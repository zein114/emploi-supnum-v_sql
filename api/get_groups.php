<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

// Get requested semester from query param
$requestedSemester = isset($_GET['semester']) ? trim($_GET['semester']) : '';

try {
    // Build query with optional semester filter
    if (!empty($requestedSemester)) {
        $stmt = $conn->prepare("
            SELECT g.code, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            WHERE g.type = 'principale' AND s.name = ?
            ORDER BY g.id
        ");
        $stmt->bind_param('s', $requestedSemester);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query("
            SELECT g.code, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            WHERE g.type = 'principale'
            ORDER BY g.id
        ");
    }
    
    $groups = [];
    while ($row = $result->fetch_assoc()) {
        $groups[] = [
            'code' => $row['code'],
            'name' => $row['name'],
            'semester' => $row['semester'] ?? '',
            'type' => $row['type'],
            'speciality' => '',  // Not stored in DB currently
            'reference' => '',   // Not applicable for principale groups
            'capacity' => 0      // Not stored in DB currently
        ];
    }
    
    echo json_encode($groups, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur : ' . $e->getMessage()]);
}
?>
