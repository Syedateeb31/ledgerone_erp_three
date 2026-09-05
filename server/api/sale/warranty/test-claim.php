<?php
ob_start();
require_once '../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();
ob_end_clean();

header('Content-Type: application/json');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

echo json_encode([
    'user_id'   => $user_id,
    'tenant_id' => $tenant_id,
    'pdo'       => $pdo ? 'connected' : 'not connected',
    'test'      => 'ok'
]);
