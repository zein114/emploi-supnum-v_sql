<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

// Ensure only admins can access
requireRole('admin');

// Disable error display to prevent HTML warnings from corrupting JSON output
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

// Get JSON Input
$inputData = json_decode(file_get_contents('php://input'), true);

if (!$inputData || !is_array($inputData)) {
    http_response_code(400);
    echo json_encode(['error' => 'Entrée invalide']);
    exit;
}

// Support both old flat array and new structured object
$input = isset($inputData['updates']) ? $inputData['updates'] : $inputData;
$isExclusionSave = isset($inputData['action']) && $inputData['action'] === 'save_exclusions';
$targetModule = isset($inputData['module_code']) ? $inputData['module_code'] : null;

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

try {
    $updatesCount = 0;
    
    // 1. Prepare statements ONCE outside the loop (Crucial for performance)
    $stmtSubject = $conn->prepare("SELECT id FROM subjects WHERE code = ?");
    $stmtGroup = $conn->prepare("SELECT id FROM `groups` WHERE code = ?");
    $stmtUpsert = $conn->prepare("
        INSERT INTO course_workloads (subject_id, group_id, cm_hours, td_hours, tp_hours)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            cm_hours = VALUES(cm_hours), 
            td_hours = VALUES(td_hours), 
            tp_hours = VALUES(tp_hours)
    ");

    // Track which (code, group) are processed
    $processedKeys = [];
    $modulesInRequest = [];
    
    foreach ($input as $item) {
        $code = trim($item['code']);
        $groupCode = trim($item['code_groupe'] ?? '');
        $key = $code . '|' . $groupCode;
        $processedKeys[] = $key;
        
        $cm = isset($item['cm']) ? (int)$item['cm'] : 0;
        $td = isset($item['td']) ? (int)$item['td'] : 0;
        $tp = isset($item['tp']) ? (int)$item['tp'] : 0;
        
        // A. Get subject_id
        $stmtSubject->bind_param('s', $code);
        $stmtSubject->execute();
        $res = $stmtSubject->get_result();
        $subjectId = ($row = $res->fetch_assoc()) ? $row['id'] : null;
        
        if (!$subjectId) continue;
        
        // B. Get group_id
        $groupId = null;
        if (!empty($groupCode)) {
            $stmtGroup->bind_param('s', $groupCode);
            $stmtGroup->execute();
            $res = $stmtGroup->get_result();
            if ($row = $res->fetch_assoc()) {
                $groupId = $row['id'];
            }
            $modulesInRequest[] = $code;
        }
        
        // C. Upsert
        $stmtUpsert->bind_param('iiiii', $subjectId, $groupId, $cm, $td, $tp);
        if ($stmtUpsert->execute()) {
            $updatesCount++;
        }
    }
    
    // 2. Handle deletions (Exclusions removed from modal)
    if ($isExclusionSave && $targetModule) {
        $modulesInRequest = [$targetModule];
    }
    
    $modulesInRequest = array_unique($modulesInRequest);
    
    if (!empty($modulesInRequest)) {
        $processedKeysSet = array_flip($processedKeys);
        $stmtDelCheck = $conn->prepare("
            SELECT cw.id, g.code as group_code
            FROM course_workloads cw
            JOIN `groups` g ON cw.group_id = g.id
            JOIN subjects s ON cw.subject_id = s.id
            WHERE s.code = ? AND cw.group_id IS NOT NULL
        ");
        $stmtDelete = $conn->prepare("DELETE FROM course_workloads WHERE id = ?");
        
        foreach ($modulesInRequest as $moduleCode) {
            $stmtDelCheck->bind_param('s', $moduleCode);
            $stmtDelCheck->execute();
            $existingResult = $stmtDelCheck->get_result();
            
            while ($existing = $existingResult->fetch_assoc()) {
                $existingKey = $moduleCode . '|' . $existing['group_code'];
                if (!isset($processedKeysSet[$existingKey])) {
                    $stmtDelete->bind_param('i', $existing['id']);
                    $stmtDelete->execute();
                    $updatesCount++;
                }
            }
        }
    }
    
    $msg = "Mise à jour de $updatesCount ligne(s) effectuée.";
    
    echo json_encode(['success' => true, 'message' => $msg]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la mise à jour de la charge hebdomadaire : ' . $e->getMessage()]);
}
?>