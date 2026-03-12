<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || $tenant_id === null) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            ev.id,
            ev.voucher_no,
            ev.date,
            ev.description,
            ev.total_amount,
            ev.total_items,
            ev.company_id
        FROM expense_voucher ev
        WHERE ev.tenant_id = ?
        ORDER BY ev.id DESC
    ");
    $stmt->execute([$tenant_id]);
    $vouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $vouchers]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch expense vouchers']);
}
