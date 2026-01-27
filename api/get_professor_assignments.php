<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

$prof_id = $_GET['prof_id'] ?? null;

if (!$prof_id) {
    echo json_encode(['error' => 'prof_id requis']);
    exit;
}

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Get assignments for this professor
$assignments = $dbHandler->getAssignments((int)$prof_id);

// Format output to match original structure
// Original: [module_name, prof_id, type, group_name, rowIndex, moduleId, groupId]
$formatted = array_map(function($assignment) use ($prof_id) {
    return [
        $assignment['subject_name'],          // [0] module name
        $prof_id,                              // [1] professor id
        $assignment['type'],                   // [2] type (CM/TP/TD)
        $assignment['group_name'],             // [3] group name
        $assignment['id'],                     // [4] assignment id (for deletion)
        $assignment['subject_code'],           // [5] subject code
        $assignment['group_code']              // [6] group code
    ];
}, $assignments);

echo json_encode($formatted, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
