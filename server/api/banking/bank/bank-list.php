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
    $stmt = $pdo->prepare("
        SELECT id, bank_name, account_number, account_title, account_type, is_mfb, 
               mfb_name, currency, branch_name, branch_city, branch_state, 
               opening_balance, debit_amount, credit_amount, balance_type, 
               is_active, created_at
        FROM bank_accounts 
        WHERE tenant_id = ? 
        ORDER BY created_at DESC
    ");
    
    $stmt->execute([$tenant_id]);
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate current balance and format data
    $totalBalance = 0;
    $activeCount = 0;
    $mfbCount = 0;
    
    foreach ($accounts as &$account) {
        $balance = $account['opening_balance'] + $account['debit_amount'] - $account['credit_amount'];
        if ($account['balance_type'] === 'credit') {
            $balance = -$balance;
        }
        $account['balance'] = $balance;
        $account['status'] = $account['is_active'] ? 'active' : 'inactive';
        
        // Calculate stats
        $totalBalance += $balance;
        if ($account['is_active']) $activeCount++;
        if ($account['is_mfb']) $mfbCount++;
    }
    
    $stats = [
        'total_accounts' => count($accounts),
        'active_accounts' => $activeCount,
        'total_balance' => $totalBalance,
        'mfb_accounts' => $mfbCount
    ];
    
    echo json_encode(['success' => true, 'data' => $accounts, 'stats' => $stats]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}