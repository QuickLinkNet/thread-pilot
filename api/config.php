<?php

require_once __DIR__ . '/contract_default.php';

function loadDotEnvFromFile($path) {
    static $loaded = [];
    if (isset($loaded[$path])) {
        return;
    }
    $loaded[$path] = true;

    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim((string)$line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        $value = trim($value, "\"'");

        if ($key === '') {
            continue;
        }

        if (getenv($key) === false) {
            putenv($key . '=' . $value);
        }
        if (!isset($_ENV[$key])) {
            $_ENV[$key] = $value;
        }
        if (!isset($_SERVER[$key])) {
            $_SERVER[$key] = $value;
        }
    }
}

function envValue($key, $default = null) {
    static $bootstrapped = false;
    if (!$bootstrapped) {
        $bootstrapped = true;
        loadDotEnvFromFile(__DIR__ . '/.env');
        loadDotEnvFromFile(dirname(__DIR__) . '/.env');
    }

    $serverValue = $_SERVER[$key] ?? null;
    if ($serverValue !== null && $serverValue !== '') {
        return $serverValue;
    }

    $envValue = $_ENV[$key] ?? null;
    if ($envValue !== null && $envValue !== '') {
        return $envValue;
    }

    $getenvValue = getenv($key);
    if ($getenvValue !== false && $getenvValue !== '') {
        return $getenvValue;
    }

    return $default;
}

function getDB() {
    $dbPath = __DIR__ . '/data/thread-pilot.sqlite';
    $dataDir = dirname($dbPath);

    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0755, true) && !is_dir($dataDir)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Database directory could not be created']);
            exit;
        }
    }

    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA busy_timeout=5000');
        ensureSchema($pdo);

        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Database connection failed']);
        exit;
    }
}

function ensureSchema($pdo) {
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
            recipient TEXT NOT NULL DEFAULT "all",
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
            area TEXT NOT NULL DEFAULT "",
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

    $stmt = $pdo->query('PRAGMA table_info(tasks)');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'name');

    if (!in_array('tags', $columnNames, true)) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT ""');
    }

    if (!in_array('deleted_at', $columnNames, true)) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN deleted_at DATETIME NULL');
    }

    if (!in_array('locked_by', $columnNames, true)) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN locked_by TEXT NULL');
    }

    if (!in_array('depends_on', $columnNames, true)) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN depends_on TEXT NOT NULL DEFAULT "[]"');
    }

    if (!in_array('priority', $columnNames, true)) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT "normal"');
    }

    if (in_array('area', $columnNames, true)) {
        $pdo->exec('UPDATE tasks SET tags = area WHERE (tags IS NULL OR tags = "") AND area IS NOT NULL AND area != ""');
    }

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

    $msgStmt = $pdo->query('PRAGMA table_info(messages)');
    $msgColumns = $msgStmt->fetchAll(PDO::FETCH_ASSOC);
    $msgColumnNames = array_column($msgColumns, 'name');

    if (!in_array('type', $msgColumnNames, true)) {
        $pdo->exec('ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT "message"');
    }

    if (!in_array('task_id', $msgColumnNames, true)) {
        $pdo->exec('ALTER TABLE messages ADD COLUMN task_id INTEGER NULL');
    }

    if (!in_array('mentions', $msgColumnNames, true)) {
        $pdo->exec('ALTER TABLE messages ADD COLUMN mentions TEXT NOT NULL DEFAULT "[]"');
    }

    if (!in_array('recipient', $msgColumnNames, true)) {
        $pdo->exec('ALTER TABLE messages ADD COLUMN recipient TEXT NOT NULL DEFAULT "all"');
    }

    $pdo->exec('UPDATE messages SET recipient = "all" WHERE recipient IS NULL OR trim(recipient) = ""');

    $personaStmt = $pdo->query('PRAGMA table_info(personas)');
    $personaColumns = $personaStmt->fetchAll(PDO::FETCH_ASSOC);
    $personaColumnNames = array_column($personaColumns, 'name');
    if (!in_array('skills', $personaColumnNames, true)) {
        $pdo->exec('ALTER TABLE personas ADD COLUMN skills TEXT NOT NULL DEFAULT "[]"');
    }

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

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_persona_contract_active ON persona_contract_versions(is_active)');

    ensurePersonaContractSeed($pdo);
    ensurePersonaContractMigrations($pdo);
}

