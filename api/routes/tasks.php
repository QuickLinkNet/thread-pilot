<?php

$auth = authenticateIdentity($pdo);
$personaName = $auth['name'];
$personaRole = $auth['role'];

require_once __DIR__ . '/tasks/helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require __DIR__ . '/tasks/get.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/tasks/post.php';
    exit;
}

errorResponse('Method not allowed', 405);
