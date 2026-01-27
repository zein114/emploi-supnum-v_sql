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
            SELECT g.code, g.name, s.name as semester, g.type
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            ORDER BY g.id
        ");
        
        $groups = [];
        $types = [];
        while ($row = $result->fetch_assoc()) {
            $groups[] = [
                'code' => trim($row['code'] ?? ''),
                'name' => trim($row['name'] ?? ''),
                'semester' => trim($row['semester'] ?? ''),
                'type' => trim($row['type'] ?? ''),
                'speciality' => '', // Not stored in DB currently
                'reference' => '',  // Would need parent_group_id lookup
                'capacity' => 0     // Not stored in DB currently
            ];
            
            if (!empty($row['type']) && !in_array($row['type'], $types)) {
                $types[] = $row['type'];
            }
        }
        
        $response['groups'] = $groups;
        sort($types);
        $response['group_types'] = array_values($types);
    }
}

header('Content-Type: application/json');
echo json_encode($response);
?>
