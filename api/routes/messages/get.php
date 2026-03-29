<?php

$action = $_GET['action'] ?? '';

if ($action === 'send') {
    $content = trim((string)($_GET['content'] ?? ''));
    $type = $_GET['type'] ?? 'message';
    $taskIdRaw = $_GET['task_id'] ?? null;

    if ($content === '') {
        errorResponse('Missing content');
    }

    $message = sendMessageRecord($pdo, $personaName, $content, [
        'type' => $type,
        'task_id' => $taskIdRaw,
    ]);
    jsonResponse($message);
}

$sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
$forPersona = trim((string)($_GET['for'] ?? ''));
if ($forPersona === '') {
    $forPersona = getRequestedPersonaName();
}

$messages = fetchMessages($pdo, $sinceId, $forPersona);

if ($action === 'sync') {
    $lastId = getLastMessageId($messages, $sinceId);
    jsonResponse([
        'items' => $messages,
        'since_id' => $sinceId,
        'last_id' => $lastId,
        'count' => count($messages),
    ]);
}

jsonResponse($messages);
