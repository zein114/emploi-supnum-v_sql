<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('professor');

$user = getCurrentUser();
$input = json_decode(file_get_contents('php://input'), true);

$old_password = $input['old_password'] ?? null;
$new_password = $input['new_password'] ?? null;

if (!$old_password || !$new_password) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit();
}

// Get current password from database
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param('i', $user['id']);
$stmt->execute();
$result = $stmt->get_result();
$current_user = $result->fetch_assoc();

if (!$current_user) {
    echo json_encode(['success' => false, 'error' => 'Utilisateur introuvable']);
    exit();
}

// Check if old password matches
if ($current_user['password'] !== $old_password) {
    echo json_encode(['success' => false, 'error' => 'Le mot de passe actuel est incorrect']);
    exit();
}

// Update password
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->bind_param('si', $new_password, $user['id']);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Échec de la mise à jour du mot de passe']);
}
?>
