<?php

requireAdmin($identity);

if ($action === 'save') {
    $body = parseContractBody();
    $text = trim((string)($body['text'] ?? ''));
    $changeNote = trim((string)($body['change_note'] ?? ''));

    if ($text === '') {
        errorResponse('Contract text is required', 400);
    }

    $version = trim((string)($body['version'] ?? ''));
    if ($version === '') {
        $version = nextContractVersion($pdo);
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec('UPDATE persona_contract_versions SET is_active = 0 WHERE is_active = 1');

        $insert = $pdo->prepare('INSERT INTO persona_contract_versions (version, content_text, change_note, created_by, is_active, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))');
        $insert->execute([$version, $text, $changeNote, $identity['name']]);
        $newId = (int)$pdo->lastInsertId();

        logSystemEvent($pdo, 'contract_updated', $identity['name'], 'persona_contract', $newId, [
            'version' => $version,
            'change_note' => $changeNote,
        ]);

        $pdo->commit();

        jsonResponse([
            'id' => $newId,
            'version' => $version,
            'text' => $text,
            'change_note' => $changeNote,
            'created_by' => $identity['name'],
            'created_at' => gmdate('Y-m-d H:i:s'),
            'is_active' => 1,
        ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        errorResponse('Could not save contract', 500);
    }
}

if ($action === 'restore') {
    $body = parseContractBody();
    $versionId = (int)($body['version_id'] ?? 0);
    $changeNote = trim((string)($body['change_note'] ?? ''));

    if ($versionId <= 0) {
        errorResponse('version_id is required', 400);
    }

    $sourceStmt = $pdo->prepare('SELECT content_text, version FROM persona_contract_versions WHERE id = ? LIMIT 1');
    $sourceStmt->execute([$versionId]);
    $source = $sourceStmt->fetch(PDO::FETCH_ASSOC);

    if (!$source) {
        errorResponse('Contract version not found', 404);
    }

    $text = (string)$source['content_text'];
    $version = nextContractVersion($pdo);
    if ($changeNote === '') {
        $changeNote = 'Restore from version #' . $versionId . ' (' . $source['version'] . ')';
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec('UPDATE persona_contract_versions SET is_active = 0 WHERE is_active = 1');

        $insert = $pdo->prepare('INSERT INTO persona_contract_versions (version, content_text, change_note, created_by, is_active, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))');
        $insert->execute([$version, $text, $changeNote, $identity['name']]);
        $newId = (int)$pdo->lastInsertId();

        logSystemEvent($pdo, 'contract_restored', $identity['name'], 'persona_contract', $newId, [
            'restored_from_id' => $versionId,
            'version' => $version,
            'change_note' => $changeNote,
        ]);

        $pdo->commit();

        jsonResponse([
            'id' => $newId,
            'version' => $version,
            'text' => $text,
            'change_note' => $changeNote,
            'created_by' => $identity['name'],
            'created_at' => gmdate('Y-m-d H:i:s'),
            'is_active' => 1,
        ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        errorResponse('Could not restore contract version', 500);
    }
}

errorResponse('Unknown action', 400);
