<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('admin');

$input = json_decode(file_get_contents('php://input'), true);

$username = $input['username'] ?? null;
$email = $input['email'] ?? null;
$password = $input['password'] ?? null;
$role = $input['role'] ?? null;

if (!$username || !$email || !$role) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit();
}

$allowed_roles = ['admin', 'professor'];
if (!in_array($role, $allowed_roles, true)) {
    echo json_encode(['success' => false, 'error' => 'Rôle invalide']);
    exit();
}

// Check if email exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param('s', $email);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(['success' => false, 'error' => "Cette adresse e-mail est déjà utilisée"]);
    exit();
}

// If password is empty, set to default "SupNum"
if (empty($password)) {
    $password = 'SupNum';
}

// Hash password
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Prepare database handler if role is professor
require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);
$forceId = null;

if ($role === 'professor') {
    try {
        $forceId = $dbHandler->getNextProfessorId();
    } catch (Exception $e) {
        error_log("Failed to get next professor ID: " . $e->getMessage());
    }
}

// Insert user
if ($forceId !== null) {
    // Check if this ID is already taken in DB (unlikely but safe)
    $check = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $check->bind_param('i', $forceId);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        // Find next available ID in DB if conflict
        $res = $conn->query("SELECT MAX(id) as max_id FROM users");
        $dbMax = $res->fetch_assoc()['max_id'] ?? 0;
        $forceId = max($forceId, $dbMax + 1);
    }
    
    $stmt = $conn->prepare("INSERT INTO users (id, username, email, password, role, id_prof) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('issssi', $forceId, $username, $email, $hashed_password, $role, $forceId);
} else {
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssss', $username, $email, $hashed_password, $role);
}

if ($stmt->execute()) {
    $new_user_id = $forceId !== null ? $forceId : $conn->insert_id;
    
    // If professor, sync with database
    if ($role === 'professor') {
        try {
            $dbHandler->syncUser($new_user_id, $username, $new_user_id);
        } catch (Exception $e) {
            error_log("Failed to sync new professor to database: " . $e->getMessage());
        }
    }

    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => "Échec de l'ajout de l'utilisateur : " . $conn->error]);
}
?>
