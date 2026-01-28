<?php 
require_once '../config/db_connect.php';
require_once '../includes/session.php';
requireRole('admin');

header('Content-Type: application/json');

try {
    $unscheduled_file = '../modele/unscheduled_classes.json';
    
    // Check if file exists
    if (!file_exists($unscheduled_file)) {
        echo json_encode([]);
        exit;
    }
    
    // Read and return the JSON file
    $content = file_get_contents($unscheduled_file);
    $unscheduled_classes = json_decode($content, true);
    
    if ($unscheduled_classes === null) {
        echo json_encode([]);
        exit;
    }
    
    echo json_encode($unscheduled_classes);
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
