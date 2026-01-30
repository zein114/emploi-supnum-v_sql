<?php
require_once '../config/db_connect.php';
require_once '../includes/session.php';

requireRole('admin');

$user = getCurrentUser();

// Fetch statistics
$stats = [];

// Count users by role
$result = $conn->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
while ($row = $result->fetch_assoc()) {
    $stats[$row['role']] = $row['count'];
}

// Use DatabaseHandler for Groups and Rooms
require_once '../api/DatabaseHandler.php';
$dbHandler = new DatabaseHandler($conn);
$groupsFromExcel = $dbHandler->getGroups();
$roomsFromExcel = $dbHandler->getRooms();

// Stats
$stats['groups'] = count($groupsFromExcel);
$stats['rooms'] = count($roomsFromExcel);

// Get recent activities (last 5 users created)
$recent_users_query = "SELECT username, role, created_at FROM users ORDER BY created_at DESC LIMIT 5";
$recent_users = $conn->query($recent_users_query);

// Additional data for dashboard modals
$recent_professors_query = "SELECT username, email, created_at FROM users WHERE role = 'professor' ORDER BY created_at DESC LIMIT 5";
$recent_professors_result = $conn->query($recent_professors_query);
$recent_professors = [];
while ($row = $recent_professors_result->fetch_assoc()) {
    $recent_professors[] = $row;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de bord administrateur - Emploi du temps de l'université</title>
    <meta name="description" content="Vue d'ensemble du tableau de bord administrateur">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/admin-sidebar.css">
    <link rel="stylesheet" href="../css/admin-dashboard.css">
    <link rel="icon" type="image/png" href="../assets/logo-supnum.png">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .chart-container { background: var(--color-bg-section); border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 1.5rem; min-height: 400px; display: flex; flex-direction: column; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .chart-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
        .insight-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .badge-blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @media print { .admin-sidebar, .btn, .quick-actions, .admin-sidebar-toggle { display: none !important; } .admin-layout { display: block; } .admin-content { margin: 0; padding: 0; } .glass-card { border: 1px solid #ddd !important; box-shadow: none !important; break-inside: avoid; } body { background: white !important; color: black !important; } .chart-container { min-height: 300px; } }
    </style>
</head>
<body>
    <div class="admin-layout">
        <?php include '../includes/admin-sidebar.php'; ?>

        <main class="admin-content">
            <div class="admin-content-inner">
                <!-- Page Header -->
                <div class="page-header">
                    <h1>
                        Tableau de bord
                    </h1>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <p>Heureux de vous revoir, <?= htmlspecialchars($user['username']) ?>&nbsp;! Voici un aperçu de la situation aujourd'hui.</p>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div id="liveStatus" class="glass-card" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.75rem; border-color: rgba(16, 185, 129, 0.2);">
                                <div style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite;"></div>
                                <span style="font-size: 0.875rem; font-weight: 600; color: #10b981;" id="statusText">Campus en direct</span>
                            </div>
                            <button onclick="window.print()" class="btn btn-secondary btn-sm" style="height: 40px; gap: 0.5rem;">
                                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                Rapport
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="grid grid-3 gap-2" style="margin-bottom: 2rem;">
                    <div class="glass-card" id="cardProfessors" style="padding: 1.5rem; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.5rem;">Nombre total de professeurs</div>
                                <div style="font-size: 2rem; font-weight: 700; color: #10b981;">
                                    <?= $stats['professor'] ?? 0 ?>
                                </div>
                            </div>
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 1.5rem; height: 1.5rem; color: #10b981;" viewBox="0 0 31.979 31.979" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <g> <circle cx="10.086" cy="4.501" r="4.501"></circle> <path d="M26.514,11.48V7.814h-2.959V6.896h-1.813c0-0.574-0.483-1.041-1.082-1.041c-0.6,0-1.084,0.467-1.084,1.041h-1.812v0.918 h-3.417v1.87L14.258,9.68h-2.533l-1.717,1.99L8.349,9.68l-3.643,0.492l-0.238,8.276h1.547l0.082,1.68h0.236v1.026v0.755v8.014 h-0.31l-1.807,0.39v1.666h1.537l1.796-0.293l0.017,0.293h1.987v-1.855v-0.2v-8.014h1.133v8.014v0.2v1.855h1.99l0.016-0.293 l1.795,0.293h1.538v-1.666l-1.806-0.391h-0.311v-8.014v-0.756v-1.025h0.286l0.152-2.972v6.991h12.167v-9.292h1.25V11.48H26.514z M20.659,6.517c0.24,0,0.438,0.195,0.438,0.438s-0.195,0.438-0.438,0.438s-0.438-0.195-0.438-0.438S20.418,6.517,20.659,6.517z M25.514,11.48h-0.792v3.375h0.792v8.292H15.347V8.814h2.417v0.708h5.791V8.814h1.959V11.48z"></path> <path d="M23.672,17.159l-0.868-1.013h-0.607c0,0-0.289,0.248-0.434,0.371c-0.156-0.076-0.32-0.139-0.494-0.186 c-0.014-0.172-0.041-0.515-0.041-0.515l-0.431-0.43l-1.328,0.107l-0.43,0.43c0,0,0.036,0.451,0.054,0.678 c-0.13,0.073-0.253,0.157-0.367,0.25c-0.187-0.086-0.561-0.257-0.561-0.257l-0.588,0.154l-0.557,1.213L17,18.044l0.174,0.506 c0,0,0.435,0.198,0.651,0.298c0.01,0.144,0.031,0.282,0.066,0.418c-0.166,0.141-0.496,0.422-0.496,0.422v0.606l0.86,1.019 c0,0,0.501,0.059,0.528,0.043c0.025-0.015,0.08-0.043,0.08-0.043s0.314-0.269,0.473-0.4c0.133,0.059,0.271,0.109,0.415,0.148 c0.017,0.178,0.049,0.535,0.049,0.535l0.431,0.43l1.326-0.12l0.43-0.431c0,0-0.041-0.461-0.062-0.689 c0.107-0.062,0.213-0.131,0.311-0.207c0.174,0.102,0.519,0.3,0.519,0.3l0.588-0.153l0.668-1.154l-0.153-0.588 c0,0-0.445-0.258-0.668-0.387c-0.006-0.127-0.02-0.254-0.046-0.377c0.177-0.15,0.528-0.451,0.528-0.451L23.672,17.159 L23.672,17.159z M20.435,20.049c-0.74,0-1.341-0.601-1.341-1.341s0.601-1.341,1.341-1.341s1.342,0.601,1.342,1.341 S21.175,20.049,20.435,20.049z"></path> <path d="M16.71,15.23l0.408,0.482c0,0,0.236,0.027,0.25,0.021c0.013-0.008,0.037-0.021,0.037-0.021s0.149-0.127,0.225-0.19 c0.062,0.029,0.13,0.053,0.197,0.071c0.008,0.085,0.021,0.254,0.021,0.254l0.203,0.203l0.63-0.058l0.204-0.203 c0,0-0.021-0.218-0.029-0.326c0.051-0.03,0.101-0.063,0.146-0.099c0.083,0.048,0.246,0.142,0.246,0.142l0.278-0.073l0.315-0.546 l-0.073-0.279c0,0-0.211-0.121-0.316-0.183c-0.002-0.061-0.008-0.12-0.021-0.179c0.084-0.07,0.25-0.214,0.25-0.214v-0.289 l-0.411-0.479h-0.287c0,0-0.138,0.116-0.205,0.175c-0.074-0.035-0.152-0.065-0.233-0.088c-0.007-0.081-0.021-0.243-0.021-0.243 l-0.205-0.203l-0.629,0.05l-0.203,0.204c0,0,0.018,0.214,0.025,0.321c-0.062,0.035-0.12,0.074-0.175,0.117 c-0.088-0.039-0.265-0.121-0.265-0.121l-0.278,0.073l-0.265,0.575l-0.01,0.038l0.082,0.24c0,0,0.206,0.095,0.309,0.141 c0.006,0.068,0.017,0.134,0.033,0.197c-0.08,0.067-0.235,0.2-0.235,0.2L16.71,15.23L16.71,15.23z M18.149,13.843 c0.351,0,0.637,0.285,0.637,0.636s-0.286,0.635-0.637,0.635s-0.635-0.284-0.635-0.635S17.799,13.843,18.149,13.843z"></path> <path d="M18.802,12.055c0.003,0.045,0.01,0.089,0.021,0.131c-0.053,0.045-0.156,0.133-0.156,0.133v0.19l0.271,0.319 c0,0,0.156,0.018,0.164,0.014c0.01-0.006,0.025-0.014,0.025-0.014s0.1-0.084,0.148-0.126c0.041,0.019,0.086,0.034,0.131,0.047 c0.004,0.057,0.015,0.168,0.015,0.168l0.135,0.135l0.417-0.038l0.135-0.135c0,0-0.014-0.145-0.021-0.216 c0.035-0.021,0.067-0.041,0.099-0.065c0.055,0.031,0.162,0.094,0.162,0.094l0.184-0.049l0.211-0.361l-0.049-0.185 c0,0-0.141-0.08-0.209-0.121c-0.002-0.04-0.006-0.079-0.016-0.118c0.057-0.047,0.166-0.142,0.166-0.142v-0.191l-0.271-0.317h-0.19 c0,0-0.091,0.078-0.136,0.116c-0.049-0.022-0.102-0.043-0.155-0.058c-0.004-0.055-0.015-0.161-0.015-0.161l-0.135-0.135 l-0.416,0.033l-0.135,0.135c0,0,0.012,0.142,0.018,0.213c-0.041,0.023-0.08,0.05-0.115,0.077c-0.059-0.025-0.176-0.08-0.176-0.08 l-0.186,0.049l-0.174,0.381l-0.007,0.025l0.055,0.159C18.598,11.962,18.733,12.024,18.802,12.055z M19.62,11.59 c0.23,0,0.421,0.189,0.421,0.421c0,0.232-0.188,0.421-0.421,0.421s-0.42-0.188-0.42-0.421C19.2,11.779,19.388,11.59,19.62,11.59z"></path> </g>
                                </svg>
                            </div>
                        </div>
                        <div class="text-muted" style="font-size: 0.875rem;">
                            Enseignants actuels
                        </div>
                    </div>

                    <div class="glass-card" id="cardGroups" style="padding: 1.5rem; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.5rem;">Groupes & Semestres</div>
                                <div style="font-size: 2rem; font-weight: 700; color: var(--color-info);">
                                    <?= $stats['groups'] ?>
                                </div>
                            </div>
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1)); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 1.5rem; height: 1.5rem; color: var(--color-info);" fill="currentColor" viewBox="0 -5 42 42" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M32.639 17.561c0 0-4.592-4.682-10.92-4.682-6.183 0-12.295 4.682-12.295 4.682l-3.433-1.433v4.204c0.541 0.184 0.937 0.682 0.937 1.285 0 0.609-0.404 1.108-0.953 1.288l1.015 2.831h-2.996l1.024-2.855c-0.492-0.209-0.836-0.695-0.836-1.264 0-0.557 0.334-1.031 0.811-1.247v-4.659l-4.993-2.082 21.969-9.861 20.156 9.985-9.486 3.808zM21.469 15.251c6.366 0 9.486 3.37 9.486 3.37v6.99c0 0-3.245 2.621-9.985 2.621s-8.987-2.621-8.987-2.621v-6.99c0 0 3.12-3.37 9.486-3.37zM21.344 26.734c4.412 0 7.989-0.895 7.989-1.997s-3.577-1.997-7.989-1.997-7.988 0.895-7.988 1.997 3.576 1.997 7.988 1.997z"></path></svg>
                            </div>
                        </div>
                        <div class="text-muted" style="font-size: 0.875rem;">
                            Groupes et semestres actuels
                        </div>
                    </div>

                    <div class="glass-card" id="cardRooms" style="padding: 1.5rem; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.5rem;">Salles</div>
                                <div style="font-size: 2rem; font-weight: 700; color: var(--color-warning);">
                                    <?= $stats['rooms'] ?>
                                </div>
                            </div>
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1)); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 1.5rem; height: 1.5rem; color: var(--color-warning);" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                        </div>
                        <div class="text-muted" style="font-size: 0.875rem;">
                            Salles disponibles
                        </div>
                    </div>
                </div>

                <!-- Insights Hub (Charts) -->
                <div class="stats-grid">
                    <div class="chart-container glass-card">
                        <div class="chart-header">
                            <span class="chart-title">Répartition de la charge par semestre</span>
                            <span class="insight-badge badge-blue">Heures / Semestre</span>
                        </div>
                        <div style="flex-grow: 1; position: relative;">
                            <canvas id="workloadChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-container glass-card">
                        <div class="chart-header">
                            <span class="chart-title">Utilisation des types de salles</span>
                            <span class="insight-badge badge-blue">Capacité totale</span>
                        </div>
                        <div style="flex-grow: 1; position: relative;">
                            <canvas id="roomsChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="grid grid-2 gap-2" style="margin-bottom: 2rem; align-items: start;">
                    <!-- Top Professors Chart -->
                    <div class="chart-container glass-card" style="height: 100%;">
                        <div class="chart-header">
                            <span class="chart-title">Volume horaire par enseignant</span>
                            <span class="insight-badge badge-blue">Performance</span>
                        </div>
                        <div style="flex-grow: 1; position: relative;">
                            <canvas id="profLoadChart"></canvas>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="glass-card" style="padding: 1.5rem; height: 100%;">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                Actions rapides
                            </div>
                            <span class="insight-badge badge-blue">Raccourcis</span>
                        </h3>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                            <a href="users.php" class="btn btn-secondary" style="justify-content: flex-start; padding: 1rem; color: var(--color-info);">
                                <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.75rem;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 20V18C13 15.2386 10.7614 13 8 13C5.23858 13 3 15.2386 3 18V20H13ZM13 20H21V19C21 16.0545 18.7614 14 16 14C14.5867 14 13.3103 14.6255 12.4009 15.6311M11 7C11 8.65685 9.65685 10 8 10C6.34315 10 5 8.65685 5 7C5 5.34315 6.34315 4 8 4C9.65685 4 11 5.34315 11 7ZM18 9C18 10.1046 17.1046 11 16 11C14.8954 11 14 10.1046 14 9C14 7.89543 14.8954 7 16 7C17.1046 7 18 7.89543 18 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                                </svg>
                                Utilisateurs
                            </a>
                            <a href="professors.php" class="btn btn-secondary" style="justify-content: flex-start; padding: 1rem; color: var(--color-info);">
                                <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.75rem;" viewBox="0 0 31.979 31.979" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <g> <circle cx="10.086" cy="4.501" r="4.501"></circle> <path d="M26.514,11.48V7.814h-2.959V6.896h-1.813c0-0.574-0.483-1.041-1.082-1.041c-0.6,0-1.084,0.467-1.084,1.041h-1.812v0.918 h-3.417v1.87L14.258,9.68h-2.533l-1.717,1.99L8.349,9.68l-3.643,0.492l-0.238,8.276h1.547l0.082,1.68h0.236v1.026v0.755v8.014 h-0.31l-1.807,0.39v1.666h1.537l1.796-0.293l0.017,0.293h1.987v-1.855v-0.2v-8.014h1.133v8.014v0.2v1.855h1.99l0.016-0.293 l1.795,0.293h1.538v-1.666l-1.806-0.391h-0.311v-8.014v-0.756v-1.025h0.286l0.152-2.972v6.991h12.167v-9.292h1.25V11.48H26.514z M20.659,6.517c0.24,0,0.438,0.195,0.438,0.438s-0.195,0.438-0.438,0.438s-0.438-0.195-0.438-0.438S20.418,6.517,20.659,6.517z M25.514,11.48h-0.792v3.375h0.792v8.292H15.347V8.814h2.417v0.708h5.791V8.814h1.959V11.48z"></path> <path d="M23.672,17.159l-0.868-1.013h-0.607c0,0-0.289,0.248-0.434,0.371c-0.156-0.076-0.32-0.139-0.494-0.186 c-0.014-0.172-0.041-0.515-0.041-0.515l-0.431-0.43l-1.328,0.107l-0.43,0.43c0,0,0.036,0.451,0.054,0.678 c-0.13,0.073-0.253,0.157-0.367,0.25c-0.187-0.086-0.561-0.257-0.561-0.257l-0.588,0.154l-0.557,1.213L17,18.044l0.174,0.506 c0,0,0.435,0.198,0.651,0.298c0.01,0.144,0.031,0.282,0.066,0.418c-0.166,0.141-0.496,0.422-0.496,0.422v0.606l0.86,1.019 c0,0,0.501,0.059,0.528,0.043c0.025-0.015,0.08-0.043,0.08-0.043s0.314-0.269,0.473-0.4c0.133,0.059,0.271,0.109,0.415,0.148 c0.017,0.178,0.049,0.535,0.049,0.535l0.431,0.43l1.326-0.12l0.43-0.431c0,0-0.041-0.461-0.062-0.689 c0.107-0.062,0.213-0.131,0.311-0.207c0.174,0.102,0.519,0.3,0.519,0.3l0.588-0.153l0.668-1.154l-0.153-0.588 c0,0-0.445-0.258-0.668-0.387c-0.006-0.127-0.02-0.254-0.046-0.377c0.177-0.15,0.528-0.451,0.528-0.451L23.672,17.159 L23.672,17.159z M20.435,20.049c-0.74,0-1.341-0.601-1.341-1.341s0.601-1.341,1.341-1.341s1.342,0.601,1.342,1.341 S21.175,20.049,20.435,20.049z"></path> <path d="M16.71,15.23l0.408,0.482c0,0,0.236,0.027,0.25,0.021c0.013-0.008,0.037-0.021,0.037-0.021s0.149-0.127,0.225-0.19 c0.062,0.029,0.13,0.053,0.197,0.071c0.008,0.085,0.021,0.254,0.021,0.254l0.203,0.203l0.63-0.058l0.204-0.203 c0,0-0.021-0.218-0.029-0.326c0.051-0.03,0.101-0.063,0.146-0.099c0.083,0.048,0.246,0.142,0.246,0.142l0.278-0.073l0.315-0.546 l-0.073-0.279c0,0-0.211-0.121-0.316-0.183c-0.002-0.061-0.008-0.12-0.021-0.179c0.084-0.07,0.25-0.214,0.25-0.214v-0.289 l-0.411-0.479h-0.287c0,0-0.138,0.116-0.205,0.175c-0.074-0.035-0.152-0.065-0.233-0.088c-0.007-0.081-0.021-0.243-0.021-0.243 l-0.205-0.203l-0.629,0.05l-0.203,0.204c0,0,0.018,0.214,0.025,0.321c-0.062,0.035-0.12,0.074-0.175,0.117 c-0.088-0.039-0.265-0.121-0.265-0.121l-0.278,0.073l-0.265,0.575l-0.01,0.038l0.082,0.24c0,0,0.206,0.095,0.309,0.141 c0.006,0.068,0.017,0.134,0.033,0.197c-0.08,0.067-0.235,0.2-0.235,0.2L16.71,15.23L16.71,15.23z M18.149,13.843 c0.351,0,0.637,0.285,0.637,0.636s-0.286,0.635-0.635,0.635s-0.635-0.284-0.635-0.635S17.799,13.843,18.149,13.843z"></path> <path d="M18.802,12.055c0.003,0.045,0.01,0.089,0.021,0.131c-0.053,0.045-0.156,0.133-0.156,0.133v0.19l0.271,0.319 c0,0,0.156,0.018,0.164,0.014c0.01-0.006,0.025-0.014,0.025-0.014s0.1-0.084,0.148-0.126c0.041,0.019,0.086,0.034,0.131,0.047 c0.004,0.057,0.015,0.168,0.015,0.168l0.135,0.135l0.417-0.038l0.135-0.135c0,0-0.014-0.145-0.021-0.216 c0.035-0.021,0.067-0.041,0.099-0.065c0.055,0.031,0.162,0.094,0.162,0.094l0.184-0.049l0.211-0.361l-0.049-0.185 c0,0-0.141-0.08-0.209-0.121c-0.002-0.04-0.006-0.079-0.016-0.118c0.057-0.047,0.166-0.142,0.166-0.142v-0.191l-0.271-0.317h-0.19 c0,0-0.091,0.078-0.136,0.116c-0.049-0.022-0.102-0.043-0.155-0.058c-0.004-0.055-0.015-0.161-0.015-0.161l-0.135-0.135 l-0.416,0.033l-0.135,0.135c0,0,0.012,0.142,0.018,0.213c-0.041,0.023-0.08,0.05-0.115,0.077c-0.059-0.025-0.176-0.08-0.176-0.08 l-0.186,0.049l-0.174,0.381l-0.007,0.025l0.055,0.159C18.598,11.962,18.733,12.024,18.802,12.055z M19.62,11.59 c0.23,0,0.421,0.189,0.421,0.421c0,0.232-0.188,0.421-0.421,0.421s-0.42-0.188-0.42-0.421C19.2,11.779,19.388,11.59,19.62,11.59z"></path> </g>
                                </svg>
                                Professeurs
                            </a>
                            <a href="timetables.php" class="btn btn-secondary" style="justify-content: flex-start; padding: 1rem; color: var(--color-info);">
                                <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.75rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                Emplois du temps
                            </a>
                            <a href="weekly_workload.php" class="btn btn-secondary" style="justify-content: flex-start; padding: 1rem; color: var(--color-info);">
                                <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.75rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="20" x2="12" y2="10"></line>
                                    <line x1="18" y1="20" x2="18" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="16"></line>
                                </svg>
                                Charge hebdomadaire
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    <script src="../js/toast.js"></script>
    <script src="../js/modal.js"></script>
    <script src="../js/spinner.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            var professorsData = <?php echo json_encode($recent_professors, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
            var groupsData = <?php echo json_encode($groupsFromExcel, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
            var roomsData = <?php echo json_encode($roomsFromExcel, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;

            // --- RE-ENABLE CARD CLICKS ---
            var professorsCard = document.getElementById('cardProfessors');
            if (professorsCard && window.Modal) {
                professorsCard.addEventListener('click', function () {
                    var html = professorsData.length ? '<div class="table-container"><table class="table"><thead><tr><th>Nom</th><th>Email</th><th>Créé le</th></tr></thead><tbody>' + 
                        professorsData.map(p => `<tr><td><strong>${p.username}</strong></td><td>${p.email||''}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('') + 
                        '</tbody></table></div>' : '<div class="text-muted" style="padding:1rem;text-align:center;">Aucun professeur trouvé.</div>';
                    html += '<div style="margin-top:1.5rem;display:flex;justify-content:flex-end;"><a href="professors.php" class="btn btn-secondary btn-sm">Gérer tout</a></div>';
                    Modal.showContent('Derniers professeurs', html);
                });
            }

            var groupsCard = document.getElementById('cardGroups');
            if (groupsCard && window.Modal) {
                groupsCard.addEventListener('click', function () {
                    var grouped = {};
                    groupsData.forEach(item => {
                        if (!grouped[item.semester]) grouped[item.semester] = [];
                        grouped[item.semester].push(item.name);
                    });
                    var html = Object.keys(grouped).sort().map(sem => `
                        <div style="margin-bottom:1rem;">
                            <div style="font-weight:600;margin-bottom:0.25rem;color:var(--color-primary-blue);">${sem}</div>
                            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                                ${grouped[sem].map(g => `<span class="badge badge-primary">${g}</span>`).join('')}
                            </div>
                        </div>
                    `).join('') || '<div class="text-muted">Aucun groupe trouvé.</div>';
                    Modal.showContent("Groupes par Semestre", html);
                });
            }

            var roomsCard = document.getElementById('cardRooms');
            if (roomsCard && window.Modal) {
                roomsCard.addEventListener('click', function () {
                    var grouped = {};
                    roomsData.forEach(r => {
                        if (!grouped[r.type]) grouped[r.type] = [];
                        grouped[r.type].push(r);
                    });
                    var html = Object.keys(grouped).sort().map(type => `
                        <div style="margin-bottom:1rem;">
                            <div style="font-weight:600;margin-bottom:0.25rem;color:var(--color-warning);">${type}</div>
                            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                                ${grouped[type].map(r => `<span class="badge badge-warning">${r.name} (${r.capacity} place${r.capacity>1?'s':''})</span>`).join('')}
                            </div>
                        </div>
                    `).join('') || '<div class="text-muted">Aucune salle trouvée.</div>';
                    Modal.showContent("Salles par Type", html);
                });
            }

            // --- FETCH INSIGHTS AND RENDER CHARTS ---
            fetch('../api/get_admin_insights.php')
                .then(response => response.json())
                .then(data => {
                    renderWorkloadChart(data.workload_by_semester);
                    renderRoomsChart(data.rooms_distribution);
                    renderProfLoadChart(data.top_professors);
                    
                    // Start live clock with database bounds
                    const hours = data.academic_day || { start_day: '08:00', end_day: '19:00' };
                    setInterval(() => updateCampusStatus(hours), 1000);
                    updateCampusStatus(hours);
                });

            function updateCampusStatus(academicBounds) {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                const statusText = document.getElementById('statusText');
                const pulse = document.querySelector('#liveStatus div');
                
                // Compare current time with academic bounds from DB
                const currentTime = h * 60 + m;
                const [startH, startM] = academicBounds.start_day.split(':').map(Number);
                const [endH, endM] = academicBounds.end_day.split(':').map(Number);
                const startTime = startH * 60 + (startM || 0);
                const endTime = endH * 60 + (endM || 0);

                if (currentTime >= startTime && currentTime <= endTime) {
                    statusText.innerText = "Campus en direct (" + timeStr + ")";
                    statusText.style.color = "#10b981";
                    pulse.style.background = "#10b981";
                    pulse.style.animation = "pulse 2s infinite";
                } else {
                    statusText.innerText = "Campus hors session (" + timeStr + ")";
                    statusText.style.color = "#8a8a8a";
                    pulse.style.background = "#8a8a8a";
                    pulse.style.animation = "none";
                }
            }

            function renderWorkloadChart(data) {
                const ctx = document.getElementById('workloadChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(d => d.semester),
                        datasets: [
                            { label: 'CM', data: data.map(d => d.total_cm), backgroundColor: '#ffb800' },
                            { label: 'TD', data: data.map(d => d.total_td), backgroundColor: '#3b5ccc' },
                            { label: 'TP', data: data.map(d => d.total_tp), backgroundColor: '#10b981' }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animations: {
                            y: {
                                duration: 1500,
                                easing: 'easeOutQuart',
                                from: 500,
                                delay: (context) => {
                                    if (context.type !== 'data' || context.mode !== 'default') return 0;
                                    return context.dataIndex * 150 + context.datasetIndex * 100;
                                }
                            },
                            opacity: {
                                duration: 1000,
                                from: 0,
                                to: 1,
                                delay: (context) => {
                                    if (context.type !== 'data' || context.mode !== 'default') return 0;
                                    return context.dataIndex * 150 + context.datasetIndex * 100;
                                }
                            }
                        },
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#c2c2c2', font: { family: 'Montserrat' } } }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: '#8a8a8a' } },
                            y: { 
                                grid: { color: 'rgba(255,255,255,0.05)' }, 
                                ticks: { color: '#8a8a8a' },
                                beginAtZero: true 
                            }
                        }
                    }
                });
            }

            function renderRoomsChart(data) {
                const ctx = document.getElementById('roomsChart').getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.map(d => d.type === 'CM' ? 'salles CM' : (d.type === 'TP' ? 'salles TP' : d.type)),
                        datasets: [{
                            data: data.map(d => d.total_capacity),
                            backgroundColor: data.map(d => d.type === 'CM' ? '#ffb800' : (d.type === 'TP' ? '#10b981' : '#3b5ccc')),
                            borderWidth: 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#c2c2c2', padding: 20 } }
                        }
                    }
                });
            }

            function renderProfLoadChart(data) {
                const ctx = document.getElementById('profLoadChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.slice(0, 5).map(d => d.name),
                        datasets: [{
                            label: 'Heures totales',
                            data: data.slice(0, 5).map(d => d.total_hours),
                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            borderColor: '#3b5ccc',
                            borderWidth: 1,
                            borderRadius: 5
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        animations: {
                            x: {
                                duration: 1500,
                                easing: 'easeOutQuart',
                                from: 0,
                                delay: (context) => {
                                    if (context.type !== 'data' || context.mode !== 'default') return 0;
                                    return context.dataIndex * 200;
                                }
                            },
                            opacity: {
                                duration: 1000,
                                from: 0,
                                to: 1,
                                delay: (context) => {
                                    if (context.type !== 'data' || context.mode !== 'default') return 0;
                                    return context.dataIndex * 200;
                                }
                            }
                        },
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { 
                                grid: { color: 'rgba(255,255,255,0.05)' }, 
                                ticks: { color: '#8a8a8a' },
                                beginAtZero: true
                            },
                            y: { grid: { display: false }, ticks: { color: '#c2c2c2' } }
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>
