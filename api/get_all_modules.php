<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

// Expanded query to join semesters
$query = "
    SELECT s.code, s.name, sem.name as semester_name
    FROM subjects s
    LEFT JOIN semesters sem ON s.semester_id = sem.id
    ORDER BY s.code
";

$result = $conn->query($query);
$modules = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $modules[] = [
            $row['code'], 
            $row['name'],
            $row['semester_name'] ?? ''
        ];
    }
}

echo json_encode($modules, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
