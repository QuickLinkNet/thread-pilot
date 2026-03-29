<?php

function parseTaskInput() {
    $raw = file_get_contents('php://input');
    $input = [];

    if ($raw !== false && trim($raw) !== '') {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $input = $decoded;
        } elseif (json_last_error() !== JSON_ERROR_NONE) {
            errorResponse('Invalid JSON body: ' . json_last_error_msg(), 400);
        }
    }

    if (count($input) === 0 && !empty($_POST)) {
        $input = $_POST;
    }

    // Compatibility fallback for legacy clients that still send fields via query params.
    $fallbackKeys = [
        'task_id',
        'title',
        'description',
        'tags',
        'assignee',
        'status',
        'priority',
        'updated_at',
        'note',
    ];
    foreach ($fallbackKeys as $key) {
        if (!array_key_exists($key, $input) && isset($_GET[$key])) {
            $input[$key] = $_GET[$key];
        }
    }

    if (!array_key_exists('depends_on', $input) && isset($_GET['depends_on'])) {
        $input['depends_on'] = $_GET['depends_on'];
    }

    return is_array($input) ? $input : [];
}

$action = $_GET['action'] ?? '';
$input = parseTaskInput();

if ($action === 'add') {
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $tags = normalizeTags($input['tags'] ?? '');
    $assignee = trim($input['assignee'] ?? '');
    $status = trim($input['status'] ?? 'open');
    $priority = normalizeTaskPriority($input['priority'] ?? 'normal');
    validateDependsOnInputType($input['depends_on'] ?? null);
    $dependsOn = normalizeDependsOn($input['depends_on'] ?? []);

    if ($title === '' || $description === '' || $assignee === '') {
        errorResponse('Missing required fields: title, description, assignee');
    }

    $validStatuses = ['open', 'in_progress', 'blocked', 'ready_for_review', 'done'];
    if (!in_array($status, $validStatuses, true)) {
        errorResponse('Invalid status. Must be one of: open, in_progress, blocked, ready_for_review, done');
    }

    $stmt = $pdo->prepare('
        INSERT INTO tasks (title, description, area, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, datetime("now"), datetime("now"))
    ');
    $stmt->execute([$title, $description, $tags, $tags, $assignee, $status, $priority, json_encode($dependsOn)]);

    $taskId = (int)$pdo->lastInsertId();
    $task = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'created', ['task' => $task]);
    logSystemEvent($pdo, 'task_created', $personaName, 'task', $taskId, ['task' => $task]);
    jsonResponse($task);
}

if ($action === 'claim') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before claiming.', 409);
    }

    $lockedBy = trim((string)($existingTask['locked_by'] ?? ''));
    if ($lockedBy !== '' && strcasecmp($lockedBy, $personaName) !== 0) {
        conflictTaskResponse('Task is already locked by another persona', $existingTask);
    }

    $dependsOn = normalizeDependsOn($existingTask['depends_on'] ?? []);
    $blockers = fetchDependencyBlockers($pdo, $dependsOn);
    if (count($blockers) > 0) {
        http_response_code(409);
        header('Content-Type: application/json');
        echo json_encode([
            'ok' => false,
            'error' => 'Cannot claim task: dependencies are not done',
            'current' => $existingTask,
            'blockers' => $blockers
        ]);
        exit;
    }

    $stmt = $pdo->prepare('
        UPDATE tasks
        SET assignee = ?, status = "in_progress", locked_by = ?, updated_at = datetime("now")
        WHERE id = ?
    ');
    $stmt->execute([$personaName, $personaName, $taskId]);

    $task = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'claimed', ['before' => $existingTask, 'after' => $task]);
    logSystemEvent($pdo, 'task_claimed', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $task,
    ]);
    jsonResponse($task);
}

if ($action === 'release') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before releasing.', 409);
    }

    assertTaskLockOwner($existingTask, $personaName, $personaRole);

    $releaseStatus = trim((string)($input['status'] ?? 'open'));
    if (!in_array($releaseStatus, ['open', 'blocked'], true)) {
        errorResponse('release status must be open or blocked');
    }

    $stmt = $pdo->prepare('
        UPDATE tasks
        SET status = ?, locked_by = NULL, updated_at = datetime("now")
        WHERE id = ?
    ');
    $stmt->execute([$releaseStatus, $taskId]);

    $task = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'released', [
        'before' => $existingTask,
        'after' => $task,
        'release_note' => trim((string)($input['note'] ?? ''))
    ]);
    logSystemEvent($pdo, 'task_released', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $task,
        'release_note' => trim((string)($input['note'] ?? ''))
    ]);
    jsonResponse($task);
}

