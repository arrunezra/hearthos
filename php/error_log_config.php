<?php
// bootstrap.php

// 1. Setup paths
$logFile = __DIR__ . '/error_logs.txt';
$maxSize = 5 * 1024 * 1024; // 5MB in bytes

// 2. Log Rotation Logic
if (file_exists($logFile) && filesize($logFile) > $maxSize) {
    $oldFile = __DIR__ . '/error_logs_old.txt';
    
    // Delete the previous "old" backup if it exists
    if (file_exists($oldFile)) {
        unlink($oldFile);
    }
    
    // Rename current log to "old" and start fresh
    rename($logFile, $oldFile);
    touch($logFile); // Create a new empty file
    chmod($logFile, 0666); // Ensure it's writable
}

// 3. Global PHP Error Settings
ini_set('log_errors', 1);
ini_set('error_log', $logFile);
ini_set('display_errors', 0); // Hide from public
error_reporting(E_ALL); // Capture everything