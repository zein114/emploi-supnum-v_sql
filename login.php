<?php
require_once 'config/db_connect.php';
require_once 'includes/session.php';

// Initialize error variable to prevent undefined variable warning
$error = '';

// Inline password error (keeps layout stable)
$password_error = '';

// Redirect if already logged in
if (isLoggedIn()) {
    if (hasRole('professor')) {
        header('Location: professor-dashboard.php');
    } elseif (hasRole('admin')) {
        header('Location: admin/dashboard.php');
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $remember = isset($_POST['remember']);

    if (empty($email) || empty($password)) {
        $error = 'Veuillez remplir tous les champs';
    } else {
        // Authenticate by email (with a fallback to username for compatibility)
        $stmt = $conn->prepare("SELECT id, username, password, role, id_prof FROM users WHERE (email = ? OR username = ?) AND role IN ('professor', 'admin')");
        $stmt->bind_param('ss', $email, $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();

            // Secure password check using password_verify
            if (password_verify($password, $user['password'])) {
                // Set session
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['id_prof'] = $user['id_prof'];

                // Handle Remember Me
                if ($remember) {
                    $token = bin2hex(random_bytes(32));
                    $update_stmt = $conn->prepare("UPDATE users SET remember_token = ? WHERE id = ?");
                    $update_stmt->bind_param('si', $token, $user['id']);
                    $update_stmt->execute();
                    $update_stmt->close();

                    // Set cookie for 30 days
                    setcookie('remember_token', $user['id'] . ':' . $token, time() + (86400 * 30), "/");
                }

                // Redirect based on role
                if ($user['role'] === 'professor') {
                    header('Location: professor-dashboard.php');
                } else {
                    header('Location: admin/dashboard.php');
                }
                exit();
            } else {
                $password_error = 'E-mail ou mot de passe invalide';
            }
        } else {
            $password_error = 'E-mail ou mot de passe invalide';
        }
        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion du personnel - Emploi du temps de l'université</title>
    <meta name="description" content="Portail de connexion pour les professeurs et les administrateurs">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/login.css">
    <link rel="icon" type="image/png" href="assets/logo-supnum.png">
    <script src="js/spinner.js"></script>
    <script>
        try {
            if (window.sessionStorage) {
                sessionStorage.removeItem('dashboard_last_anim');
            }
        } catch (e) {
        }
    </script>
</head>
<body class="login-body">
    
    <div class="login-container">
        <!-- Left Side: Form -->
        <div class="login-left">
            <!-- Logo -->
            <img src="assets/logo-supnum.png" alt="Logo SupNum" class="login-logo">
            
            <!-- Heading -->
            <h1 class="login-title">Heureux de vous revoir</h1>
            <p class="login-subtitle">Connectez-vous pour accéder à votre tableau de bord</p>

            <!-- Error Alert -->
            <?php if (!empty($error)): ?>
                <div class="alert alert-error slide-in" style="margin-bottom: 1.5rem;">
                    <svg style="width: 1em; height: 1em; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <!-- Login Form -->
            <form method="POST" action="" class="login-form">
                
                <div class="form-group">
                    <div class="input-with-icon">
                        <div class="input-icon">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="style=linear"><g id="email"><path id="vector" d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="#999" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path id="vector_2" d="M18.7698 7.7688L13.2228 12.0551C12.5025 12.6116 11.4973 12.6116 10.777 12.0551L5.22998 7.7688" stroke="#999" stroke-width="1.5" stroke-linecap="round"/></g></g></svg>
                        </div>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            class="login-input" 
                            placeholder="nom.prenom@exemple.com"
                            required
                            value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                        >
                    </div>
                </div>

                <div class="form-group">
                    <div class="input-with-icon">
                        <div class="input-icon">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div class="input-group">
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                class="login-input" 
                                placeholder="••••••••••••"
                                required
                            >
                            <div id="passwordToggle" class="password-toggle">
                                <!-- eye-show.svg content -->
                                <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg>
                            </div>
                        </div>
                    </div>
                    <div class="login-field-error" aria-live="polite">
                        <?= !empty($password_error) ? htmlspecialchars($password_error) : '' ?>
                    </div>
                </div>

                <div class="login-options">
                    <label class="remember-me">
                        <input type="checkbox" name="remember" style="display: none;">
                        <span class="checkbox-custom">
                            <svg style="width: 1em; height: 1em; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                        </span>
                        Se souvenir de moi
                    </label>
                </div>

                <button type="submit" id="loginBtn" class="btn-login">
                    Se connecter
                </button>
            </form>
        </div>

        <!-- Right Side: Image -->
        <div class="login-right">
            <div class="login-image-container">
                <img src="assets/supnum.jpg" alt="Illustration de connexion" class="login-image">
            </div>
        </div>
    </div>

    <script>
        // Form Loading State
        document.querySelector('.login-form').addEventListener('submit', function(e) {
            const btn = document.getElementById('loginBtn');
            Spinner.show(btn);
        });

        // Password Toggle Logic
        const passwordInput = document.getElementById('password');
        const passwordToggle = document.getElementById('passwordToggle');
        
        const showIcon = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg>
        `;
        
        const hideIcon = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.4955 7.44088C3.54724 8.11787 2.77843 8.84176 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C13.2958 19 14.4799 18.8108 15.5523 18.4977L13.8895 16.8349C13.2936 16.9409 12.6638 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366C4.23754 10.2097 4.99526 9.50784 5.93214 8.87753L4.4955 7.44088Z" fill="#999"/><path d="M8.53299 11.4784C8.50756 11.6486 8.49439 11.8227 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5C12.1716 15.5 12.3458 15.4868 12.516 15.4614L8.53299 11.4784Z" fill="#999"/><path d="M15.4661 12.4471L11.5473 8.52829C11.6937 8.50962 11.8429 8.5 11.9944 8.5C13.9274 8.5 15.4944 10.067 15.4944 12C15.4944 12.1515 15.4848 12.3007 15.4661 12.4471Z" fill="#999"/><path d="M18.1118 15.0928C19.0284 14.4702 19.7715 13.7805 20.3413 13.1634C20.9657 12.4872 20.9657 11.5128 20.3413 10.8366C18.8117 9.18002 16.0331 7 12 7C11.3594 7 10.7505 7.05499 10.1732 7.15415L8.50483 5.48582C9.5621 5.1826 10.7272 5 12 5C16.8112 5 20.0833 7.60905 21.8107 9.47978C23.1426 10.9222 23.1426 13.0778 21.8107 14.5202C21.2305 15.1486 20.476 15.8603 19.5474 16.5284L18.1118 15.0928Z" fill="#999"/><path d="M2.00789 3.42207C1.61736 3.03155 1.61736 2.39838 2.00789 2.00786C2.39841 1.61733 3.03158 1.61733 3.4221 2.00786L22.0004 20.5862C22.391 20.9767 22.391 21.6099 22.0004 22.0004C21.6099 22.3909 20.9767 22.3909 20.5862 22.0004L2.00789 3.42207Z" fill="#999"/></svg>
        `;

        passwordToggle.addEventListener('click', function() {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordToggle.innerHTML = isPassword ? hideIcon : showIcon;
        });
    </script>
</body>
</html>

