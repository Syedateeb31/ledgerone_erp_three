<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$invoice_id = $_GET['id'] ?? null;

if (!$invoice_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invoice ID is required']);
    exit;
}

try {
    // Get invoice data
    $stmt = $pdo->prepare("
        SELECT 
            pi.*,
            s.supplier_name,
            s.supplier_code,
            s.current_balance,
            b.branch_name,
            b.branch_code,
            b.branch_type,
            pb.branch_name as parent_branch_name,
            c.symbol as currency_symbol,
            c.code as currency_code,
            c.name as currency_name,
            pi.company_id
        FROM purchase_invoice pi
        LEFT JOIN suppliers s ON pi.supplier_id = s.id
        LEFT JOIN branches b ON pi.branch_id = b.id
        LEFT JOIN branches pb ON b.parent_branch_id = pb.id
        LEFT JOIN ledgerone_public.currencies c ON pi.currency_id = c.id
        WHERE pi.id = ? AND pi.tenant_id = ?
    ");
    $stmt->execute([$invoice_id, $tenant_id]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found']);
        exit;
    }
    
    // Get invoice items
    $itemStmt = $pdo->prepare("
        SELECT 
            pii.*,
            p.name as product_name,
            p.code as product_code
        FROM purchase_invoice_items pii
        LEFT JOIN products p ON pii.product_id = p.id
        WHERE pii.purchase_invoice_id = ? AND pii.tenant_id = ?
    ");
    $itemStmt->execute([$invoice_id, $tenant_id]);
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'invoice' => $invoice,
        'items' => $items
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
