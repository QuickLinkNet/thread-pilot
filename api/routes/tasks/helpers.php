<?php

function taskResponseById($pdo, $taskId, $includeDeleted = false) {
    $sql = 'SELECT id, title, description, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at FROM tasks WHERE id = ?';
    if (!$includeDeleted) {
        $sql .= ' AND deleted_at IS NULL';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$taskId]);
    return hydrateTask($stmt->fetch(PDO::FETCH_ASSOC));
}

function taskResponseByIdAnyState($pdo, $taskId) {
    $stmt = $pdo->prepare('SELECT id, title, description, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at FROM tasks WHERE id = ?');
    $stmt->execute([$taskId]);
    return hydrateTask($stmt->fetch(PDO::FETCH_ASSOC));
}

function normalizeTags($tags) {
    if (is_array($tags)) {
        $tags = implode(', ', array_map('trim', $tags));
    }
    return trim((string)$tags);
}

function normalizeTaskPriority($priorityInput, $fallback = 'normal', $strict = true) {
    $priority = strtolower(trim((string)($priorityInput ?? $fallback)));
    if ($priority === '') {
        $priority = strtolower(trim((string)$fallback));
    }

    $validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!in_array($priority, $validPriorities, true)) {
        if ($strict) {
            errorResponse('Invalid priority. Must be one of: low, normal, high, urgent');
        }
        return 'normal';
    }

    return $priority;
}

function hydrateTask($task) {
    if (!$task) return $task;
    $task['priority'] = normalizeTaskPriority($task['priority'] ?? 'normal', 'normal', false);
    $decoded = json_decode((string)($task['depends_on'] ?? '[]'), true);
    $task['depends_on'] = is_array($decoded)
        ? array_values(array_map('intval', $decoded))
        : [];
    return $task;
}

function normalizeDependsOn($dependsOnInput, $fallback = []) {
    $raw = $dependsOnInput;
    if ($raw === null) {
        $raw = $fallback;
    }

    if (is_string($raw)) {
        $raw = trim($raw);
        if ($raw === '') {
            return [];
        }
        $parts = array_map('trim', explode(',', $raw));
        $out = [];
        foreach ($parts as $part) {
            if ($part === '') continue;
            $id = (int)$part;
            if ($id > 0) $out[] = $id;
        }
        return array_values(array_unique($out));
    }

    if (is_array($raw)) {
        $out = [];
        foreach ($raw as $value) {
            $id = (int)$value;
            if ($id > 0) $out[] = $id;
        }
        return array_values(array_unique($out));
    }

    return [];
}

function validateDependsOnInputType($dependsOnInput) {
    if ($dependsOnInput === null) {
        return;
    }
    if (!is_array($dependsOnInput)) {
        errorResponse('depends_on must be an array of task IDs');
    }
}

function fetchDependencyBlockers($pdo, $dependsOn) {
    if (count($dependsOn) === 0) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($dependsOn), '?'));
    $stmt = $pdo->prepare("SELECT id, status, deleted_at FROM tasks WHERE id IN ($placeholders)");
    $stmt->execute($dependsOn);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $byId = [];
    foreach ($rows as $row) {
        $byId[(int)$row['id']] = $row;
    }

    $blockers = [];
    foreach ($dependsOn as $depId) {
        if (!isset($byId[$depId])) {
            $blockers[] = ['id' => $depId, 'reason' => 'missing'];
            continue;
        }
        $dep = $byId[$depId];
        if ($dep['deleted_at'] !== null) {
            $blockers[] = ['id' => $depId, 'reason' => 'deleted'];
            continue;
        }
        if ((string)$dep['status'] !== 'done') {
            $blockers[] = ['id' => $depId, 'reason' => 'not_done', 'status' => (string)$dep['status']];
        }
    }

    return $blockers;
}

function getPersonaSkillsMap($pdo) {
    $rows = $pdo->query('SELECT name, skills FROM personas')->fetchAll(PDO::FETCH_ASSOC);
    $map = [];
    foreach ($rows as $row) {
        $name = trim((string)($row['name'] ?? ''));
        if ($name === '') continue;
        $decoded = json_decode((string)($row['skills'] ?? '[]'), true);
        $skills = [];
        if (is_array($decoded)) {
            foreach ($decoded as $skill) {
                $value = strtolower(trim((string)$skill));
                if ($value !== '') $skills[] = $value;
            }
        }
        $map[$name] = array_values(array_unique($skills));
    }
    return $map;
}

