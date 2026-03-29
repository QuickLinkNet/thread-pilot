<?php

$personaName = authenticate($pdo);

function personaById($pdo, $personaId) {
    $stmt = $pdo->prepare('SELECT id, name, role, skills, token, created_at FROM personas WHERE id = ?');
    $stmt->execute([$personaId]);
    $persona = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($persona && isset($persona['skills'])) {
        $decoded = json_decode((string)$persona['skills'], true);
        $persona['skills'] = is_array($decoded) ? $decoded : [];
    }
    return $persona;
}

function normalizeSkills($skillsInput) {
    if (is_array($skillsInput)) {
        $clean = [];
        foreach ($skillsInput as $skill) {
            $value = trim((string)$skill);
            if ($value !== '') {
                $clean[] = $value;
            }
        }
        return array_values(array_unique($clean));
    }

    $raw = trim((string)$skillsInput);
    if ($raw === '') {
        return [];
    }
    $parts = array_map('trim', explode(',', $raw));
    $clean = [];
    foreach ($parts as $part) {
        if ($part !== '') {
            $clean[] = $part;
        }
    }
    return array_values($clean);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $personaId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($personaId > 0) {
        $persona = personaById($pdo, $personaId);
        if (!$persona) {
            errorResponse('Persona not found', 404);
        }
        jsonResponse($persona);
    }

    $stmt = $pdo->query('SELECT id, name, role, skills, token, created_at FROM personas ORDER BY created_at ASC');
    $personas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($personas as &$persona) {
        $decoded = json_decode((string)($persona['skills'] ?? '[]'), true);
        $persona['skills'] = is_array($decoded) ? $decoded : [];
    }
    jsonResponse($personas);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    if ($action === 'add') {
        $name = trim($input['name'] ?? '');
        $role = trim($input['role'] ?? '');
        $skills = normalizeSkills($input['skills'] ?? []);

        if ($name === '' || $role === '') {
            errorResponse('Missing required fields: name, role');
        }

        $token = bin2hex(random_bytes(32));
        $stmt = $pdo->prepare('INSERT INTO personas (name, role, token, skills) VALUES (?, ?, ?, ?)');

        try {
            $stmt->execute([$name, $role, $token, json_encode($skills)]);
        } catch (PDOException $e) {
            errorResponse('Persona name already exists');
        }

        $persona = personaById($pdo, $pdo->lastInsertId());
        logSystemEvent($pdo, 'persona_joined', $personaName, 'persona', (int)$persona['id'], ['persona' => $persona]);
        jsonResponse($persona);
    }

    if ($action === 'update') {
        $personaId = (int)($input['id'] ?? 0);
        if ($personaId <= 0) {
            errorResponse('Missing persona id');
        }

        $existing = personaById($pdo, $personaId);
        if (!$existing) {
            errorResponse('Persona not found', 404);
        }

        $name = trim((string)($input['name'] ?? $existing['name']));
        $role = trim((string)($input['role'] ?? $existing['role']));
        $skills = array_key_exists('skills', $input)
            ? normalizeSkills($input['skills'])
            : (is_array($existing['skills']) ? $existing['skills'] : []);

        if ($name === '' || $role === '') {
            errorResponse('Name and role cannot be empty');
        }

        $stmt = $pdo->prepare('UPDATE personas SET name = ?, role = ?, skills = ? WHERE id = ?');
        try {
            $stmt->execute([$name, $role, json_encode($skills), $personaId]);
        } catch (PDOException $e) {
            errorResponse('Persona name already exists');
        }

        $persona = personaById($pdo, $personaId);
        logSystemEvent($pdo, 'persona_updated', $personaName, 'persona', (int)$persona['id'], ['persona' => $persona]);
        jsonResponse($persona);
    }

    if ($action === 'regen_token') {
        $personaId = (int)($input['id'] ?? 0);
        if ($personaId <= 0) {
            errorResponse('Missing persona id');
        }

        $existing = personaById($pdo, $personaId);
        if (!$existing) {
            errorResponse('Persona not found', 404);
        }

        $newToken = bin2hex(random_bytes(32));
        $stmt = $pdo->prepare('UPDATE personas SET token = ? WHERE id = ?');
        $stmt->execute([$newToken, $personaId]);

        $persona = personaById($pdo, $personaId);
        logSystemEvent($pdo, 'persona_token_regenerated', $personaName, 'persona', (int)$persona['id'], ['persona' => $persona]);
        jsonResponse($persona);
    }

    if ($action === 'delete') {
        $personaId = (int)($input['id'] ?? 0);
        if ($personaId <= 0) {
            errorResponse('Missing persona id');
        }

        $existing = personaById($pdo, $personaId);
        if (!$existing) {
            errorResponse('Persona not found', 404);
        }

        if ($existing['name'] === $personaName) {
            errorResponse('You cannot delete your own persona');
        }

        $stmt = $pdo->prepare('DELETE FROM personas WHERE id = ?');
        $stmt->execute([$personaId]);
        logSystemEvent($pdo, 'persona_deleted', $personaName, 'persona', $personaId, ['persona' => $existing]);
        jsonResponse(['deleted' => true]);
    }
}

errorResponse('Method not allowed', 405);
