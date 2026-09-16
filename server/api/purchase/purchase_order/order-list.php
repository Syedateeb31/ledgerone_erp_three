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
    // Status filter: pending (default) / confirmed / partially fulfilled / fulfilled / all.
    // Matches the fulfillment_status computed below. Defaults to 'pending' so orders
    // already confirmed/fulfilled don't clutter the default Soda Book Buyer view.
    $statusFilter = strtolower(trim($_GET['status'] ?? 'pending'));

    $dateFrom   = $_GET['date_from'] ?? null;
    $dateTo     = $_GET['date_to'] ?? null;
    $companyId  = isset($_GET['company_id']) && $_GET['company_id'] !== '' ? (int)$_GET['company_id'] : null;
    $supplierId = isset($_GET['supplier_id']) && $_GET['supplier_id'] !== '' ? (int)$_GET['supplier_id'] : null;
    $search     = trim($_GET['search'] ?? '');

    // Build WHERE clause (all server-side so pagination/counts stay correct
    // regardless of which page the matching rows fall on).
    $where = "pi.tenant_id = ?";
    $params = [$tenant_id];

    if ($dateFrom) {
        $where .= " AND pi.purchase_date >= ?";
        $params[] = $dateFrom;
    }
    if ($dateTo) {
        $where .= " AND pi.purchase_date <= ?";
        $params[] = $dateTo;
    }
    if ($companyId) {
        $where .= " AND pi.company_id = ?";
        $params[] = $companyId;
    }
    if ($supplierId) {
        $where .= " AND pi.supplier_id = ?";
        $params[] = $supplierId;
    }
    if ($search !== '') {
        $where .= " AND (pi.bill_no LIKE ? OR s.supplier_name LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    // Shared building blocks: the fulfillment_status CASE expression and its
    // underlying joins, reused identically by both the count query and the
    // paginated data query so the two never disagree.
    $fulfillmentCase = "
        CASE
            WHEN COALESCE(SUM(pii.quantity), 0) = 0 THEN 'Pending'
            WHEN COALESCE((
                SELECT SUM(pi_items.quantity)
                FROM purchase_invoice pinv
                JOIN purchase_invoice_items pi_items ON pinv.id = pi_items.purchase_invoice_id
                WHERE pinv.purchase_order_id = pi.id
            ), 0) >= COALESCE(SUM(pii.quantity), 0) THEN 'Fulfilled'
            WHEN EXISTS (
                SELECT 1 FROM purchase_invoice pinv2
                WHERE pinv2.purchase_order_id = pi.id AND pinv2.status = 'confirmed'
            ) THEN 'Confirmed'
            WHEN COALESCE((
                SELECT SUM(pi_items.quantity)
                FROM purchase_invoice pinv
                JOIN purchase_invoice_items pi_items ON pinv.id = pi_items.purchase_invoice_id
                WHERE pinv.purchase_order_id = pi.id
            ), 0) > 0 THEN 'Partially Fulfilled'
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
            SELECT pi.id, $fulfillmentCase as fulfillment_status
            FROM purchase_order pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN purchase_order_items pii ON pi.id = pii.purchase_invoice_id
            WHERE $where
            GROUP BY pi.id
            $havingClause
        ) t
    ");
    $countStmt->execute(array_merge($params, $havingParams));
    $totalRecords = $countStmt->fetchColumn();

    // Get paginated data
    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.bill_no,
            pi.purchase_date,
            pi.last_date,
            pi.company_id,
            pi.supplier_id,
            s.supplier_name,
            COUNT(pii.id) as item_count,
            pi.net_amount,
            c.symbol as currency_symbol,
            COALESCE(SUM(pii.quantity), 0) as total_ordered_qty,
            COALESCE((
                SELECT SUM(pi_items.quantity)
                FROM purchase_invoice pinv
                JOIN purchase_invoice_items pi_items ON pinv.id = pi_items.purchase_invoice_id
                WHERE pinv.purchase_order_id = pi.id
            ), 0) as total_served_qty,
            $fulfillmentCase as fulfillment_status
        FROM purchase_order pi
        LEFT JOIN suppliers s ON pi.supplier_id = s.id
        LEFT JOIN purchase_order_items pii ON pi.id = pii.purchase_invoice_id
        LEFT JOIN ledgerone_public.currencies c ON pi.currency_id = c.id
        WHERE $where
        GROUP BY pi.id
        $havingClause
        ORDER BY pi.purchase_date DESC, pi.id DESC
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