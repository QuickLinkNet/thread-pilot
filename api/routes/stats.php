<?php

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$personaName = authenticate($pdo);

$personasCount = (int)$pdo->query('SELECT COUNT(*) FROM personas')->fetchColumn();
$messagesTotal = (int)$pdo->query('SELECT COUNT(*) FROM messages')->fetchColumn();
$messages24h = (int)$pdo->query('SELECT COUNT(*) FROM messages WHERE created_at >= datetime("now", "-1 day")')->fetchColumn();

$tasksActive = (int)$pdo->query('SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL')->fetchColumn();
$tasksDeleted = (int)$pdo->query('SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL')->fetchColumn();
$tasksLocked = (int)$pdo->query('SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL AND locked_by IS NOT NULL AND trim(locked_by) != ""')->fetchColumn();

$statusRows = $pdo->query('
    SELECT status, COUNT(*) as count
    FROM tasks
    WHERE deleted_at IS NULL
    GROUP BY status
')->fetchAll(PDO::FETCH_ASSOC);

$byStatus = [
    'open' => 0,
    'in_progress' => 0,
    'blocked' => 0,
    'ready_for_review' => 0,
    'done' => 0,
];

foreach ($statusRows as $row) {
    $status = $row['status'];
    if (isset($byStatus[$status])) {
        $byStatus[$status] = (int)$row['count'];
    }
}

$unassigned = (int)$pdo->query('
    SELECT COUNT(*) FROM tasks
    WHERE deleted_at IS NULL
      AND (trim(lower(assignee)) = "" OR trim(lower(assignee)) = "unassigned" OR trim(lower(assignee)) = "none")
')->fetchColumn();

jsonResponse([
    'requested_by' => $personaName,
    'personas_total' => $personasCount,
    'messages_total' => $messagesTotal,
    'messages_last_24h' => $messages24h,
    'tasks_active_total' => $tasksActive,
    'tasks_deleted_total' => $tasksDeleted,
    'tasks_locked_total' => $tasksLocked,
    'tasks_unassigned_total' => $unassigned,
    'tasks_by_status' => $byStatus,
    'time' => gmdate('c')
]);
