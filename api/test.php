<?php

require_once __DIR__ . '/config.php';

try {
    $pdo = getDB();

    $stmt = $pdo->query('SELECT COUNT(*) as count FROM personas');
    $personas = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->query('SELECT COUNT(*) as count FROM messages');
    $messages = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->query('SELECT COUNT(*) as count FROM tasks');
    $tasks = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'database' => 'connected',
        'personas' => $personas['count'],
        'messages' => $messages['count'],
        'tasks' => $tasks['count']
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
