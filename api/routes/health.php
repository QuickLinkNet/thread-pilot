<?php

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

jsonResponse([
    'status' => 'ok',
    'service' => 'thread-pilot-api',
    'time' => gmdate('c'),
    'database' => 'ok'
]);
