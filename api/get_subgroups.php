<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$parent_id = $_GET['parent_id'] ?? 0;
$response = ['success' => false, 'subgroups' => []];

if ($parent_id > 0) {
    $stmt = $conn->prepare("
        SELECT g.id, g.name, s.name as semester, g.type, g.student_count as capacity, g.speciality
        FROM `groups` g
        LEFT JOIN semesters s ON g.semester_id = s.id
        WHERE g.parent_group_id = ?
        ORDER BY g.id
    ");
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $response['subgroups'][] = [
            'id' => trim($row['id'] ?? ''),
            'name' => trim($row['name'] ?? ''),
            'semester' => trim($row['semester'] ?? ''),
            'type' => trim($row['type'] ?? ''),
            'speciality' => trim($row['speciality'] ?? ''), 
            'capacity' => (int)($row['capacity'] ?? 0)
        ];
    }
    $response['success'] = true;
}

header('Content-Type: application/json');
echo json_encode($response);
?>
