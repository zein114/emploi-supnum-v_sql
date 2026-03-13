<?php
require_once '../includes/session.php';
require_once '../config/db_connect.php';

requireRole('admin');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$prof_id = $input['prof_id'] ?? null;
$group_id = $input['group_id'] ?? null;
$module_id = $input['module_id'] ?? null;
$assignment_type = $input['assignment_type'] ?? null;

if (!$prof_id || !$group_id || !$module_id || !$assignment_type) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit();
}

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

// Check for existing assignment
$existingAssignments = $dbHandler->getAssignments();

// If principal group and TD/TP, we need to check sub-groups
$stmt = $conn->prepare("SELECT type FROM `groups` WHERE id = ?");
$stmt->bind_param('i', $group_id);
$stmt->execute();
$groupType = $stmt->get_result()->fetch_assoc()['type'] ?? '';

$targetGroupIds = [(int)$group_id];
if (strtolower($groupType) === 'principale' && ($assignment_type === 'TD' || $assignment_type === 'TP')) {
    // Fetch all sub-groups of type TD or TP (flexible search)
    $subGroups = $dbHandler->getSubGroups((int)$group_id); 
    // Filter manually for TD or TP to be safe, although we know only TD exists for now
    $filteredSubGroups = array_filter($subGroups, function($sg) {
        $t = strtoupper($sg['type']);
        return $t === 'TD' || $t === 'TP';
    });
    if (!empty($filteredSubGroups)) {
        $targetGroupIds = array_column($filteredSubGroups, 'id');
    }
}

foreach ($existingAssignments as $assignment) {
    if ($assignment['subject_id'] == (int)$module_id && 
        $assignment['type'] == $assignment_type && 
        in_array($assignment['group_id'], $targetGroupIds)) {
        
        $existingProfName = $assignment['professor_name'] ?? $assignment['professor_id'];
        $actualGroupName = $assignment['group_name'] ?? $assignment['group_id'];
        echo json_encode([
            'success' => false,
            'error' => "Le professeur $existingProfName est déjà affecté à ce module, au groupe $actualGroupName et ce type d'attribution."
        ]);
        exit();
    }
}

// Add assignment
$result = $dbHandler->addAssignment((int)$prof_id, (int)$module_id, (int)$group_id, $assignment_type);

echo json_encode($result);
?>
