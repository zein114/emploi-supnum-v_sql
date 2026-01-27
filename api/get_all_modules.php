<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json; charset=utf-8');

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

$subjects = $dbHandler->getSubjects();

// Convert to array format (code, name)
$modules = array_map(function($subject) {
    return [$subject['code'], $subject['name']];
}, $subjects);

echo json_encode($modules, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
