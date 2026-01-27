<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

// In the new version, row_index is actually the assignment id
$assignmentId = $input['row_index'] ?? null;

if (!$assignmentId) {
    echo json_encode(['success' => false, 'error' => 'ID d\'attribution requis']);
    exit();
}

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Delete the assignment
$result = $dbHandler->deleteAssignment((int)$assignmentId);

echo json_encode($result);
?>
