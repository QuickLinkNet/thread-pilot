<?php

require_once __DIR__ . '/config.php';

setCorsHeaders();

$rawRoute = trim($_GET['route'] ?? '', '/');
$routeParts = $rawRoute === '' ? [] : explode('/', $rawRoute);
$route = $routeParts[0] ?? '';
$route = preg_replace('/\.php$/i', '', (string)$route);
$routeId = $routeParts[1] ?? null;

if ($routeId !== null && ctype_digit($routeId)) {
    $_GET['id'] = $routeId;
}

$pdo = getDB();

switch ($route) {
    case 'health':
        require __DIR__ . '/routes/health.php';
        break;

    case 'stats':
        require __DIR__ . '/routes/stats.php';
        break;

    case 'personas':
        require __DIR__ . '/routes/personas.php';
        break;

    case 'persona-contract':
        require __DIR__ . '/routes/persona_contract.php';
        break;

    case 'messages':
        require __DIR__ . '/routes/messages.php';
        break;

    case 'events':
        require __DIR__ . '/routes/events.php';
        break;

    case 'tasks':
        require __DIR__ . '/routes/tasks.php';
        break;

    case 'db':
        require __DIR__ . '/routes/db.php';
        break;

    default:
        errorResponse('Route not found', 404);
}
