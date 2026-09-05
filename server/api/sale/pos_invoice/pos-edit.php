<?php
require_once '../../../../includes/connection.php';
require_once 'invoice-tax-helper.php';
require_once 'stock-management.php';

error_reporting(0);
ini_set('display_errors', '0');

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
                c.identity_card_no as customer_identity_card,
                csa.sub_account_name,
                co.company_name,
                b.branch_name,
                b.branch_code,
                b.branch_type,
                pb.branch_name as parent_branch_name,
                cur.symbol as currency_symbol,
                cur.code as currency_code,
                cur.name as currency_name,
                e.id as sales_officer_id,
                e.full_name as sales_officer_name,
                sm.id as supplier_man_id,
                sm.employee_id as supplier_man_employee_id,
                sm.full_name as supplier_man_name,
                br.supplier_name as brand_name,
                COALESCE(rv.amount, 0) as amount_paid,
                CASE 
                    WHEN rv.payment_method_id = 1 THEN 'cash'
                    WHEN rv.payment_method_id = 2 THEN 'bank_transfer'
                    ELSE NULL
                END as payment_method,
                pt.term_name as payment_term_name
            FROM sale_invoice si
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN customer_sub_accounts csa ON si.sub_account_id = csa.id
            LEFT JOIN companies co ON si.company_id = co.id
            LEFT JOIN branches b ON si.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
            LEFT JOIN employees e ON si.sale_officer_id = e.id
            LEFT JOIN employees sm ON si.supplier_man_id = sm.id
            LEFT JOIN suppliers br ON si.brand_id = br.id
            LEFT JOIN receive_voucher rv ON si.bill_no = rv.bill_no AND si.tenant_id = rv.tenant_id
            LEFT JOIN payment_terms pt ON si.payment_term_id = pt.id
            WHERE si.id = ? AND si.tenant_id = ?
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
                sii.*,
                COALESCE(sii.scheme, 'sale_on_tp') as scheme,
                p.name as product_name,
                p.code as product_code,
                p.stock_affects,
                p.invoice_affects,
                u.uom_name
            FROM sale_invoice_items sii
            LEFT JOIN products p ON sii.product_id = p.id
            LEFT JOIN uom u ON sii.uom_id = u.id
            WHERE sii.sale_invoice_id = ? AND sii.tenant_id = ?
            ORDER BY COALESCE(sii.parent_row_id, sii.id), sii.id
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

        // Get customer tax info
        $customerStmt = $pdo->prepare("SELECT is_sales_tax_registered, is_filer, advance_income_tax_percentage FROM customers WHERE id = ?");
        $customerStmt->execute([$input['customerId']]);
        $customer = $customerStmt->fetch();
        
        // Calculate withholding tax
        $withholdingTaxPercent = floatval($customer['advance_income_tax_percentage'] ?? 0);
        $withholdingTaxAmount = $input['netAmount'] * ($withholdingTaxPercent / 100);

        // Update sale invoice
        $stmt = $pdo->prepare("
            UPDATE sale_invoice SET
                currency_id = ?, sale_date = ?, customer_id = ?, sub_account_id = ?, company_id = ?, branch_id = ?,
                previous_balance = ?, sale_officer_id = ?, supplier_man_id = ?, brand_id = ?, sale_order_id = ?, rpo_no = ?, truck_no = ?, payment_term_id = ?, bilty_no = ?, transport_name = ?,
                rate_type = ?, brokery_rate_type = ?, brokery_kg_basis = ?, brokery_pct_mode = ?, brokery_rate = ?, brokery_amount = ?,
                brokery_tax_percent = ?, brokery_tax_amount = ?,
                wt_charges = ?, wt_charges_sign = ?, freight = ?, freight_sign = ?, m_sukri = ?, m_sukri_sign = ?,
                broken_percent = ?, broken_amount = ?, broken_amount_sign = ?, brokery_amount_sign = ?, brokery_tax_amount_sign = ?,
                bardana = ?, bardana_sign = ?, phone_charges = ?, phone_charges_sign = ?,
                filling_charges = ?, filling_charges_sign = ?, total_charges = ?,
                total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, extra_discount_1_percent = ?, extra_discount_1_amount = ?, extra_discount_2_percent = ?, extra_discount_2_amount = ?,
                shipping_fees = ?,
                net_amount = ?, withholding_tax_percent = ?, withholding_tax_amount = ?, amount_paid_auto_fill = ?, invoice_type = ?, due_date = ?, remarks = ?, status = ?, invoice_status = ?, updated_by = ?
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->execute([
            $input['currencyId'],
            $input['saleDate'],
            $input['customerId'],
            $input['subAccountId'] ?? null,
            $input['companyId'] ?? null,
            $input['branchId'],
            extractBalanceAmount($input['previousBalance'] ?? '0.00'),
            $input['salesOfficerId'] ?? null,
            $input['supplierManId'] ?? null,
            $input['brandId'] ?? null,
            $input['saleOrderId'] ?? null,
            $input['rpoNo'] ?? null,
            $input['truckNo'] ?? null,
            $input['paymentTermId'] ?? null,
            $input['biltyNo'] ?? null,
            $input['transportName'] ?? null,
            $input['rateType'] ?? null,
            $input['brokeryRateType'] ?? null,
            $input['brokeryKgBasis'] ?? 'net',
            $input['brokeryPctMode'] ? 1 : 0,
            $input['brokeryRate'] ?? 0.00,
            $input['brokeryAmount'] ?? 0.00,
            $input['brokeryTaxPercent'] ?? 0.00,
            $input['brokeryTaxAmount'] ?? 0.00,
            $input['wtCharges'] ?? 0.00,
            $input['wtChargesSign'] ?? '+',
            $input['freight'] ?? 0.00,
            $input['freightSign'] ?? '+',
            $input['mSukri'] ?? 0.00,
            $input['mSukriSign'] ?? '+',
            $input['brokenPercent'] ?? 0.00,
            $input['brokenAmount'] ?? 0.00,
            $input['brokenAmountSign'] ?? '+',
            $input['brokeryAmountSign'] ?? '+',
            $input['brokeryTaxAmountSign'] ?? '+',
            $input['bardana'] ?? 0.00,
            $input['bardanaSign'] ?? '+',
            $input['phoneCharges'] ?? 0.00,
            $input['phoneChargesSign'] ?? '+',
            $input['fillingCharges'] ?? 0.00,
            $input['fillingChargesSign'] ?? '+',
            $input['totalCharges'] ?? 0.00,
            $input['totalBill'],
            $input['totalDiscountPercent'] ?? 0.00,
            $input['totalDiscountAmount'] ?? 0.00,
            $input['extraDiscount1Percent'] ?? 0.00,
            $input['extraDiscount1Amount'] ?? 0.00,
            $input['extraDiscount2Percent'] ?? 0.00,
            $input['extraDiscount2Amount'] ?? 0.00,
            $input['shippingFees'] ?? 0.00,
            $input['netAmount'],
            $withholdingTaxPercent,
            $withholdingTaxAmount,
            $input['amountPaidAutoFill'] ?? 'yes',
            $input['invoiceType'] ?? 'Cash',
            $input['dueDate'] ?? null,
            $input['remarks'] ?? null,
            $input['status'] ?? 'Posted',
            $input['invoiceStatus'] ?? 'pending',
            $user_id,
            $invoice_id,
            $tenant_id
        ]);

        // Delete existing items and related records
        $pdo->prepare("DELETE FROM sale_invoice_taxes WHERE sale_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        $pdo->prepare("DELETE FROM sale_invoice_items WHERE sale_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        // Delete existing stock ledger entries
        deleteInvoiceStockLedger($pdo, $tenant_id, $invoice_id);
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'sale_invoice' AND reference_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        
        // Delete existing receive voucher and its accounting entries
        $billStmt = $pdo->prepare("SELECT bill_no FROM sale_invoice WHERE id = ?");
        $billStmt->execute([$invoice_id]);
        $billNo = $billStmt->fetchColumn();
        
        $rvStmt = $pdo->prepare("SELECT id FROM receive_voucher WHERE bill_no = ? AND tenant_id = ?");
        $rvStmt->execute([$billNo, $tenant_id]);
        $existingRvId = $rvStmt->fetchColumn();
        
        if ($existingRvId) {
            $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'receive_voucher' AND reference_id = ? AND tenant_id = ?")->execute([$existingRvId, $tenant_id]);
            $pdo->prepare("DELETE FROM receive_voucher WHERE id = ? AND tenant_id = ?")->execute([$existingRvId, $tenant_id]);
        }

        $status = $input['status'] ?? 'Posted';

        // Save invoice-level taxes
        if (!empty($input['invoiceLevelTaxes']) && is_array($input['invoiceLevelTaxes'])) {
            $mappedTaxes = array_map(function($t) use ($input) {
                return [
                    'taxRegimeId'   => $t['regime_id'] ?? null,
                    'taxRateId'     => $t['tax_rate_id'] ?? null,
                    'taxName'       => $t['regime_name'] ?? 'Tax',
                    'ratePercentage'=> floatval($t['rate_percentage'] ?? 0),
                    'baseAmount'    => floatval($input['netAmount'] ?? 0),
                    'taxAmount'     => floatval($t['calculated_amount'] ?? 0),
                ];
            }, $input['invoiceLevelTaxes']);
            saveInvoiceTaxes($pdo, $tenant_id, $invoice_id, $mappedTaxes, $user_id);
        }

        // Insert new items
        $item_stmt = $pdo->prepare("
            INSERT INTO sale_invoice_items (
                tenant_id, sale_invoice_id, product_id, uom_id,
                bag, total_kg, cut_kg_percent, cut_kg, al_kg_percent, al_kg, net_kg, al_rate_cut, net_rate,
                quantity, sale_price, gross_amount, discount_percent,
                discount_amount, trade_offer_percent, trade_offer_amount,
                gst_percent, gst_amount, tax_percent, tax_amount, foc_quantity, net_amount, parent_row_id,
                piece, carton, dozen, scheme, chassis_no, motor_no, colour, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $itemIdMap = [];
        foreach ($input['items'] as $index => $item) {
            $parentRowId = null;
            if (isset($item['parentRowId']) && $item['parentRowId'] !== null) {
                $parentRowId = $itemIdMap[$item['parentRowId']] ?? null;
            }
            
                        $item_stmt->execute([
            $tenant_id,
            $invoice_id,
            $item['productId'],
            $item['uomId'],
            $item['bag'] ?? 0.00,
            $item['totalKg'] ?? 0.00,
            $item['cutKgPercent'] ?? 0.00,
            $item['cutKg'] ?? 0.00,
            $item['alKgPercent'] ?? 0.00,
            $item['alKg'] ?? 0.00,
            $item['netKg'] ?? 0.00,
            $item['alRateCut'] ?? 0.00,
            $item['netRate'] ?? 0.00,
            $item['quantity'],
            $item['salePrice'],
            $item['grossAmount'],
            $item['discountPercent'] ?? 0.00,
            $item['discountAmount'] ?? 0.00,
            $item['tradeOfferPercent'] ?? 0.00,
            $item['tradeOfferAmount'] ?? 0.00,
            0.00,
            0.00,
            $item['taxPercent'] ?? 0.00,
            $item['taxAmount'] ?? 0.00,
            $item['focQty'] ?? 0.00,
            $item['netAmount'],
            $parentRowId,
            $item['piece'] ?? null,
            $item['carton'] ?? null,
            $item['dozen'] ?? null,
            $item['scheme'] ?? 'sale_on_tp',
            $item['chassisNo'] ?? null,
            $item['motorNo'] ?? null,
            $item['colour'] ?? null,
            $user_id,
            $user_id
        ]);
            
            $itemIdMap[$index + 1] = $pdo->lastInsertId();

            // Handle stock ledger based on invoice type and stock_affects flag
            if ($status === 'Posted') {
                // Insert stock ledger entry (will skip if invoice type doesn't affect stock)
                insertStockLedgerEntry(
                    $pdo, $tenant_id, $invoice_id, $item['productId'],
                    $item['quantity'], $item['uomId'], $input['branchId'],
                    $input['saleDate'], $input['invoiceType'] ?? 'Cash'
                );
                
                // Insert FOC stock ledger entry if exists
                if (isset($item['focQty']) && $item['focQty'] > 0) {
                    insertFOCStockLedgerEntry(
                        $pdo, $tenant_id, $invoice_id, $item['productId'],
                        $item['focQty'], $item['uomId'], $input['branchId'],
                        $input['saleDate'], $input['invoiceType'] ?? 'Cash'
                    );
                }
            }
        }

        // Skip accounting ledger for Draft status
        if ($status === 'Posted') {
            // Calculate totals for accounting entries
            $totalTradeOffer = 0;
            $totalTax = 0;
            $totalGrossAmount = 0;
            
            foreach ($input['items'] as $item) {
                $totalTradeOffer += floatval($item['tradeOfferAmount'] ?? 0);
                $totalTax += floatval($item['taxAmount'] ?? 0);
                $totalGrossAmount += floatval($item['grossAmount']);
            }
            
            $totalInvoiceDiscount = floatval($input['totalDiscountAmount'] ?? 0);
            
            // Calculate net receivable (after withholding tax)
            $netReceivable = $input['netAmount'] - $withholdingTaxAmount;
            
            // Debit: Trade Debtors (Net Receivable after withholding tax)
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, debit
                ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 2, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $input['saleDate'],
                'Sale Invoice - ' . $billNo, $netReceivable
            ]);
            
            // Debit: AIT Receivable (Withholding Tax)
            if ($withholdingTaxAmount > 0) {
                $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id,
                        account_id, date, description, debit
                    ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 137, ?, ?, ?)
                ")->execute([
                    $tenant_id, $invoice_id, $input['saleDate'],
                    'AIT Withholding - ' . $billNo, $withholdingTaxAmount
                ]);
            }
            
            // Debit: Discount Allowed (Invoice-level discount only)
            if ($totalInvoiceDiscount > 0) {
                $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id,
                        account_id, date, description, debit
                    ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 89, ?, ?, ?)
                ")->execute([
                    $tenant_id, $invoice_id, $input['saleDate'],
                    'Sale Invoice - ' . $billNo, $totalInvoiceDiscount
                ]);
            }
            
            // Debit: Trade Discount (Trade Offer)
            if ($totalTradeOffer > 0) {
                $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id,
                        account_id, date, description, debit
                    ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 105, ?, ?, ?)
                ")->execute([
                    $tenant_id, $invoice_id, $input['saleDate'],
                    'Sale Invoice - ' . $billNo, $totalTradeOffer
                ]);
            }
            
            // Credit: Sales Revenue (Gross Amount)
            $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, credit
                ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 9, ?, ?, ?)
            ")->execute([
                $tenant_id, $invoice_id, $input['saleDate'],
                'Sale Invoice - ' . $billNo, $totalGrossAmount
            ]);
            
            // Credit: Sales Tax Payable
            if ($totalTax > 0) {
                $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id,
                        account_id, date, description, credit
                    ) VALUES (?, 'Sale Invoice', 'sale_invoice', ?, 106, ?, ?, ?)
                ")->execute([
                    $tenant_id, $invoice_id, $input['saleDate'],
                    'Sale Invoice - ' . $billNo, $totalTax
                ]);
            }
        }

        // Insert receive voucher if amount paid > 0 and status is Posted
        if ($status === 'Posted' && isset($input['amountPaid']) && $input['amountPaid'] > 0) {
            // Generate voucher number with year
            $currentYear = date('Y');
            $voucherStmt = $pdo->prepare("SELECT voucher_number FROM receive_voucher WHERE tenant_id = ? AND voucher_number LIKE ? ORDER BY id DESC LIMIT 1");
            $voucherStmt->execute([$tenant_id, "RV-{$currentYear}-%"]);
            $lastVoucher = $voucherStmt->fetchColumn();

            if ($lastVoucher) {
                $lastNumber = (int) substr($lastVoucher, strrpos($lastVoucher, '-') + 1);
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }
            $voucherNumber = 'RV-' . $currentYear . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);

            // Determine payment method ID (1=Cash, 2=Bank Transfer)
            $paymentMethodId = ($input['paymentMethod'] === 'cash') ? 1 : 2;

            // Insert receive voucher
            $rvStmt = $pdo->prepare("
                INSERT INTO receive_voucher (
                    tenant_id, currency_id, voucher_number, voucher_date, customer_id,
                    bill_no, amount, payment_method_id, bank_account_id, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $rvStmt->execute([
                $tenant_id,
                $input['currencyId'],
                $voucherNumber,
                $input['saleDate'],
                $input['customerId'],
                $billNo,
                $input['amountPaid'],
                $paymentMethodId,
                $input['bankAccountId'] ?? null,
                $user_id,
                $user_id
            ]);

            $voucher_id = $pdo->lastInsertId();

            // Get account_id for cash/bank
            if ($input['paymentMethod'] === 'cash') {
                $cashAccountId = 1;
            } else {
                $bankStmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ?");
                $bankStmt->execute([$input['bankAccountId']]);
                $cashAccountId = $bankStmt->fetchColumn();
            }

            // Debit Cash/Bank Account
            $rvDebitStmt = $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, debit
                ) VALUES (?, 'Receive Voucher', 'receive_voucher', ?, ?, ?, ?, ?)
            ");
            $rvDebitStmt->execute([
                $tenant_id,
                $voucher_id,
                $cashAccountId,
                $input['saleDate'],
                'Receive Voucher - ' . $voucherNumber,
                $input['amountPaid']
            ]);

            // Credit Trade Debtors
            $rvCreditStmt = $pdo->prepare("
                INSERT INTO accounting_ledger (
                    tenant_id, transaction_type, reference_table, reference_id,
                    account_id, date, description, credit
                ) VALUES (?, 'Receive Voucher', 'receive_voucher', ?, 2, ?, ?, ?)
            ");
            $rvCreditStmt->execute([
                $tenant_id,
                $voucher_id,
                $input['saleDate'],
                'Receive Voucher - ' . $voucherNumber,
                $input['amountPaid']
            ]);
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Sale invoice updated successfully']);

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

