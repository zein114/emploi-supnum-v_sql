<?php
require '../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$file = "../modele/Tous_les_Emplois_du_Temps.xlsx";
$sheetName = $_GET['sheet_name'];

$reader = IOFactory::createReaderForFile($file);
$reader->setReadDataOnly(true);
$reader->setLoadSheetsOnly([$sheetName]);
$spreadsheet = $reader->load($file);

$sheet = $spreadsheet->getSheetByName($sheetName);

if (!$sheet) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([]);
    exit;
}

$highestRow = $sheet->getHighestRow();
$highestColumn = $sheet->getHighestColumn();

$timesTables = $sheet->rangeToArray('B3:' . $highestColumn . $highestRow, null, true, false);


header('Content-Type: application/json; charset=utf-8');
echo json_encode($timesTables, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
