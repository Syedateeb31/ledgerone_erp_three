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
                pi.*,
                s.supplier_name,
                s.supplier_code,
                b.branch_name,
                b.branch_type,
                b.branch_code,
                pb.branch_name as parent_branch_name,
                c.symbol as currency_symbol,
                c.code as currency_code,
                c.name as currency_name,
                po.bill_no as purchase_order_bill_no,
                sa.sub_account_name,
                co.company_name,
                co.legal_name,
                co.email as company_email,
                co.phone as company_phone,
                co.address as company_address,
                co.city as company_city,
                co.state as company_state,
                co.zipcode as company_zipcode,
                co.logo_url,
                pt.term_name as payment_term_name
            FROM purchase_invoice pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN branches b ON pi.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies c ON pi.currency_id = c.id
            LEFT JOIN purchase_order po ON pi.purchase_order_id = po.id
            LEFT JOIN supplier_sub_accounts sa ON pi.sub_account_id = sa.id
            LEFT JOIN companies co ON pi.company_id = co.id
            LEFT JOIN payment_terms pt ON pi.payment_term_id = pt.id
            WHERE pi.id = ? AND pi.tenant_id = ?
        ");
        $stmt->execute([$invoice_id, $tenant_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Invoice not found']);
            exit;
        }
        
        // Get invoice items grouped by product
        $itemStmt = $pdo->prepare("
            SELECT 
                pii.*,
                p.name as product_name,
                p.code as product_code,
                p.uom_type,
                p.uom_group_id,
                p.default_unit_id,
                u.uom_name
            FROM purchase_invoice_items pii
            LEFT JOIN products p ON pii.product_id = p.id
            LEFT JOIN uom u ON pii.uom_id = u.id
            WHERE pii.purchase_invoice_id = ? AND pii.tenant_id = ?
            ORDER BY pii.id
        ");
        $itemStmt->execute([$invoice_id, $tenant_id]);
        $rawItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!$rawItems) {
            $items = [];
        } else {
            // Group items: merge all entries with same product_id
            $productGroups = [];
            foreach ($rawItems as $item) {
                if (!$item['product_id']) continue;
                $productGroups[$item['product_id']][] = $item;
            }
            
            $groupedItems = [];
            $itemIndex = 0;
            
            foreach ($productGroups as $productId => $items_group) {
                $uomMap = [];
                $firstItem = null;
                $totalGross = 0;
                $totalDiscount = 0;
                $totalTradeOffer = 0;
                $totalGst = 0;
                $totalFoc = 0;
                $totalNet = 0;
                
                foreach ($items_group as $item) {
                    if (!$firstItem) $firstItem = $item;
                    
                    $uomId = $item['uom_id'];
                    if (!isset($uomMap[$uomId])) {
                        $uomMap[$uomId] = [
                            'uom_id' => $uomId,
                            'uom_name' => $item['uom_name'] ?? 'Unknown',
                            'quantity' => 0
                        ];
                    }
                    $uomMap[$uomId]['quantity'] += floatval($item['quantity'] ?? 0);
                    
                    if (floatval($item['gross_amount'] ?? 0) > 0) {
                        $totalGross += floatval($item['gross_amount'] ?? 0);
                        $totalDiscount += floatval($item['discount_amount'] ?? 0);
                        $totalTradeOffer += floatval($item['trade_offer_amount'] ?? 0);
                        $totalGst += floatval($item['tax_amount'] ?? 0);
                        $totalFoc += floatval($item['foc_quantity'] ?? 0);
                        $totalNet += floatval($item['net_amount'] ?? 0);
                    }
                }
                
                if ($firstItem) {
                    $itemIndex++;
                    $groupedItems[$itemIndex] = [
                        'product_id' => $productId,
                        'product_name' => $firstItem['product_name'] ?? 'Unknown',
                        'product_code' => $firstItem['product_code'] ?? '',
                        'uom_type' => $firstItem['uom_type'] ?? 'unit',
                        'uom_group_id' => $firstItem['uom_group_id'],
                        'default_unit_id' => $firstItem['default_unit_id'],
                        'purchase_price' => floatval($firstItem['purchase_price'] ?? 0),
                        'gross_amount' => $totalGross,
                        'discount_percent' => floatval($firstItem['discount_percent'] ?? 0),
                        'discount_amount' => $totalDiscount,
                        'trade_offer_percent' => floatval($firstItem['trade_offer_percent'] ?? 0),
                        'trade_offer_amount' => $totalTradeOffer,
                        'tax_percent' => floatval($firstItem['tax_percent'] ?? 0),
                        'tax_amount' => $totalGst,
                        'foc_quantity' => $totalFoc,
                        'net_amount' => $totalNet,
                        'unit_entries' => array_values($uomMap),
                        'bag' => floatval($firstItem['bag'] ?? 0),
                        'total_kg' => floatval($firstItem['total_kg'] ?? 0),
                        'cut_kg_percent' => floatval($firstItem['cut_kg_percent'] ?? 0),
                        'cut_kg' => floatval($firstItem['cut_kg'] ?? 0),
                        'al_kg_percent' => floatval($firstItem['al_kg_percent'] ?? 0),
                        'al_kg' => floatval($firstItem['al_kg'] ?? 0),
                        'net_kg' => floatval($firstItem['net_kg'] ?? 0),
                        'al_rate_cut' => floatval($firstItem['al_rate_cut'] ?? 0),
                        'net_rate' => floatval($firstItem['net_rate'] ?? 0)
                    ];
                }
            }
            
            $items = array_values($groupedItems);
        }
        
        echo json_encode([
            'success' => true,
            'invoice' => $invoice,
            'items' => $items ?? []
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error loading invoice: ' . $e->getMessage()]);
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
        
        // Update purchase invoice
        $stmt = $pdo->prepare("
            UPDATE purchase_invoice SET
                company_id = ?, currency_id = ?, purchase_date = ?, supplier_id = ?, branch_id = ?,
                previous_balance = ?, total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, total_tax_percent = ?, total_tax_amount = ?,
                shipping_fees = ?, shipping_fees_type = ?, net_amount = ?, supplier_invoice_no = ?,
                supplier_invoice_date = ?, purchase_order_id = ?, rpo_no = ?, truck_no = ?, delivered_at = ?, payment_term_id = ?, bilty_no = ?, transport_name = ?, remarks = ?, sub_account_id = ?,
                rate_type = ?, brokery_rate_type = ?, brokery_kg_basis = ?, brokery_pct_mode = ?, brokery_rate = ?, brokery_amount = ?, brokery_amount_sign = ?,
                brokery_tax_percent = ?, brokery_tax_amount = ?, brokery_tax_amount_sign = ?,
                wt_charges = ?, wt_charges_sign = ?, freight = ?, freight_sign = ?, m_sukri = ?, m_sukri_sign = ?,
                broken_percent = ?, broken_amount = ?, broken_amount_sign = ?,
                bardana = ?, bardana_sign = ?, phone_charges = ?, phone_charges_sign = ?,
                filling_charges = ?, filling_charges_sign = ?, total_charges = ?,
                status = ?, updated_by = ?
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
            $input['totalTaxPercent'] ?? 0.00,
            $input['totalTaxAmount'] ?? 0.00,
            $input['shippingFees'] ?? 0.00,
            $input['shippingFeesType'] ?? 'add',
            $input['netAmount'],
            $input['supplierInvoiceNo'],
            $input['supplierInvoiceDate'],
            $input['purchaseOrderId'] ?? null,
            $input['rpoNo'] ?? null,
            $input['truckNo'] ?? null,
            $input['deliveredAt'] ?? null,
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
            $input['status'] ?? 'pending',
            $user_id,
            $invoice_id,
            $tenant_id
        ]);
        
        // Delete existing items and related records
        $pdo->prepare("DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM stock_ledger WHERE reference_table = 'purchase_invoice' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'purchase_invoice' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        
        // Insert new items with dynamic UOM system
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
        
        // Get bill number
        $billStmt = $pdo->prepare("SELECT bill_no FROM purchase_invoice WHERE id = ?");
        $billStmt->execute([$invoice_id]);
        $billNo = $billStmt->fetchColumn();
        
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
        
        echo json_encode(['success' => true, 'message' => 'Purchase invoice updated successfully']);
        
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