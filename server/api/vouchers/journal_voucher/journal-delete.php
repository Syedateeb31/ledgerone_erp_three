<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Voucher ID required']);
    exit();
}

try {
    $pdo->beginTransaction();

    // Check if voucher exists and is draft
    $stmt = $pdo->prepare(
        "SELECT id, status FROM journal_voucher WHERE id = ? AND tenant_id = ?"
    );
    $stmt->execute([$id, $tenant_id]);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$voucher) {
        http_response_code(404);
        echo json_encode(['error' => 'Voucher not found']);
        exit();
    }

    if ($voucher['status'] !== 'draft') {
        http_response_code(400);
        echo json_encode(['error' => 'Only draft vouchers can be deleted']);
        exit();
    }

    // Delete voucher lines
    $stmt = $pdo->prepare("DELETE FROM journal_voucher_line WHERE voucher_id = ?");
    $stmt->execute([$id]);

    // Delete voucher
    $stmt = $pdo->prepare("DELETE FROM journal_voucher WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Voucher deleted successfully']);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete voucher: ' . $e->getMessage()]);
}