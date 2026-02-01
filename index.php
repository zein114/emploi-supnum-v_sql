<?php
/**
 * Decision page for SupNum Portal
 * Users choose between Student (Timetable) and Administration (Login)
 */

if (isset($_GET['clear'])) {
    setcookie('user_role', '', time() - 3600, '/');
    header('Location: index.php');
    exit;
}

// Check if decision is already made
if (isset($_COOKIE['user_role'])) {
    if ($_COOKIE['user_role'] === 'student') {
        header('Location: timetable.php');
        exit;
    } elseif ($_COOKIE['user_role'] === 'admin') {
        header('Location: login.php');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue - SupNum Portal</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/png" href="assets/logo-supnum.png">
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: var(--color-bg-main);
            color: var(--text-muted);
            font-family: 'Plus Jakarta Sans', sans-serif;
            overflow: hidden;
        }

        .container-decision {
            text-align: center;
            max-width: 900px;
            width: 100%;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4rem;
        }

        .logo-img {
            height: 140px;
            width: auto;
        }

        .buttons-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
            width: 100%;
        }

        .decision-btn {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2rem;
            padding: 4.5rem 2rem;
            background: var(--color-bg-card);
            border: 1px solid var(--border-color);
            border-radius: 1.5rem;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            transition: none;
            overflow: hidden;
        }

        /* Border Animation: coloring from left to right */
        .decision-btn::after {
            content: '';
            position: absolute;
            inset: 0;
            border: 2px solid var(--color-primary-blue);
            border-radius: inherit;
            clip-path: inset(0 100% 0 0);
            transition: clip-path 0.5s ease-in-out;
            pointer-events: none;
        }

        .decision-btn:hover::after {
            clip-path: inset(0 0 0 0);
        }

        .btn-icon-wrapper {
            width: 110px;
            height: 110px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-icon-wrapper svg {
            width: 100%;
            height: 100%;
            fill: var(--text-muted);
        }

        .btn-icon-wrapper svg#_x32_ path {
            fill: var(--text-muted) !important;
        }

        .btn-label {
            font-size: 1.75rem;
            font-weight: 800;
            letter-spacing: 1px;
        }

        @media (max-width: 768px) {
            .buttons-grid {
                grid-template-columns: 1fr;
                gap: 2rem;
            }
            .decision-btn {
                padding: 3.5rem 2rem;
            }
        }
    </style>