function taskTagsToTokens($tags) {
    $parts = explode(',', (string)$tags);
    $out = [];
    foreach ($parts as $part) {
        $value = strtolower(trim((string)$part));
        if ($value !== '') $out[] = $value;
    }
    return array_values(array_unique($out));
}

function computeRouteSuggestion($pdo, $task, $personaSkillsMap, $allTasksById) {
    if (!$task) {
        return ['kind' => 'blocked', 'message' => 'Task not found'];
    }
    if ($task['deleted_at'] !== null) {
        return ['kind' => 'blocked', 'message' => 'Task is deleted'];
    }

    $lockedBy = trim((string)($task['locked_by'] ?? ''));
    if ($lockedBy !== '') {
        return [
            'kind' => 'locked',
            'message' => 'Task is locked',
            'locked_by' => $lockedBy
        ];
    }

    $dependsOn = normalizeDependsOn($task['depends_on'] ?? []);
    $blockers = [];
    foreach ($dependsOn as $depId) {
        if (!isset($allTasksById[$depId])) {
            $blockers[] = ['id' => $depId, 'reason' => 'missing'];
            continue;
        }
        $depTask = $allTasksById[$depId];
        if ($depTask['deleted_at'] !== null) {
            $blockers[] = ['id' => $depId, 'reason' => 'deleted'];
            continue;
        }
        if ((string)$depTask['status'] !== 'done') {
            $blockers[] = ['id' => $depId, 'reason' => 'not_done', 'status' => (string)$depTask['status']];
        }
    }
    if (count($blockers) > 0) {
        return [
            'kind' => 'blocked',
            'message' => 'Dependencies are not done',
            'blockers' => $blockers
        ];
    }

    $tags = taskTagsToTokens($task['tags'] ?? '');
    if (count($tags) === 0) {
        return ['kind' => 'no_match', 'message' => 'No tags available for routing'];
    }

    $bestName = null;
    $bestScore = 0;
    foreach ($personaSkillsMap as $personaName => $skills) {
        $score = 0;
        foreach ($tags as $tag) {
            if (in_array($tag, $skills, true)) {
                $score += 3;
                continue;
            }
            foreach ($skills as $skill) {
                if (strpos($skill, $tag) !== false || strpos($tag, $skill) !== false) {
                    $score += 1;
                    break;
                }
            }
        }
        if ($score > $bestScore) {
            $bestScore = $score;
            $bestName = $personaName;
        }
    }

    if ($bestName === null || $bestScore <= 0) {
        return ['kind' => 'no_match', 'message' => 'No persona skill matches task tags'];
    }

    $suggestedStatus = ((string)$task['status'] === 'open') ? 'in_progress' : (string)$task['status'];
    return [
        'kind' => 'ready',
        'message' => 'Route available',
        'suggested_assignee' => $bestName,
        'suggested_status' => $suggestedStatus,
        'score' => $bestScore
    ];
}

function logTaskEvent($pdo, $taskId, $actor, $eventType, $payload) {
    $stmt = $pdo->prepare('
        INSERT INTO task_events (task_id, actor, event_type, event_payload, created_at)
        VALUES (?, ?, ?, ?, datetime("now"))
    ');
    $stmt->execute([$taskId, $actor, $eventType, json_encode($payload)]);
}

function conflictTaskResponse($message, $currentTask) {
    http_response_code(409);
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'error' => $message,
        'current' => $currentTask
    ]);
    exit;
}

function assertTaskLockOwner($task, $personaName, $personaRole = '') {
    if (isAdminRole($personaRole)) {
        return;
    }
    $lockedBy = trim((string)($task['locked_by'] ?? ''));
    if ($lockedBy !== '' && strcasecmp($lockedBy, $personaName) !== 0) {
        conflictTaskResponse('Task is locked by another persona', $task);
    }
}
