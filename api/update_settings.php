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
        
        $sql = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ss', $key1, $val1);
        $stmt->execute();
        
        $success = true;
        $message = 'Paramètres généraux mis à jour';
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

        $stmt = $conn->prepare("INSERT INTO `groups` (name, type, semester_id, parent_group_id, student_count) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('ssiii', $input['name'], $input['type'], $semesterId, $parentId, $capacity);
        $success = $stmt->execute();
        $message = $success ? 'Groupe ajouté avec succès' : 'Erreur lors de l\'ajout du groupe';
        break;

    case 'edit_group':
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
        
        $capacity = isset($input['capacity']) ? intval($input['capacity']) : 0;
        $parentId = !empty($input['parent_group_id']) ? $input['parent_group_id'] : null;

        // Prevent editing into a duplicate of another existing group
        if ($parentId === null) {
            $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id IS NULL AND id <> ? LIMIT 1");
            $stmt->bind_param('ssii', $input['name'], $input['type'], $semesterId, $input['id']);
        } else {
            $stmt = $conn->prepare("SELECT id FROM `groups` WHERE name = ? AND type = ? AND semester_id = ? AND parent_group_id = ? AND id <> ? LIMIT 1");
            $stmt->bind_param('ssiii', $input['name'], $input['type'], $semesterId, $parentId, $input['id']);
        }
        $stmt->execute();
        $duplicateResult = $stmt->get_result();
        if ($duplicateResult && $duplicateResult->fetch_assoc()) {
            $success = false;
            $error = 'Un groupe avec le même nom, semestre, type et groupe parent existe déjà.';
            break;
        }
        
        $stmt = $conn->prepare("UPDATE `groups` SET name = ?, type = ?, semester_id = ?, parent_group_id = ?, student_count = ? WHERE id = ?");
        $stmt->bind_param('ssiiii', $input['name'], $input['type'], $semesterId, $parentId, $capacity, $input['id']);
        $success = $stmt->execute();
        $message = $success ? 'Groupe modifié avec succès' : 'Erreur lors de la modification du groupe';
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