</head>
<body>

    <div class="container-decision">
        <div class="logo-container">
            <img src="assets/logo-supnum.png" alt="SupNum Logo" class="logo-img">
        </div>

        <div class="buttons-grid">
            <!-- Student Button -->
            <div onclick="setRole('student', 'timetable.php')" class="decision-btn">
                <div class="btn-icon-wrapper">
                    <svg fill="currentColor" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
                        <path d="M226.52979,56.41016l-96-32a8.00672,8.00672,0,0,0-5.05958,0L29.6239,56.35889l-.00976.00341-.14393.04786c-.02819.00927-.053.02465-.08105.03442a7.91407,7.91407,0,0,0-1.01074.42871c-.03748.019-.07642.03516-.11353.05469a7.97333,7.97333,0,0,0-.93139.58325c-.06543.04688-.129.09522-.19288.144a8.08459,8.08459,0,0,0-.81872.71119c-.0238.02416-.04443.05053-.06787.0747a8.0222,8.0222,0,0,0-.661.783c-.04163.05567-.08472.10986-.12476.16675a8.00177,8.00177,0,0,0-.56714.92993c-.02588.04981-.04809.10083-.073.15112a7.97024,7.97024,0,0,0-.40515.97608c-.01062.03149-.0238.06128-.03405.093a7.95058,7.95058,0,0,0-.26282,1.08544c-.01331.07666-.02405.15308-.035.23A8.02888,8.02888,0,0,0,24,64v80a8,8,0,0,0,16,0V75.09985L73.58521,86.29492a63.9717,63.9717,0,0,0,20.42944,87.89746,95.88087,95.88087,0,0,0-46.48389,37.4375,7.9997,7.9997,0,1,0,13.40235,8.73828,80.023,80.023,0,0,1,134.1333,0,7.99969,7.99969,0,1,0,13.40234-8.73828,95.87941,95.87941,0,0,0-46.4834-37.43725,63.972,63.972,0,0,0,20.42944-87.89771l44.115-14.70508a8.0005,8.0005,0,0,0,0-15.17968ZM128,168A47.99154,47.99154,0,0,1,89.34875,91.54932l36.12146,12.04052a8.00672,8.00672,0,0,0,5.05958,0l36.12146-12.04052A47.99154,47.99154,0,0,1,128,168Z"></path>
                    </svg>
                </div>
                <span class="btn-label">Étudiant</span>
            </div>

            <!-- Admin Button -->
            <div onclick="setRole('admin', 'login.php')" class="decision-btn">
                <div class="btn-icon-wrapper">
                    <svg height="200px" width="200px" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="currentColor">
                        <style type="text/css"> .st0{fill:currentColor !important;} </style>
                        <path class="st0" d="M157.604,321.598c7.26-2.232,10.041-6.696,10.6-10.046c-0.559-4.469-3.143-6.279-3.986-14.404 c-0.986-9.457,6.91-32.082,9.258-36.119c-0.32-0.772-0.65-1.454-0.965-2.247c-11.002-6.98-22.209-19.602-27.359-42.416 c-2.754-12.197-0.476-24.661,6.121-35.287c0,0-7.463-52.071,3.047-86.079c-9.818-4.726-20.51-3.93-35.164-2.466 c-11.246,1.126-12.842,3.516-21.48,2.263c-9.899-1.439-17.932-4.444-20.348-5.654c-1.392-0.694-14.449,10.89-18.084,20.35 c-11.531,29.967-8.435,50.512-5.5,66.057c-0.098,1.592-0.224,3.178-0.224,4.787l2.68,11.386c0.01,0.12,0,0.232,0.004,0.346 c-5.842,5.24-9.363,12.815-7.504,21.049c3.828,16.934,12.07,23.802,20.186,26.777c5.383,15.186,10.606,24.775,16.701,31.222 c1.541,7.027,2.902,16.57,1.916,26.032C83.389,336.78,0,315.904,0,385.481c0,9.112,25.951,23.978,88.818,28.259 c-0.184-1.342-0.31-2.695-0.31-4.078C88.508,347.268,129.068,330.379,157.604,321.598z"></path>
                        <path class="st0" d="M424.5,297.148c-0.986-9.457,0.371-18.995,1.912-26.011c6.106-6.458,11.328-16.052,16.713-31.246 c8.113-2.977,16.35-9.848,20.174-26.774c1.77-7.796-1.293-15.006-6.59-20.2c3.838-12.864,18.93-72.468-26.398-84.556 c-15.074-18.839-28.258-18.087-50.871-15.827c-11.246,1.126-12.844,3.516-21.477,2.263c-1.89-0.275-3.682-0.618-5.41-0.984 c1.658,2.26,3.238,4.596,4.637,7.092c15.131,27.033,11.135,61.27,6.381,82.182c5.67,10.21,7.525,21.944,4.963,33.285 c-5.15,22.8-16.352,35.419-27.348,42.4c-0.551,1.383-2.172,4.214,0.06,7.006c2.039,3.305,2.404,2.99,4.627,5.338 c1.539,7.027,2.898,16.57,1.91,26.032c-0.812,7.85-14.352,14.404-10.533,17.576c3.756,1.581,8.113,3.234,13,5.028 c28.025,10.29,74.928,27.516,74.928,89.91c0,1.342-0.117,2.659-0.291,3.96C486.524,409.195,512,394.511,512,385.481 C512,315.904,428.613,336.78,424.5,297.148z"></path>
                        <path class="st0" d="M301.004,307.957c-1.135-10.885,0.432-21.867,2.201-29.956c7.027-7.423,13.047-18.476,19.244-35.968 c9.34-3.427,18.826-11.335,23.23-30.826c2.028-8.976-1.494-17.276-7.586-23.256c4.412-14.81,21.785-83.437-30.398-97.353 c-17.354-21.692-32.539-20.825-58.57-18.222c-12.951,1.294-14.791,4.048-24.731,2.603c-11.4-1.657-20.646-5.117-23.428-6.508 c-1.602-0.803-16.637,12.538-20.826,23.428c-13.27,34.5-9.705,58.159-6.33,76.056c-0.111,1.833-0.264,3.658-0.264,5.511 l3.092,13.11c0.01,0.135,0,0.264,0.004,0.399c-6.726,6.03-10.777,14.752-8.636,24.232c4.402,19.498,13.894,27.404,23.238,30.828 c6.199,17.485,12.207,28.533,19.231,35.956c1.773,8.084,3.34,19.076,2.205,29.966c-4.738,45.626-100.744,21.593-100.744,101.706 c0,12.355,41.4,33.902,144.906,33.902c103.506,0,144.906-21.547,144.906-33.902C401.748,329.549,305.742,353.583,301.004,307.957z M240.039,430.304l-26.276-106.728l32.324,13.453l-1.738,15.619l5.135-0.112L240.039,430.304z M276.209,430.304l-9.447-77.768 l5.135,0.112l-1.738-15.619l32.324-13.453L276.209,430.304z"></path>
                    </svg>
                </div>
                <span class="btn-label">Administration</span>
            </div>
        </div>
    </div>

    <script src="js/theme-switcher.js"></script>
    <script>
        function setRole(role, redirect) {
            const d = new Date();
            d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
            const expires = "expires=" + d.toUTCString();
            document.cookie = "user_role=" + role + ";" + expires + ";path=/";
            window.location.href = redirect;
        }
    </script>
</body>
</html>
