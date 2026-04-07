<?php

function assertFirstMessageTableExists($pdo): void
{
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='first_message_versions'");
    if (!$stmt->fetch()) {
        errorResponse('First message table does not exist. Run migration first.', 500);
    }
}

function getActiveFirstMessage($pdo): ?array
{
    assertFirstMessageTableExists($pdo);
    $stmt = $pdo->query('SELECT * FROM first_message_versions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function getFirstMessageHistory($pdo, int $limit = 50): array
{
    assertFirstMessageTableExists($pdo);
    $stmt = $pdo->prepare('SELECT * FROM first_message_versions ORDER BY created_at DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function generateFirstMessageVersion(): string
{
    return date('Y-m-d.H:i:s');
}

function saveFirstMessage($pdo, string $text, string $changeNote, string $createdBy): array
{
    assertFirstMessageTableExists($pdo);

    $version = generateFirstMessageVersion();

    $pdo->exec('UPDATE first_message_versions SET is_active = 0 WHERE is_active = 1');

    $stmt = $pdo->prepare('
        INSERT INTO first_message_versions (version, content_text, change_note, created_by, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime("now"))
    ');
    $stmt->execute([$version, $text, $changeNote, $createdBy]);

    return [
        'id' => (int)$pdo->lastInsertId(),
        'version' => $version,
        'content_text' => $text,
        'change_note' => $changeNote,
        'created_by' => $createdBy,
        'is_active' => 1,
        'created_at' => date('Y-m-d H:i:s'),
    ];
}

function restoreFirstMessage($pdo, int $id): ?array
{
    assertFirstMessageTableExists($pdo);

    $stmt = $pdo->prepare('SELECT * FROM first_message_versions WHERE id = ?');
    $stmt->execute([$id]);
    $version = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$version) {
        return null;
    }

    $pdo->exec('UPDATE first_message_versions SET is_active = 0 WHERE is_active = 1');

    $updateStmt = $pdo->prepare('UPDATE first_message_versions SET is_active = 1 WHERE id = ?');
    $updateStmt->execute([$id]);

    return $version;
}
