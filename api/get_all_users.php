<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('admin');

$result = $conn->query("SELECT id, username, email, role, created_at, id_prof FROM users ORDER BY created_at DESC");

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
?>
