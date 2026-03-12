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
    
    // Get total count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM sale_return WHERE tenant_id = ? AND status = 'Posted'");
    $countStmt->execute([$tenant_id]);
    $totalRecords = $countStmt->fetchColumn();
    
    // Get paginated data
    $stmt = $pdo->prepare("
        SELECT 
            si.id,
            si.bill_no,
            si.sale_date,
            si.company_id,
            c.customer_name,
            COUNT(sii.id) as item_count,
            si.net_amount,
            cur.symbol as currency_symbol
        FROM sale_return si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN sale_return_items sii ON si.id = sii.sale_invoice_id
        LEFT JOIN ledgerone_public.currencies cur ON si.currency_id = cur.id
        WHERE si.tenant_id = ? AND si.status = 'Posted'
        GROUP BY si.id
        ORDER BY si.sale_date DESC, si.id DESC
        LIMIT ? OFFSET ?
    ");
    
    $stmt->bindParam(1, $tenant_id, PDO::PARAM_INT);
    $stmt->bindParam(2, $limit, PDO::PARAM_INT);
    $stmt->bindParam(3, $offset, PDO::PARAM_INT);
    $stmt->execute();
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