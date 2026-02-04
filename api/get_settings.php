<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$tab = $_GET['tab'] ?? 'general';
$response = [];

// 1. Fetch current semester type setting
$settingResult = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'current_semester_type'");
$currentType = 'impair'; // Default
if ($settingResult && $settingResult->num_rows > 0) {
    $currentType = $settingResult->fetch_assoc()['setting_value'];
}
$response['current_semester_type'] = $currentType; // Ensure it's passed to frontend

// Always fetch semesters as they are needed for modals in multiple tabs
$response['semesters'] = [];
$allSemesters = [];
$result = $conn->query("SELECT * FROM semesters ORDER BY order_index, id");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $allSemesters[] = $row; // Store strictly for pairing logic
        
        // Filter for DISPLAY purposes (legacy support for other parts of app)
        if (preg_match('/(\d+)/', $row['name'], $matches)) {
            $num = intval($matches[1]);
            $isEven = ($num % 2 === 0);
            
            if ($currentType === 'pair' && $isEven) {
                $response['semesters'][] = $row;
            } elseif ($currentType === 'impair' && !$isEven) {
                $response['semesters'][] = $row;
            }
        } else {
            $response['semesters'][] = $row;
        }
    }
}

// Generate Pairs for "Add Group" Modal
$response['semester_pairs'] = [];
// Assuming order 1=S1, 2=S2, etc.
for ($i = 0; $i < count($allSemesters); $i += 2) {
    if (isset($allSemesters[$i]) && isset($allSemesters[$i+1])) {
        // e.g. S1 and S2
        $sA = $allSemesters[$i];
        $sB = $allSemesters[$i+1];
        
        // Create a display label like "S1/S2" or infer level "L1 (S1/S2)"
        // Simple concat for now
        $pairName = $sA['name'] . '/' . $sB['name'];
        
        $response['semester_pairs'][] = [
            'display' => $pairName,
            'odd_semester' => $sA,
            'even_semester' => $sB,
            // ID to use for selection? Maybe use the odd one as reference
            'pair_id' => $i/2 + 1 
        ];
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
        // Get groups from database, ordered by numeric semester then by name
        $result = $conn->query("
            SELECT g.id, g.name, s.name as semester, g.type, g.parent_group_id, p.name as parent_name, g.student_count
            FROM `groups` g
            LEFT JOIN semesters s ON g.semester_id = s.id
            LEFT JOIN `groups` p ON g.parent_group_id = p.id
            ORDER BY CAST(SUBSTRING(s.name, 2) AS UNSIGNED), g.type, parent_name, g.name, g.id
        ");
        
        $groups = [];
        $allGroupsUnfiltered = []; // For checking "both semesters" for specialite
        $types = ['principale', 'TD', 'specialite', 'langues && ppp'];
        while ($row = $result->fetch_assoc()) {
            $rawType = strtolower(trim($row['type'] ?? ''));
            $actualType = ($rawType === 'td') ? 'TD' : $rawType;
            
            $groupData = [
                'id' => $row['id'],
                'name' => trim($row['name'] ?? ''),
                'semester' => trim($row['semester'] ?? ''),
                'type' => $actualType,
                'speciality' => trim($row['parent_name'] ?? ''), 
                'parent_group_id' => $row['parent_group_id'],
                'capacity' => $row['student_count'] ?? 0
            ];
            
            // Add to unfiltered list for frontend "both semester" checking
            $allGroupsUnfiltered[] = $groupData;
            
            // Filter by semester parity for display
            $shouldInclude = false;
            if ($row['semester']) {
                if (preg_match('/(\\d+)/', $row['semester'], $matches)) {
                    $num = intval($matches[1]);
                    $isEven = ($num % 2 === 0);
                    if (($response['current_semester_type'] ?? 'impair') === 'pair' && $isEven) {
                        $shouldInclude = true;
                    } elseif (($response['current_semester_type'] ?? 'impair') === 'impair' && !$isEven) {
                         $shouldInclude = true;
                    }
                } else {
                    $shouldInclude = true;
                }
            } else {
                $shouldInclude = true;
            }

            if ($shouldInclude) {
                $groups[] = [
                    'id' => $row['id'],
                    'name' => trim($row['name'] ?? ''),
                    'semester' => trim($row['semester'] ?? ''),
                    'type' => $actualType,
                    'speciality' => trim($row['parent_name'] ?? ''), 
                    'reference' => trim($row['parent_group_id'] ?? ''),
                    'capacity' => $row['student_count'] ?? 0
                ];
            }
            
            if (!empty($actualType) && !in_array($actualType, $types)) {
                $types[] = $actualType;
            }
        }
        
        $response['groups'] = $groups;
        $response['all_groups'] = $allGroupsUnfiltered; // Unfiltered list for semester coverage checking
        // Don't sort to keep my order, or sort if preferred. 
        // Let's keep the defined order and append others.
        $response['group_types'] = array_values($types);
    }
}

header('Content-Type: application/json');
echo json_encode($response);
?>
