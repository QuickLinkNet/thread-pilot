<?php

$identity = authenticateIdentity($pdo);
requireAdmin($identity);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = trim((string)($_GET['action'] ?? ''));
$format = trim((string)($_GET['format'] ?? 'json'));
$format = in_array($format, ['json', 'text'], true) ? $format : 'json';

require_once __DIR__ . '/first_message/helpers.php';

if ($method === 'GET') {
    require __DIR__ . '/first_message/get.php';
    exit;
}

if ($method === 'POST') {
    require __DIR__ . '/first_message/post.php';
    exit;
}

errorResponse('Method not allowed', 405);
