<?php

if ($action === 'restore') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? (int)$input['id'] : 0;

    if ($id <= 0) {
        errorResponse('Invalid id');
    }

    $restored = restoreFirstMessage($pdo, $id);

    if (!$restored) {
        errorResponse('Version not found', 404);
    }

    jsonResponse([
        'ok' => true,
        'message' => 'Version restored successfully',
        'data' => [
            'id' => (int)$restored['id'],
            'version' => $restored['version'],
            'text' => $restored['content_text'],
            'change_note' => $restored['change_note'],
            'created_by' => $restored['created_by'],
            'created_at' => $restored['created_at'],
        ]
    ]);
}

$input = json_decode(file_get_contents('php://input'), true);
$text = trim((string)($input['text'] ?? ''));
$changeNote = trim((string)($input['change_note'] ?? ''));

if ($text === '') {
    errorResponse('First message text cannot be empty');
}

$createdBy = $identity['name'];

$saved = saveFirstMessage($pdo, $text, $changeNote, $createdBy);

jsonResponse([
    'ok' => true,
    'message' => 'First message saved successfully',
    'data' => $saved
]);
