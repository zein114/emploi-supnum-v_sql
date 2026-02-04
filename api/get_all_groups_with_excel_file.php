<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Get all groups (both principale and TD)
$result = $conn->query("
    SELECT id, name, type
    FROM `groups`
    ORDER BY type DESC, id
");

$groups = [];
while ($row = $result->fetch_assoc()) {
    $groups[] = [$row['id'], $row['name'], $row['type']];
}

echo json_encode($groups);
?>
