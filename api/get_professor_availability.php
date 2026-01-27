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
    if (isset($user['id'])) {
        $stmt = $conn->prepare("SELECT id_prof FROM users WHERE id = ?");
        $stmt->bind_param("i", $user['id']);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $prof_index = $row['id_prof'];
            $_SESSION['id_prof'] = $prof_index;
        }
    }
}

if ($prof_index === null) {
    echo json_encode(['error' => 'Indice de professeur introuvable']);
    exit;
}

try {
    require_once 'DatabaseHandler.php';
    $dbHandler = new DatabaseHandler($conn);
    
    $availability = $dbHandler->getAvailability($prof_index);
    
    echo json_encode($availability);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Échec du chargement des disponibilités : ' . $e->getMessage()]);
}
?>
