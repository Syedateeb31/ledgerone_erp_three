<?php
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

session_start();
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
    
    if (empty($input['items']) || !is_array($input['items'])) {
        throw new Exception('At least one item is required');
    }
    
    $pdo->beginTransaction();
    
    // Generate sequential bill number
    $billStmt = $pdo->prepare("SELECT bill_no FROM purchase_invoice WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
    $billStmt->execute([$tenant_id]);
    $lastBill = $billStmt->fetchColumn();
    
    if ($lastBill) {
        $lastNumber = (int)substr($lastBill, 4); // Extract number from PUR-XXXX
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    $billNo = 'PUR-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    
    // Insert purchase invoice
    $stmt = $pdo->prepare("
        INSERT INTO purchase_invoice (
            tenant_id, company_id, currency_id, bill_no, purchase_date, supplier_id, branch_id,
            previous_balance, total_bill, total_discount_percent,
            total_discount_amount, total_tax_percent, total_tax_amount,
            shipping_fees, shipping_fees_type, net_amount, status, supplier_invoice_no, supplier_invoice_date,
            purchase_order_id, rpo_no, truck_no, payment_term_id, bilty_no, transport_name, remarks, sub_account_id,
            rate_type, brokery_rate_type, brokery_kg_basis, brokery_pct_mode, brokery_rate, brokery_amount, brokery_amount_sign,
            brokery_tax_percent, brokery_tax_amount, brokery_tax_amount_sign,
            wt_charges, wt_charges_sign, freight, freight_sign, m_sukri, m_sukri_sign,
            broken_percent, broken_amount, broken_amount_sign,
            bardana, bardana_sign, phone_charges, phone_charges_sign,
            filling_charges, filling_charges_sign, total_charges,
            created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $tenant_id,
        $input['companyId'],
        $input['currencyId'],
        $billNo,
        $input['purchaseDate'],
        $input['supplierId'],
        $input['branchId'],
        extractBalanceAmount($input['previousBalance'] ?? '0.00'),
        $input['totalBill'],
        $input['totalDiscountPercent'] ?? 0.00,
        $input['totalDiscountAmount'] ?? 0.00,
        $input['totalTaxPercent'] ?? 0.00,
        $input['totalTaxAmount'] ?? 0.00,
        $input['shippingFees'] ?? 0.00,
        $input['shippingFeesType'] ?? 'add',
        $input['netAmount'],
        $input['status'] ?? 'pending',
        $input['supplierInvoiceNo'],
        $input['supplierInvoiceDate'],
        $input['purchaseOrderId'] ?? null,
        $input['rpoNo'] ?? null,
        $input['truckNo'] ?? null,
        $input['paymentTermId'] ?? null,
        $input['biltyNo'],
        $input['transportName'],
        $input['remarks'] ?? null,
        $input['subAccountId'] ?? null,
        $input['rateType'] ?? null,
        $input['brokeryRateType'] ?? null,
        $input['brokeryKgBasis'] ?? 'net',
        $input['brokeryPctMode'] ?? 0,
        $input['brokeryRate'] ?? 0,
        $input['brokeryAmount'] ?? 0,
        $input['brokeryAmountSign'] ?? '+',
        $input['brokeryTaxPercent'] ?? 0,
        $input['brokeryTaxAmount'] ?? 0,
        $input['brokeryTaxAmountSign'] ?? '+',
        $input['wtCharges'] ?? 0,
        $input['wtChargesSign'] ?? '+',
        $input['freight'] ?? 0,
        $input['freightSign'] ?? '+',
        $input['mSukri'] ?? 0,
        $input['mSukriSign'] ?? '+',
        $input['brokenPercent'] ?? 0,
        $input['brokenAmount'] ?? 0,
        $input['brokenAmountSign'] ?? '+',
        $input['bardana'] ?? 0,
        $input['bardanaSign'] ?? '+',
        $input['phoneCharges'] ?? 0,
        $input['phoneChargesSign'] ?? '+',
        $input['fillingCharges'] ?? 0,
        $input['fillingChargesSign'] ?? '+',
        $input['totalCharges'] ?? 0,
        $user_id,
        $user_id
    ]);
    
    $invoice_id = $pdo->lastInsertId();
    
    // Insert invoice items
    $item_stmt = $pdo->prepare("
        INSERT INTO purchase_invoice_items (
            tenant_id, purchase_invoice_id, product_id, uom_id,
            quantity, purchase_price, gross_amount, discount_percent,
            discount_amount, trade_offer_percent, trade_offer_amount,
            tax_percent, tax_amount, foc_quantity, net_amount,
            bag, total_kg, cut_kg_percent, cut_kg, al_kg_percent, al_kg, net_kg, al_rate_cut, net_rate,
            created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                $item['taxPercent'] ?? 0.00,
                $isFirstEntry ? $item['taxAmount'] : 0,
                $item['focQty'] ?? 0,
                $isFirstEntry ? $item['netAmount'] : 0,
                $isFirstEntry ? ($item['bag'] ?? 0) : 0,
                $isFirstEntry ? ($item['totalKg'] ?? 0) : 0,
                $isFirstEntry ? ($item['cutKgPercent'] ?? 0) : 0,
                $isFirstEntry ? ($item['cutKg'] ?? 0) : 0,
                $isFirstEntry ? ($item['alKgPercent'] ?? 0) : 0,
                $isFirstEntry ? ($item['alKg'] ?? 0) : 0,
                $isFirstEntry ? ($item['netKg'] ?? 0) : 0,
                $isFirstEntry ? ($item['alRateCut'] ?? 0) : 0,
                $isFirstEntry ? ($item['netRate'] ?? 0) : 0,
                $user_id,
                $user_id
            ]);
            
            // Stock ledger entry for each unit
            $stockAffects = $item['stockAffects'] ?? 1;
            if ($stockAffects == 1) {
                $product_stmt = $pdo->prepare("SELECT inventory_account_id FROM products WHERE id = ?");
                $product_stmt->execute([$item['productId']]);
                $account_id = $product_stmt->fetchColumn();
                
                $stock_stmt = $pdo->prepare("
                    INSERT INTO stock_ledger (
                        tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                        qty_in, unit_cost, unit_id, transaction_type, transaction_date
                    ) VALUES (?, ?, ?, ?, 'purchase_invoice', ?, ?, ?, ?, 'Purchase Invoice', ?)
                ");
                $stock_stmt->execute([
                    $tenant_id,
                    $account_id,
                    $input['branchId'],
                    $item['productId'],
                    $invoice_id,
                    $unitEntry['quantity'],
                    $item['purchasePrice'],
                    $unitEntry['uomId'],
                    $input['purchaseDate']
                ]);
            }
            
            $isFirstEntry = false;
        }
    }
    
    // Accounting entries
    $ledger_stmt = $pdo->prepare("
        INSERT INTO accounting_ledger (
            tenant_id, transaction_type, reference_table, reference_id,
            account_id, date, description, debit, credit
        ) VALUES (?, 'Purchase Invoice', 'purchase_invoice', ?, ?, ?, ?, ?, ?)
    ");
    
    // 1. Debit - Purchases (totalBill already has item discounts applied, subtract invoice-level discount)
    $purchaseAmount = $input['totalBill'] - $input['totalDiscountAmount'];
    $ledger_stmt->execute([$tenant_id, $invoice_id, 19, $input['purchaseDate'], 'Purchase Invoice - ' . $billNo, $purchaseAmount, 0]);
    
    // 2. Debit - Input Tax Receivable
    if ($input['totalTaxAmount'] > 0) {
        $ledger_stmt->execute([$tenant_id, $invoice_id, 107, $input['purchaseDate'], 'Purchase Invoice - ' . $billNo, $input['totalTaxAmount'], 0]);
    }
    
    // 3. Debit - Freight Inward
    if ($input['shippingFees'] > 0) {
        $ledger_stmt->execute([$tenant_id, $invoice_id, 110, $input['purchaseDate'], 'Purchase Invoice - ' . $billNo, $input['shippingFees'], 0]);
    }
    
    // 4. Credit - Purchase Discounts Received (invoice-level discount)
    if ($input['totalDiscountAmount'] > 0) {
        $ledger_stmt->execute([$tenant_id, $invoice_id, 103, $input['purchaseDate'], 'Purchase Invoice - ' . $billNo, 0, $input['totalDiscountAmount']]);
    }
    
    // 5. Credit - Trade Creditors
    $ledger_stmt->execute([$tenant_id, $invoice_id, 14, $input['purchaseDate'], 'Purchase Invoice - ' . $billNo, 0, $input['netAmount']]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Purchase invoice saved successfully',
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