<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Get professors
$professors = $dbHandler->getProfessors();

// Get assignment counts for each professor
$result = $conn->query("
    SELECT professor_id, COUNT(*) as count
    FROM teacher_assignments
    GROUP BY professor_id
");

$assignments = [];
while ($row = $result->fetch_assoc()) {
    $assignments[$row['professor_id']] = $row['count'];
}

// Add assignment counts to professor data
$professors = array_map(function($professor) use ($assignments) {
    return [
        'id' => $professor['id'],
        'username' => $professor['name'],
        'assignments' => $assignments[$professor['id']] ?? 0
    ];
}, $professors);

echo json_encode($professors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
