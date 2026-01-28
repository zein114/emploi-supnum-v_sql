<?php
require_once 'config/db_connect.php';
require_once 'includes/session.php';

requireRole('professor');

$user = getCurrentUser();

// Years query removed as per new requirements
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de bord professeur - Emploi du temps de l'université</title>
    <meta name="description" content="Gérez vos disponibilités pour les créneaux d'enseignement">
    <link rel="stylesheet" href="css/style.css?v=<?= time() ?>">
    <link rel="stylesheet" href="css/professor-dashboard.css?v=<?= time() ?>">
    <link rel="icon" type="image/png" href="assets/logo-supnum.png">
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">
                    <svg style="width: 1em; height: 1em; vertical-align: middle; font-size: 1.8rem; color: var(--color-primary-blue);" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M9 16l2 2 4-4"></path></svg>
                    Emploi du temps de l'université
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-muted">Bienvenue, <strong><?= htmlspecialchars($user['username']) ?></strong></span>
                    <span class="badge badge-primary">Professeur</span>
                    <a href="logout.php" class="btn btn-secondary btn-sm">
                        <svg style="width: 1em; height: 1em; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Déconnexion
                    </a>
                </div>
            </nav>
        </div>
    </header>

    <!-- Main Content -->
    <main class="professor-main">
        <div class="container">
            <!-- Dashboard Header -->
            <div class="glass-card  " style="padding: 2rem; margin-bottom: 2rem;">
                <h1 style="margin-bottom: 0.5rem;">
                    <svg style="width: 2rem; height: 2rem; vertical-align: middle; color: var(--color-primary-blue-light);" viewBox="0 0 31.979 31.979" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <g> <circle cx="10.086" cy="4.501" r="4.501"></circle> <path d="M26.514,11.48V7.814h-2.959V6.896h-1.813c0-0.574-0.483-1.041-1.082-1.041c-0.6,0-1.084,0.467-1.084,1.041h-1.812v0.918 h-3.417v1.87L14.258,9.68h-2.533l-1.717,1.99L8.349,9.68l-3.643,0.492l-0.238,8.276h1.547l0.082,1.68h0.236v1.026v0.755v8.014 h-0.31l-1.807,0.39v1.666h1.537l1.796-0.293l0.017,0.293h1.987v-1.855v-0.2v-8.014h1.133v8.014v0.2v1.855h1.99l0.016-0.293 l1.795,0.293h1.538v-1.666l-1.806-0.391h-0.311v-8.014v-0.756v-1.025h0.286l0.152-2.972v6.991h12.167v-9.292h1.25V11.48H26.514z M20.659,6.517c0.24,0,0.438,0.195,0.438,0.438s-0.195,0.438-0.438,0.438s-0.438-0.195-0.438-0.438S20.418,6.517,20.659,6.517z M25.514,11.48h-0.792v3.375h0.792v8.292H15.347V8.814h2.417v0.708h5.791V8.814h1.959V11.48z"></path> <path d="M23.672,17.159l-0.868-1.013h-0.607c0,0-0.289,0.248-0.434,0.371c-0.156-0.076-0.32-0.139-0.494-0.186 c-0.014-0.172-0.041-0.515-0.041-0.515l-0.431-0.43l-1.328,0.107l-0.43,0.43c0,0,0.036,0.451,0.054,0.678 c-0.13,0.073-0.253,0.157-0.367,0.25c-0.187-0.086-0.561-0.257-0.561-0.257l-0.588,0.154l-0.557,1.213L17,18.044l0.174,0.506 c0,0,0.435,0.198,0.651,0.298c0.01,0.144,0.031,0.282,0.066,0.418c-0.166,0.141-0.496,0.422-0.496,0.422v0.606l0.86,1.019 c0,0,0.501,0.059,0.528,0.043c0.025-0.015,0.08-0.043,0.08-0.043s0.314-0.269,0.473-0.4c0.133,0.059,0.271,0.109,0.415,0.148 c0.017,0.178,0.049,0.535,0.049,0.535l0.431,0.43l1.326-0.12l0.43-0.431c0,0-0.041-0.461-0.062-0.689 c0.107-0.062,0.213-0.131,0.311-0.207c0.174,0.102,0.519,0.3,0.519,0.3l0.588-0.153l0.668-1.154l-0.153-0.588 c0,0-0.445-0.258-0.668-0.387c-0.006-0.127-0.02-0.254-0.046-0.377c0.177-0.15,0.528-0.451,0.528-0.451L23.672,17.159 L23.672,17.159z M20.435,20.049c-0.74,0-1.341-0.601-1.341-1.341s0.601-1.341,1.341-1.341s1.342,0.601,1.342,1.341 S21.175,20.049,20.435,20.049z"></path> <path d="M16.71,15.23l0.408,0.482c0,0,0.236,0.027,0.25,0.021c0.013-0.008,0.037-0.021,0.037-0.021s0.149-0.127,0.225-0.19 c0.062,0.029,0.13,0.053,0.197,0.071c0.008,0.085,0.021,0.254,0.021,0.254l0.203,0.203l0.63-0.058l0.204-0.203 c0,0-0.021-0.218-0.029-0.326c0.051-0.03,0.101-0.063,0.146-0.099c0.083,0.048,0.246,0.142,0.246,0.142l0.278-0.073l0.315-0.546 l-0.073-0.279c0,0-0.211-0.121-0.316-0.183c-0.002-0.061-0.008-0.12-0.021-0.179c0.084-0.07,0.25-0.214,0.25-0.214v-0.289 l-0.411-0.479h-0.287c0,0-0.138,0.116-0.205,0.175c-0.074-0.035-0.152-0.065-0.233-0.088c-0.007-0.081-0.021-0.243-0.021-0.243 l-0.205-0.203l-0.629,0.05l-0.203,0.204c0,0,0.018,0.214,0.025,0.321c-0.062,0.035-0.12,0.074-0.175,0.117 c-0.088-0.039-0.265-0.121-0.265-0.121l-0.278,0.073l-0.265,0.575l-0.01,0.038l0.082,0.24c0,0,0.206,0.095,0.309,0.141 c0.006,0.068,0.017,0.134,0.033,0.197c-0.08,0.067-0.235,0.2-0.235,0.2L16.71,15.23L16.71,15.23z M18.149,13.843 c0.351,0,0.637,0.285,0.637,0.636s-0.286,0.635-0.637,0.635s-0.635-0.284-0.635-0.635S17.799,13.843,18.149,13.843z"></path> <path d="M18.802,12.055c0.003,0.045,0.01,0.089,0.021,0.131c-0.053,0.045-0.156,0.133-0.156,0.133v0.19l0.271,0.319 c0,0,0.156,0.018,0.164,0.014c0.01-0.006,0.025-0.014,0.025-0.014s0.1-0.084,0.148-0.126c0.041,0.019,0.086,0.034,0.131,0.047 c0.004,0.057,0.015,0.168,0.015,0.168l0.135,0.135l0.417-0.038l0.135-0.135c0,0-0.014-0.145-0.021-0.216 c0.035-0.021,0.067-0.041,0.099-0.065c0.055,0.031,0.162,0.094,0.162,0.094l0.184-0.049l0.211-0.361l-0.049-0.185 c0,0-0.141-0.08-0.209-0.121c-0.002-0.04-0.006-0.079-0.016-0.118c0.057-0.047,0.166-0.142,0.166-0.142v-0.191l-0.271-0.317h-0.19 c0,0-0.091,0.078-0.136,0.116c-0.049-0.022-0.102-0.043-0.155-0.058c-0.004-0.055-0.015-0.161-0.015-0.161l-0.135-0.135 l-0.416,0.033l-0.135,0.135c0,0,0.012,0.142,0.018,0.213c-0.041,0.023-0.08,0.05-0.115,0.077c-0.059-0.025-0.176-0.08-0.176-0.08 l-0.186,0.049l-0.174,0.381l-0.007,0.025l0.055,0.159C18.598,11.962,18.733,12.024,18.802,12.055z M19.62,11.59 c0.23,0,0.421,0.189,0.421,0.421c0,0.232-0.188,0.421-0.421,0.421s-0.42-0.188-0.42-0.421C19.2,11.779,19.388,11.59,19.62,11.59z"></path> </g>
                    </svg>
                    Tableau de bord professeur
                </h1>
                <p class="text-muted" style="margin-bottom:2rem;">Indiquez vos disponibilités pour les créneaux d'enseignement de la semaine</p>


            <!-- Availability Timetable - Collapsible -->
            <div class="glass-card  " style="padding: 2rem; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.75rem;">
                            <svg style="width: 1.75rem; height: 1.75rem; color: var(--color-primary-blue-light);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Grille de disponibilités
                        </h2>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Cliquez sur les cellules pour indiquer vos disponibilités d'enseignement</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button class="btn btn-secondary" onclick="toggleSection('availabilitySection')" id="toggleAvailabilityBtn" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span id="availabilityIcon"><svg style="width: 1em; height: 1em; vertical-align: middle; position: relative; bottom: 1px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg></span>
                            <span id="availabilityBtnText">Afficher</span>
                        </button>
                    </div>
                </div>
                
                <div id="availabilitySection" style="display: none;">
                    <div class="availability-legend" style="margin-bottom: 1.5rem;">
                        <div class="legend-items">
                            <div class="legend-item">
                                <div class="legend-box available"></div>
                                <span style="font-size: 0.9rem;">Disponible</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-box unavailable"></div>
                                <span style="font-size: 0.9rem;">Non disponible</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="initializeTimetables()" id="initTimetablesBtn" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                            <svg style="width: 1em; height: 1em; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clip-rule="evenodd"/></svg>
                            Initialiser
                        </button>
                    </div>
                    
                    <div id="timetableContainer" class="table-container-scroll">
                             <div id="timetableGrid">
                             <!-- Loading state -->
                             <div style="padding: 2rem; text-align: center; color: var(--text-muted);">Chargement de l'emploi du temps...</div>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Professor Timetable - Collapsible -->
            <div class="glass-card  " style="padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.75rem;">
                            <svg style="width: 1.75rem; height: 1.75rem; color: var(--color-primary-blue-light);" viewBox="0 0 31.979 31.979" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <g> <circle cx="10.086" cy="4.501" r="4.501"></circle> <path d="M26.514,11.48V7.814h-2.959V6.896h-1.813c0-0.574-0.483-1.041-1.082-1.041c-0.6,0-1.084,0.467-1.084,1.041h-1.812v0.918 h-3.417v1.87L14.258,9.68h-2.533l-1.717,1.99L8.349,9.68l-3.643,0.492l-0.238,8.276h1.547l0.082,1.68h0.236v1.026v0.755v8.014 h-0.31l-1.807,0.39v1.666h1.537l1.796-0.293l0.017,0.293h1.987v-1.855v-0.2v-8.014h1.133v8.014v0.2v1.855h1.99l0.016-0.293 l1.795,0.293h1.538v-1.666l-1.806-0.391h-0.311v-8.014v-0.756v-1.025h0.286l0.152-2.972v6.991h12.167v-9.292h1.25V11.48H26.514z M20.659,6.517c0.24,0,0.438,0.195,0.438,0.438s-0.195,0.438-0.438,0.438s-0.438-0.195-0.438-0.438S20.418,6.517,20.659,6.517z M25.514,11.48h-0.792v3.375h0.792v8.292H15.347V8.814h2.417v0.708h5.791V8.814h1.959V11.48z"></path> <path d="M23.672,17.159l-0.868-1.013h-0.607c0,0-0.289,0.248-0.434,0.371c-0.156-0.076-0.32-0.139-0.494-0.186 c-0.014-0.172-0.041-0.515-0.041-0.515l-0.431-0.43l-1.328,0.107l-0.43,0.43c0,0,0.036,0.451,0.054,0.678 c-0.13,0.073-0.253,0.157-0.367,0.25c-0.187-0.086-0.561-0.257-0.561-0.257l-0.588,0.154l-0.557,1.213L17,18.044l0.174,0.506 c0,0,0.435,0.198,0.651,0.298c0.01,0.144,0.031,0.282,0.066,0.418c-0.166,0.141-0.496,0.422-0.496,0.422v0.606l0.86,1.019 c0,0,0.501,0.059,0.528,0.043c0.025-0.015,0.08-0.043,0.08-0.043s0.314-0.269,0.473-0.4c0.133,0.059,0.271,0.109,0.415,0.148 c0.017,0.178,0.049,0.535,0.049,0.535l0.431,0.43l1.326-0.12l0.43-0.431c0,0-0.041-0.461-0.062-0.689 c0.107-0.062,0.213-0.131,0.311-0.207c0.174,0.102,0.519,0.3,0.519,0.3l0.588-0.153l0.668-1.154l-0.153-0.588 c0,0-0.445-0.258-0.668-0.387c-0.006-0.127-0.02-0.254-0.046-0.377c0.177-0.15,0.528-0.451,0.528-0.451L23.672,17.159 L23.672,17.159z M20.435,20.049c-0.74,0-1.341-0.601-1.341-1.341s0.601-1.341,1.341-1.341s1.342,0.601,1.342,1.341 S21.175,20.049,20.435,20.049z"></path> <path d="M16.71,15.23l0.408,0.482c0,0,0.236,0.027,0.25,0.021c0.013-0.008,0.037-0.021,0.037-0.021s0.149-0.127,0.225-0.19 c0.062,0.029,0.13,0.053,0.197,0.071c0.008,0.085,0.021,0.254,0.021,0.254l0.203,0.203l0.63-0.058l0.204-0.203 c0,0-0.021-0.218-0.029-0.326c0.051-0.03,0.101-0.063,0.146-0.099c0.083,0.048,0.246,0.142,0.246,0.142l0.278-0.073l0.315-0.546 l-0.073-0.279c0,0-0.211-0.121-0.316-0.183c-0.002-0.061-0.008-0.12-0.021-0.179c0.084-0.07,0.25-0.214,0.25-0.214v-0.289 l-0.411-0.479h-0.287c0,0-0.138,0.116-0.205,0.175c-0.074-0.035-0.152-0.065-0.233-0.088c-0.007-0.081-0.021-0.243-0.021-0.243 l-0.205-0.203l-0.629,0.05l-0.203,0.204c0,0,0.018,0.214,0.025,0.321c-0.062,0.035-0.12,0.074-0.175,0.117 c-0.088-0.039-0.265-0.121-0.265-0.121l-0.278,0.073l-0.265,0.575l-0.01,0.038l0.082,0.24c0,0,0.206,0.095,0.309,0.141 c0.006,0.068,0.017,0.134,0.033,0.197c-0.08,0.067-0.235,0.2-0.235,0.2L16.71,15.23L16.71,15.23z M18.149,13.843 c0.351,0,0.637,0.285,0.637,0.636s-0.286,0.635-0.637,0.635s-0.635-0.284-0.635-0.635S17.799,13.843,18.149,13.843z"></path> <path d="M18.802,12.055c0.003,0.045,0.01,0.089,0.021,0.131c-0.053,0.045-0.156,0.133-0.156,0.133v0.19l0.271,0.319 c0,0,0.156,0.018,0.164,0.014c0.01-0.006,0.025-0.014,0.025-0.014s0.1-0.084,0.148-0.126c0.041,0.019,0.086,0.034,0.131,0.047 c0.004,0.057,0.015,0.168,0.015,0.168l0.135,0.135l0.417-0.038l0.135-0.135c0,0-0.014-0.145-0.021-0.216 c0.035-0.021,0.067-0.041,0.099-0.065c0.055,0.031,0.162,0.094,0.162,0.094l0.184-0.049l0.211-0.361l-0.049-0.185 c0,0-0.141-0.08-0.209-0.121c-0.002-0.04-0.006-0.079-0.016-0.118c0.057-0.047,0.166-0.142,0.166-0.142v-0.191l-0.271-0.317h-0.19 c0,0-0.091,0.078-0.136,0.116c-0.049-0.022-0.102-0.043-0.155-0.058c-0.004-0.055-0.015-0.161-0.015-0.161l-0.135-0.135 l-0.416,0.033l-0.135,0.135c0,0,0.012,0.142,0.018,0.213c-0.041,0.023-0.08,0.05-0.115,0.077c-0.059-0.025-0.176-0.08-0.176-0.08 l-0.186,0.049l-0.174,0.381l-0.007,0.025l0.055,0.159C18.598,11.962,18.733,12.024,18.802,12.055z M19.62,11.59 c0.23,0,0.421,0.189,0.421,0.421c0,0.232-0.188,0.421-0.421,0.421s-0.42-0.188-0.42-0.421C19.2,11.779,19.388,11.59,19.62,11.59z"></path> </g>
                            </svg>
                            Mon planning de cours
                        </h2>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Consultez vos cours et horaires d'enseignement attribués</p>
                    </div>
                    <button class="btn btn-secondary" onclick="toggleSection('timetableSection')" id="toggleTimetableBtn" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span id="timetableIcon"><svg style="width: 1em; height: 1em; vertical-align: middle; position: relative; bottom: 1px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg></span>
                        <span id="timetableBtnText">Afficher</span>
                    </button>
                </div>
                
                <div id="timetableSection" style="display: none;">
                    <div class="table-container-scroll">
                            <div id="professorTimetableGrid">
                            <!-- Loading state -->
                            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">Chargement de l'emploi du temps...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Password Management - Collapsible -->
            <div class="glass-card  " style="padding: 2rem; margin-top: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.75rem;">
                            <svg style="width: 1.75rem; height: 1.75rem; color: var(--color-primary-blue-light);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Gestion du mot de passe
                        </h2>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Mettez à jour votre mot de passe pour sécuriser votre accès</p>
                    </div>
                    <button class="btn btn-secondary" onclick="toggleSection('passwordSection')" id="passwordBtn" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span id="passwordIcon"><svg style="width: 1em; height: 1em; vertical-align: middle; position: relative; bottom: 1px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9944 15.5C13.9274 15.5 15.4944 13.933 15.4944 12C15.4944 10.067 13.9274 8.5 11.9944 8.5C10.0614 8.5 8.49439 10.067 8.49439 12C8.49439 13.933 10.0614 15.5 11.9944 15.5ZM11.9944 13.4944C11.1691 13.4944 10.5 12.8253 10.5 12C10.5 11.1747 11.1691 10.5056 11.9944 10.5056C12.8197 10.5056 13.4888 11.1747 13.4888 12C13.4888 12.8253 12.8197 13.4944 11.9944 13.4944Z" fill="#999"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C7.18879 5 3.9167 7.60905 2.1893 9.47978C0.857392 10.9222 0.857393 13.0778 2.1893 14.5202C3.9167 16.391 7.18879 19 12 19C16.8112 19 20.0833 16.391 21.8107 14.5202C23.1426 13.0778 23.1426 10.9222 21.8107 9.47978C20.0833 7.60905 16.8112 5 12 5ZM3.65868 10.8366C5.18832 9.18002 7.9669 7 12 7C16.0331 7 18.8117 9.18002 20.3413 10.8366C20.9657 11.5128 20.9657 12.4872 20.3413 13.1634C18.8117 14.82 16.0331 17 12 17C7.9669 17 5.18832 14.82 3.65868 13.1634C3.03426 12.4872 3.03426 11.5128 3.65868 10.8366Z" fill="#999"/></svg></span>
                        <span id="passwordBtnText">Afficher</span>
                    </button>
                </div>
                
                <div id="passwordSection" style="display: none;">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="oldPassword" class="form-label" style="font-size: 0.85rem;">Mot de passe actuel</label>
                        <input type="password" id="oldPassword" class="form-input" placeholder="Saisissez votre mot de passe actuel">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="newPassword" class="form-label" style="font-size: 0.85rem;">Nouveau mot de passe</label>
                        <input type="password" id="newPassword" class="form-input" placeholder="Saisissez un nouveau mot de passe">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label for="confirmPassword" class="form-label" style="font-size: 0.85rem;">Confirmez le nouveau mot de passe</label>
                        <input type="password" id="confirmPassword" class="form-input" placeholder="Confirmez le nouveau mot de passe">
                    </div>
                    <button class="btn btn-primary" onclick="changePassword()" id="changePasswordBtn" style="width: 100%;">
                        Mettre à jour le mot de passe
                    </button>
                </div>
        </div>
    </main>

    <script src="js/toast.js"></script>
    <script src="js/modal.js"></script>
    <script src="js/spinner.js"></script>
    <script src="js/dropdown.js?v=<?= time() ?>"></script>
    <script src="js/professor-dashboard.js?v=<?= time() ?>"></script>
</body>
</html>
