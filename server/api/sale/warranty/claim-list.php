<?php
ob_start();
require_once '../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();
ob_end_clean();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {

    // Next claim number
    if (isset($_GET['action']) && $_GET['action'] === 'next_no') {
        $stmt = $pdo->prepare("SELECT claim_no FROM warranty_claims WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $last   = $stmt->fetchColumn();
        $newNum = $last ? ((int)substr($last, 4)) + 1 : 1;
        echo json_encode(['success' => true, 'claim_no' => 'CLM-' . str_pad($newNum, 4, '0', STR_PAD_LEFT)]);
        exit;
    }

    // Single claim with items
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM warranty_claims WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$_GET['id'], $tenant_id]);
        $claim = $stmt->fetch();

        if (!$claim) {
            echo json_encode(['success' => false, 'message' => 'Not found']);
            exit;
        }

        // Fetch claim items from separate table
        $stmt = $pdo->prepare("SELECT * FROM warranty_claim_items WHERE claim_id = ? AND tenant_id = ? ORDER BY id");
        $stmt->execute([$_GET['id'], $tenant_id]);
        $claim['claim_items'] = $stmt->fetchAll();

        // Keep claim_items_json for backward compat in viewClaim JS
        $claim['claim_items_json'] = json_encode($claim['claim_items']);

        echo json_encode(['success' => true, 'claim' => $claim]);
        exit;
    }

    // All claims
    $stmt = $pdo->prepare("SELECT * FROM warranty_claims WHERE tenant_id = ? ORDER BY id DESC");
    $stmt->execute([$tenant_id]);
    echo json_encode(['success' => true, 'claims' => $stmt->fetchAll()]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
