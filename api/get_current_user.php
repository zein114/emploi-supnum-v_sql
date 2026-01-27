<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('admin');

$user = getCurrentUser();

if ($user) {
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'error' => 'Utilisateur introuvable']);
}
?>
