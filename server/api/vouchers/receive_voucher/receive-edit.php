<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$voucher_id = $_GET['id'] ?? null;

if (!$voucher_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Voucher ID is required']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $voucher_date = $input['voucher_date'] ?? '';
    $company_id = $input['company_id'] ?? null;
    $bill_no = (!empty($input['bill_no']) && $input['bill_no'] !== 'null') ? $input['bill_no'] : null;
    $amount = $input['amount'] ?? 0;
    $currency_id = $input['currency_id'] ?? null;
    $payment_method_id = $input['payment_method_id'] ?? null;
    $bank_account_id = (!empty($input['bank_account_id']) && $input['bank_account_id'] !== 'null') ? intval($input['bank_account_id']) : null;
    $cheque_date = (!empty($input['cheque_date']) && $input['cheque_date'] !== 'null') ? $input['cheque_date'] : null;
    $cheque_no = (!empty($input['cheque_no']) && $input['cheque_no'] !== 'null') ? $input['cheque_no'] : null;
    $description = (!empty($input['description']) && $input['description'] !== 'null') ? $input['description'] : null;

    // Get current voucher details for payment method check
    $stmt = $pdo->prepare("SELECT payment_method_id, customer_id, bank_account_id FROM receive_voucher WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$voucher_id, $tenant_id]);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$voucher) {
        echo json_encode(['success' => false, 'error' => 'Voucher not found']);
        exit();
    }
    
    $old_bank_account_id = $voucher['bank_account_id'];
    
    // Update receive voucher
    $stmt = $pdo->prepare("
        UPDATE receive_voucher 
        SET voucher_date = ?, company_id = ?, bill_no = ?, amount = ?, currency_id = ?, payment_method_id = ?, 
            bank_account_id = ?, cheque_date = ?, cheque_no = ?, description = ?, updated_by = ?
        WHERE id = ? AND tenant_id = ?
    ");
    
    $stmt->execute([
        $voucher_date, $company_id, $bill_no, $amount, $currency_id, $payment_method_id,
        $bank_account_id, $cheque_date, $cheque_no, $description, $user_id,
        $voucher_id, $tenant_id
    ]);
    
    if ($stmt->rowCount() > 0) {
        // Check if PDC is approved
        $stmt = $pdo->prepare("SELECT status FROM post_dated_cheques WHERE tenant_id = ? AND reference_table = 'receive_voucher' AND reference_id = ?");
        $stmt->execute([$tenant_id, $voucher_id]);
        $pdc = $stmt->fetch(PDO::FETCH_ASSOC);
        $is_pdc_approved = $pdc && $pdc['status'] === 'Approved';
        
        // Update post-dated cheques if payment method is 6
        if ($payment_method_id == 6) {
            $stmt = $pdo->prepare("
                UPDATE post_dated_cheques 
                SET amount = ?, bank_account_id = ?, cheque_date = ?, cheque_no = ?
                WHERE tenant_id = ? AND reference_table = 'receive_voucher' AND reference_id = ?
            ");
            $stmt->execute([$amount, $bank_account_id, $cheque_date, $cheque_no, $tenant_id, $voucher_id]);
            
            // If PDC is approved and bank changed, create balancing entries
            if ($is_pdc_approved && $old_bank_account_id != $bank_account_id && $old_bank_account_id && $bank_account_id) {
                // Get old bank account_id
                $stmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$old_bank_account_id, $tenant_id]);
                $old_bank = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Get new bank account_id
                $stmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$bank_account_id, $tenant_id]);
                $new_bank = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Credit old bank
                $stmt = $pdo->prepare("
                    INSERT INTO accounting_ledger (
                        tenant_id, transaction_type, reference_table, reference_id, account_id, 
                        date, description, debit, credit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $tenant_id, 'Receive Voucher - Bank Change', 'receive_voucher', $voucher_id, $old_bank['account_id'],
                    $voucher_date, 'Bank account change - Credit old bank', 0.00, $amount
                ]);
                
                // Debit new bank
                $stmt->execute([
                    $tenant_id, 'Receive Voucher - Bank Change', 'receive_voucher', $voucher_id, $new_bank['account_id'],
                    $voucher_date, 'Bank account change - Debit new bank', $amount, 0.00
                ]);
            }
        }
        
        // Determine debit account ID based on payment method
        if ($payment_method_id == 6) {
            $debit_account_id = 78;
        } elseif ($payment_method_id == 7) {
            $debit_account_id = 1;
        } else {
            $stmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$bank_account_id, $tenant_id]);
            $bank_account = $stmt->fetch(PDO::FETCH_ASSOC);
            $debit_account_id = $bank_account['account_id'];
        }
        
        // Update accounting ledger entries
        $stmt = $pdo->prepare("
            UPDATE accounting_ledger 
            SET date = ?, description = ?, debit = ?, credit = ?, account_id = ?
            WHERE tenant_id = ? AND reference_table = 'receive_voucher' AND reference_id = ? AND debit > 0 AND transaction_type = 'Receive Voucher'
        ");
        $stmt->execute([$voucher_date, $description, $amount, 0.00, $debit_account_id, $tenant_id, $voucher_id]);
        
        $stmt = $pdo->prepare("
            UPDATE accounting_ledger 
            SET date = ?, description = ?, debit = ?, credit = ?
            WHERE tenant_id = ? AND reference_table = 'receive_voucher' AND reference_id = ? AND credit > 0 AND transaction_type = 'Receive Voucher'
        ");
        $stmt->execute([$voucher_date, $description, 0.00, $amount, $tenant_id, $voucher_id]);
        
        echo json_encode(['success' => true, 'message' => 'Receive voucher updated successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Voucher not found or no changes made']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error', 'message' => $e->getMessage()]);
}
?>