<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $invoice_id = $_GET['id'] ?? null;
    
    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Return ID is required']);
        exit;
    }
    
    try {
        // Get invoice data
        $stmt = $pdo->prepare("
            SELECT 
                pi.*,
                s.supplier_name,
                s.supplier_code,
                b.branch_name,
                b.branch_type,
                pb.branch_name as parent_branch_name,
                c.symbol as currency_symbol,
                c.code as currency_code,
                c.name as currency_name,
                sa.sub_account_name,
                co.company_name,
                co.legal_name,
                co.email,
                co.phone,
                co.address,
                co.city,
                co.state,
                co.zipcode,
                co.logo_url
            FROM purchase_return pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN branches b ON pi.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies c ON pi.currency_id = c.id
            LEFT JOIN supplier_sub_accounts sa ON pi.sub_account_id = sa.id
            LEFT JOIN companies co ON pi.company_id = co.id
            WHERE pi.id = ? AND pi.tenant_id = ?
        ");
        $stmt->execute([$invoice_id, $tenant_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Return not found']);
            exit;
        }
        
        // Get invoice items
        $itemStmt = $pdo->prepare("
            SELECT 
                pii.*,
                p.name as product_name,
                p.code as product_code
            FROM purchase_return_items pii
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
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $invoice_id = $input['invoice_id'] ?? null;
    
    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Return ID is required']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Update purchase return
        $stmt = $pdo->prepare("
            UPDATE purchase_return SET
                company_id = ?, currency_id = ?, purchase_date = ?, supplier_id = ?, branch_id = ?,
                previous_balance = ?, total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, total_gst_percent = ?, total_gst_amount = ?,
                shipping_fees = ?, net_amount = ?, purchase_invoice_no = ?, 
                bilty_no = ?, transport_name = ?, remarks = ?, sub_account_id = ?, updated_by = ?
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->execute([
            $input['companyId'],
            $input['currencyId'],
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
            $input['purchaseInvoiceId'],
            $input['biltyNo'],
            $input['transportName'],
            $input['remarks'] ?? null,
            $input['subAccountId'] ?? null,
            $user_id,
            $invoice_id,
            $tenant_id
        ]);
        
        // Delete existing items and related records
        $pdo->prepare("DELETE FROM purchase_return_items WHERE purchase_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM stock_ledger WHERE reference_table = 'purchase_return' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'purchase_return' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        
        // Insert new items
        $item_stmt = $pdo->prepare("
            INSERT INTO purchase_return_items (
                tenant_id, purchase_invoice_id, product_id, uom_id,
                quantity, purchase_price, gross_amount, discount_percent,
                discount_amount, net_amount, vehicle_no, trade_offer_percent, trade_offer_amount,
                gst_percent, gst_amount, foc_quantity, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($input['items'] as $item) {
            $item_stmt->execute([
                $tenant_id, $invoice_id, $item['productId'], $item['uomId'],
                $item['quantity'], $item['purchasePrice'], $item['grossAmount'],
                $item['discountPercent'] ?? 0.00, $item['discountAmount'] ?? 0.00,
                $item['netAmount'], $item['vehicleNo'] ?? null,
                $item['tradeOfferPercent'] ?? 0.00, $item['tradeOfferAmount'] ?? 0.00,
                $item['gstPercent'] ?? 0.00, $item['gstAmount'] ?? 0.00,
                $item['focQty'] ?? 0, $user_id, $user_id
            ]);
            
        // Get product's inventory_account_id
        $product_stmt = $pdo->prepare("SELECT inventory_account_id FROM products WHERE id = ?");
        $product_stmt->execute([$item['productId']]);
        $account_id = $product_stmt->fetchColumn();
        
        // Insert stock ledger - qty_out for returns (reducing inventory)
        $stock_stmt = $pdo->prepare("
            INSERT INTO stock_ledger (
                tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                qty_out, unit_cost, unit_id, transaction_type, transaction_date
            ) VALUES (?, ?, ?, ?, 'purchase_return', ?, ?, ?, ?, 'Purchase Return', ?)
        ");
        $stock_stmt->execute([
            $tenant_id, $account_id, $input['branchId'], $item['productId'], $invoice_id,
            $item['quantity'], $item['purchasePrice'], $item['uomId'], $input['purchaseDate']
        ]);
        }
        
        // Get bill number
        $billStmt = $pdo->prepare("SELECT bill_no FROM purchase_return WHERE id = ?");
        $billStmt->execute([$invoice_id]);
        $billNo = $billStmt->fetchColumn();
        
        // Accounting entries
        $ledger_stmt = $pdo->prepare("
            INSERT INTO accounting_ledger (
                tenant_id, transaction_type, reference_table, reference_id,
                account_id, date, description, debit, credit
            ) VALUES (?, 'Purchase Return', 'purchase_return', ?, ?, ?, ?, ?, ?)
        ");
        
        // Calculate total item-level discounts and trade offers
        $totalItemDiscounts = 0;
        $totalItemTradeOffers = 0;
        foreach ($input['items'] as $item) {
            $totalItemDiscounts += ($item['discountAmount'] ?? 0);
            $totalItemTradeOffers += ($item['tradeOfferAmount'] ?? 0);
        }
        
        // Calculate inventory value = Gross - All Discounts - All Trade Offers
        $inventoryValue = $input['totalBill'] - $totalItemDiscounts - $totalItemTradeOffers - ($input['totalDiscountAmount'] ?? 0);
        
        // 1. Debit - Accounts Payable - Reduce liability
        $ledger_stmt->execute([$tenant_id, $invoice_id, 14, $input['purchaseDate'], 'Purchase Return - ' . $billNo, $input['netAmount'], 0]);
        
        // 2. Credit - Inventory - Reduce asset value
        $ledger_stmt->execute([$tenant_id, $invoice_id, 1, $input['purchaseDate'], 'Purchase Return - ' . $billNo, 0, $inventoryValue]);
        
        // 3. Credit - Input Tax Receivable - Reverse GST
        if ($input['totalGSTAmount'] > 0) {
            $ledger_stmt->execute([$tenant_id, $invoice_id, 107, $input['purchaseDate'], 'Purchase Return - ' . $billNo, 0, $input['totalGSTAmount']]);
        }
        
        // 4. Credit - Freight Inward - Reverse shipping
        if ($input['shippingFees'] > 0) {
            $ledger_stmt->execute([$tenant_id, $invoice_id, 110, $input['purchaseDate'], 'Purchase Return - ' . $billNo, 0, $input['shippingFees']]);
        }
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Purchase return updated successfully']);
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Function to extract numeric amount from balance string
function extractBalanceAmount($balanceString) {
    if (empty($balanceString)) return 0.00;
    $amount = preg_replace('/^(Dr|Cr)\s*/', '', $balanceString);
    return floatval($amount);
}