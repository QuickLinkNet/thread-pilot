<?php

$personaName = authenticate($pdo);

require_once __DIR__ . '/messages/helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require __DIR__ . '/messages/get.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/messages/post.php';
    exit;
}

errorResponse('Method not allowed', 405);
