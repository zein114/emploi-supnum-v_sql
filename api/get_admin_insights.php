<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

$insights = [];

// 1. Workload by Semester
$workload_query = "
    SELECT sem.name as semester, 
           SUM(cw.cm_hours) as total_cm, 
           SUM(cw.td_hours) as total_td, 
           SUM(cw.tp_hours) as total_tp
    FROM course_workloads cw
    JOIN subjects s ON cw.subject_id = s.id
    JOIN semesters sem ON s.semester_id = sem.id
    GROUP BY sem.id, sem.name
    ORDER BY sem.order_index
";
$workload_res = $conn->query($workload_query);
$insights['workload_by_semester'] = [];
while ($row = $workload_res->fetch_assoc()) {
    $insights['workload_by_semester'][] = $row;
}

// 2. Room Utilization / Capacity Analytics
$rooms_query = "
    SELECT type, COUNT(*) as count, SUM(capacity) as total_capacity
    FROM classrooms
    GROUP BY type
";
$rooms_res = $conn->query($rooms_query);
$insights['rooms_distribution'] = [];
while ($row = $rooms_res->fetch_assoc()) {
    $insights['rooms_distribution'][] = $row;
}

// 3. Teacher Load (Top 10 teachers by assigned hours)
// This is a bit complex because one assignment (CM) means cw.cm_hours for that subject
$teacher_load_query = "
    SELECT p.name, 
           SUM(CASE 
                WHEN ta.type = 'CM' THEN cw.cm_hours 
                WHEN ta.type = 'TD' THEN cw.td_hours 
                WHEN ta.type = 'TP' THEN cw.tp_hours 
                ELSE 0 END) as total_hours
    FROM teacher_assignments ta
    JOIN professors p ON ta.professor_id = p.id
    JOIN course_workloads cw ON (ta.subject_id = cw.subject_id AND (ta.group_id = cw.group_id OR cw.group_id IS NULL))
    GROUP BY p.id, p.name
    ORDER BY total_hours DESC
    LIMIT 10
";
$teacher_res = $conn->query($teacher_load_query);
$insights['top_professors'] = [];
if ($teacher_res) {
    while ($row = $teacher_res->fetch_assoc()) {
        $insights['top_professors'][] = $row;
    }
}

// 4. Global Stats
$stats = $conn->query("
    SELECT 
        (SELECT COUNT(*) FROM professors) as total_profs,
        (SELECT COUNT(*) FROM `groups` WHERE type = 'principale') as total_groups,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM classrooms) as total_rooms
")->fetch_assoc();
$insights['global_stats'] = $stats;

// 5. Active Time Range
$time_res = $conn->query("SELECT MIN(SUBSTRING_INDEX(time_range, '-', 1)) as start_day, MAX(SUBSTRING_INDEX(time_range, '-', -1)) as end_day FROM time_slots WHERE is_active = 1");
$insights['academic_day'] = $time_res->fetch_assoc();

echo json_encode($insights);
