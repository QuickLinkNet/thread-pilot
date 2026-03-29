<?php

$personaName = authenticate($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
$limit = max(1, min($limit, 500));

$sql = '
    SELECT id, event_type, actor, entity_type, entity_id, payload, created_at
    FROM events
';
$params = [];

if ($sinceId > 0) {
    $sql .= ' WHERE id > ?';
    $params[] = $sinceId;
}

$sql .= ' ORDER BY id ASC LIMIT ?';
$params[] = $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$row) {
    $decoded = json_decode((string)$row['payload'], true);
    $row['payload'] = $decoded !== null ? $decoded : ['raw' => $row['payload']];
}

jsonResponse($rows);
