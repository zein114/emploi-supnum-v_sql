<?php
$config_file = __DIR__ . "/../modele/generation_config.json";
if (file_exists($config_file)) {
    header('Content-Type: application/json; charset=utf-8');
    echo file_get_contents($config_file);
} else {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Config file not found']);
}
?>
