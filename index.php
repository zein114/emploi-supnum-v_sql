<?php
require_once 'config/db_connect.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emploi du temps - SupNum Portal</title>
    <meta name="description" content="Consultez votre emploi du temps universitaire">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/index.css">
    <link rel="icon" type="image/png" href="assets/logo-supnum.png">
    <script src="js/theme-switcher.js"></script>
</head>
<body>

    <main class="student-main">
        
        <!-- Left Side: Form & Content -->
        <div class="content-side">
            <div class="content-wrapper">
                <!-- Logo -->
                <div class="logo-container">
                    <img src="assets/logo-supnum.png" alt="SupNum Logo" class="logo-img">
                </div>

                <!-- Titles -->
                <h1 class="welcome-title">Emploi du temps</h1>
                <p class="welcome-subtitle">
                    Sélectionnez votre semestre et votre groupe pour accéder à votre planning en temps réel.
                </p>

                <!-- Selection Form -->
                <div class="form-card">
                    <form id="timetableForm">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- Semester Selection -->
                            <div class="form-group">
                                <label class="form-label">Semestre</label>
                                <div class="dropdown-container" style="margin-bottom: 0rem;">
                                    <button type="button" class="dropdown-button" data-dropdown-id="semesterSelect">
                                        <span class="dropdown-text">Choisir le semestre</span>
                                        <div class="dropdown-arrow"></div>
                                    </button>
                                    <div class="dropdown-menu" id="semesterOptionsMenu">
                                        <!-- Populated via JS -->
                                    </div>
                                </div>
                            </div>

                            <!-- Group Selection -->
                            <div class="form-group">
                                <label class="form-label">Groupe d'étude</label>
                                <div class="dropdown-container" style="margin-bottom: 0.75rem;">
                                    <button type="button" class="dropdown-button" data-dropdown-id="groupSelect" disabled>
                                        <span class="dropdown-text">Choisir un semestre d'abord</span>
                                        <div class="dropdown-arrow"></div>
                                    </button>
                                    <div class="dropdown-menu" id="groupOptionsMenu">
                                        <!-- Populated via JS -->
                                    </div>
                                </div>
                            </div>

                            <button type="submit" class="btn-submit" id="submitBtn">
                                <span>Afficher le planning</span>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Footer Help -->
                <div style="margin-top: 1rem; opacity: 0.60; text-align: center;">
                    <p style="font-size: 0.85rem; line-height: 1.5;">
                        Une question ? Contactez le service scolarité.<br>
                        © <?= date('Y') ?> Institut Supérieur du Numérique.
                    </p>
                </div>
            </div>
        </div>

        <!-- Right Side: Image with Cutout -->
        <div class="image-side">
            <div class="image-container-cutout">
                <img src="assets/supnum.jpg" alt="Campus SupNum" class="bg-image">
                <div class="image-overlay-content">
                    <h2>Excellence Académique</h2>
                </div>
            </div>
        </div>
    </main>

    <!-- Timetable Overlay -->
    <div id="timetableContainer">
        <button id="closeTimetable" class="timetable-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Fermer
        </button>
        <div class="container container-xl" style="padding-top: 5rem; padding-bottom: 5rem;">
            <div class="glass-card" style="padding: 2.5rem; background: var(--color-bg-section); border: 1px solid var(--border-color); border-radius: 20px;">            
                <div class="table-container-scroll">
                    <div id="timetableGrid">
                        <!-- Loading state -->
                        <div style="padding: 4rem; text-align: center; color: var(--text-muted); font-size: 1.1rem;">Initialisation du planning...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="js/dropdown.js"></script>
    <script src="js/spinner.js"></script>
    <script src="js/index.js"></script>
</body>
</html>
