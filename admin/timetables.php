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
                        
                        <!-- Unscheduled Classes Section -->
                        <div id="unscheduledClassesSection" style="margin-top: 2rem; display: none;">
                            <h3 style="color: var(--color-danger); margin-bottom: 1rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 0.5rem;">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Classes non programmées
                            </h3>
                            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                                Les classes suivantes n'ont pas pu être placées dans l'emploi du temps en raison de contraintes (disponibilité des professeurs, salles, etc.)
                            </p>
                            <div id="unscheduledClassesList">
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
