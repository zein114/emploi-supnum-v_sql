<?php
require_once '../config/db_connect.php';
require '../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$baseFile = "../modele/Tous_les_Emplois_du_Temps.xlsx";
$archive = isset($_GET['archive']) ? $_GET['archive'] : null;

if ($archive) {
    $file = "../modele/archives_timetables/" . basename($archive);
} else {
    $file = $baseFile;
}

if (!file_exists($file)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'File not found']);
    exit;
}

$sheetName = $_GET['sheet_name'];

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

// The Excel generator (excel_utils.py) already merges 'specialite' and 'langues && ppp' 
// into the principal group's sheet, so we just return this data.
$timesTable = $sheet->rangeToArray('B3:' . $highestColumn . $highestRow, null, true, false);

header('Content-Type: application/json; charset=utf-8');
echo json_encode($timesTable, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
