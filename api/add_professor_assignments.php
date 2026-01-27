<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$prof_id = $input['prof_id'] ?? null;
$group_id = $input['group_id'] ?? null;
$module_id = $input['module_id'] ?? null;
$assignment_type = $input['assignment_type'] ?? null;

if (!$prof_id || !$group_id || !$module_id || !$assignment_type) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit();
}

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Check for existing assignment
$existingAssignments = $dbHandler->getAssignments();

foreach ($existingAssignments as $assignment) {
    if ($assignment['subject_code'] == $module_id && 
        $assignment['type'] == $assignment_type && 
        $assignment['group_code'] == $group_id) {
        
        $existingProfName = $assignment['professor_name'] ?? $assignment['professor_id'];
        echo json_encode([
            'success' => false,
            'error' => "Le professeur $existingProfName est déjà affecté à ce module, ce groupe et ce type d'attribution."
        ]);
        exit();
    }
}

// Add assignment
$result = $dbHandler->addAssignment((int)$prof_id, $module_id, $group_id, $assignment_type);

echo json_encode($result);
?>
