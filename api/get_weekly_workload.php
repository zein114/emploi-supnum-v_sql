<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

// Ensure only admins can access
requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

// 1. Fetch current semester setting
$semesterResult = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'current_semester_type'");
$currentSemester = $semesterResult->fetch_assoc()['setting_value'] ?? 'impair';

// 2. Identify active semesters
$activeSemesterIds = [];
$semResult = $conn->query("SELECT id, name FROM semesters");
while($sem = $semResult->fetch_assoc()) {
    if (preg_match('/(\d+)/', $sem['name'], $matches)) {
        $num = intval($matches[1]);
        $isEven = ($num % 2 === 0);
        if (($currentSemester === 'pair' && $isEven) || ($currentSemester === 'impair' && !$isEven)) {
            $activeSemesterIds[] = $sem['id'];
        }
    } else {
        // Fallback for non-numbered semesters, treat as active
        $activeSemesterIds[] = $sem['id'];
    }
}

// 3. Force workload to 0 for inactive semesters in the database
if (!empty($activeSemesterIds)) {
    $activeList = implode(',', $activeSemesterIds);
    $conn->query("
        UPDATE course_workloads cw
        JOIN subjects s ON cw.subject_id = s.id
        SET cw.cm_hours = 0, cw.td_hours = 0, cw.tp_hours = 0,
            cw.cm_online = 0, cw.td_online = 0, cw.tp_online = 0
        WHERE s.semester_id NOT IN ($activeList)
    ");
}

try {
    // 4. Fetch only subjects from ACTIVE semesters
    $activeFilter = !empty($activeSemesterIds) ? "WHERE s.semester_id IN (" . implode(',', $activeSemesterIds) . ")" : "";
    
    $query = "
        SELECT s.id as subject_id, s.code as subject_code, s.name as subject_name, 
               sem.name as semester_name, sem.order_index,
               cw.cm_hours, cw.td_hours, cw.tp_hours,
               cw.cm_online, cw.td_online, cw.tp_online,
               g.id as group_id,
               (
                SELECT COUNT(DISTINCT COALESCE(pg.id, ghier.id))
                FROM teacher_assignments ta
                JOIN `groups` ghier ON ta.group_id = ghier.id
                LEFT JOIN `groups` pg ON ghier.parent_group_id = pg.id
                WHERE ta.subject_id = s.id
               ) as assigned_group_count,
               (
                SELECT GROUP_CONCAT(DISTINCT COALESCE(pg.id, ghier.id))
                FROM teacher_assignments ta
                JOIN `groups` ghier ON ta.group_id = ghier.id
                LEFT JOIN `groups` pg ON ghier.parent_group_id = pg.id
                WHERE ta.subject_id = s.id
               ) as assigned_group_ids
        FROM subjects s
        LEFT JOIN semesters sem ON s.semester_id = sem.id
        LEFT JOIN course_workloads cw ON cw.subject_id = s.id
        LEFT JOIN `groups` g ON cw.group_id = g.id
        $activeFilter
        ORDER BY sem.order_index, s.code, g.id
    ";
    
    $result = $conn->query($query);
    if (!$result) {
        throw new Exception("Error fetching data: " . $conn->error);
    }
    
    // 2. Process results: Group by subject
    $groupedBySubject = [];
    while ($row = $result->fetch_assoc()) {
        $sid = $row['subject_id'];
        if (!isset($groupedBySubject[$sid])) {
            $groupedBySubject[$sid] = [
                'info' => [
                    'code' => $row['subject_code'],
                    'nom' => $row['subject_name'],
                    'semester' => $row['semester_name'] ?? '',
                ],
                'general_entry' => null,
                'group_entries' => [],
                'assigned_group_count' => (int)$row['assigned_group_count'],
                'assigned_group_ids' => $row['assigned_group_ids'] ?? ''
            ];
        }
        
        $entry = [
            'code' => $row['subject_code'],
            'group_id' => $row['group_id'] ?? '',
            'nom' => $row['subject_name'],
            'semester' => $row['semester_name'] ?? '',
            'cm' => (int)($row['cm_hours'] ?? 0),
            'td' => (int)($row['td_hours'] ?? 0),
            'tp' => (int)($row['tp_hours'] ?? 0),
            'online_cm' => (int)($row['cm_online'] ?? 0),
            'online_td' => (int)($row['td_online'] ?? 0),
            'online_tp' => (int)($row['tp_online'] ?? 0),
            'assigned_group_count' => (int)$row['assigned_group_count'],
            'assigned_group_ids' => $row['assigned_group_ids'] ?? ''
        ];

        if (empty($row['group_id'])) {
            // This is the general workload entry (or the NULL result of the LEFT JOIN)
            // We check if cw.id is not null to know if it's a real entry in DB
            if ($row['cm_hours'] !== null) {
               $groupedBySubject[$sid]['general_entry'] = $entry;
            }
        } else {
            // This is a group-specific exclusion
            $groupedBySubject[$sid]['group_entries'][] = $entry;
        }
    }
    
    // 3. Flatten grouped data and add/synthesize general rows
    $finalData = [];
    foreach ($groupedBySubject as $sid => $data) {
        // Semester filtering
        $semesterStr = $data['info']['semester'];
        $semNum = (int)preg_replace('/[^0-9]/', '', $semesterStr);
        
        if ($semNum === 0) continue;
        // No filtering here anymore, we let the frontend filter by semester name/number if needed

        // Handle General Entry
        if ($data['general_entry']) {
            $finalData[] = $data['general_entry'];
        } else {
            // No general entry in database (only group-specific entries exist).
            // Show zeros so the admin does NOT accidentally overwrite the
            // general DEFAULT with the max of specific group values when saving.
            $finalData[] = [
                'code' => $data['info']['code'],
                'group_id' => '',
                'nom' => $data['info']['nom'],
                'semester' => $data['info']['semester'],
                'cm' => 0,
                'td' => 0,
                'tp' => 0,
                'online_cm' => 0,
                'online_td' => 0,
                'online_tp' => 0,
                'assigned_group_count' => $data['assigned_group_count'],
                'assigned_group_ids' => $data['assigned_group_ids']
            ];
        }

        // Add all group exclusions
        foreach ($data['group_entries'] as $ge) {
            $finalData[] = $ge;
        }
    }
    
    echo json_encode(['data' => $finalData]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors du chargement des données : ' . $e->getMessage()]);
}
?>
