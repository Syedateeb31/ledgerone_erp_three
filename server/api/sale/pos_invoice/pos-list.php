<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;
    
    // Get filters
    $dateFrom = $_GET['dateFrom'] ?? null;
    $dateTo = $_GET['dateTo'] ?? null;
    $companyFilter = $_GET['company'] ?? null;
    $customerFilter = $_GET['customer'] ?? null;
    $saleOfficerFilter = $_GET['saleOfficer'] ?? null;
    $supplierManFilter = $_GET['supplierMan'] ?? null;
    $search = $_GET['search'] ?? null;
    $invoiceTypeFilter = $_GET['invoiceType'] ?? null;
    
    // Build WHERE clause
    $whereConditions = ["si.tenant_id = ?", "si.status = 'Posted'"];
    $params = [$tenant_id];
    
    if ($dateFrom) {
        $whereConditions[] = "si.sale_date >= ?";
        $params[] = $dateFrom;
    }
    if ($dateTo) {
        $whereConditions[] = "si.sale_date <= ?";
        $params[] = $dateTo;
    }
    if ($companyFilter) {
        $whereConditions[] = "co.company_name = ?";
        $params[] = $companyFilter;
    }
    if ($customerFilter) {
        $whereConditions[] = "c.customer_name = ?";
        $params[] = $customerFilter;
    }
    if ($saleOfficerFilter) {
        $whereConditions[] = "si.sale_officer_id = ?";
        $params[] = $saleOfficerFilter;
    }
    if ($supplierManFilter) {
        $whereConditions[] = "si.supplier_man_id = ?";
        $params[] = $supplierManFilter;
    }
    if ($search) {
        $whereConditions[] = "(si.bill_no LIKE ? OR c.customer_name LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    if ($invoiceTypeFilter) {
        if ($invoiceTypeFilter === 'Delivered') {
            $whereConditions[] = "si.invoice_type IN ('Cash', 'Credit')";
        } elseif (in_array($invoiceTypeFilter, ['pending', 'confirmed'])) {
            $whereConditions[] = "si.invoice_status = ?";
            $params[] = $invoiceTypeFilter;
        } else {
            $whereConditions[] = "si.invoice_type = ?";
            $params[] = $invoiceTypeFilter;
        }
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Get total count
    $countQuery = "SELECT COUNT(DISTINCT si.id) FROM sale_invoice si 
                   LEFT JOIN customers c ON si.customer_id = c.id 
                   LEFT JOIN companies co ON si.company_id = co.id 
                   WHERE {$whereClause}";
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetchColumn();
    
    // Get paginated data
    $limit = (int)$limit;
    $offset = (int)$offset;
    
    $query = "SELECT 
            si.id,
            si.bill_no,
            si.sale_date,
            c.customer_name,
            co.company_name,
            COUNT(DISTINCT sii.id) as item_count,
            si.net_amount,
            si.amount_paid_auto_fill,
            si.invoice_type,
            si.invoice_status,
            cur.symbol as currency_symbol,
            COALESCE(SUM(rv.amount), 0) as amount_paid
        FROM sale_invoice si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN companies co ON si.company_id = co.id
        LEFT JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id
        LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
        LEFT JOIN receive_voucher rv ON rv.bill_no = si.bill_no AND rv.tenant_id = si.tenant_id
        WHERE {$whereClause}
        GROUP BY si.id
        ORDER BY si.sale_date DESC, si.id DESC
        LIMIT {$limit} OFFSET {$offset}";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each invoice, fetch item details (chassis_no, motor_no, colour, product name)
    $invoiceIds = array_column($invoices, 'id');
    $itemsMap = [];
    if (!empty($invoiceIds)) {
        $placeholders = implode(',', array_fill(0, count($invoiceIds), '?'));
        $itemsQuery = "SELECT sii.sale_invoice_id, p.name as product_name, sii.chassis_no, sii.motor_no, sii.colour
            FROM sale_invoice_items sii
            LEFT JOIN products p ON sii.product_id = p.id
            WHERE sii.sale_invoice_id IN ({$placeholders})";
        $itemsStmt = $pdo->prepare($itemsQuery);
        $itemsStmt->execute($invoiceIds);
        foreach ($itemsStmt->fetchAll(PDO::FETCH_ASSOC) as $item) {
            $itemsMap[$item['sale_invoice_id']][] = $item;
        }
    }
    foreach ($invoices as &$inv) {
        $inv['items_detail'] = $itemsMap[$inv['id']] ?? [];
    }
    unset($inv);

    echo json_encode([
        'success' => true, 
        'invoices' => $invoices,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $totalRecords,
            'pages' => ceil($totalRecords / $limit)
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}