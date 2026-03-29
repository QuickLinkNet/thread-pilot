<?php

$action = $_GET['action'] ?? '';

if ($action === 'send') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $content = trim((string)($input['content'] ?? ''));

    if ($content === '') {
        errorResponse('Missing content');
    }

    $message = sendMessageRecord($pdo, $personaName, $content, $input);
    jsonResponse($message);
}

errorResponse('Method not allowed', 405);
