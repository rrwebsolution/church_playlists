<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$stateFile = sys_get_temp_dir() . '/obs_church_state.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($stateFile)) {
        echo file_get_contents($stateFile);
    } else {
        echo json_encode(['text' => '', 'fontSize' => 60, 'background' => 'none', 'updatedAt' => 0]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $current = file_exists($stateFile) ? json_decode(file_get_contents($stateFile), true) ?? [] : [];
    $new = json_decode(file_get_contents('php://input'), true) ?? [];
    $merged = array_merge($current, $new);
    file_put_contents($stateFile, json_encode($merged));
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
