<?php
require_once '../../../../includes/connection.php';

if (session_status() == PHP_SESSION_NONE) session_start();

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

    // ── Next warranty number ──────────────────────────────────────────────────
    if (isset($_GET['action']) && $_GET['action'] === 'next_no') {
        $stmt = $pdo->prepare("SELECT warranty_no FROM warranty_registrations WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $last   = $stmt->fetchColumn();
        $newNum = $last ? ((int) substr($last, 3)) + 1 : 1;
        echo json_encode(['success' => true, 'warranty_no' => 'WR-' . str_pad($newNum, 4, '0', STR_PAD_LEFT)]);
        exit;
    }

    // ── Single warranty with products + coverage items ────────────────────────
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM warranty_registrations WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$_GET['id'], $tenant_id]);
        $warranty = $stmt->fetch();

        if (!$warranty) {
            echo json_encode(['success' => false, 'message' => 'Not found']);
            exit;
        }

        // Products
        $stmt = $pdo->prepare("SELECT * FROM warranty_products WHERE warranty_id = ? AND tenant_id = ? ORDER BY id");
        $stmt->execute([$_GET['id'], $tenant_id]);
        $warranty['products'] = $stmt->fetchAll();

        // Coverage items
        $stmt = $pdo->prepare("SELECT * FROM warranty_coverage_items WHERE warranty_id = ? AND tenant_id = ? ORDER BY id");
        $stmt->execute([$_GET['id'], $tenant_id]);
        $warranty['coverage_items'] = $stmt->fetchAll();

        echo json_encode(['success' => true, 'warranty' => $warranty]);
        exit;
    }

    // ── All warranties (list view) ────────────────────────────────────────────
    $stmt = $pdo->prepare("SELECT * FROM warranty_registrations WHERE tenant_id = ? ORDER BY id DESC");
    $stmt->execute([$tenant_id]);
    echo json_encode(['success' => true, 'warranties' => $stmt->fetchAll()]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
