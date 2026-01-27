<?php
require './vendor/autoload.php';
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

// 2. Scan Tous_les_Emplois_du_Temps.xlsx for this professor
$timetableFile = "../modele/Tous_les_Emplois_du_Temps.xlsx";
if (!file_exists($timetableFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichier des emplois du temps introuvable']);
    exit;
}

try {
    $reader = IOFactory::createReaderForFile($timetableFile);
    $reader->setReadDataOnly(true);
    $spreadsheetTimetable = $reader->load($timetableFile);
    $sheets = $spreadsheetTimetable->getSheetNames();
    
    $classes = [];
    // $totalCount = 0;

    foreach ($sheets as $sheetName) {
        $sheet = $spreadsheetTimetable->getSheetByName($sheetName);
        $highestColumn = $sheet->getHighestColumn();
        $highestRow = $sheet->getHighestRow();
        
        // Skip header rows (Horaire, Lundi, etc.)
        $data = $sheet->rangeToArray('B3:' . $highestColumn . $highestRow);
        
        foreach ($data as $rowIndex => $row) {
            foreach ($row as $colIndex => $cellContent) {
                if (empty($cellContent)) continue;
                
                // Handle multiple sessions in one cell
                $sessions = explode(" /// ", $cellContent);
                
                foreach ($sessions as $sessionStr) {
                    if (stripos($sessionStr, "Prof: " . $profName) !== false || stripos($sessionStr, "Prof: " . $prof_id) !== false) {
                        // Inject SheetName (Group) into the string
                        // Format: [CODE] Subject\n(TYPE) - Details\n...
                        $lines = explode("\n", $sessionStr);
                        if (count($lines) > 1) {
                            // Append SheetName to the second line (Type/Group info)
                            // Example: (CM)  -->  (CM) - L1-G1
                            $lines[1] .= " - " . $sheetName;
                            $modifiedSessionStr = implode("\n", $lines);
                        } else {
                            $modifiedSessionStr = $sessionStr . "\n" . $sheetName;
                        }

                        // 3. Match the cell coordinates with Day and Time
                        if (isset($days[$colIndex]) && isset($times[$rowIndex])) {
                            $dayName = $days[$colIndex];
                            $timeRange = $times[$rowIndex];
                            $classes[] = [$modifiedSessionStr, $dayName, $timeRange];
                        }
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
