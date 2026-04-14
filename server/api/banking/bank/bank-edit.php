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
    $input = $_POST;
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
    
    // Get current data
    $stmt = $pdo->prepare("SELECT opening_balance, balance_type, account_id, bank_logo_path FROM bank_accounts WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$id, $tenant_id]);
    $currentAccount = $stmt->fetch();
    
    if (!$currentAccount) {
        throw new Exception('Bank account not found');
    }
    
    // Handle file upload
    $bankLogoPath = $currentAccount['bank_logo_path'];
    if (isset($_FILES['bankLogo']) && $_FILES['bankLogo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../../../client/assets/uploads/bank_logo/';
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fileExtension = strtolower(pathinfo($_FILES['bankLogo']['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        
        if (!in_array($fileExtension, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only JPG, PNG, and GIF are allowed.');
        }
        
        if ($_FILES['bankLogo']['size'] > 2 * 1024 * 1024) {
            throw new Exception('File size must be less than 2MB');
        }
        
        // Delete old logo if exists
        if ($bankLogoPath && file_exists($uploadDir . $bankLogoPath)) {
            unlink($uploadDir . $bankLogoPath);
        }
        
        // Generate unique filename
        $uniqueFilename = uniqid('bank_logo_', true) . '.' . $fileExtension;
        $uploadPath = $uploadDir . $uniqueFilename;
        
        if (!move_uploaded_file($_FILES['bankLogo']['tmp_name'], $uploadPath)) {
            throw new Exception('Failed to upload file');
        }
        
        $bankLogoPath = $uniqueFilename;
    }
    
    // Update bank_accounts
    $stmt = $pdo->prepare("
        UPDATE bank_accounts SET 
            bank_name = ?, account_number = ?, account_title = ?, account_type = ?, 
            currency = ?, branch_name = ?, branch_code = ?, branch_city = ?, 
            branch_state = ?, iban = ?, swift_code = ?, contact_person = ?, 
            contact_number = ?, email = ?, balance_type = ?, opening_balance = ?, 
            is_active = ?, bank_logo_path = ?
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
        $input['isActive'] === 'true' ? 1 : 0,
        $bankLogoPath,
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