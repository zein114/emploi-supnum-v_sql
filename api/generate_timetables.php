<?php 
require_once '../config/db_connect.php';
require_once '../includes/session.php';
requireRole('admin');

try {
        // Fetch Days and Slots for configuration
        $days_result = $conn->query("SELECT name, is_active FROM days ORDER BY order_index, id");
        $slots_result = $conn->query("SELECT time_range, is_active FROM time_slots ORDER BY id");
        
        $days = [];
        if ($days_result) {
            while ($row = $days_result->fetch_assoc()) {
                $days[] = [
                    'name' => $row['name'],
                    'is_active' => (int)$row['is_active']
                ];
            }
        }
        
        $slots = [];
        if ($slots_result) {
            while ($row = $slots_result->fetch_assoc()) {
                $slots[] = [
                    'time_range' => $row['time_range'],
                    'is_active' => (int)$row['is_active']
                ];
            }
        }
        
        // Defaults if empty
        if (empty($days)) $days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        if (empty($slots)) $slots = ['08:00-9:30', '9:45-11:15', '11:30-13:00', '15:00-16:30', '17:00-18:30'];
        
        $config = [
            'days' => $days,
            'time_slots' => $slots
        ];
        
        // Write config file
        file_put_contents("../modele/generation_config.json", json_encode($config));

        $output_dir = "../modele/";
        // Invoke optimizer - it will read the config file
        exec("python ../modele/optimizer.py \"$output_dir\"", $output, $status);

    $output = json_encode($output);
    if ($status !== 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Échec de la génération des emplois du temps : " . $output
        ]);
        exit;
    }
    echo json_encode([
        "status" => "success",
        "message" => "Les emplois du temps ont été générés avec succès"
    ]);
}
catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

?>