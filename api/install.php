<?php

require_once __DIR__ . '/config.php';

$dbPath = __DIR__ . '/data/thread-pilot.sqlite';
$dataDir = dirname($dbPath);

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

if (file_exists($dbPath)) {
    echo json_encode(['ok' => false, 'error' => 'Database already exists. Use reset.php to recreate.']);
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA busy_timeout=5000');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            skills TEXT NOT NULL DEFAULT "[]",
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT "message",
            task_id INTEGER NULL,
            mentions TEXT NOT NULL DEFAULT "[]",
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            area TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT "",
            assignee TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT "open",
            priority TEXT NOT NULL DEFAULT "normal",
            locked_by TEXT NULL,
            depends_on TEXT NOT NULL DEFAULT "[]",
            deleted_at DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS task_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            actor TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_payload TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NULL,
            payload TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS persona_contract_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            content_text TEXT NOT NULL,
            change_note TEXT NOT NULL DEFAULT "",
            created_by TEXT NOT NULL DEFAULT "system",
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS first_message_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            content_text TEXT NOT NULL,
            change_note TEXT NOT NULL DEFAULT "",
            created_by TEXT NOT NULL DEFAULT "system",
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $adminName = trim((string)envValue('THREAD_PILOT_ADMIN_NAME', 'Admin'));
    if ($adminName === '') {
        $adminName = 'Admin';
    }
    $adminRole = trim((string)envValue('THREAD_PILOT_ADMIN_ROLE', 'projectmanager'));
    if ($adminRole === '') {
        $adminRole = 'projectmanager';
    }

    $personas = [
        ['name' => $adminName, 'role' => $adminRole],
    ];

    $stmt = $pdo->prepare('INSERT INTO personas (name, role, token, skills) VALUES (?, ?, ?, ?)');

    $tokens = [];
    foreach ($personas as $persona) {
        $token = bin2hex(random_bytes(32));
        $stmt->execute([$persona['name'], $persona['role'], $token, '[]']);
        $tokens[$persona['name']] = $token;
    }

    $seedContractStmt = $pdo->prepare('
        INSERT INTO persona_contract_versions (version, content_text, change_note, created_by, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime("now"))
    ');
    $seedContractStmt->execute([
        getDefaultPersonaContractVersion(),
        getDefaultPersonaContractText(),
        'Initial contract seed',
        'system',
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'Database created successfully',
        'admin' => ['name' => $adminName, 'role' => $adminRole],
        'tokens' => $tokens
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Installation failed: ' . $e->getMessage()]);
}



