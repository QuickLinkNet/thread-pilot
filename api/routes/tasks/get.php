<?php

$action = $_GET['action'] ?? '';
if ($action === 'history') {
    $taskId = (int)($_GET['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $stmt = $pdo->prepare('
        SELECT id, task_id, actor, event_type, event_payload, created_at
        FROM task_events
        WHERE task_id = ?
        ORDER BY created_at DESC, id DESC
    ');
    $stmt->execute([$taskId]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($events as &$event) {
        $decoded = json_decode($event['event_payload'], true);
        $event['event_payload'] = $decoded !== null ? $decoded : ['raw' => $event['event_payload']];
    }

    jsonResponse($events);
}

if ($action === 'route_suggest') {
    $taskId = (int)($_GET['task_id'] ?? 0);
    $personaSkillsMap = getPersonaSkillsMap($pdo);
    $allRows = $pdo->query('SELECT id, title, description, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at FROM tasks')->fetchAll(PDO::FETCH_ASSOC);
    $allTasksById = [];
    foreach ($allRows as $row) {
        $hydrated = hydrateTask($row);
        $allTasksById[(int)$hydrated['id']] = $hydrated;
    }

    if ($taskId > 0) {
        if (!isset($allTasksById[$taskId])) {
            errorResponse('Task not found', 404);
        }
        $task = $allTasksById[$taskId];
        $suggestion = computeRouteSuggestion($pdo, $task, $personaSkillsMap, $allTasksById);
        jsonResponse([
            'task_id' => $taskId,
            'suggestion' => $suggestion
        ]);
    }

    $result = [];
    foreach ($allTasksById as $id => $task) {
        if ($task['deleted_at'] !== null) continue;
        $result[] = [
            'task_id' => (int)$id,
            'suggestion' => computeRouteSuggestion($pdo, $task, $personaSkillsMap, $allTasksById)
        ];
    }
    jsonResponse($result);
}

$includeDeleted = ($_GET['include_deleted'] ?? '0') === '1';
$taskId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($taskId > 0) {
    $task = taskResponseById($pdo, $taskId, $includeDeleted);
    if (!$task) {
        errorResponse('Task not found', 404);
    }
    jsonResponse($task);
}

$assignee = $_GET['assignee'] ?? '';
$baseSql = 'SELECT id, title, description, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at FROM tasks';
$where = [];
$params = [];

if ($assignee !== '') {
    $where[] = 'assignee = ?';
    $params[] = $assignee;
}

if (!$includeDeleted) {
    $where[] = 'deleted_at IS NULL';
}

if (count($where) > 0) {
    $baseSql .= ' WHERE ' . implode(' AND ', $where);
}
$baseSql .= ' ORDER BY created_at DESC';

$stmt = $pdo->prepare($baseSql);
$stmt->execute($params);
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($tasks as &$task) {
    $task = hydrateTask($task);
}
jsonResponse($tasks);
