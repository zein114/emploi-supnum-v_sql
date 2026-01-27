<?php
require_once '../config/db_connect.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT * FROM days ORDER BY order_index, id");

$days = [];
while ($row = $result->fetch_assoc()) {
    $days[] = $row;
}

echo json_encode($days);
?>
