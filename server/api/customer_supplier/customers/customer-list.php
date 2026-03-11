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
    // Get query parameters
    $search = $_GET['search'] ?? '';
    $status = $_GET['status'] ?? '';
    $company = $_GET['company'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $where = ['tenant_id = ?'];
    $params = [$tenant_id];
    
    if ($search) {
        $where[] = '(customer_name LIKE ? OR customer_code LIKE ? OR email LIKE ? OR primary_phone LIKE ?)';
        $searchTerm = '%' . $search . '%';
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    if ($status === 'active') {
        $where[] = 'is_blacklisted = FALSE';
    } elseif ($status === 'blacklisted') {
        $where[] = 'is_blacklisted = TRUE';
    }
    
    if ($company) {
        $where[] = 'company_id = ?';
        $params[] = (int)$company;
    }
    
    $whereClause = 'WHERE ' . implode(' AND ', $where);
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM customers $whereClause";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = $stmt->fetch()['total'];
    
    // Get customers
    $sql = "SELECT id, customer_code, customer_name, primary_phone, email, current_balance, is_blacklisted, created_at 
            FROM customers $whereClause 
            ORDER BY created_at DESC 
            LIMIT $limit OFFSET $offset";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get stats
    $statsSql = "SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN is_blacklisted = FALSE THEN 1 END) as active_customers,
        COUNT(CASE WHEN is_blacklisted = TRUE THEN 1 END) as blacklisted_customers,
        SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END) as total_receivables
        FROM customers WHERE tenant_id = ?";
    
    $stmt = $pdo->prepare($statsSql);
    $stmt->execute([$tenant_id]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'customers' => $customers,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ],
        'stats' => $stats
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>