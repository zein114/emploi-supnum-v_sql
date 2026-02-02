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
    <title>Outil de charge hebdomadaire - Admin</title>
    <meta name="description" content="Gérer la charge hebdomadaire des modules">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/admin-dashboard.css">
    <link rel="stylesheet" href="../css/weekly_workload.css">
    <link rel="icon" type="image/png" href="../assets/logo-supnum.png">
    <script src="../js/theme-switcher.js"></script>
</head>
<body>
    <div class="admin-layout">
        <?php include '../includes/admin-sidebar.php'; ?>

        <main class="admin-content">
            <div class="admin-content-inner">
                <!-- Page Header -->
                <div class="page-header" style="display:flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h1>
                            Charge hebdomadaire
                        </h1>
                        <p>Gérez la charge hebdomadaire de l'ensemble des modules.</p>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button id="saveWorkloadBtn" class="btn btn-primary">
                            Enregistrer les modifications
                        </button>
                    </div>
                </div>

                <!-- Main Content Card -->
                <div class="glass-card">
                    <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <h3 class="text-lg font-semibold" style="margin: 0; flex-grow: 1;">Charges par module</h3>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <div class="dropdown-container" style="min-width: 220px; margin-bottom: 0;">
                                <button type="button" class="dropdown-button" id="semesterFilterBtn" data-dropdown-id="semesterFilter" data-value="all">
                                    <span class="dropdown-text">Tous les semestres</span>
                                    <div class="dropdown-arrow"></div>
                                </button>
                                <div class="dropdown-menu">
                                    <div class="dropdown-item selected" data-value="all">Tous les semestres</div>
                                    <div class="dropdown-item" data-value="1">Semestre 1</div>
                                    <div class="dropdown-item" data-value="2">Semestre 2</div>
                                    <div class="dropdown-item" data-value="3">Semestre 3</div>
                                    <div class="dropdown-item" data-value="4">Semestre 4</div>
                                    <div class="dropdown-item" data-value="5">Semestre 5</div>
                                    <div class="dropdown-item" data-value="6">Semestre 6</div>
                                </div>
                            </div>
                            <input type="text" id="searchInput" placeholder="Rechercher par code ou nom..." class="search-input" style="min-width: 250px;">
                        </div>
                    </div>
                    
                    <div class="table-container" style="overflow-x: auto; background: transparent; border: none;">
                        <table class="table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                <th class="code-col">Module</th>
                                <th class="workload-col">CM</th>
                                <th class="workload-col">TD</th>
                                <th class="workload-col">TP</th>
                                <th class="status-col" style="width: 120px;">Actions</th>
                                <th class="status-col">Statut</th>
                            </tr>
                            </thead>
                            <tbody id="workloadTableBody">
                                <!-- Data populated by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>


    
    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/dropdown.js"></script>
    <script src="../js/spinner.js"></script>
    <script src="../js/weekly_workload.js"></script>
</body>
</html>
