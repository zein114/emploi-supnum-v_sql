<?php
require '../vendor/autoload.php';
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('professor');
use PhpOffice\PhpSpreadsheet\IOFactory;

header('Content-Type: application/json; charset=utf-8');

$user = getCurrentUser();
$id_user = $user['id'];

$result = $conn->query("SELECT id_prof, username FROM users WHERE id = $id_user");
$userData = $result->fetch_assoc();
$prof_id = $userData['id_prof'];
$username = $userData['username'];

// Fetch ALL days to maintain column index mapping (B=Lundi, C=Mardi...)
$daysResult = $conn->query("SELECT name FROM days ORDER BY order_index");
$days = [];
while ($row = $daysResult->fetch_assoc()) {
    $days[] = $row['name'];
}

// Fetch ALL time slots to maintain row index mapping
$timesResult = $conn->query("SELECT time_range FROM time_slots ORDER BY id");
$times = [];
while ($row = $timesResult->fetch_assoc()) {
    $times[] = $row['time_range'];
}

if (!$prof_id) {
    // If no id_prof, the professor column in users table is null
    echo json_encode(['success' => false, 'message' => "Vous n'avez pas d'identifiant professeur associé à votre compte. Veuillez contacter l'administrateur."]);
    exit;
}

// 1. Map Prof ID to Name from database
$stmt = $conn->prepare("SELECT name FROM professors WHERE id = ?");
$stmt->bind_param('i', $prof_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $profName = trim($row['name']);
} else {
    echo json_encode(['success' => false, 'message' => 'Professeur introuvable dans la base de données']);
    exit;
}

// 2. Query from Excel file
try {
    $file = "../model/Tous_les_Emplois_du_Temps.xlsx";
    if (!file_exists($file)) {
        echo json_encode(['success' => true, 'classes' => []]);
        exit;
    }

    $reader = IOFactory::createReaderForFile($file);
    $reader->setReadDataOnly(true);
    $spreadsheet = $reader->load($file);
    $classes = [];
    
    $profNameSearch = "Prof: " . $profName;
    $profIdSearch = "Prof: " . $prof_id;

    foreach ($spreadsheet->getAllSheets() as $sheet) {
        $sheetName = $sheet->getTitle();
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        
        // Read the data (A2:H8 or whatever the range is)
        // Days are in row 2, Time slots are in column B starting at row 3?
        // Let's use the columns/rows dynamically
        
        // Map columns to day names
        $colToDay = [];
        for ($col = 2; $col <= \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn); $col++) {
            $dayVal = $sheet->getCellByColumnAndRow($col, 2)->getValue();
            if ($dayVal) {
                $colToDay[$col] = $dayVal;
            }
        }
        
        // Iterate through rows (Time slots)
        for ($row = 3; $row <= $highestRow; $row++) {
            $timeRange = $sheet->getCellByColumnAndRow(1, $row)->getValue();
            if (!$timeRange) continue;
            
            foreach ($colToDay as $col => $dayName) {
                $cellContent = $sheet->getCellByColumnAndRow($col, $row)->getValue();
                if (!$cellContent || $cellContent === 'x') continue;
                
                // Handle multiple sessions in one cell
                $sessions = explode(" /// ", $cellContent);
                
                foreach ($sessions as $sessionStr) {
                    if (stripos($sessionStr, $profNameSearch) !== false || stripos($sessionStr, $profIdSearch) !== false) {
                        $lines = explode("\n", $sessionStr);
                        if (count($lines) > 1) {
                            $lines[1] .= " - " . $sheetName;
                            $modifiedSessionStr = implode("\n", $lines);
                        } else {
                            $modifiedSessionStr = $sessionStr . "\n" . $sheetName;
                        }
                        
                        $classes[] = [$modifiedSessionStr, $dayName, $timeRange];
                    }
                }
            }
        }
    }

    echo json_encode(['success' => true, 'classes' => $classes]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
}
?>
