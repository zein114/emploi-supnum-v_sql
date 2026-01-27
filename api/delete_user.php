<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('admin');

$input = json_decode(file_get_contents('php://input'), true);

$user_id = $input['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(['success' => false, 'error' => "L'identifiant utilisateur est requis"]);
    exit();
}

if ($user_id == getCurrentUser()['id']) {
    echo json_encode(['success' => false, 'error' => 'Vous ne pouvez pas supprimer votre propre compte']);
    exit();
}

$stmt = $conn->prepare("SELECT role, id_prof FROM users WHERE id = ?");
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Utilisateur introuvable']);
    exit();
}

$user = $result->fetch_assoc();
$role = $user['role'];
$id_prof = $user['id_prof'];

if ($role === 'professor' && $id_prof !== null) {
    try {
        require_once 'DatabaseHandler.php';
        $dbHandler = new DatabaseHandler($conn);
        $dbHandler->removeProfessor($id_prof);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Échec de la mise à jour de la base de données : ' . $e->getMessage()]);
        exit();
    }
}

$stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
$stmt->bind_param('i', $user_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => "Échec de la suppression de l'utilisateur"]);
}
?>
