<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    
    // Validate required fields
    $required = ['bankName', 'accountNumber', 'accountType', 'branchName', 'branchCity', 'branchState', 'asOfDate'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("$field is required");
        }
    }
    
    $pdo->beginTransaction();
    
    // Insert into accounts table first
    $accountName = $input['bankName'] . ' - ' . $input['accountNumber'];
    $openingBalance = floatval($input['openingBalance'] ?? 0.00);
    
    $stmt = $pdo->prepare("
        INSERT INTO accounts (tenant_id, sub_account_id, name, debit, credit)
        VALUES (?, 75, ?, ?, ?)
    ");
    
    if ($input['balanceType'] === 'credit') {
        $stmt->execute([$tenant_id, $accountName, 0.00, $openingBalance]);
    } else {
        $stmt->execute([$tenant_id, $accountName, $openingBalance, 0.00]);
    }
    
    $accountId = $pdo->lastInsertId();
    
    // Insert into bank_accounts with account_id
    $stmt = $pdo->prepare("
        INSERT INTO bank_accounts (
            tenant_id, bank_name, is_mfb, mfb_name, account_number, account_type, 
            currency, branch_name, branch_code, branch_city, branch_state, 
            branch_address, account_title, iban, swift_code, contact_person, 
            contact_number, email, notes, balance_type, opening_balance, 
            as_of_date, is_active, account_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $tenant_id,
        $input['bankName'],
        $input['isMfb'] ? 1 : 0,
        $input['mfbName'] ?? null,
        $input['accountNumber'],
        $input['accountType'],
        $input['currency'] ?? 'PKR',
        $input['branchName'],
        $input['branchCode'] ?? null,
        $input['branchCity'],
        $input['branchState'],
        $input['branchAddress'] ?? null,
        $input['accountTitle'] ?? null,
        $input['iban'] ?? null,
        $input['swiftCode'] ?? null,
        $input['contactPerson'] ?? null,
        $input['contactNumber'] ?? null,
        $input['email'] ?? null,
        $input['notes'] ?? null,
        $input['balanceType'] ?? 'debit',
        $input['openingBalance'] ?? 0.00,
        $input['asOfDate'],
        $input['isActive'] ? 1 : 0,
        $accountId
    ]);
    
    $bankAccountId = $pdo->lastInsertId();
    // Insert into accounting_ledger table if opening balance exists
    if ($openingBalance > 0) {
        $stmt = $pdo->prepare("
            INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit)
            VALUES (?, 'opening_balance', 'bank_accounts', ?, ?, ?, ?, ?, ?)
        ");
        
        // Bank account entry
        if ($input['balanceType'] === 'credit') {
            $stmt->execute([$tenant_id, $bankAccountId, $accountId, $input['asOfDate'], 'Opening Balance - ' . $accountName, 0.00, $openingBalance]);
        } else {
            $stmt->execute([$tenant_id, $bankAccountId, $accountId, $input['asOfDate'], 'Opening Balance - ' . $accountName, $openingBalance, 0.00]);
        }
        
        // Opening Balance Equity entry (opposite side)
        if ($input['balanceType'] === 'credit') {
            $stmt->execute([$tenant_id, $bankAccountId, 90, $input['asOfDate'], 'Opening Balance - ' . $accountName, $openingBalance, 0.00]);
        } else {
            $stmt->execute([$tenant_id, $bankAccountId, 90, $input['asOfDate'], 'Opening Balance - ' . $accountName, 0.00, $openingBalance]);
        }
    }
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Bank account created successfully', 'id' => $bankAccountId]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}