function ensurePersonaContractSeed($pdo) {
    $count = (int)$pdo->query('SELECT COUNT(*) FROM persona_contract_versions')->fetchColumn();
    if ($count > 0) {
        $activeCount = (int)$pdo->query('SELECT COUNT(*) FROM persona_contract_versions WHERE is_active = 1')->fetchColumn();
        if ($activeCount === 0) {
            $latestId = (int)$pdo->query('SELECT id FROM persona_contract_versions ORDER BY id DESC LIMIT 1')->fetchColumn();
            if ($latestId > 0) {
                $stmt = $pdo->prepare('UPDATE persona_contract_versions SET is_active = 1 WHERE id = ?');
                $stmt->execute([$latestId]);
            }
        }
        return;
    }

    $stmt = $pdo->prepare('
        INSERT INTO persona_contract_versions (version, content_text, change_note, created_by, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime("now"))
    ');
    $stmt->execute([
        getDefaultPersonaContractVersion(),
        getDefaultPersonaContractText(),
        'Initial contract seed',
        'system',
    ]);
}

function ensurePersonaContractMigrations($pdo) {
    $stmt = $pdo->query('
        SELECT id, version, content_text, created_by
        FROM persona_contract_versions
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
    ');
    $active = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$active) {
        return;
    }

    $isLegacyDefault =
        (string)($active['version'] ?? '') === '2026-03-20.1'
        && strtolower((string)($active['created_by'] ?? '')) === 'system';


    if (!$isLegacyDefault) {
        return;
    }

    $newVersion = getDefaultPersonaContractVersion();
    if ((string)($active['version'] ?? '') === $newVersion) {
        return;
    }

    $existing = $pdo->prepare('SELECT id FROM persona_contract_versions WHERE version = ? LIMIT 1');
    $existing->execute([$newVersion]);
    $existingRow = $existing->fetch(PDO::FETCH_ASSOC);
    if ($existingRow) {
        $pdo->exec('UPDATE persona_contract_versions SET is_active = 0 WHERE is_active = 1');
        $activate = $pdo->prepare('UPDATE persona_contract_versions SET is_active = 1 WHERE id = ?');
        $activate->execute([(int)$existingRow['id']]);
        return;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec('UPDATE persona_contract_versions SET is_active = 0 WHERE is_active = 1');
        $insert = $pdo->prepare('
            INSERT INTO persona_contract_versions (version, content_text, change_note, created_by, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, datetime("now"))
        ');
        $insert->execute([
            $newVersion,
            getDefaultPersonaContractText(),
            'Auto-migration: align contract with delta-sync protocol',
            'system',
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
    }
}
function getActivePersonaContractRow($pdo) {
    $stmt = $pdo->query('
        SELECT id, version, content_text, change_note, created_by, is_active, created_at
        FROM persona_contract_versions
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
    ');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        return $row;
    }

    ensurePersonaContractSeed($pdo);
    ensurePersonaContractMigrations($pdo);
    $stmt = $pdo->query('
        SELECT id, version, content_text, change_note, created_by, is_active, created_at
        FROM persona_contract_versions
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
    ');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        return $row;
    }

    return [
        'id' => null,
        'version' => getDefaultPersonaContractVersion(),
        'content_text' => getDefaultPersonaContractText(),
        'change_note' => 'Fallback contract',
        'created_by' => 'system',
        'is_active' => 1,
        'created_at' => date('Y-m-d H:i:s'),
    ];
}

function isAdminRole($role) {
    $normalized = strtolower(trim((string)$role));
    return in_array($normalized, ['admin', 'projectmanager', 'project_manager', 'owner'], true);
}

function authenticateIdentity($pdo) {
    $token = $_SERVER['HTTP_X_THREAD_TOKEN']
        ?? $_SERVER['HTTP_X_CHAT_TOKEN']
        ?? $_GET['token']
        ?? '';

    if (!$token) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Missing token']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT name, role, skills FROM personas WHERE token = ?');
    $stmt->execute([$token]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid token']);
        exit;
    }

    $requestedPersona = getRequestedPersonaName();
    if ($requestedPersona !== '' && strcasecmp($requestedPersona, (string)$result['name']) !== 0) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Persona header does not match token owner']);
        exit;
    }

    return [
        'name' => (string)$result['name'],
        'role' => (string)$result['role'],
        'skills' => (string)($result['skills'] ?? ''),
    ];
}

function authenticate($pdo) {
    $identity = authenticateIdentity($pdo);
    return $identity['name'];
}

function requireAdmin($identity) {
    if (!isAdminRole($identity['role'] ?? '')) {
        errorResponse('Admin role required', 403);
    }
}

function jsonResponse($data, $ok = true) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => $ok, 'data' => $data]);
    exit;
}

function errorResponse($message, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

function setCorsHeaders() {
    //header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-THREAD-TOKEN, X-THREAD-PERSONA, X-CHAT-TOKEN, X-CHAT-PERSONA');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function getRequestedPersonaName() {
    $headerPersona = trim((string)($_SERVER['HTTP_X_THREAD_PERSONA'] ?? ''));
    if ($headerPersona !== '') {
        return $headerPersona;
    }

    $legacyHeaderPersona = trim((string)($_SERVER['HTTP_X_CHAT_PERSONA'] ?? ''));
    if ($legacyHeaderPersona !== '') {
        return $legacyHeaderPersona;
    }

    return '';
}

function logSystemEvent($pdo, $eventType, $actor, $entityType, $entityId, $payload) {
    $stmt = $pdo->prepare('
        INSERT INTO events (event_type, actor, entity_type, entity_id, payload, created_at)
        VALUES (?, ?, ?, ?, ?, datetime("now"))
    ');
    $safeActor = trim((string)$actor) !== '' ? $actor : 'system';
    $stmt->execute([
        (string)$eventType,
        $safeActor,
        (string)$entityType,
        $entityId !== null ? (int)$entityId : null,
        json_encode($payload),
    ]);
}









