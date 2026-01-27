<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

error_reporting(0);
header('Content-Type: application/json');

requireRole('professor');

$user = getCurrentUser();
$prof_index = $user['id_prof'] ?? null;

// Fallback: fetch from DB if missing in session
if ($prof_index === null) {
    $stmt = $conn->prepare("SELECT id_prof FROM users WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $prof_index = $row['id_prof'];
        // Update session to avoid future queries
        $_SESSION['id_prof'] = $prof_index;
    }
}

if ($prof_index === null) {
    echo json_encode(['success' => false, 'error' => "Indice de professeur manquant pour l'utilisateur"]);
    exit;
}

try {
    // Use DatabaseHandler to initialize and reset
    require_once 'DatabaseHandler.php';
    $dbHandler = new DatabaseHandler($conn);
    
    // 1. Init timetables (ensures structure exists)
    $initResult = $dbHandler->initTimetables();
    
    // 2. Reset availability for this professor
    $resetResult = $dbHandler->resetAvailability($prof_index);
    
    echo json_encode([
        'success' => true,
        'message' => 'Les emplois du temps ont été initialisés et réinitialisés avec succès.'
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => "Échec de l'initialisation : " . $e->getMessage()]);
}
?>
