<?php

if ($action === 'history') {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $limit = max(1, min($limit, 200));

    $history = getFirstMessageHistory($pdo, $limit);

    jsonResponse($history);
}

$current = getActiveFirstMessage($pdo);

if (!$current) {
    errorResponse('No active first message found', 404);
}

if ($format === 'text') {
    header('Content-Type: text/plain; charset=utf-8');
    echo $current['content_text'];
    exit;
}

jsonResponse([
    'id' => (int)$current['id'],
    'version' => $current['version'],
    'text' => $current['content_text'],
    'change_note' => $current['change_note'],
    'created_by' => $current['created_by'],
    'created_at' => $current['created_at'],
]);
