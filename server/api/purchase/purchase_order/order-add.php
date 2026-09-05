<?php
ob_start();
session_start();
require_once '../../../../includes/connection.php';
ob_end_clean();

ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '../../../../error_log.txt');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login again']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validate required fields
    $required = ['purchaseDate', 'supplierId', 'branchId', 'items'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field {$field} is required");
        }
    }
    
    if (empty($input['items']) || !is_array($input['items']) || count($input['items']) === 0) {
        throw new Exception('At least one item with quantity is required');
    }
    
    foreach ($input['items'] as $idx => $item) {
        if (empty($item['unitEntries']) || !is_array($item['unitEntries'])) {
            throw new Exception('Item ' . ($idx + 1) . ' has no unit entries');
        }
        $hasQty = false;
        foreach ($item['unitEntries'] as $entry) {
            if ($entry['quantity'] > 0) {
                $hasQty = true;
                break;
            }
        }
        if (!$hasQty) {
            throw new Exception('Item ' . ($idx + 1) . ' must have at least one unit with quantity greater than 0');
        }
    }
    
    $pdo->beginTransaction();
    
    // Generate sequential bill number
    $billStmt = $pdo->prepare("SELECT bill_no FROM purchase_order WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
    $billStmt->execute([$tenant_id]);
    $lastBill = $billStmt->fetchColumn();
    
    if ($lastBill) {
        $lastNumber = (int)substr($lastBill, 3); // Extract number from PO-XXXX
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    $billNo = 'PO-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    
    // Insert purchase order
    $stmt = $pdo->prepare("
        INSERT INTO purchase_order (
            tenant_id, company_id, currency_id, bill_no, rpo_no, purchase_date, supplier_id, branch_id,
            previous_balance, total_bill, total_discount_percent,
            total_discount_amount, total_gst_percent, total_gst_amount,
            shipping_fees, net_amount, supplier_invoice_no, supplier_invoice_date,
            bilty_no, transport_name, truck_no, last_date, broker, mill_name,
            moist, damage, under_mill, broken, chakki,
            payment_term_id, remarks, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $tenant_id,
        $input['companyId'] ?? null,
        $input['currencyId'] ?? null,
        $billNo,
        $input['rpoNo'] ?? null,
        $input['purchaseDate'],
        $input['supplierId'],
        $input['branchId'],
        extractBalanceAmount($input['previousBalance'] ?? '0.00'),
        $input['totalBill'],
        $input['totalDiscountPercent'] ?? 0.00,
        $input['totalDiscountAmount'] ?? 0.00,
        $input['totalGSTPercent'] ?? 0.00,
        $input['totalGSTAmount'] ?? 0.00,
        $input['shippingFees'] ?? 0.00,
        $input['netAmount'],
        $input['supplierInvoiceNo'] ?? null,
        $input['supplierInvoiceDate'] ?? null,
        $input['biltyNo'] ?? null,
        $input['transportName'] ?? null,
        $input['truckNo'] ?? null,
        $input['lastDate'] ?? null,
        $input['broker'] ?? null,
        $input['millName'] ?? null,
        $input['moist'] ?? null,
        $input['damage'] ?? null,
        $input['underMill'] ?? null,
        $input['broken'] ?? null,
        $input['chakki'] ?? null,
        $input['paymentTermId'] ?? null,
        $input['remarks'] ?? null,
        $user_id,
        $user_id
    ]);
    
    $invoice_id = $pdo->lastInsertId();
    
    // Insert order items
    $item_stmt = $pdo->prepare("
        INSERT INTO purchase_order_items (
            tenant_id, purchase_invoice_id, product_id, uom_id,
            quantity, purchase_price, gross_amount, discount_percent,
            discount_amount, trade_offer_percent, trade_offer_amount,
            gst_percent, gst_amount, foc_quantity, net_amount, 
            created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    foreach ($input['items'] as $item) {
        // Each item can have multiple unit entries
        $isFirstEntry = true;
        foreach ($item['unitEntries'] as $unitEntry) {
            $item_stmt->execute([
                $tenant_id,
                $invoice_id,
                $item['productId'],
                $unitEntry['uomId'],
                $unitEntry['quantity'],
                $item['purchasePrice'],
                $isFirstEntry ? $item['grossAmount'] : 0,
                $item['discountPercent'] ?? 0.00,
                $isFirstEntry ? $item['discountAmount'] : 0,
                $item['tradeOfferPercent'] ?? 0.00,
                $isFirstEntry ? $item['tradeOfferAmount'] : 0,
                $item['gstPercent'] ?? 0.00,
                $isFirstEntry ? $item['gstAmount'] : 0,
                $item['focQty'] ?? 0,
                $isFirstEntry ? $item['netAmount'] : 0,
                $user_id,
                $user_id
            ]);
            $isFirstEntry = false;
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Purchase order saved successfully',
        'invoice_id' => $invoice_id
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

// Function to extract numeric amount from balance string
function extractBalanceAmount($balanceString) {
    if (empty($balanceString)) return 0.00;
    
    // Remove 'Dr' or 'Cr' and extract numeric value
    $amount = preg_replace('/^(Dr|Cr)\s*/', '', $balanceString);
    return floatval($amount);
}