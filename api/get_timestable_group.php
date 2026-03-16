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
    // CURRENT LOGIC: Read directly from the current Excel file
    // -------------------------------------------------------------
    $file = "../model/Tous_les_Emplois_du_Temps.xlsx";

    if (!file_exists($file)) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([]);
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

    $highestRow    = $sheet->getHighestRow();
    $highestColumn = $sheet->getHighestColumn();

    $timesTable = $sheet->rangeToArray('B3:' . $highestColumn . $highestRow, null, true, false);

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($timesTable, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
