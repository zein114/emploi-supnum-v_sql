<?php
require_once '../includes/session.php';
requireRole('admin');

$archiveDir = '../modele/archives_timetables/';
$archives = [];

if (is_dir($archiveDir)) {
    $files = scandir($archiveDir, SCANDIR_SORT_DESCENDING);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'xlsx') {
            $timestamp = filemtime($archiveDir . $file);
            $archives[] = [
                'filename' => $file,
                'displayName' => date("d/m/Y H:i:s", $timestamp),
                'date' => date("d/m/Y H:i", $timestamp),
                'searchDate' => date("Y/m/d H:i", $timestamp), // For flexible searching
                'size' => round(filesize($archiveDir . $file) / 1024, 2) . ' KB'
            ];
        }
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($archives);
