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
    <title>Paramètres - Emploi du temps de l'université</title>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/settings.css">
    <link rel="icon" type="image/png" href="../assets/logo-supnum.png">
    <script src="../js/theme-switcher.js"></script>
    <style>
        /* Hide number input spinners */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
        }
        input[type=number] {
            -moz-appearance: textfield;
        }
    </style>
</head>
<body>
    <div class="admin-layout">
        <?php include '../includes/admin-sidebar.php'; ?>

        <main class="admin-content">
            <div class="admin-content-inner">
                <div class="page-header">
                    <h1>Paramètres</h1>
                    <p>Configuration globale du système</p>
                </div>

                <div class="settings-container">
                    <!-- Tabs Navigation -->
                    <div class="settings-tabs">
                        <button class="tab-btn active" data-tab="general">Général</button>
                        <button class="tab-btn" data-tab="days-times">Jours & Heures</button>
                        <button class="tab-btn" data-tab="classrooms">Salles</button>
                        <button class="tab-btn" data-tab="groups">Groupes</button>
                    </div>

                    <!-- Tab Content: General -->
                    <div class="tab-content active" id="general">
                        <div class="glass-card p-xl">
                            <h3 class="mb-2">Paramètres du Système</h3>
                            <form id="generalSettingsForm" class="settings-form">
                                <div class="form-group mb-2">
                                    <label class="form-label">Type de semestre actuel</label>
                                    <div class="dropdown-container">
                                        <button type="button" class="dropdown-button" data-dropdown-id="semesterTypeSelect" id="semesterTypeBtn">
                                            <span class="dropdown-text">Chargement...</span>
                                            <div class="dropdown-arrow"></div>
                                        </button>
                                        <div class="dropdown-menu" id="semesterTypeDropdownMenu">
                                            <div class="dropdown-item" data-value="impair">Impair (S1, S3, S5...)</div>
                                            <div class="dropdown-item" data-value="pair">Pair (S2, S4, S6...)</div>
                                        </div>
                                    </div>
                                    <input type="hidden" name="current_semester_type" id="current_semester_type_input">
                                </div>
                                <div class="form-actions mt-3" style="display: flex; justify-content: flex-end;">
                                    <button type="submit" class="btn btn-primary btn-lg">Enregistrer les modifications</button>
                                </div>
                            </form>
                        </div>

                        <!-- Semester Management Section -->
                        <div class="glass-card p-lg mt-2">
                                <h3 class="m-0">Gestion des Semestres</h3>
                            </div>
                            <div id="semestersList" class="settings-list"></div>
                        </div>
                    </div>

                    <!-- Tab Content: Days & Times -->
                    <div class="tab-content" id="days-times">
                        <div class="grid grid-2 gap-2">
                            <div class="glass-card p-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <h3 class="m-0">Gestion des Jours</h3>
                                </div>
                                <div id="daysList" class="settings-list"></div>
                            </div>
                            <div class="glass-card p-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <h3 class="m-0">Gestion des Heures</h3>
                                </div>
                                <div id="timeSlotsList" class="settings-list"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content: Classrooms -->
                    <div class="tab-content" id="classrooms">
                        <div class="glass-card p-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="m-0">Salles d'étude</h3>
                                <button class="btn btn-primary btn-sm" onclick="addClassroom()">
                                    <span class="icon-plus"></span> Ajouter une salle
                                </button>
                            </div>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Salle</th>
                                            <th>Capacité</th>
                                            <th>Type</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="classroomsTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content: Groups -->
                    <div class="tab-content" id="groups">
                        <div class="glass-card p-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="m-0">Groupes d'étude</h3>
                                <button class="btn btn-primary btn-sm" onclick="addGroup()">
                                    <span class="icon-plus"></span> Ajouter un groupe
                                </button>
                            </div>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Nom</th>
                                            <th>Semestre</th>
                                            <th>Type</th>
                                            <th>Parent/Spécialité</th>
                                            <th>Étudiants</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="groupsTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Custom Modal Structure managed by Modal.js -->
    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/dropdown.js"></script>
    <script src="../js/spinner.js"></script>
    <script src="../js/settings.js"></script>
</body>
</html>
