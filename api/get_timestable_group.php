<?php
require_once '../config/db_connect.php';
require '../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$archive = isset($_GET['archive']) ? $_GET['archive'] : null;
$sheetName = isset($_GET['sheet_name']) ? $_GET['sheet_name'] : '';

if (empty($sheetName)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Sheet name is required']);
    exit;
}

if ($archive) {
    // -------------------------------------------------------------
    // ARCHIVE LOGIC: Fetch from historical Excel files
    // -------------------------------------------------------------
    $file = "../model/archives_timetables/" . basename($archive);
    
    if (!file_exists($file)) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'File not found']);
        exit;
    }

    $reader = IOFactory::createReaderForFile($file);
    $reader->setReadDataOnly(true);
    $reader->setLoadSheetsOnly([$sheetName]);
    $spreadsheet = null;

    try {
        $spreadsheet = $reader->load($file);
    } catch (Exception $e) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([]);
        exit;
    }

    $sheet = $spreadsheet->getSheetByName($sheetName);

    if (!$sheet) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([]);
        exit;
    }

    $highestRow = $sheet->getHighestRow();
    $highestColumn = $sheet->getHighestColumn();

    $timesTable = $sheet->rangeToArray('B3:' . $highestColumn . $highestRow, null, true, false);

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($timesTable, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    // -------------------------------------------------------------
    // CURRENT LOGIC: Fetch directly from database `timetables` table
    // -------------------------------------------------------------
    
    // 1. Fetch Days to form columns
    $daysResult = $conn->query("SELECT name FROM days ORDER BY order_index, id");
    $days = [];
    while ($row = $daysResult->fetch_assoc()) {
        $days[] = $row['name'];
    }

    // 2. Fetch Time Slots to form rows
    $slotsResult = $conn->query("SELECT time_range FROM time_slots ORDER BY id");
    $slots = [];
    while ($row = $slotsResult->fetch_assoc()) {
        $slots[] = $row['time_range'];
    }

    // 3. Fetch from DB
    $stmt = $conn->prepare("SELECT `day`, `time_slot`, `session_info` FROM `timetables` WHERE `group_name` = ?");
    $stmt->bind_param("s", $sheetName);
    $stmt->execute();
    $result = $stmt->get_result();

    $dbData = [];
    while ($row = $result->fetch_assoc()) {
        $dbData[$row['time_slot']][$row['day']] = $row['session_info'];
    }

    // 4. Construct the 2D array equivalent to Excel's rangeToArray
    $timesTable = [];
    foreach ($slots as $slot) {
        $rowArray = [];
        foreach ($days as $day) {
            $rowArray[] = isset($dbData[$slot][$day]) ? $dbData[$slot][$day] : null;
        }
        $timesTable[] = $rowArray;
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($timesTable, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
