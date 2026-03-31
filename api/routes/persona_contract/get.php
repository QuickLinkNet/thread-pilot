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

// For format=json (persona view), perform replacements
if ($format === 'json') {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $apiPath = dirname($scriptName);
    $baseUrl = $protocol . '://' . $host . $apiPath;

    $replacements = [
        '{{BASE_URL}}' => $baseUrl,
        '{{PERSONA_NAME}}' => $personaName,
        '{{PERSONA_ROLE}}' => $personaRole,
        '{{PERSONA_SKILLS}}' => $personaSkills,
    ];
    $text = str_replace(array_keys($replacements), array_values($replacements), $text);

    // Build expected first reply with persona data
    $firstReply = "Hey! ich bin im Thread-Pilot Team als {$personaName} und verantwortlich für den Bereich {$personaRole}.";

    jsonResponse([
        'id' => isset($active['id']) ? (int)$active['id'] : null,
        'version' => (string)$active['version'],
        'mode' => 'full',
        'requested_by' => $personaName,
        'first_reply_required' => $firstReply,
        'text' => $text,
        'change_note' => (string)($active['change_note'] ?? ''),
        'created_by' => (string)($active['created_by'] ?? 'system'),
        'created_at' => (string)($active['created_at'] ?? ''),
        'source_of_truth' => '/persona-contract',
    ]);
}

// For format=text (admin view), return raw text without replacements but as JSON
jsonResponse([
    'id' => isset($active['id']) ? (int)$active['id'] : null,
    'version' => (string)$active['version'],
    'text' => $text,
    'change_note' => (string)($active['change_note'] ?? ''),
    'created_by' => (string)($active['created_by'] ?? 'system'),
    'created_at' => (string)($active['created_at'] ?? ''),
]);
