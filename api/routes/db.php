<?php

$identity = authenticateIdentity($pdo);
requireAdmin($identity);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$action = trim((string)($_GET['action'] ?? 'tables'));

function listReadableTables($pdo) {
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    return array_values(array_filter(array_map('strval', $tables), function ($name) {
        return $name !== '';
    }));
}

function assertKnownTable($tableName, $tables) {
    if (!in_array($tableName, $tables, true)) {
        errorResponse('Unknown table', 404);
    }
}

if ($action === 'tables') {
    $tables = listReadableTables($pdo);
    $result = [];
    foreach ($tables as $tableName) {
        $safe = '"' . str_replace('"', '""', $tableName) . '"';
        $count = (int)$pdo->query("SELECT COUNT(*) FROM {$safe}")->fetchColumn();
        $result[] = [
            'name' => $tableName,
            'row_count' => $count,
        ];
    }
    jsonResponse($result);
}

if ($action === 'schema') {
    $table = trim((string)($_GET['table'] ?? ''));
    if ($table === '') {
        errorResponse('Missing table');
    }

    $tables = listReadableTables($pdo);
    assertKnownTable($table, $tables);

    $safe = '"' . str_replace('"', '""', $table) . '"';
    $stmt = $pdo->query("PRAGMA table_info({$safe})");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse([
        'table' => $table,
        'columns' => $columns,
    ]);
}

if ($action === 'rows') {
    $table = trim((string)($_GET['table'] ?? ''));
    if ($table === '') {
        errorResponse('Missing table');
    }

    $tables = listReadableTables($pdo);
    assertKnownTable($table, $tables);

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $limit = max(1, min($limit, 200));
    $offset = max(0, $offset);

    $safe = '"' . str_replace('"', '""', $table) . '"';

    $total = (int)$pdo->query("SELECT COUNT(*) FROM {$safe}")->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM {$safe} LIMIT ? OFFSET ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $columnsStmt = $pdo->query("PRAGMA table_info({$safe})");
    $columnsInfo = $columnsStmt->fetchAll(PDO::FETCH_ASSOC);
    $columns = array_map(function ($col) {
        return (string)$col['name'];
    }, $columnsInfo);

    jsonResponse([
        'table' => $table,
        'limit' => $limit,
        'offset' => $offset,
        'total' => $total,
        'columns' => $columns,
        'rows' => $rows,
    ]);
}

errorResponse('Unknown action', 400);
