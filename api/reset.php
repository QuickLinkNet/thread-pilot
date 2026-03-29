<?php

require_once __DIR__ . '/config.php';

$dbPath = __DIR__ . '/data/thread-pilot.sqlite';

if (!file_exists($dbPath)) {
    echo json_encode(['ok' => true, 'message' => 'No database found. Nothing to reset.']);
    exit;
}

$pdo = getDB();
$identity = authenticateIdentity($pdo);
requireAdmin($identity);

if (file_exists($dbPath)) {
    unlink($dbPath);
}

if (file_exists($dbPath . '-shm')) {
    unlink($dbPath . '-shm');
}

if (file_exists($dbPath . '-wal')) {
    unlink($dbPath . '-wal');
}

echo json_encode(['ok' => true, 'message' => 'Database deleted. Run install.php to recreate.']);
