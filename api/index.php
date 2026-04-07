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

switch ($route) {
    case 'health':
        require __DIR__ . '/routes/health.php';
        break;

    case 'install':
        require __DIR__ . '/install.php';
        break;

    case 'reset':
        require __DIR__ . '/reset.php';
        break;

    case 'test':
        require __DIR__ . '/test.php';
        break;

    case 'stats':
        $pdo = getDB();
        require __DIR__ . '/routes/stats.php';
        break;

    case 'personas':
        $pdo = getDB();
        require __DIR__ . '/routes/personas.php';
        break;

    case 'persona-contract':
        $pdo = getDB();
        require __DIR__ . '/routes/persona_contract.php';
        break;

    case 'first-message':
        $pdo = getDB();
        require __DIR__ . '/routes/first_message.php';
        break;

    case 'messages':
        $pdo = getDB();
        require __DIR__ . '/routes/messages.php';
        break;

    case 'events':
        $pdo = getDB();
        require __DIR__ . '/routes/events.php';
        break;

    case 'tasks':
        $pdo = getDB();
        require __DIR__ . '/routes/tasks.php';
        break;

    case 'db':
        $pdo = getDB();
        require __DIR__ . '/routes/db.php';
        break;

    default:
        errorResponse('Route not found', 404);
}
