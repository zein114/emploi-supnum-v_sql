<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$tab = $_GET['tab'] ?? 'general';
$response = [];

// Always fetch semesters as they are needed for modals in multiple tabs
$response['semesters'] = [];
$result = $conn->query("SELECT * FROM semesters ORDER BY order_index, id");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $response['semesters'][] = $row;
    }
}

if ($tab === 'general' || $tab === 'days-times') {
    // Fetch SQL Settings
    $result = $conn->query("SELECT * FROM settings");
    while ($row = $result->fetch_assoc()) {
        $response[$row['setting_key']] = $row['setting_value'];
    }

    $response['days'] = [];
    $result = $conn->query("SELECT * FROM days ORDER BY order_index, id");
    while ($row = $result->fetch_assoc()) {
        $response['days'][] = $row;
    }

    $response['time_slots'] = [];
    $result = $conn->query("SELECT * FROM time_slots ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $response['time_slots'][] = $row;
    }
}

if ($tab === 'classrooms' || $tab === 'groups') {
    if ($tab === 'classrooms') {
        // Get classrooms from database
        $result = $conn->query("SELECT * FROM classrooms ORDER BY id");
        $classrooms = [];
        while ($row = $result->fetch_assoc()) {
            $classrooms[] = [
                'A' => $row['name'],
                'B' => $row['capacity'],
                'C' => $row['type']
            ];
        }
        $response['classrooms'] = $classrooms;
    } else {
        // Get groups from database
        $result = $conn->query("
            SELECT g.id, g.code, g.name, s.name as semester, g.type, g.parent_group_id, p.name as parent_name, g.student_count
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            LEFT JOIN `groups` p ON g.parent_group_id = p.id
            ORDER BY g.id
        ");
        
        $groups = [];
        $types = ['principale', 'TD', 'specialite', 'langues && ppp'];
        while ($row = $result->fetch_assoc()) {
            $groups[] = [
                'id' => $row['id'],
                'code' => trim($row['code'] ?? ''),
                'name' => trim($row['name'] ?? ''),
                'semester' => trim($row['semester'] ?? ''),
                'type' => trim($row['type'] ?? ''),
                'speciality' => trim($row['parent_name'] ?? ''), 
                'reference' => trim($row['parent_group_id'] ?? ''),
                'capacity' => $row['student_count'] ?? 30
            ];
            
            if (!empty($row['type']) && !in_array($row['type'], $types)) {
                $types[] = $row['type'];
            }
        }
        
        $response['groups'] = $groups;
        // Don't sort to keep my order, or sort if preferred. 
        // Let's keep the defined order and append others.
        $response['group_types'] = array_values($types);
    }
}

header('Content-Type: application/json');
echo json_encode($response);
?>
