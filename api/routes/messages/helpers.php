<?php

function messageById($pdo, $messageId) {
    $stmt = $pdo->prepare('SELECT * FROM messages WHERE id = ?');
    $stmt->execute([$messageId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function getMessageTableColumns($pdo) {
    static $columns = null;
    if ($columns !== null) {
        return $columns;
    }

    $stmt = $pdo->query('PRAGMA table_info(messages)');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columns = array_column($rows, 'name');
    return $columns;
}

function getPersonaMap($pdo) {
    $stmt = $pdo->query('SELECT name FROM personas');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $map = [];
    foreach ($rows as $row) {
        $name = trim((string)$row['name']);
        if ($name !== '') {
            $map[strtolower($name)] = $name;
        }
    }
    return $map;
}

function extractMentionNames($content, $personaMap) {
    preg_match_all('/@([\p{L}\p{N}_\.\-]+)/u', $content, $matches);
    $rawMentions = $matches[1] ?? [];

    $mentions = [];
    foreach ($rawMentions as $mention) {
        $key = strtolower(trim((string)$mention));
        if ($key === 'all') {
            continue;
        }
        if (isset($personaMap[$key])) {
            $mentions[$personaMap[$key]] = true;
        }
    }
    return array_keys($mentions);
}

function normalizeMentions($inputMentions, $content, $personaMap) {
    $mentions = [];

    if (is_array($inputMentions)) {
        foreach ($inputMentions as $mention) {
            $value = strtolower(trim((string)$mention));
            if ($value === '') {
                continue;
            }
            if ($value === 'all') {
                return ['all'];
            }
            if (isset($personaMap[$value])) {
                $mentions[$personaMap[$value]] = true;
            }
        }
        return array_values(array_keys($mentions));
    }

    return extractMentionNames($content, $personaMap);
}

function resolveRecipientFromMentions($mentions) {
    if (!is_array($mentions) || count($mentions) === 0) {
        return 'all';
    }

    $isBroadcast = false;
    $targeted = [];
    foreach ($mentions as $mention) {
        $value = trim((string)$mention);
        if ($value === '') {
            continue;
        }
        if (strcasecmp($value, 'all') === 0) {
            $isBroadcast = true;
            continue;
        }
        $targeted[$value] = true;
    }

    if ($isBroadcast || count($targeted) === 0) {
        return 'all';
    }

    return 'mention:|' . implode('|', array_keys($targeted)) . '|';
}

function normalizeMessageType($inputType) {
    $type = trim((string)$inputType);
    $valid = [
        'message',
        'question',
        'status',
        'handoff',
        'decision',
        'blocker',
        'review',
        'directive',
        'announcement',
        'shutdown',
        'priority',
    ];
    return in_array($type, $valid, true) ? $type : 'message';
}

function sendMessageRecord($pdo, $actorName, $content, $input = []) {
    $personaMap = getPersonaMap($pdo);
    $type = normalizeMessageType($input['type'] ?? 'message');
    $taskId = isset($input['task_id']) && (int)$input['task_id'] > 0 ? (int)$input['task_id'] : null;
    $mentions = normalizeMentions($input['mentions'] ?? null, $content, $personaMap);
    $recipient = resolveRecipientFromMentions($mentions);
    $messageColumns = getMessageTableColumns($pdo);
    $hasType = in_array('type', $messageColumns, true);
    $hasTaskId = in_array('task_id', $messageColumns, true);
    $hasMentions = in_array('mentions', $messageColumns, true);

    $inserted = false;
    $insertErrors = [];
    if ($hasType && $hasTaskId && $hasMentions) {
        try {
            $stmt = $pdo->prepare('
                INSERT INTO messages (sender, recipient, type, task_id, mentions, content)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $actorName,
                $recipient,
                $type,
                $taskId,
                json_encode($mentions),
                $content,
            ]);
            $inserted = true;
        } catch (Exception $e) {
            $inserted = false;
            $insertErrors[] = 'structured insert failed: ' . $e->getMessage();
        }
    }

    if (!$inserted) {
        try {
            if (in_array('recipient', $messageColumns, true)) {
                $stmt = $pdo->prepare('
                    INSERT INTO messages (sender, recipient, content)
                    VALUES (?, ?, ?)
                ');
                $stmt->execute([
                    $actorName,
                    $recipient,
                    $content,
                ]);
            } else {
                $stmt = $pdo->prepare('
                    INSERT INTO messages (sender, content)
                    VALUES (?, ?)
                ');
                $stmt->execute([
                    $actorName,
                    $content,
                ]);
            }
            $inserted = true;
        } catch (Exception $e) {
            $inserted = false;
            $insertErrors[] = 'legacy insert failed: ' . $e->getMessage();
        }
    }

    if (!$inserted) {
        $columnsText = implode(',', $messageColumns);
        $errorsText = implode(' || ', $insertErrors);
        errorResponse('Message insert failed. columns=[' . $columnsText . '] errors=[' . $errorsText . ']', 500);
    }

    $message = messageById($pdo, $pdo->lastInsertId());
    if (!$message) {
        errorResponse('Message could not be read after insert', 500);
    }

    if (!isset($message['type'])) {
        $message['type'] = $type;
    }
    if (!array_key_exists('task_id', $message)) {
        $message['task_id'] = $taskId;
    }
    if (!isset($message['mentions'])) {
        $message['mentions'] = json_encode($mentions);
    }

    if (isset($message['mentions'])) {
        $decodedMentions = json_decode((string)$message['mentions'], true);
        $message['mentions'] = is_array($decodedMentions) ? $decodedMentions : [];
    }

    logSystemEvent($pdo, 'message_created', $actorName, 'message', (int)$message['id'], [
        'type' => $message['type'] ?? 'message',
        'task_id' => $message['task_id'] ?? null,
        'recipient' => $message['recipient'] ?? 'all',
        'mentions' => $message['mentions'] ?? [],
    ]);

    return $message;
}

function fetchMessages($pdo, $sinceId = 0, $forPersona = '') {
    $forPersona = trim($forPersona);
    $hasFor = $forPersona !== '';
    $forLower = strtolower($forPersona);
    $likePattern = '%|' . $forLower . '|%';

    $sql = 'SELECT * FROM messages';
    $where = [];
    $params = [];

    if ($sinceId > 0) {
        $where[] = 'id > ?';
        $params[] = $sinceId;
    }

    if ($hasFor) {
        $where[] = '(recipient = "all" OR lower(sender) = ? OR lower(recipient) = ? OR lower(recipient) LIKE ?)';
        $params[] = $forLower;
        $params[] = $forLower;
        $params[] = $likePattern;
    }

    if (count($where) > 0) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY created_at ASC, id ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $decoded = json_decode((string)($row['mentions'] ?? '[]'), true);
        if (is_array($decoded)) {
            $row['mentions'] = $decoded;
            continue;
        }
        $fallbackMentions = [];
        if (stripos((string)($row['recipient'] ?? ''), 'mention:|') === 0) {
            $parts = explode('|', (string)$row['recipient']);
            foreach ($parts as $part) {
                $name = trim((string)$part);
                if ($name !== '' && strcasecmp($name, 'mention:') !== 0) {
                    $fallbackMentions[] = $name;
                }
            }
        }
        $row['mentions'] = $fallbackMentions;
    }
    return $rows;
}

function getLastMessageId($messages, $fallbackId = 0) {
    if (!is_array($messages) || count($messages) === 0) {
        return (int)$fallbackId;
    }

    $last = end($messages);
    if (!is_array($last) || !isset($last['id'])) {
        return (int)$fallbackId;
    }

    return (int)$last['id'];
}
