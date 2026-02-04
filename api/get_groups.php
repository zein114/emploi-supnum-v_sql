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
            SELECT g.id, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            WHERE g.type IN ('principale', 'langues && ppp', 'specialite') AND s.name = ?
            ORDER BY CAST(SUBSTRING(s.name, 2) AS UNSIGNED), g.type, g.name, g.id
        ");
        $stmt->bind_param('s', $requestedSemester);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query("
            SELECT g.id, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            WHERE g.type IN ('principale', 'langues && ppp', 'specialite')
            ORDER BY CAST(SUBSTRING(s.name, 2) AS UNSIGNED), g.type, g.name, g.id
        ");
    }
    
    $groups = [];
    while ($row = $result->fetch_assoc()) {
        $groups[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'semester' => $row['semester'] ?? '',
            'type' => $row['type']
        ];
    }
    
    echo json_encode($groups, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur : ' . $e->getMessage()]);
}
?>
