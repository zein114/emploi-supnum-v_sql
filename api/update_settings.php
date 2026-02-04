<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['action'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$action = $input['action'];
$success = false;
$message = '';
$error = '';

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

switch ($action) {
    case 'update_general':
        $key1 = 'current_semester_type';
        $val1 = $input['current_semester_type'] ?? 'impair';
        
        // Check current value before update to detect change
        $currentValQuery = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'current_semester_type'");
        $oldVal = ($currentValQuery && $currentValQuery->num_rows > 0) ? $currentValQuery->fetch_assoc()['setting_value'] : 'impair';

        // Update Setting
        $sql = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ss', $key1, $val1);
        $stmt->execute();
        
        // BULK UPDATE GROUPS if value changed
        if ($oldVal !== $val1) {
            // Logic:
            // If Impair (S1, S3, S5) -> Pair (S2, S4, S6): Add 1 to semester_id
            // If Pair (S2, S4, S6) -> Impair (S1, S3, S5): Subtract 1 from semester_id (or logic to revert)
            
            // Wait, simpliest logic is:
            // S1 (1) <-> S2 (2)
            // S3 (3) <-> S4 (4)
            // S5 (5) <-> S6 (6)
            
            // Apply ONLY to 'genric' groups (Principale, TD, Langues).
            // Exclude 'specialite' as they are specific to a semester (user requirement).
            
            $updateSql = "
                UPDATE `groups`
                SET semester_id = CASE
                    WHEN semester_id = 1 THEN 2
                    WHEN semester_id = 2 THEN 1
                    WHEN semester_id = 3 THEN 4
                    WHEN semester_id = 4 THEN 3
                    WHEN semester_id = 5 THEN 6
                    WHEN semester_id = 6 THEN 5
                    ELSE semester_id
                END
                WHERE type != 'specialite'
            ";
            $conn->query($updateSql);
            $message = 'Paramètres généraux mis à jour et groupes rebasculés';
        } else {
            $message = 'Paramètres généraux mis à jour';
        }
        
        $success = true;
        break;

    case 'toggle_day_status':
        $stmt = $conn->prepare("UPDATE days SET is_active = ? WHERE id = ?");
        $stmt->bind_param('ii', $input['is_active'], $input['id']);
        $success = $stmt->execute();
        if ($success) {
            $dbHandler->initTimetables();
        }
        break;

    case 'toggle_timeslot_status':
        $stmt = $conn->prepare("UPDATE time_slots SET is_active = ? WHERE id = ?");
        $stmt->bind_param('ii', $input['is_active'], $input['id']);
        $success = $stmt->execute();
        if ($success) {
            $dbHandler->initTimetables();
        }
        break;

    case 'edit_timeslot':
        $stmt = $conn->prepare("UPDATE time_slots SET time_range = ? WHERE id = ?");
        $stmt->bind_param('si', $input['range'], $input['id']);
        $success = $stmt->execute();
        if ($success) {
            $dbHandler->initTimetables();
        }
        break;

    case 'delete_timeslot':
        $stmt = $conn->prepare("DELETE FROM time_slots WHERE id = ?");
        $stmt->bind_param('i', $input['id']);
        $success = $stmt->execute();
        if ($success) {
            $dbHandler->initTimetables();
        }
        break;

    case 'edit_semester':
        $stmt = $conn->prepare("UPDATE semesters SET name = ?, display_name = ? WHERE id = ?");
        $stmt->bind_param('ssi', $input['name'], $input['display_name'], $input['id']);
        $success = $stmt->execute();
        break;

    // Classroom and Group management (now using database)
    case 'add_classroom':
        $stmt = $conn->prepare("INSERT INTO classrooms (name, capacity, type) VALUES (?, ?, ?)");
        $stmt->bind_param('sis', $input['name'], $input['capacity'], $input['type']);
        $success = $stmt->execute();
        $message = $success ? 'Salle ajoutée avec succès' : 'Erreur lors de l\'ajout de la salle';
        break;

    case 'edit_classroom':
        $oldName = $input['old_name'] ?? $input['name'];
        $stmt = $conn->prepare("UPDATE classrooms SET name = ?, capacity = ?, type = ? WHERE name = ?");
        $stmt->bind_param('siss', $input['name'], $input['capacity'], $input['type'], $oldName);
        $success = $stmt->execute();
        $message = $success ? 'Salle modifiée avec succès' : 'Erreur lors de la modification de la salle';
        break;

    case 'delete_classroom':
        $stmt = $conn->prepare("DELETE FROM classrooms WHERE name = ?");
        $stmt->bind_param('s', $input['name']);
        $success = $stmt->execute();
        $message = $success ? 'Salle supprimée avec succès' : 'Erreur lors de la suppression de la salle';
        break;

    case 'add_group':
        // Get semester_id from semester name
        $semesterId = null;
        if (!empty($input['semester'])) {
            $stmt = $conn->prepare("SELECT id FROM semesters WHERE name = ?");
            $stmt->bind_param('s', $input['semester']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $semesterId = $row['id'];
            }
        }
        
        $capacity = isset($input['capacity']) ? intval($input['capacity']) : 0;
        $parentId = !empty($input['parent_group_id']) ? $input['parent_group_id'] : null;

        // Prevent creating a group with identical name, type, parent group and semester
        if ($parentId === null) {
            $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id IS NULL LIMIT 1");
            $stmt->bind_param('ssi', $input['name'], $input['type'], $semesterId);
        } else {
            $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id = ? LIMIT 1");
            $stmt->bind_param('ssii', $input['name'], $input['type'], $semesterId, $parentId);
        }
        $stmt->execute();
        $duplicateResult = $stmt->get_result();
        if ($duplicateResult && $duplicateResult->fetch_assoc()) {
            $success = false;
            $error = 'Un groupe avec le même nom, semestre, type et groupe parent existe déjà.';
            break;
        }

        // Check if create_next_semester is true
        $createNext = $input['create_next_semester'] ?? false;
        
        $stmt = $conn->prepare("INSERT INTO `groups` (name, type, semester_id, parent_group_id, student_count) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('ssiii', $input['name'], $input['type'], $semesterId, $parentId, $capacity);
        $success = $stmt->execute();
        $message = $success ? 'Groupe ajouté avec succès' : 'Erreur lors de l\'ajout du groupe';

        // Handle Next Semester Creation for Specialite
        if ($success && $createNext && !empty($input['semester'])) {
            // Find next semester
            // 1. Get current semester order index
            $findIdx = $conn->prepare("SELECT order_index FROM semesters WHERE id = ?");
            $findIdx->bind_param('i', $semesterId);
            $findIdx->execute();
            $resIdx = $findIdx->get_result();
            if ($resIdx && $r = $resIdx->fetch_assoc()) {
                $currentOrder = $r['order_index'];
                $nextOrder = $currentOrder + 1;
                
                // 2. Get next semester id
                $findNext = $conn->prepare("SELECT id FROM semesters WHERE order_index = ?");
                $findNext->bind_param('i', $nextOrder);
                $findNext->execute();
                $resNext = $findNext->get_result();
                if ($resNext && $n = $resNext->fetch_assoc()) {
                    $nextSemesterId = $n['id'];
                    
                    // 3. Create duplicate group in next semester
                    // Check duplicate first
                    if ($parentId === null) {
                        $chk = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id IS NULL");
                        $chk->bind_param('ssi', $input['name'], $input['type'], $nextSemesterId);
                    } else {
                        $chk = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id = ?");
                        $chk->bind_param('ssii', $input['name'], $input['type'], $nextSemesterId, $parentId);
                    }
                    $chk->execute();
                    if ($chk->get_result()->num_rows == 0) {
                         $stmtNext = $conn->prepare("INSERT INTO `groups` (name, type, semester_id, parent_group_id, student_count) VALUES (?, ?, ?, ?, ?)");
                         $stmtNext->bind_param('ssiii', $input['name'], $input['type'], $nextSemesterId, $parentId, $capacity);
                         if ($stmtNext->execute()) {
                             $message .= " (Ajouté également au semestre suivant)";
                         }
                    }
                }
            }
        }
        break;

    case 'edit_group':
        $id = $input['id'];
        $type = $input['type'];
        $newName = $input['name'];
        $capacity = isset($input['capacity']) ? intval($input['capacity']) : 0;
        $parentId = !empty($input['parent_group_id']) ? $input['parent_group_id'] : null;
        
        $newSemesterId = null;
        if (!empty($input['semester'])) {
            $stmt = $conn->prepare("SELECT id FROM semesters WHERE name = ?");
            $stmt->bind_param('s', $input['semester']);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($row = $res->fetch_assoc()) $newSemesterId = $row['id'];
        }

        if (strtolower($type) === 'specialite' && isset($input['coverage'])) {
            $coverage = $input['coverage'];
            $oddSemId = ($newSemesterId % 2 != 0) ? $newSemesterId : ($newSemesterId - 1);
            $evenSemId = $oddSemId + 1;

            // Get old name for cleanup
            $oldStmt = $conn->prepare("SELECT name FROM `groups` WHERE id = ?");
            $oldStmt->bind_param('i', $id);
            $oldStmt->execute();
            $oldName = ($r = $oldStmt->get_result()->fetch_assoc()) ? $r['name'] : $newName;

            if ($coverage === 'both') {
                // UPDATE CURRENT ROW
                $stmt = $conn->prepare("UPDATE `groups` SET name=?, type=?, semester_id=?, parent_group_id=?, student_count=? WHERE id=?");
                $stmt->bind_param('ssiiii', $newName, $type, $newSemesterId, $parentId, $capacity, $id);
                $stmt->execute();

                // ENSURE TWIN EXISTS
                $twinSemId = ($newSemesterId == $oddSemId) ? $evenSemId : $oddSemId;
                
                // Try to find an existing twin with same name/type
                $checkTwin = $conn->prepare("SELECT id FROM `groups` WHERE name=? AND type=? AND semester_id=? AND id <> ?");
                $checkTwin->bind_param('ssii', $newName, $type, $twinSemId, $id);
                $checkTwin->execute();
                
                if ($checkTwin->get_result()->num_rows === 0) {
                    // Create twin
                    $ins = $conn->prepare("INSERT INTO `groups` (name, type, semester_id, parent_group_id, student_count) VALUES (?, ?, ?, ?, ?)");
                    $ins->bind_param('ssiii', $newName, $type, $twinSemId, $parentId, $capacity);
                    $ins->execute();
                    $message = 'Groupe étendu aux deux semestres';
                } else {
                    // Update existing twin to match new name/parent/capacity
                    $upd = $conn->prepare("UPDATE `groups` SET name=?, parent_group_id=?, student_count=? WHERE name=? AND type=? AND semester_id=? AND id <> ?");
                    $upd->bind_param('siissii', $newName, $parentId, $capacity, $newName, $type, $twinSemId, $id);
                    $upd->execute();
                    $message = 'Groupe mis à jour sur les deux semestres';
                }
            } else {
                // SINGLE SEMESTER (odd or even)
                $targetSemId = ($coverage === 'even') ? $evenSemId : $oddSemId;
                $otherSemId = ($coverage === 'even') ? $oddSemId : $evenSemId;

                // 1. Delete duplicates in target semester first (to avoid constraint hit during update)
                $cleanup = $conn->prepare("DELETE FROM `groups` WHERE name=? AND type=? AND semester_id=? AND id <> ?");
                $cleanup->bind_param('ssii', $newName, $type, $targetSemId, $id);
                $cleanup->execute();

                // 2. Update the current row
                $stmt = $conn->prepare("UPDATE `groups` SET name=?, type=?, semester_id=?, parent_group_id=?, student_count=? WHERE id=?");
                $stmt->bind_param('ssiiii', $newName, $type, $targetSemId, $parentId, $capacity, $id);
                $stmt->execute();

                // 3. Delete from the other (unwanted) semester
                $del = $conn->prepare("DELETE FROM `groups` WHERE (name=? OR name=?) AND type=? AND semester_id=? AND id <> ?");
                $del->bind_param('ssiii', $oldName, $newName, $type, $otherSemId, $id);
                $del->execute();
                
                $message = 'Groupe restreint à un seul semestre';
            }
            $success = true;
        } else {
            // STANDARD LOGIC for non-specialite
            if ($parentId === null) {
                $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id IS NULL AND id <> ? LIMIT 1");
                $stmt->bind_param('ssii', $newName, $type, $newSemesterId, $id);
            } else {
                $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id = ? AND id <> ? LIMIT 1");
                $stmt->bind_param('ssiii', $newName, $type, $newSemesterId, $parentId, $id);
            }
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                $success = false;
                $error = 'Un groupe avec le même nom, semestre, type et groupe parent existe déjà.';
            } else {
                $stmt = $conn->prepare("UPDATE `groups` SET name = ?, type = ?, semester_id = ?, parent_group_id = ?, student_count = ? WHERE id = ?");
                $stmt->bind_param('ssiiii', $newName, $type, $newSemesterId, $parentId, $capacity, $id);
                $success = $stmt->execute();
                $message = 'Groupe modifié avec succès';
            }
        }
        break;

    case 'edit_group_semester':
        // Get semester_id
        $semesterId = null;
        if (!empty($input['semester'])) {
            $stmt = $conn->prepare("SELECT id FROM semesters WHERE name = ?");
            $stmt->bind_param('s', $input['semester']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $semesterId = $row['id'];
            }
        }
        
        $stmt = $conn->prepare("UPDATE `groups` SET semester_id = ? WHERE id = ?");
        $stmt->bind_param('ii', $semesterId, $input['id']);
        $success = $stmt->execute();
        $message = $success ? 'Semestre mis à jour' : 'Erreur lors de la mise à jour du semestre';
        break;

    case 'delete_group':
        $stmt = $conn->prepare("DELETE FROM `groups` WHERE id = ?");
        $stmt->bind_param('i', $input['id']);
        $success = $stmt->execute();
        $message = $success ? 'Groupe supprimé avec succès' : 'Erreur lors de la suppression du groupe';
        break;
}

echo json_encode(['success' => $success, 'message' => $message, 'error' => $error]);
?>
