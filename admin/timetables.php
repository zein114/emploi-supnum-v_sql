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
                            <div class="grid grid-3 gap-2" style="margin-bottom: 1.5rem;">
                                <!-- Source Selection (Live or Archive) -->
                                <div class="form-group">
                                    <label class="form-label">Source de l'emploi du temps</label>
                                    <div class="dropdown-container">
                                        <button type="button" class="dropdown-button" data-dropdown-id="adminSourceSelect" data-value="live">
                                            <span class="dropdown-text">Emploi du temps actuel</span>
                                            <div class="dropdown-arrow"></div>
                                        </button>
                                        <div class="dropdown-menu" id="adminSourceOptionsMenu" style="padding-top: 0;">
                                            <div class="dropdown-search-container" style="position: sticky; top: 0; background: var(--color-bg-card); z-index: 10; padding: 10px 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 4px;">
                                                <input type="text" class="dropdown-search-input" id="archiveSearchInput" placeholder="Rechercher par date..." style="width: 100%; padding: 10px 10px; font-size: 0.85rem; background: var(--color-bg-section); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                                            </div>
                                            <div id="archiveDropdownItems" style="padding: 0 8px 8px 8px;">
                                                <div class="dropdown-item" data-value="live">Emploi du temps actuel</div>
                                                <!-- Archives will be populated here -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
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

                            <div class="flex gap-2">
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    <span>Afficher l'emploi du temps</span>
                                </button>
                                <button type="button" class="btn btn-secondary" id="exportExcelBtn" style="padding-left: 1.5rem; padding-right: 1.5rem;" title="Exporter en Excel">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span style="font-size: 14px; margin-left: 5px;">Exporter l'Excel</span>
                                </button>
                            </div>
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="color: var(--color-warning); margin: 0; display: flex; align-items: center; gap: 0.5rem; position: relative; top: 5px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    <span>Classes non programmées</span>
                                </h3>
                                <button class="btn btn-secondary" onclick="toggleSection('unscheduledContentSection')" id="unscheduledContentBtn" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span id="unscheduledContentIcon"><svg style="width: 1em; height: 1em; vertical-align: middle; position: relative; bottom: 1px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg></span>
                                    <span id="unscheduledContentBtnText">Afficher</span>
                                </button>
                            </div>

                            <div id="unscheduledContentSection" style="display: none;">
                                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                                    Les classes suivantes n'ont pas pu être placées dans l'emploi du temps en raison de disponibilité des professeurs, salles, etc...
                                </p>
                                <div id="unscheduledClassesList">
                                    <!-- Will be populated by JS -->
                                </div>
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
