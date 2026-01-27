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
    <title>Gestion des emplois du temps - Emploi du temps de l'université</title>
    <meta name="description" content="Gérer et consulter les emplois du temps">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/timetables.css">
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
                        Gestion des emplois du temps
                    </h1>
                    <p>Gérez les emplois du temps pour tous les groupes et toutes les années</p>
                </div>

                <!-- Timetables View -->
                <div class="glass-card" style="padding: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h3 style="margin: 0;">Vue des emplois du temps</h3>
                        <button class="btn btn-primary" onclick="GenerateTimetables(this)">
                            <span>Régénérer les emplois du temps</span>
                        </button>
                    </div>

                    <!-- Selection Form -->
                    <div class="form-card" style="margin-bottom: 2rem; background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
                        <form id="adminTimetableForm">
                            <div class="grid grid-2 gap-2" style="margin-bottom: 1.5rem;">
                                <!-- Semester Selection -->
                                <div class="form-group">
                                    <label class="form-label">Semestre</label>
                                    <div class="dropdown-container">
                                        <button type="button" class="dropdown-button" data-dropdown-id="adminSemesterSelect">
                                            <span class="dropdown-text">Sélectionner un semestre</span>
                                            <div class="dropdown-arrow"></div>
                                        </button>
                                        <div class="dropdown-menu" id="adminSemesterOptionsMenu">
                                            <!-- Populated via JS -->
                                        </div>
                                    </div>
                                </div>

                                <!-- Group Selection -->
                                <div class="form-group">
                                    <label class="form-label">Groupe</label>
                                    <div class="dropdown-container">
                                        <button type="button" class="dropdown-button" data-dropdown-id="adminGroupSelect" disabled>
                                            <span class="dropdown-text">Sélectionnez d'abord un semestre</span>
                                            <div class="dropdown-arrow"></div>
                                        </button>
                                        <div class="dropdown-menu" id="adminGroupOptionsMenu" data-dropdown-menu-id="adminGroupSelect">
                                            <!-- Populated via JS -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width: 100%;">
                                <span>Afficher l'emploi du temps</span>
                            </button>
                        </form>
                    </div>

                    <!-- Timetable Display -->
                    <div id="timetableContainer" style="display: none;">
                        <div class="table-container-scroll" style="margin-top: 2rem;">
                            <div id="timetableGrid">
                                <!-- Will be populated by JS -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/dropdown.js"></script>
    <script src="../js/spinner.js"></script>
    <script src="../js/timetables.js"></script>
</body>
</html>
