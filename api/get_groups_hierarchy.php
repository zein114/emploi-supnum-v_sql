<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch all groups that are NOT specialite (unless we decide otherwise, but plan says filter out)
    // We want 'principale' and 'TD' (and potentially 'TP' if added later)
    // We treat 'principale' as parents, and others as potential children
    $query = "
        SELECT g.id, g.code, g.name, g.type, g.semester_id, g.parent_group_id, s.name as semester_name
        FROM `groups` g
        LEFT JOIN semesters s ON g.semester_id = s.id
        ORDER BY s.name, FIELD(g.type, 'principale', 'langues && ppp', 'specialite', 'TD'), g.code
    ";
    
    $result = $conn->query($query);
    if (!$result) {
        throw new Exception("Error fetching groups: " . $conn->error);
    }
    
    $allGroups = [];
    while ($row = $result->fetch_assoc()) {
        $allGroups[] = $row;
    }
    
    // 2. Build Hierarchy
    $principaleGroups = [];
    $subGroupsMap = []; // parent_id => [subgroups]
    
    foreach ($allGroups as $g) {
        $type = strtolower($g['type']);
        $isTopLevel = ($type === 'principale' || $type === 'langues && ppp' || $type === 'specialite');
        
        if ($isTopLevel || !$g['parent_group_id']) {
            $g['subgroups'] = [];
            // For specialty and language groups, they act as their own subgroup for assignments
            if ($type !== 'principale') {
                $g['subgroups'][] = $g;
            }
            $principaleGroups[$g['id']] = $g;
        } else {
            // It's a subgroup (TD, etc)
            $parentId = $g['parent_group_id'];
            if ($parentId) {
                if (!isset($subGroupsMap[$parentId])) {
                    $subGroupsMap[$parentId] = [];
                }
                $subGroupsMap[$parentId][] = $g;
            }
        }
    }
    
    // Attach subgroups to parents
    foreach ($subGroupsMap as $parentId => $subs) {
        if (isset($principaleGroups[$parentId])) {
            $principaleGroups[$parentId]['subgroups'] = $subs;
        }
    }
    
    // Convert to values array
    $response = array_values($principaleGroups);
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
