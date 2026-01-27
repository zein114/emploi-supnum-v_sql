<?php
require_once '../config/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT * FROM time_slots ORDER BY id");

$slots = [];
while ($row = $result->fetch_assoc()) {
    $slots[] = $row;
}

echo json_encode($slots);
?>
