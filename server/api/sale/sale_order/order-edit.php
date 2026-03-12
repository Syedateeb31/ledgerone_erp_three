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
        echo json_encode(['success' => false, 'message' => 'Order ID is required']);
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
                b.branch_type,
                pb.branch_name as parent_branch_name,
                cur.symbol as currency_symbol,
                cur.code as currency_code,
                cur.name as currency_name,
                e.full_name as sales_officer_name,
                COALESCE(rv.amount, 0) as amount_paid,
                CASE 
                    WHEN rv.payment_method_id = 1 THEN 'Cash'
                    WHEN rv.payment_method_id = 2 THEN 'Bank Transfer'
                    ELSE NULL
                END as payment_method
            FROM sale_order si
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN branches b ON si.branch_id = b.id
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
            LEFT JOIN employees e ON si.sale_officer_id = e.id
            LEFT JOIN receive_voucher rv ON si.bill_no = rv.bill_no AND si.tenant_id = rv.tenant_id
            WHERE si.id = ? AND si.tenant_id = ?
        ");
        $stmt->execute([$invoice_id, $tenant_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit;
        }

        // Get invoice items
        $itemStmt = $pdo->prepare("
            SELECT 
                sii.*,
                p.name as product_name,
                p.code as product_code,
                u.uom_name
            FROM sale_order_items sii
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
        echo json_encode(['success' => false, 'message' => 'Order ID is required']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Update sale invoice
        $stmt = $pdo->prepare("
            UPDATE sale_order SET
                company_id = ?, currency_id = ?, sale_date = ?, customer_id = ?, branch_id = ?,
                previous_balance = ?, sale_officer_id = ?, bilty_no = ?, transport_name = ?, total_bill = ?, total_discount_percent = ?,
                total_discount_amount = ?, net_amount = ?, remarks = ?, status = ?, updated_by = ?
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->execute([
            $input['companyId'] ?? null,
            $input['currencyId'],
            $input['saleDate'],
            $input['customerId'],
            $input['branchId'],
            extractBalanceAmount($input['previousBalance'] ?? '0.00'),
            $input['salesOfficerId'] ?? null,
            $input['biltyNo'] ?? null,
            $input['transportName'] ?? null,
            $input['totalBill'],
            $input['totalDiscountPercent'] ?? 0.00,
            $input['totalDiscountAmount'] ?? 0.00,
            $input['netAmount'],
            $input['remarks'] ?? null,
            $input['status'] ?? 'Posted',
            $user_id,
            $invoice_id,
            $tenant_id
        ]);

        // Delete existing items and related records
        $pdo->prepare("DELETE FROM sale_order_items WHERE sale_invoice_id = ? AND tenant_id = ?")->execute([$invoice_id, $tenant_id]);

        $status = $input['status'] ?? 'Posted';

        // Insert new items
        $item_stmt = $pdo->prepare("
            INSERT INTO sale_order_items (
                tenant_id, sale_invoice_id, product_id, uom_id,
                quantity, sale_price, gross_amount, discount_percent,
                discount_amount, trade_offer_percent, trade_offer_amount,
                gst_percent, gst_amount, foc_quantity, net_amount, parent_row_id, piece, carton, dozen, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                $item['parentRowId'] ?? null,
                $item['pcs'] ?? 0,
                $item['ctn'] ?? 0,
                $item['dz'] ?? 0,
                $user_id,
                $user_id
            ]);
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Sale order updated successfully']);

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