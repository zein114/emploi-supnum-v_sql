<?php
require_once '../config/db_connect.php';

header('Content-Type: application/json');

// 1. Fetch current semester type setting
$settingResult = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'current_semester_type'");
$currentType = 'impair'; // Default
if ($settingResult && $settingResult->num_rows > 0) {
    $currentType = $settingResult->fetch_assoc()['setting_value'];
}

// 2. Fetch semesters
$result = $conn->query("SELECT * FROM semesters ORDER BY order_index, id");

$semesters = [];
$showAll = isset($_GET['all']) && $_GET['all'] === 'true';

if ($result) {
    while ($row = $result->fetch_assoc()) {
        if ($showAll) {
            $semesters[] = $row;
            continue;
        }

        // 3. Filter Logic
        if (preg_match('/(\d+)/', $row['name'], $matches)) {
            $num = intval($matches[1]);
            $isEven = ($num % 2 === 0);
            
            if ($currentType === 'pair' && $isEven) {
                $semesters[] = $row;
            } elseif ($currentType === 'impair' && !$isEven) {
                $semesters[] = $row;
            }
        } else {
            $semesters[] = $row;
        }
    }
}

echo json_encode($semesters);
?>
