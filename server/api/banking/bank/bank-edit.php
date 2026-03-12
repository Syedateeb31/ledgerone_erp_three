<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    
    if (!$id) {
        throw new Exception('Bank account ID is required');
    }
    
    // Validate required fields
    $required = ['bankName', 'accountNumber', 'accountType', 'branchName', 'branchCity', 'branchState'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("$field is required");
        }
    }
    
    $pdo->beginTransaction();
    
    // Get current opening balance for comparison
    $stmt = $pdo->prepare("SELECT opening_balance, balance_type, account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$id, $tenant_id]);
    $currentAccount = $stmt->fetch();
    
    if (!$currentAccount) {
        throw new Exception('Bank account not found');
    }
    
    // Update bank_accounts
    $stmt = $pdo->prepare("
        UPDATE bank_accounts SET 
            bank_name = ?, account_number = ?, account_title = ?, account_type = ?, 
            currency = ?, branch_name = ?, branch_code = ?, branch_city = ?, 
            branch_state = ?, iban = ?, swift_code = ?, contact_person = ?, 
            contact_number = ?, email = ?, balance_type = ?, opening_balance = ?, 
            is_active = ?
        WHERE id = ? AND tenant_id = ?
    ");
    
    $stmt->execute([
        $input['bankName'],
        $input['accountNumber'],
        $input['accountTitle'] ?? null,
        $input['accountType'],
        $input['currency'] ?? 'PKR',
        $input['branchName'],
        $input['branchCode'] ?? null,
        $input['branchCity'],
        $input['branchState'],
        $input['iban'] ?? null,
        $input['swiftCode'] ?? null,
        $input['contactPerson'] ?? null,
        $input['contactNumber'] ?? null,
        $input['email'] ?? null,
        $input['balanceType'] ?? 'debit',
        $input['openingBalance'] ?? 0.00,
        $input['isActive'] ? 1 : 0,
        $id,
        $tenant_id
    ]);
    
    // Update accounts table
    $accountName = $input['bankName'] . ' - ' . $input['accountNumber'];
    $openingBalance = floatval($input['openingBalance'] ?? 0.00);
    
    $stmt = $pdo->prepare("
        UPDATE accounts SET name = ?, debit = ?, credit = ? 
        WHERE id = (SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?) 
        AND tenant_id = ?
    ");
    
    if ($input['balanceType'] === 'credit') {
        $stmt->execute([$accountName, 0.00, $openingBalance, $id, $tenant_id, $tenant_id]);
    } else {
        $stmt->execute([$accountName, $openingBalance, 0.00, $id, $tenant_id, $tenant_id]);
    }
    
    // Update accounting_ledger if opening balance or balance type changed
    $currentBalance = floatval($currentAccount['opening_balance']);
    $newBalance = floatval($input['openingBalance'] ?? 0.00);
    $currentBalanceType = $currentAccount['balance_type'];
    $newBalanceType = $input['balanceType'] ?? 'debit';
    $accountName = $input['bankName'] . ' - ' . $input['accountNumber'];
    
    if (($currentBalance != $newBalance || $currentBalanceType != $newBalanceType) && $currentAccount['account_id']) {
        // Delete existing opening balance entries
        $stmt = $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'bank_accounts' AND reference_id = ? AND transaction_type = 'opening_balance' AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        
        // Insert new opening balance entries if balance > 0
        if ($newBalance > 0) {
            $stmt = $pdo->prepare("
                INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit)
                VALUES (?, 'opening_balance', 'bank_accounts', ?, ?, CURDATE(), ?, ?, ?)
            ");
            
            // Bank account entry
            if ($input['balanceType'] === 'credit') {
                $stmt->execute([$tenant_id, $id, $currentAccount['account_id'], 'Opening Balance - ' . $accountName, 0.00, $newBalance]);
            } else {
                $stmt->execute([$tenant_id, $id, $currentAccount['account_id'], 'Opening Balance - ' . $accountName, $newBalance, 0.00]);
            }
            
            // Opening Balance Equity entry (opposite side)
            if ($input['balanceType'] === 'credit') {
                $stmt->execute([$tenant_id, $id, 90, 'Opening Balance - ' . $accountName, $newBalance, 0.00]);
            } else {
                $stmt->execute([$tenant_id, $id, 90, 'Opening Balance - ' . $accountName, 0.00, $newBalance]);
            }
        }
    }
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Bank account updated successfully']);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}