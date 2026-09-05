<?php
session_start();
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $data      = json_decode(file_get_contents('php://input'), true);
    $chartName = trim($data['chartName'] ?? '');
    $chartDate = $data['chartDate'] ?? date('Y-m-d');
    $slabs     = $data['slabs'] ?? [];

    if (empty($chartName)) throw new Exception('Chart name is required');
    if (empty($slabs))     throw new Exception('At least one slab is required');

    $pdo->beginTransaction();

    // Check if chart already exists for this tenant
    $check = $pdo->prepare("SELECT id FROM broken_allowance_charts WHERE tenant_id = ?");
    $check->execute([$tenant_id]);
    $existing = $check->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // UPDATE existing chart
        $pdo->prepare("UPDATE broken_allowance_charts SET chart_name = ?, chart_date = ? WHERE tenant_id = ?")
            ->execute([$chartName, $chartDate, $tenant_id]);
        $chartId = $existing['id'];
        // Delete old slabs and re-insert
        $pdo->prepare("DELETE FROM broken_allowance_slabs WHERE chart_id = ?")->execute([$chartId]);
    } else {
        // INSERT new chart
        $pdo->prepare("INSERT INTO broken_allowance_charts (tenant_id, chart_name, chart_date) VALUES (?, ?, ?)")
            ->execute([$tenant_id, $chartName, $chartDate]);
        $chartId = $pdo->lastInsertId();
    }

    $slabStmt = $pdo->prepare("INSERT INTO broken_allowance_slabs (chart_id, `from`, `to`, rate) VALUES (?, ?, ?, ?)");
    foreach ($slabs as $slab) {
        $slabStmt->execute([$chartId, $slab['from'], $slab['to'], $slab['rate']]);
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Chart saved successfully', 'chart_id' => $chartId]);

} catch (Exception $e) {
    if (isset($pdo)) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
