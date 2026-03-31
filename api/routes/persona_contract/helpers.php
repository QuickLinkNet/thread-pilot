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
    $stmt = $pdo->prepare('SELECT version FROM persona_contract_versions WHERE version LIKE ? ORDER BY version DESC LIMIT 1');
    $stmt->execute([$prefix . '.%']);
    $lastVersion = $stmt->fetchColumn();

    if ($lastVersion === false) {
        return $prefix . '.1';
    }

    $parts = explode('.', $lastVersion);
    $lastNum = (int)end($parts);
    return $prefix . '.' . ($lastNum + 1);
}
