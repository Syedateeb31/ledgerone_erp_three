<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || $tenant_id === null) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$expense_account_id = $_GET['expense_account_id'] ?? null;
$cost_center_id = $_GET['cost_center_id'] ?? null;

try {
    $sql = "";
    $params = [$tenant_id];
    
    if ($expense_account_id || $cost_center_id) {
        // When filtering, return sum of filtered lines only
        $sql = "SELECT 
            ev.id,
            ev.voucher_no,
            ev.date,
            ev.description,
            SUM(evl.amount) as total_amount,
            COUNT(evl.id) as total_items,
            GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ') as expense_accounts
        FROM expense_voucher ev
        INNER JOIN expense_voucher_line evl ON ev.id = evl.voucher_id
        INNER JOIN accounts a ON evl.account_id = a.id
        WHERE ev.tenant_id = ?";
        
        if ($expense_account_id) {
            $sql .= " AND evl.account_id = ?";
            $params[] = $expense_account_id;
        }
        
        if ($cost_center_id) {
            $sql .= " AND evl.cost_center_id = ?";
            $params[] = $cost_center_id;
        }
        
        $sql .= " GROUP BY ev.id, ev.voucher_no, ev.date, ev.description ORDER BY ev.id DESC";
    } else {
        // No filter, return original voucher totals
        $sql = "SELECT 
            ev.id,
            ev.voucher_no,
            ev.date,
            ev.description,
            ev.total_amount,
            ev.total_items
        FROM expense_voucher ev
        WHERE ev.tenant_id = ?
        ORDER BY ev.id DESC";
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $vouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $vouchers]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch expense vouchers']);
}
