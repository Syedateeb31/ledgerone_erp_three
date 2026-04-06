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
        echo json_encode(['success' => false, 'message' => 'Invoice ID is required']);
        exit;
    }

    try {
        // Get invoice data
        $stmt = $pdo->prepare("
            SELECT 
                si.*,
                c.customer_name,
                c.customer_code,
                c.address as customer_address,
                c.primary_phone as customer_phone,
                c.email as customer_email,
                b.branch_name,
                b.branch_code,
                b.branch_type,
                pb.branch_name as parent_branch_name,
                cur.symbol as currency_symbol,
                cur.code as currency_code,
                cur.name as currency_name,
                e.full_name as sales_officer_name,
                sm.full_name as supplier_man_name,
                comp.company_name,
                comp.company_code,
                comp.legal_name,
                comp.email as company_email,
                comp.phone as company_phone,
                comp.address as company_address,
                comp.city as company_city,
                comp.state as company_state,
                comp.zipcode as company_zipcode,
                comp.logo_url as company_logo
            FROM sale_return si
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN branches b ON si.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
            LEFT JOIN employees e ON si.sale_officer_id = e.id
            LEFT JOIN employees sm ON si.supplier_man_id = sm.id
            LEFT JOIN companies comp ON si.company_id = comp.id
            WHERE si.id = ? AND si.tenant_id = ?
        ");
        $stmt->execute([$invoice_id, $tenant_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Return not found']);
            exit;
        }

        // Get return items
        $itemStmt = $pdo->prepare("
            SELECT 
                sii.*,
                p.name as product_name,
                p.code as product_code,
                u.uom_name
            FROM sale_return_items sii
            LEFT JOIN products p ON sii.product_id = p.id
            LEFT JOIN uom u ON sii.uom_id = u.id
            WHERE sii.sale_invoice_id = ? AND sii.tenant_id = ?
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
        echo json_encode(['success' => false, 'message' => 'Invoice ID is required']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Update sale return
        $stmt = $pdo->prepare("
            UPDATE sale_return SET
                company_id = ?, currency_id = ?, sale_date = ?, customer_id = ?, branch_id = ?,
                previous_balance = ?, total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, net_amount = ?, sale_invoice_no = ?, 
                amount_refunded = ?, payment_method = ?, bank_account_id = ?, sale_officer_id = ?, supplier_man_id = ?, sub_account_id = ?, remarks = ?, status = ?, updated_by = ?
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->execute([
            $input['companyId'] ?? null,
            $input['currencyId'],
            $input['saleDate'],
            $input['customerId'],
            $input['branchId'],
            extractBalanceAmount($input['previousBalance'] ?? '0.00'),
            $input['totalBill'],
            $input['totalDiscountPercent'] ?? 0.00,
            $input['totalDiscountAmount'] ?? 0.00,
            $input['netAmount'],
            $input['saleInvoiceId'] ?? null,
            $input['amountPaid'] ?? 0.00,
            $input['paymentMethod'] ?? null,
            $input['bankAccountId'] ?? null,
            $input['salesOfficerId'] ?? null,
            $input['supplierManId'] ?? null,
            $input['subAccountId'] ?? null,
            $input['remarks'] ?? null,
            $input['status'] ?? 'Posted',
            $user_id,
            $invoice_id,
            $tenant_id
        ]);

        // Delete existing items and related records
        $pdo->prepare("DELETE FROM sale_return_items WHERE sale_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM stock_ledger WHERE reference_table = 'sale_return' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'sale_return' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);

        $status = $input['status'] ?? 'Posted';

        // Insert new items
        $item_stmt = $pdo->prepare("
            INSERT INTO sale_return_items (
                tenant_id, sale_invoice_id, product_id, uom_id,
                quantity, sale_price, gross_amount, discount_percent,
                discount_amount, trade_offer_percent, trade_offer_amount,
                gst_percent, gst_amount, foc_quantity, net_amount, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($input['items'] as $item) {
            $item_stmt->execute([
                $tenant_id,
                $invoice_id,
                $item['productId'],
                $item['uomId'],
                $item['quantity'],
                $item['salePrice'],
                $item['grossAmount'],
                $item['discountPercent'] ?? 0.00,
                $item['discountAmount'] ?? 0.00,
                $item['tradeOfferPercent'] ?? 0.00,
                $item['tradeOfferAmount'] ?? 0.00,
                $item['gstPercent'] ?? 0.00,
                $item['gstAmount'] ?? 0.00,
                $item['focQty'] ?? 0.00,
                $item['netAmount'],
                $user_id,
                $user_id
            ]);

            // Skip stock ledger for Draft status
            if ($status === 'Posted') {
                // Get inventory account_id from product
                $accountStmt = $pdo->prepare("SELECT inventory_account_id FROM products WHERE id = ?");
                $accountStmt->execute([$item['productId']]);
                $accountId = $accountStmt->fetchColumn() ?: 0;
                
                // Convert quantity to pieces based on UOM
                $qtyInPieces = convertToPieces($item['quantity'], $item['uomId'], $pdo, $item['productId']);
                
                // Insert stock ledger for quantity returned
                $stock_stmt = $pdo->prepare("
                        INSERT INTO stock_ledger (
                            tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                            qty_in, unit_cost, unit_id, stock_status, transaction_type, transaction_date
                        ) VALUES (?, ?, ?, ?, 'sale_return', ?, ?, ?, ?, ?, 'Sale Return', ?)
                    ");
                $stock_stmt->execute([
                    $tenant_id,
                    $accountId,
                    $input['branchId'],
                    $item['productId'],
                    $invoice_id,
                    $qtyInPieces,
                    $item['salePrice'],
                    $item['uomId'],
                    $item['stockStatus'] ?? 'sellable',
                    $input['saleDate']
                ]);
                
                // Insert stock ledger for FOC quantity if exists
                if (isset($item['focQty']) && $item['focQty'] > 0) {
                    $focQtyInPieces = convertToPieces($item['focQty'], $item['uomId'], $pdo, $item['productId']);
                    
                    $foc_stmt = $pdo->prepare("
                        INSERT INTO stock_ledger (
                            tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                            qty_in, unit_cost, unit_id, stock_status, transaction_type, transaction_date
                        ) VALUES (?, ?, ?, ?, 'sale_return', ?, ?, ?, ?, ?, 'Sale Return - FOC', ?)
                    ");
                    $foc_stmt->execute([
                        $tenant_id,
                        $accountId,
                        $input['branchId'],
                        $item['productId'],
                        $invoice_id,
                        $focQtyInPieces,
                        0,
                        $item['uomId'],
                        $item['stockStatus'] ?? 'sellable',
                        $input['saleDate']
                    ]);
                }
            }
        }

        // Get bill_no for accounting entries
        $billStmt = $pdo->prepare("SELECT bill_no FROM sale_return WHERE id = ? AND tenant_id = ?");
        $billStmt->execute([$invoice_id, $tenant_id]);
        $billNo = $billStmt->fetchColumn();

        // Skip accounting ledger for Draft status
        if ($status === 'Posted') {
            // Calculate total GST
            $totalGST = 0;
            foreach ($input['items'] as $item) {
                $totalGST += floatval($item['gstAmount'] ?? 0);
            }
            
            // Entry 1: Record Sales Return
            // Dr: Sales Returns & Allowances (Net Amount excluding GST)
            $netAmountExcludingGST = $input['netAmount'] - $totalGST;
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, debit
                ) VALUES (?, 'Sale Return', 'sale_return', ?, 18, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $input['saleDate'],
                'Sale Return - ' . $billNo, $netAmountExcludingGST
            ]);
            
            // Dr: Sales Tax Payable (GST reversal)
            if ($totalGST > 0) {
                $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id,
                        account_id, date, description, debit
                    ) VALUES (?, 'Sale Return', 'sale_return', ?, 106, ?, ?, ?)
                ")->execute([
                    $tenant_id, $invoice_id, $input['saleDate'],
                    'Sale Return - GST Reversal - ' . $billNo, $totalGST
                ]);
            }
            
            // Cr: Trade Debtors (Total Net Amount)
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, credit
                ) VALUES (?, 'Sale Return', 'sale_return', ?, 2, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $input['saleDate'],
                'Sale Return - ' . $billNo, $input['netAmount']
            ]);
        }

        // Entry 2: If amount refunded > 0, record cash payment
        if ($status === 'Posted' && isset($input['amountPaid']) && $input['amountPaid'] > 0) {
            // Get account_id for cash/bank
            if ($input['paymentMethod'] === 'cash') {
                $cashAccountId = 1;
            } else {
                $bankStmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ?");
                $bankStmt->execute([$input['bankAccountId']]);
                $cashAccountId = $bankStmt->fetchColumn();
            }

            // Dr: Trade Debtors
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, debit
                ) VALUES (?, 'Sale Return', 'sale_return', ?, 2, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $input['saleDate'],
                'Sale Return Payment - ' . $billNo, $input['amountPaid']
            ]);

            // Cr: Cash/Bank Account
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, credit
                ) VALUES (?, 'Sale Return', 'sale_return', ?, ?, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $cashAccountId, $input['saleDate'],
                'Sale Return Payment - ' . $billNo, $input['amountPaid']
            ]);
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Sale return updated successfully']);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Function to extract numeric amount from balance string
function extractBalanceAmount($balanceString)
{
    if (empty($balanceString))
        return 0.00;
    $amount = preg_replace('/^(Dr|Cr)\s*/', '', $balanceString);
    return floatval($amount);
}

// Function to convert quantity to pieces based on UOM
function convertToPieces($quantity, $uomId, $pdo, $productId)
{
    $qty = floatval($quantity);
    $uomId = intval($uomId);
    
    // Piece (id: 9) - base unit
    if ($uomId === 9) {
        return $qty;
    }
    
    // Dozen (id: 10) - 12 pieces
    if ($uomId === 10) {
        return $qty * 12;
    }
    
    // Carton (id: 16) - get from product's carton_conversion
    if ($uomId === 16) {
        $stmt = $pdo->prepare("SELECT carton_conversion FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $cartonConversion = $stmt->fetchColumn();
        return $qty * intval($cartonConversion ?: 1);
    }
    
    // Other units - return as is
    return $qty;
}