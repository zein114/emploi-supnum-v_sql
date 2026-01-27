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
        
        $stmt = $conn->prepare("INSERT INTO `groups` (code, name, type, semester_id) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('sssi', $input['code'], $input['name'], $input['type'], $semesterId);
        $success = $stmt->execute();
        $message = $success ? 'Groupe ajouté avec succès' : 'Erreur lors de l\'ajout du groupe';
        break;

    case 'edit_group':
        $oldCode = $input['old_code'] ?? $input['code'];
        
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
        
        $stmt = $conn->prepare("UPDATE `groups` SET code = ?, name = ?, type = ?, semester_id = ? WHERE code = ?");
        $stmt->bind_param('sssss', $input['code'], $input['name'], $input['type'], $semesterId, $oldCode);
        $success = $stmt->execute();
        $message = $success ? 'Groupe modifié avec succès' : 'Erreur lors de la modification du groupe';
        break;

    case 'delete_group':
        $stmt = $conn->prepare("DELETE FROM `groups` WHERE code = ?");
        $stmt->bind_param('s', $input['code']);
        $success = $stmt->execute();
        $message = $success ? 'Groupe supprimé avec succès' : 'Erreur lors de la suppression du groupe';
        break;
}

echo json_encode(['success' => $success, 'message' => $message]);
?>
