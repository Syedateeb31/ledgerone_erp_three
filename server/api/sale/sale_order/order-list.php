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
    $company_id = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
    // Status filter: pending (default) / confirmed / partially fulfilled / all.
    // Matches the fulfillment_status computed below. Defaults to 'pending' so
    // orders whose sale invoice is already confirmed don't clutter the default
    // Soda Book Seller view.
    $statusFilter = strtolower(trim($_GET['status'] ?? 'pending'));

    // Build WHERE clause
    $where = "si.tenant_id = ? AND si.status = 'Posted'";
    $countParams = [$tenant_id];
    $params = [$tenant_id];

    if ($company_id) {
        $where .= " AND si.company_id = ?";
        $countParams[] = $company_id;
        $params[] = $company_id;
    }

    // Shared fulfillment_status expression, reused identically by the count
    // query and the paginated data query so the two never disagree.
    $fulfillmentCase = "
        CASE
            WHEN EXISTS(
                SELECT 1 FROM sale_invoice inv WHERE inv.sale_order_id = si.id AND inv.invoice_status = 'confirmed'
            ) THEN 'Confirmed'
            WHEN EXISTS(
                SELECT 1 FROM sale_invoice inv WHERE inv.sale_order_id = si.id AND inv.status = 'Posted'
            ) THEN 'Partially Fulfilled'
            ELSE 'Pending'
        END
    ";

    $havingClause = '';
    $havingParams = [];
    if ($statusFilter !== '' && $statusFilter !== 'all') {
        $havingClause = 'HAVING LOWER(fulfillment_status) = ?';
        $havingParams[] = $statusFilter;
    }

    // Get total count (of orders matching the status filter)
    $countStmt = $pdo->prepare("
        SELECT COUNT(*) FROM (
            SELECT si.id, $fulfillmentCase as fulfillment_status
            FROM sale_order si
            WHERE $where
            GROUP BY si.id
            $havingClause
        ) t
    ");
    $countStmt->execute(array_merge($countParams, $havingParams));
    $totalRecords = $countStmt->fetchColumn();

    // Get paginated data
    $stmt = $pdo->prepare("
        SELECT
            si.id,
            si.bill_no,
            si.sale_date,
            si.last_date,
            c.customer_name,
            e.full_name as sales_officer_name,
            sm.full_name as supplier_man_name,
            COUNT(sii.id) as item_count,
            si.net_amount,
            cur.symbol as currency_symbol,
            $fulfillmentCase as fulfillment_status
        FROM sale_order si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN employees e ON si.sale_officer_id = e.id
        LEFT JOIN employees sm ON si.supplier_man_id = sm.id
        LEFT JOIN sale_order_items sii ON si.id = sii.sale_invoice_id
        LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
        WHERE $where
        GROUP BY si.id
        $havingClause
        ORDER BY si.sale_date DESC, si.id DESC
        LIMIT $limit OFFSET $offset
    ");

    $stmt->execute(array_merge($params, $havingParams));
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

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