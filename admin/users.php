<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestion des utilisateurs - Emploi du temps de l'université</title>
    <meta name="description" content="Gérer les utilisateurs du système">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/users.css">
    <link rel="icon" type="image/png" href="../assets/logo-supnum.png">
    <script src="../js/theme-switcher.js"></script>
</head>
<body>
    <div class="admin-layout">
        <?php include '../includes/admin-sidebar.php'; ?>

        <main class="admin-content">
            <div class="admin-content-inner">
                <!-- Page Header -->
                <div class="page-header">
                    <h1>
                        Gestion des utilisateurs
                    </h1>
                    <p>Gérez l'ensemble des utilisateurs du système et leurs rôles</p>
                </div>

                <!-- Users Table -->
                <div class="glass-card">
                    <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Tous les utilisateurs</h3>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <input type="text" id="searchInput" placeholder="Rechercher un utilisateur..." class="search-input">
                            <button class="btn btn-primary" onclick="openAddUserModal()" style="white-space: nowrap; flex-shrink: 0;">
                                <span>Ajouter un utilisateur</span>
                            </button>
                        </div>
                    </div>

                    <div class="table-container" style="overflow-x: auto; background: transparent; border: none;">
                        <table class="table" id="usersTable" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th class="col-id">ID</th>
                                    <th class="col-username">Nom d'utilisateur</th>
                                    <th class="col-email">Email</th>
                                    <th class="col-role">Rôle</th>
                                    <th class="col-created">Créé le</th>
                                    <th class="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Will be populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add User Modal -->
    <!-- Add User Modal replaced by js/users.js -->

    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/dropdown.js"></script>
    <script src="../js/spinner.js"></script>
    <script src="../js/users.js"></script>
</body>
</html>