if ($action === 'route_apply') {
    requireAdmin(['name' => $personaName, 'role' => $personaRole]);

    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before routing.', 409);
    }
    assertTaskLockOwner($existingTask, $personaName, $personaRole);

    $clientUpdatedAt = trim((string)($input['updated_at'] ?? ''));
    if ($clientUpdatedAt === '') {
        errorResponse('Missing updated_at for optimistic concurrency control');
    }
    if ($clientUpdatedAt !== (string)$existingTask['updated_at']) {
        conflictTaskResponse('Conflict: task was updated by another persona', $existingTask);
    }

    $personaSkillsMap = getPersonaSkillsMap($pdo);
    $allRows = $pdo->query('SELECT id, title, description, tags, assignee, status, priority, locked_by, depends_on, deleted_at, created_at, updated_at FROM tasks')->fetchAll(PDO::FETCH_ASSOC);
    $allTasksById = [];
    foreach ($allRows as $row) {
        $hydrated = hydrateTask($row);
        $allTasksById[(int)$hydrated['id']] = $hydrated;
    }

    $suggestion = computeRouteSuggestion($pdo, $existingTask, $personaSkillsMap, $allTasksById);
    if (($suggestion['kind'] ?? '') !== 'ready') {
        http_response_code(409);
        header('Content-Type: application/json');
        echo json_encode([
            'ok' => false,
            'error' => 'Routing is not applicable',
            'current' => $existingTask,
            'suggestion' => $suggestion
        ]);
        exit;
    }

    $suggestedAssignee = (string)($suggestion['suggested_assignee'] ?? '');
    $suggestedStatus = (string)($suggestion['suggested_status'] ?? $existingTask['status']);
    if ($suggestedAssignee === '') {
        errorResponse('Routing suggestion has no assignee', 409);
    }

    $stmt = $pdo->prepare('
        UPDATE tasks
        SET assignee = ?, status = ?, updated_at = datetime("now")
        WHERE id = ?
    ');
    $stmt->execute([$suggestedAssignee, $suggestedStatus, $taskId]);

    $updatedTask = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'route_applied', [
        'before' => $existingTask,
        'after' => $updatedTask,
        'suggestion' => $suggestion
    ]);
    logSystemEvent($pdo, 'task_route_applied', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $updatedTask,
        'suggestion' => $suggestion
    ]);

    jsonResponse([
        'task' => $updatedTask,
        'suggestion' => $suggestion
    ]);
}

if ($action === 'update') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before updating.', 409);
    }
    assertTaskLockOwner($existingTask, $personaName, $personaRole);

    $clientUpdatedAt = trim((string)($input['updated_at'] ?? ''));
    if ($clientUpdatedAt === '') {
        errorResponse('Missing updated_at for optimistic concurrency control');
    }
    if ($clientUpdatedAt !== (string)$existingTask['updated_at']) {
        conflictTaskResponse('Conflict: task was updated by another persona', $existingTask);
    }

    $title = trim((string)($input['title'] ?? $existingTask['title']));
    $description = trim((string)($input['description'] ?? $existingTask['description']));
    $tags = normalizeTags($input['tags'] ?? $existingTask['tags']);
    $assignee = trim((string)($input['assignee'] ?? $existingTask['assignee']));
    $status = trim((string)($input['status'] ?? $existingTask['status']));
    $priority = normalizeTaskPriority($input['priority'] ?? $existingTask['priority'] ?? 'normal');
    validateDependsOnInputType($input['depends_on'] ?? null);
    $dependsOn = normalizeDependsOn($input['depends_on'] ?? null, $existingTask['depends_on'] ?? []);

    if (in_array($taskId, $dependsOn, true)) {
        errorResponse('Task cannot depend on itself');
    }

    if ($title === '' || $description === '' || $assignee === '') {
        errorResponse('Fields title, description and assignee cannot be empty');
    }

    $validStatuses = ['open', 'in_progress', 'blocked', 'ready_for_review', 'done'];
    if (!in_array($status, $validStatuses, true)) {
        errorResponse('Invalid status. Must be one of: open, in_progress, blocked, ready_for_review, done');
    }

    $stmt = $pdo->prepare('
        UPDATE tasks
        SET title = ?, description = ?, area = ?, tags = ?, assignee = ?, status = ?, priority = ?, depends_on = ?, updated_at = datetime("now")
        WHERE id = ?
    ');
    $stmt->execute([$title, $description, $tags, $tags, $assignee, $status, $priority, json_encode($dependsOn), $taskId]);

    $task = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'updated', [
        'before' => $existingTask,
        'after' => $task
    ]);
    logSystemEvent($pdo, 'task_updated', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $task,
    ]);
    jsonResponse($task);
}

