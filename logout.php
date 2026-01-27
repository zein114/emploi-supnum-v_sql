<?php
require_once 'includes/session.php';

require_once 'config/db_connect.php';

// Clear remember token in database if user was logged in
if (isset($_SESSION['user_id'])) {
    $stmt = $conn->prepare("UPDATE users SET remember_token = NULL WHERE id = ?");
    $stmt->bind_param('i', $_SESSION['user_id']);
    $stmt->execute();
    $stmt->close();
}

// Destroy session
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 42000, '/');
}
session_destroy();

// Clear remember cookie
if (isset($_COOKIE['remember_token'])) {
    setcookie('remember_token', '', time() - 3600, '/');
}

// Redirect to login
header('Location: login.php');
exit();
?>
