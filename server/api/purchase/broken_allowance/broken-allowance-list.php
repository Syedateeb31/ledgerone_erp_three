<?php
session_start();
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// GET - return the single chart with slabs for this tenant
try {
    $stmt = $pdo->prepare("SELECT * FROM broken_allowance_charts WHERE tenant_id = ? LIMIT 1");
    $stmt->execute([$tenant_id]);
    $chart = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$chart) {
        echo json_encode(['success' => true, 'chart' => null]);
        exit;
    }

    $slabStmt = $pdo->prepare("SELECT * FROM broken_allowance_slabs WHERE chart_id = ? ORDER BY `from` ASC");
    $slabStmt->execute([$chart['id']]);
    $chart['slabs'] = $slabStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'chart' => $chart]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
