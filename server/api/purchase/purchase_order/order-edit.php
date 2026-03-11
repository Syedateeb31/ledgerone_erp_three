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
                co.company_name,
                co.legal_name,
                co.email as company_email,
                co.phone as company_phone,
                co.address as company_address,
                co.city as company_city,
                co.state as company_state,
                co.zipcode as company_zipcode,
                co.logo_url
            FROM purchase_order pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN branches b ON pi.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies c ON pi.currency_id = c.id
            LEFT JOIN companies co ON pi.company_id = co.id
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
            FROM purchase_order_items pii
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
        echo json_encode(['success' => false, 'message' => 'Invoice ID is required']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Update purchase order
        $stmt = $pdo->prepare("
            UPDATE purchase_order SET
                company_id = ?, currency_id = ?, purchase_date = ?, supplier_id = ?, branch_id = ?,
                previous_balance = ?, total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, total_gst_percent = ?, total_gst_amount = ?,
                shipping_fees = ?, net_amount = ?, supplier_invoice_no = ?, 
                supplier_invoice_date = ?, bilty_no = ?, transport_name = ?, remarks = ?, updated_by = ?
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
            $input['supplierInvoiceNo'],
            $input['supplierInvoiceDate'],
            $input['biltyNo'],
            $input['transportName'],
            $input['remarks'] ?? null,
            $user_id,
            $invoice_id,
            $tenant_id
        ]);
        
        // Delete existing items and related records
        $pdo->prepare("DELETE FROM purchase_order_items WHERE purchase_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);
        
        // Insert new items
        $item_stmt = $pdo->prepare("
            INSERT INTO purchase_order_items (
                tenant_id, purchase_invoice_id, product_id, uom_id, vehicle_no,
                quantity, piece, carton, dozen, purchase_price, gross_amount, discount_percent,
                discount_amount, trade_offer_percent, trade_offer_amount,
                gst_percent, gst_amount, foc_quantity, net_amount,
                created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $parent_item_ids = [];
        
        foreach ($input['items'] as $item) {
            $item_stmt->execute([
                $tenant_id, $invoice_id, $item['productId'], $item['uomId'], $item['vehicleNo'] ?? null,
                $item['quantity'], $item['pcs'] ?? 0, $item['ctn'] ?? 0, $item['dz'] ?? 0,
                $item['purchasePrice'], $item['grossAmount'],
                $item['discountPercent'] ?? 0.00, $item['discountAmount'] ?? 0.00,
                $item['tradeOfferPercent'] ?? 0.00, $item['tradeOfferAmount'] ?? 0.00,
                $item['gstPercent'] ?? 0.00, $item['gstAmount'] ?? 0.00,
                $item['focQty'] ?? 0, $item['netAmount'], $user_id, $user_id
            ]);
            
            $item_id = $pdo->lastInsertId();
            
            if (isset($item['parentRowId'])) {
                $parent_row_index = $item['parentRowId'] - 1;
                if (isset($parent_item_ids[$parent_row_index])) {
                    $pdo->prepare("UPDATE purchase_order_items SET parent_row_id = ? WHERE id = ?")
                        ->execute([$parent_item_ids[$parent_row_index], $item_id]);
                }
            } else {
                $parent_item_ids[] = $item_id;
            }
        }
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Purchase order updated successfully']);
        
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