<?php
// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
function isLoggedIn() {
    if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
        return true;
    }

    // Try auto-login with remember cookie
    if (isset($_COOKIE['remember_token'])) {
        require_once dirname(__FILE__) . '/../config/db_connect.php';
        global $conn;

        $cookie_data = explode(':', $_COOKIE['remember_token']);
        if (count($cookie_data) === 2) {
            $user_id = $cookie_data[0];
            $token = $cookie_data[1];

            $stmt = $conn->prepare("SELECT id, username, role, id_prof, remember_token FROM users WHERE id = ?");
            $stmt->bind_param('i', $user_id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 1) {
                $user = $result->fetch_assoc();
                // In a real app, use password_verify for token or hash it
                if ($user['remember_token'] && $token === $user['remember_token']) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['role'] = $user['role'];
                    $_SESSION['id_prof'] = $user['id_prof'];
                    return true;
                }
            }
        }
    }

    return false;
}

// Check if user has specific role
function hasRole($role) {
    return isset($_SESSION['role']) && $_SESSION['role'] === $role;
}

// Redirect if not logged in
function requireLogin() {
    if (!isLoggedIn()) {
        $current_path = $_SERVER['PHP_SELF'];
        $redirect_to = strpos($current_path, '/admin/') !== false ? '../login.php' : 'login.php';
        header('Location: ' . $redirect_to);
        exit();
    }
}

// Redirect if not specific role
function requireRole($role) {
    requireLogin();
    if (!hasRole($role)) {
        $current_path = $_SERVER['PHP_SELF'];
        $redirect_to = strpos($current_path, '/admin/') !== false ? '../login.php' : 'login.php';
        header('Location: ' . $redirect_to);
        exit();
    }
}

// Get current user data
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'role' => $_SESSION['role'],
        'id_prof' => $_SESSION['id_prof'] ?? null
    ];
}
?>
