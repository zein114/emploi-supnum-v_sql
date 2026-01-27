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
    <title>Gestion des professeurs - Emploi du temps de l'université</title>
    <meta name="description" content="Gérer les professeurs et leurs attributions">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/professors.css">
    <link rel="icon" type="image/png" href="../assets/logo-supnum.png">
</head>
<body>
    <div class="admin-layout">
        <?php include '../includes/admin-sidebar.php'; ?>

        <main class="admin-content">
            <div class="admin-content-inner">
                <!-- Page Header -->
                <div class="page-header">
                    <h1>
                        Gestion des professeurs
                    </h1>
                    <p>Gérez les professeurs et leurs attributions de cours</p>
                </div>

                <!-- Professors Table -->
                <div class="glass-card">
                    <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Liste des professeurs</h3>
                        <input type="text" id="searchInput" placeholder="Rechercher un professeur..." class="search-input">
                    </div>

                    <div class="table-container" style="overflow-x: auto; background: transparent; border: none;">
                        <table class="table" id="professorsTable" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th class="col-id">ID</th>
                                    <th class="col-name">Nom</th>
                                    <th class="col-assignments">Attributions</th>
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

    <!-- Add Professor Modal -->
    <!-- Modals replaced by js/professors.js -->

    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/dropdown.js"></script>
    <script src="../js/spinner.js"></script>
    <script src="../js/professors.js"></script>
</body>
</html>
