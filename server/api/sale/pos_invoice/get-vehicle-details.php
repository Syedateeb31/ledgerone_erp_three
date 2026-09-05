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

$product_id = $_GET['product_id'] ?? null;
$invoice_id = $_GET['invoice_id'] ?? null; // Optional: for edit mode

if (!$product_id) {
    echo json_encode(['success' => true, 'vehicles' => []]);
    exit;
}

try {
    // Fetch distinct chassis/motor/colour combos for this product from purchase_invoice_items
    // EXCLUDING those that have already been sold (exist in sale_invoice_items)
    // BUT if invoice_id is provided (edit mode), exclude only OTHER invoices' items
    $stmt = $pdo->prepare("
        SELECT DISTINCT pii.chassis_no, pii.motor_no, pii.colour
        FROM purchase_invoice_items pii
        WHERE pii.tenant_id = ?
          AND pii.product_id = ?
          AND pii.chassis_no IS NOT NULL
          AND pii.chassis_no != ''
          AND NOT EXISTS (
            SELECT 1 FROM sale_invoice_items sii
            WHERE sii.tenant_id = pii.tenant_id
              AND sii.product_id = pii.product_id
              AND sii.chassis_no = pii.chassis_no
              AND sii.motor_no = pii.motor_no
              AND (? IS NULL OR sii.sale_invoice_id != ?)
          )
        ORDER BY pii.id DESC
    ");
    $stmt->execute([$tenant_id, $product_id, $invoice_id, $invoice_id]);
    $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'vehicles' => $vehicles]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

