<?php
// view_logs_protected.php
// WARNING: Add a password check here or IP restriction!

$logFile = __DIR__ . '/error_logs.txt';

if (file_exists($logFile)) {
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50); // Get last 50 entries
    
    echo "<h1>Last 50 Error Logs</h1><pre>";
    foreach ($lastLines as $line) {
        echo htmlspecialchars($line);
    }
    echo "</pre>";
} else {
    echo "No log file found.";
}