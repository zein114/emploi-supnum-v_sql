<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

header('Content-Type: application/json');

requireRole('admin');

$input = json_decode(file_get_contents('php://input'), true);

$user_id = $input['user_id'] ?? null;
$username = $input['username'] ?? null;
$email = $input['email'] ?? null;
$password = $input['password'] ?? null;
$role = $input['role'] ?? null;
$original_role = $input['original_role'] ?? null;
$original_id_prof = $input['original_id_prof'] ?? null;
$original_username = $input['original_username'] ?? null;

if (!$user_id || !$username || !$email || !$role) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit();
}

$allowed_roles = ['admin', 'professor'];
if (!in_array($role, $allowed_roles, true)) {
    echo json_encode(['success' => false, 'error' => 'Rôle invalide']);
    exit();
}

// Check if email exists (excluding current user)
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
$stmt->bind_param('si', $email, $user_id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(['success' => false, 'error' => "Cette adresse e-mail est déjà utilisée"]);
    exit();
}

// Helper function to extract JSON from Python output
function extractJSON($output) {
    // Find the last line that looks like JSON
    $lines = array_filter(array_map('trim', $output));
    foreach (array_reverse($lines) as $line) {
        if (strpos($line, '{') === 0) {
            return json_decode($line, true);
        }
    }
    return null;
}

// Handle role changes
$new_id_prof = $original_id_prof;

require_once 'DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);

try {
    // Case 1: Admin → Professor (need to add to database and get new code)
    if ($original_role === 'admin' && $role === 'professor') {
        $result = $dbHandler->syncUser($user_id, $username);
        if ($result['success'] && isset($result['id_prof'])) {
            $new_id_prof = $result['id_prof'];
        } else {
            throw new Exception($result['error'] ?? 'Échec de l\'ajout du professeur dans la base de données');
        }
    }

    // Case 2: Professor → Admin (need to remove from database and set id_prof to NULL)
    if ($original_role === 'professor' && $role === 'admin' && $original_id_prof) {
        $result = $dbHandler->removeProfessor($original_id_prof);
        if (!$result['success']) {
            throw new Exception($result['error'] ?? 'Échec de la suppression du professeur dans la base de données');
        }
        $new_id_prof = null;
    }

    // Case 3: Professor username changed (update name in database)
    if ($role === 'professor' && $original_role === 'professor' && $original_id_prof && $username !== $original_username) {
        $result = $dbHandler->updateProfessorName($original_id_prof, $username);
        if (!$result['success']) {
            throw new Exception($result['error'] ?? 'Échec de la mise à jour du nom du professeur');
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit();
}

// Update user - build query based on what needs to be updated
$updates = [];
$types = '';
$values = [];

$updates[] = "username = ?";
$types .= 's';
$values[] = $username;

$updates[] = "email = ?";
$types .= 's';
$values[] = $email;

if (!empty($password)) {
    $updates[] = "password = ?";
    $types .= 's';
    $values[] = password_hash($password, PASSWORD_DEFAULT);
}

$updates[] = "role = ?";
$types .= 's';
$values[] = $role;

// Update id_prof if role changed
if ($original_role !== $role) {
    if ($new_id_prof === null) {
        $updates[] = "id_prof = NULL";
    } else {
        $updates[] = "id_prof = ?";
        $types .= 'i';
        $values[] = $new_id_prof;
    }
}

$values[] = $user_id;
$types .= 'i';

$sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => "Échec de la mise à jour de l'utilisateur"]);
}
?>
