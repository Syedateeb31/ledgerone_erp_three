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
    $search = $_GET['search'] ?? '';
    $tax_authority = $_GET['tax_authority'] ?? '';
    $status = $_GET['status'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = 20;
    $offset = ($page - 1) * $limit;
    
    $sql = "
        SELECT id, regime_name, regime_code, country_id, tax_authority, tax_base, applies_at_stage,
               is_active, effective_from, effective_to,
               (CASE WHEN tenant_id = 0 THEN 'System' ELSE 'Custom' END) as record_type,
               tenant_id
        FROM tax_regimes
        WHERE (tenant_id = ? OR tenant_id = 0)
    ";
    
    $params = [$tenant_id];
    
    if ($search) {
        $sql .= " AND (regime_name LIKE ? OR regime_code LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    if ($tax_authority) {
        $sql .= " AND tax_authority = ?";
        $params[] = $tax_authority;
    }
    
    if ($status !== '') {
        $active = ($status === 'active') ? 1 : 0;
        $sql .= " AND is_active = ?";
        $params[] = $active;
    }
    
    // Count total records
    $countSql = "
        SELECT COUNT(*) as total 
        FROM tax_regimes
        WHERE (tenant_id = ? OR tenant_id = 0)
    ";
    $countParams = [$tenant_id];
    
    if ($search) {
        $countSql .= " AND (regime_name LIKE ? OR regime_code LIKE ?)";
        $countParams[] = "%$search%";
        $countParams[] = "%$search%";
    }
    if ($tax_authority) {
        $countSql .= " AND tax_authority = ?";
        $countParams[] = $tax_authority;
    }
    if ($status !== '') {
        $active = ($status === 'active') ? 1 : 0;
        $countSql .= " AND is_active = ?";
        $countParams[] = $active;
    }
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $totalRecords = $countStmt->fetch()['total'];
    $totalPages = ceil($totalRecords / $limit);
    
    // Get paginated records
    $sql .= " ORDER BY effective_from DESC, regime_name ASC LIMIT $limit OFFSET $offset";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $taxRegimes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'tax_regimes' => $taxRegimes,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_records' => $totalRecords,
            'per_page' => $limit
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
