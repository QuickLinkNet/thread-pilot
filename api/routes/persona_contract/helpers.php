<?php

function parseContractBody() {
    $input = file_get_contents('php://input');
    if ($input === false || trim($input) === '') {
        return [];
    }

    $decoded = json_decode($input, true);
    if (!is_array($decoded)) {
        errorResponse('Invalid JSON body', 400);
    }

    return $decoded;
}

function nextContractVersion($pdo) {
    $prefix = gmdate('Y-m-d');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM persona_contract_versions WHERE version LIKE ?');
    $stmt->execute([$prefix . '.%']);
    $count = (int)$stmt->fetchColumn();
    return $prefix . '.' . ($count + 1);
}
