<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

error_reporting(0);
header('Content-Type: application/json');

requireRole('professor');

$data = json_decode(file_get_contents('php://input'), true);
$slotIndex = $data['index'] ?? null;

if ($slotIndex === null) {
    echo json_encode(['success' => false, 'error' => 'Indice de créneau manquant']);
    exit;
}

$user = getCurrentUser();
// We need the professor ID as mapped to the Excel file (id_prof in users table)
// Note: id_prof is the index in the "Professeurs" list (0-based)
$prof_index = $user['id_prof'] ?? null;

// Fallback: fetch from DB if missing in session
if ($prof_index === null) {
    $stmt = $conn->prepare("SELECT id_prof FROM users WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $prof_index = $row['id_prof'];
        // Update session
        $_SESSION['id_prof'] = $prof_index;
    }
}

// Ensure strictly integer/numeric to avoid empty string issues
if (!isset($prof_index) || $prof_index === '') {
     echo json_encode(['success' => false, 'error' => "Indice de professeur introuvable pour l'utilisateur"]);
     exit;
}

try {
    require_once 'DatabaseHandler.php';
    $dbHandler = new DatabaseHandler($conn);
    
    $result = $dbHandler->toggleAvailability($prof_index, (int)$slotIndex);
    
    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => "Échec de la mise à jour des disponibilités : " . $e->getMessage()]);
}
?>
