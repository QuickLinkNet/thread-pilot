<?php

if ($action === 'history') {
    requireAdmin($identity);

    $limit = (int)($_GET['limit'] ?? 50);
    if ($limit < 1) {
        $limit = 1;
    }
    if ($limit > 200) {
        $limit = 200;
    }

    $stmt = $pdo->prepare('SELECT id, version, content_text, change_note, created_by, is_active, created_at FROM persona_contract_versions ORDER BY id DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse($rows);
}

$active = getActivePersonaContractRow($pdo);
$text = (string)$active['content_text'];

if ($format === 'text') {
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
    exit;
}

jsonResponse([
    'id' => isset($active['id']) ? (int)$active['id'] : null,
    'version' => (string)$active['version'],
    'mode' => 'full',
    'requested_by' => $personaName,
    'first_reply_required' => 'ok, ich warte auf die Anweisung: Chat',
    'text' => $text,
    'change_note' => (string)($active['change_note'] ?? ''),
    'created_by' => (string)($active['created_by'] ?? 'system'),
    'created_at' => (string)($active['created_at'] ?? ''),
    'source_of_truth' => '/persona-contract',
]);