if ($action === 'request_review') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before updating.', 409);
    }
    assertTaskLockOwner($existingTask, $personaName, $personaRole);
    if ((string)$existingTask['status'] === 'done') {
        errorResponse('Done tasks cannot be moved to review', 409);
    }

    $clientUpdatedAt = trim((string)($input['updated_at'] ?? ''));
    if ($clientUpdatedAt === '') {
        errorResponse('Missing updated_at for optimistic concurrency control');
    }
    if ($clientUpdatedAt !== (string)$existingTask['updated_at']) {
        conflictTaskResponse('Conflict: task was updated by another persona', $existingTask);
    }

    $stmt = $pdo->prepare('UPDATE tasks SET status = "ready_for_review", updated_at = datetime("now") WHERE id = ?');
    $stmt->execute([$taskId]);
    $after = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'requested_review', ['before' => $existingTask, 'after' => $after]);
    logSystemEvent($pdo, 'review_requested', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $after,
    ]);
    jsonResponse($after);
}

if ($action === 'approve') {
    requireAdmin(['name' => $personaName, 'role' => $personaRole]);

    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        errorResponse('Task is deleted. Restore it before approving.', 409);
    }
    assertTaskLockOwner($existingTask, $personaName, $personaRole);
    if ((string)$existingTask['status'] !== 'ready_for_review') {
        errorResponse('Only ready_for_review tasks can be approved', 409);
    }

    $clientUpdatedAt = trim((string)($input['updated_at'] ?? ''));
    if ($clientUpdatedAt === '') {
        errorResponse('Missing updated_at for optimistic concurrency control');
    }
    if ($clientUpdatedAt !== (string)$existingTask['updated_at']) {
        conflictTaskResponse('Conflict: task was updated by another persona', $existingTask);
    }

    $stmt = $pdo->prepare('UPDATE tasks SET status = "done", locked_by = NULL, updated_at = datetime("now") WHERE id = ?');
    $stmt->execute([$taskId]);
    $after = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'approved', ['before' => $existingTask, 'after' => $after]);
    logSystemEvent($pdo, 'review_approved', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $after,
    ]);
    jsonResponse($after);
}

if ($action === 'delete') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] !== null) {
        jsonResponse(['deleted' => true, 'soft' => true, 'already_deleted' => true]);
    }

    $stmt = $pdo->prepare('UPDATE tasks SET deleted_at = datetime("now"), updated_at = datetime("now") WHERE id = ?');
    $stmt->execute([$taskId]);
    $after = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'deleted', ['before' => $existingTask, 'after' => $after]);
    logSystemEvent($pdo, 'task_deleted', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $after,
    ]);
    jsonResponse(['deleted' => true, 'soft' => true]);
}

if ($action === 'restore') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($taskId <= 0) {
        errorResponse('Missing task_id');
    }

    $existingTask = taskResponseByIdAnyState($pdo, $taskId);
    if (!$existingTask) {
        errorResponse('Task not found', 404);
    }
    if ($existingTask['deleted_at'] === null) {
        jsonResponse($existingTask);
    }

    $stmt = $pdo->prepare('UPDATE tasks SET deleted_at = NULL, updated_at = datetime("now") WHERE id = ?');
    $stmt->execute([$taskId]);
    $restored = taskResponseByIdAnyState($pdo, $taskId);
    logTaskEvent($pdo, $taskId, $personaName, 'restored', ['before' => $existingTask, 'after' => $restored]);
    logSystemEvent($pdo, 'task_restored', $personaName, 'task', $taskId, [
        'before' => $existingTask,
        'after' => $restored,
    ]);
    jsonResponse($restored);
}

errorResponse('Method not allowed', 405);
