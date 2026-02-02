<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

// Ensure only admins can access
requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

// Fetch current semester setting
$semesterResult = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'current_semester_type'");
$currentSemester = $semesterResult->fetch_assoc()['setting_value'] ?? 'impair';

try {
    // 1. Fetch all subjects joined with semesters and all workloads in ONE query
    $query = "
        SELECT s.id as subject_id, s.code as subject_code, s.name as subject_name, 
               sem.name as semester_name, sem.order_index,
               cw.cm_hours, cw.td_hours, cw.tp_hours,
               cw.cm_online, cw.td_online, cw.tp_online,
               g.code as group_code
        FROM subjects s
        LEFT JOIN semesters sem ON s.semester_id = sem.id
        LEFT JOIN course_workloads cw ON cw.subject_id = s.id
        LEFT JOIN `groups` g ON cw.group_id = g.id
        ORDER BY sem.order_index, s.code, g.code
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
                'group_entries' => []
            ];
        }
        
        $entry = [
            'code' => $row['subject_code'],
            'code_groupe' => $row['group_code'] ?? '',
            'nom' => $row['subject_name'],
            'semester' => $row['semester_name'] ?? '',
            'cm' => (int)($row['cm_hours'] ?? 0),
            'td' => (int)($row['td_hours'] ?? 0),
            'tp' => (int)($row['tp_hours'] ?? 0),
            'online_cm' => (int)($row['cm_online'] ?? 0),
            'online_td' => (int)($row['td_online'] ?? 0),
            'online_tp' => (int)($row['tp_online'] ?? 0)
        ];

        if (empty($row['group_code'])) {
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
        if ($currentSemester === 'impair') {
            if ($semNum % 2 === 0) continue;
        } else {
            if ($semNum % 2 !== 0) continue;
        }

        // Handle General Entry
        if ($data['general_entry']) {
            $finalData[] = $data['general_entry'];
        } else {
            // No general entry in database, synthesize one
            // Use MAX of group entries if they exist, otherwise 0
            $maxCm = 0; $maxTd = 0; $maxTp = 0;
            $maxOnlCm = 0; $maxOnlTd = 0; $maxOnlTp = 0;
            
            foreach ($data['group_entries'] as $ge) {
                $maxCm = max($maxCm, $ge['cm']);
                $maxTd = max($maxTd, $ge['td']);
                $maxTp = max($maxTp, $ge['tp']);
                $maxOnlCm = max($maxOnlCm, $ge['online_cm']);
                $maxOnlTd = max($maxOnlTd, $ge['online_td']);
                $maxOnlTp = max($maxOnlTp, $ge['online_tp']);
            }
            
            $finalData[] = [
                'code' => $data['info']['code'],
                'code_groupe' => '',
                'nom' => $data['info']['nom'],
                'semester' => $data['info']['semester'],
                'cm' => $maxCm,
                'td' => $maxTd,
                'tp' => $maxTp,
                'online_cm' => $maxOnlCm,
                'online_td' => $maxOnlTd,
                'online_tp' => $maxOnlTp
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
