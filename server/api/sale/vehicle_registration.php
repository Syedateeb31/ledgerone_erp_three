<?php
ob_start();
require_once '../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();
ob_end_clean();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = $_GET['id']     ?? null;

try {

    // ── GET ───────────────────────────────────────────────────────────────────
    if ($method === 'GET') {

        // Next application number
        if ($action === 'next_no') {
            $stmt = $pdo->prepare("SELECT application_no FROM vehicle_registrations WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
            $stmt->execute([$tenant_id]);
            $last   = $stmt->fetchColumn();
            $newNum = $last ? ((int)substr($last, 4)) + 1 : 1;
            echo json_encode(['success' => true, 'application_no' => 'VR-' . str_pad($newNum, 4, '0', STR_PAD_LEFT)]);
            exit;
        }

        // Customers with identity_card_no
        if ($action === 'customers') {
            $stmt = $pdo->prepare("
                SELECT id, customer_name, primary_phone AS phone, email, address, identity_card_no AS cnic
                FROM customers
                WHERE tenant_id = ? AND status = 'ACTIVE'
                ORDER BY customer_name
            ");
            $stmt->execute([$tenant_id]);
            echo json_encode(['success' => true, 'customers' => $stmt->fetchAll()]);
            exit;
        }

        // Search invoices
        if ($action === 'invoices') {
            $q    = trim($_GET['q'] ?? '');
            $like = ($q === '' || $q === '%') ? '%' : '%' . $q . '%';
            $params = [$tenant_id, $like];
            $custWhere = '';
            if (!empty($_GET['customer_id'])) {
                $custWhere = 'AND si.customer_id = ?';
                $params[]  = (int)$_GET['customer_id'];
            }
            $stmt = $pdo->prepare("
                SELECT si.id, si.bill_no, si.sale_date,
                       c.customer_name, c.primary_phone AS phone, c.email, c.address, c.identity_card_no AS cnic
                FROM sale_invoice si
                LEFT JOIN customers c ON c.id = si.customer_id
                WHERE si.tenant_id = ? AND si.bill_no LIKE ? $custWhere
                ORDER BY si.id DESC LIMIT 30
            ");
            $stmt->execute($params);
            echo json_encode(['success' => true, 'invoices' => $stmt->fetchAll()]);
            exit;
        }

        // Invoice items (chassis/motor/colour)
        if ($action === 'invoice_items') {
            $inv_id = (int)($_GET['invoice_id'] ?? 0);
            $stmt = $pdo->prepare("
                SELECT sii.product_id, p.name AS product_name, sii.chassis_no, sii.motor_no, sii.colour
                FROM sale_invoice_items sii
                LEFT JOIN products p ON p.id = sii.product_id
                WHERE sii.sale_invoice_id = ? AND sii.tenant_id = ? AND sii.parent_row_id IS NULL
            ");
            $stmt->execute([$inv_id, $tenant_id]);
            echo json_encode(['success' => true, 'items' => $stmt->fetchAll()]);
            exit;
        }

        // Bank accounts
        if ($action === 'bank_accounts') {
            $stmt = $pdo->prepare("SELECT id, account_title, account_number, account_id FROM bank_accounts WHERE tenant_id = ? AND is_active = 1 ORDER BY account_title");
            $stmt->execute([$tenant_id]);
            echo json_encode(['success' => true, 'accounts' => $stmt->fetchAll()]);
            exit;
        }

        // Single record
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM vehicle_registrations WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            $rec = $stmt->fetch();
            echo $rec ? json_encode(['success' => true, 'record' => $rec]) : json_encode(['success' => false, 'message' => 'Not found']);
            exit;
        }

        // All records
        $stmt = $pdo->prepare("SELECT * FROM vehicle_registrations WHERE tenant_id = ? ORDER BY id DESC");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'records' => $stmt->fetchAll()]);
        exit;
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $pdo->beginTransaction();
        
        // Get application number to find receive vouchers
        $stmt = $pdo->prepare("SELECT application_no FROM vehicle_registrations WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        $appNo = $stmt->fetchColumn();
        
        // Get receive voucher IDs for this registration
        $rvIds = [];
        if ($appNo) {
            $stmt = $pdo->prepare("SELECT id FROM receive_voucher WHERE bill_no = ? AND tenant_id = ?");
            $stmt->execute([$appNo, $tenant_id]);
            $rvIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        // Delete accounting entries for receive vouchers
        foreach ($rvIds as $rvId) {
            $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'receive_voucher' AND reference_id = ? AND tenant_id = ?")->execute([$rvId, $tenant_id]);
        }
        
        // Delete receive vouchers
        if ($appNo) {
            $pdo->prepare("DELETE FROM receive_voucher WHERE bill_no = ? AND tenant_id = ?")->execute([$appNo, $tenant_id]);
        }
        
        // Delete accounting entries for vehicle registration
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'vehicle_registrations' AND reference_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        
        // Delete registration
        $pdo->prepare("DELETE FROM vehicle_registrations WHERE id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Deleted successfully']);
        exit;
    }

    // ── POST / PUT ────────────────────────────────────────────────────────────
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) throw new Exception('Invalid JSON');

    if (empty($data['customer_name']))   throw new Exception('Customer name is required');
    if (empty($data['registration_type'])) throw new Exception('Registration type is required');
    if (empty($data['registration_city'])) throw new Exception('Registration city is required');
    if (empty($data['product_name']))    throw new Exception('Product name is required');
    if (empty($data['reg_status']))      throw new Exception('Status is required');

    $customer_id = !empty($data['customer_id']) ? (int)$data['customer_id'] : null;
    $invoice_id  = !empty($data['invoice_id'])  ? (int)$data['invoice_id']  : null;
    $total       = floatval($data['registration_fee'] ?? 0) + floatval($data['number_plate_fee'] ?? 0)
                 + floatval($data['smart_card_fee']   ?? 0) + floatval($data['service_charges']  ?? 0);
    $amount_paid = floatval($data['amount_paid'] ?? 0);

    $fields = [
        'application_no','application_date','registration_no','registration_type','registration_city','reg_status',
        'customer_id','customer_name','phone_number','email','address','cnic_no',
        'invoice_id','invoice_number','sale_date',
        'product_name','engine_cc','chassis_no','motor_no','colour','model_year',
        'registration_fee','number_plate_fee','smart_card_fee','service_charges','total_amount',
        'payment_method','bank_account_id','amount_paid','remaining_balance',
        'expected_delivery_date','submitted_date','completed_date','remarks',
        'delivery_date','delivered_to','delivered_by','delivery_notes',
        'notes','tenant_id'
    ];

    $values = [
        $data['application_no']          ?? null,
        $data['application_date']        ?: date('Y-m-d'),
        $data['registration_no']         ?: null,
        $data['registration_type'],
        $data['registration_city'],
        $data['reg_status'],
        $customer_id,
        $data['customer_name'],
        $data['phone_number']            ?: null,
        $data['email']                   ?: null,
        $data['address']                 ?: null,
        $data['cnic_no']                 ?: null,
        $invoice_id,
        $data['invoice_number']          ?: null,
        $data['sale_date']               ?: null,
        $data['product_name'],
        $data['engine_cc']               ?: null,
        $data['chassis_no']              ?: null,
        $data['motor_no']                ?: null,
        $data['colour']                  ?: null,
        $data['model_year']              ?: null,
        floatval($data['registration_fee']  ?? 0),
        floatval($data['number_plate_fee']  ?? 0),
        floatval($data['smart_card_fee']    ?? 0),
        floatval($data['service_charges']   ?? 0),
        $total,
        $data['payment_method']          ?: null,
        !empty($data['bank_account_id']) ? (int)$data['bank_account_id'] : null,
        $amount_paid,
        $total - $amount_paid,
        $data['expected_delivery_date']  ?: null,
        $data['submitted_date']          ?: null,
        $data['completed_date']          ?: null,
        $data['remarks']                 ?: null,
        $data['delivery_date']           ?: null,
        $data['delivered_to']            ?: null,
        $data['delivered_by']            ?: null,
        $data['delivery_notes']          ?: null,
        $data['notes']                   ?: null,
        $tenant_id
    ];

    $pdo->beginTransaction();

    if ($method === 'PUT' && $id) {
        $setClauses = array_map(fn($f) => "$f = ?", array_slice($fields, 0, -1));
        $setClauses[] = 'updated_by = ?';
        $sql = "UPDATE vehicle_registrations SET " . implode(', ', $setClauses) . " WHERE id = ? AND tenant_id = ?";
        $updateVals = array_slice($values, 0, -1);
        $updateVals[] = $user_id;
        $updateVals[] = $id;
        $updateVals[] = $tenant_id;
        $pdo->prepare($sql)->execute($updateVals);

        if ($amount_paid > 0 && !empty($data['payment_method'])) {
            saveAccounting($pdo, $tenant_id, $user_id, $id, $data, $total, $amount_paid, true);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Updated successfully']);
        exit;
    }

    if ($method === 'POST') {
        $stmt = $pdo->prepare("SELECT application_no FROM vehicle_registrations WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $last   = $stmt->fetchColumn();
        $newNum = $last ? ((int)substr($last, 4)) + 1 : 1;
        $appNo  = 'VR-' . str_pad($newNum, 4, '0', STR_PAD_LEFT);
        $values[0] = $appNo;

        $cols  = implode(', ', $fields) . ', created_by, updated_by';
        $ph    = implode(', ', array_fill(0, count($fields), '?')) . ', ?, ?';
        $values[] = $user_id;
        $values[] = $user_id;

        $pdo->prepare("INSERT INTO vehicle_registrations ($cols) VALUES ($ph)")->execute($values);
        $rec_id = (int)$pdo->lastInsertId();

        if ($amount_paid > 0 && !empty($data['payment_method'])) {
            saveAccounting($pdo, $tenant_id, $user_id, $rec_id, $data, $total, $amount_paid, false);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Saved successfully', 'application_no' => $appNo, 'id' => $rec_id]);
        exit;
    }

    $pdo->rollBack();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Validate registration fields
 */
function validateRegistration($data) {
    if (empty($data['customer_name']))      return 'Customer name is required';
    if (empty($data['registration_type']))  return 'Registration type is required';
    if (empty($data['registration_city']))  return 'Registration city is required';
    if (empty($data['product_name']))       return 'Product name is required';
    if (empty($data['reg_status']))         return 'Status is required';
    return null;
}

/**
 * Calculate remaining balance
 */
function calculateBalance($total, $amountPaid) {
    return max(0, floatval($total) - floatval($amountPaid));
}

/**
 * Get registration summary with timeline
 */
function getRegistrationStatusDetails($appData) {
    $status = $appData['reg_status'] ?? 'PENDING';
    $timeline = [];
    
    if (!empty($appData['submitted_date'])) {
        $timeline[] = ['stage' => 'Submitted', 'date' => $appData['submitted_date']];
    }
    if (!empty($appData['completed_date'])) {
        $timeline[] = ['stage' => 'Completed', 'date' => $appData['completed_date']];
    }
    if (!empty($appData['delivery_date'])) {
        $timeline[] = ['stage' => 'Delivered', 'date' => $appData['delivery_date']];
    }
    
    return [
        'current_status' => $status,
        'timeline' => $timeline,
        'progress_percent' => getProgressPercent($status),
        'has_pending_balance' => floatval($appData['remaining_balance'] ?? 0) > 0
    ];
}

/**
 * Get progress percentage based on status
 */
function getProgressPercent($status) {
    $statusMap = [
        'PENDING' => 20,
        'SUBMITTED' => 40,
        'UNDER_PROCESS' => 60,
        'IN_PROCESS' => 60,
        'COMPLETED' => 80,
        'DELIVERED' => 100,
        'CANCELLED' => 0
    ];
    return $statusMap[strtoupper($status)] ?? 20;
}

/**
 * Check if registration has pending balance
 */
function hasPendingBalance($pdo, $tenant_id, $rec_id) {
    $stmt = $pdo->prepare("
        SELECT remaining_balance FROM vehicle_registrations 
        WHERE id = ? AND tenant_id = ?
    ");
    $stmt->execute([$rec_id, $tenant_id]);
    $balance = $stmt->fetchColumn();
    return $balance > 0;
}

/**
 * Update application status to submitted
 */
function markAsSubmitted($pdo, $tenant_id, $rec_id) {
    $pdo->prepare("
        UPDATE vehicle_registrations 
        SET reg_status = 'SUBMITTED', submitted_date = NOW()
        WHERE id = ? AND tenant_id = ?
    ")->execute([$rec_id, $tenant_id]);
    return true;
}

/**
 * Update application status to completed with registration number
 */
function markAsCompleted($pdo, $tenant_id, $rec_id, $registrationNo = null) {
    $sql = "UPDATE vehicle_registrations SET reg_status = 'COMPLETED', completed_date = NOW()";
    if ($registrationNo) {
        $sql .= ", registration_no = ?";
    }
    $sql .= " WHERE id = ? AND tenant_id = ?";
    
    $params = $registrationNo ? [$registrationNo, $rec_id, $tenant_id] : [$rec_id, $tenant_id];
    $pdo->prepare($sql)->execute($params);
    return true;
}

/**
 * Record delivery details
 */
function recordDelivery($pdo, $tenant_id, $rec_id, $deliveryData) {
    $pdo->prepare("
        UPDATE vehicle_registrations 
        SET delivery_date = ?, delivered_to = ?, delivered_by = ?, delivery_notes = ?, reg_status = 'DELIVERED'
        WHERE id = ? AND tenant_id = ?
    ")->execute([
        $deliveryData['delivery_date'] ?? date('Y-m-d'),
        $deliveryData['delivered_to'] ?? null,
        $deliveryData['delivered_by'] ?? null,
        $deliveryData['delivery_notes'] ?? null,
        $rec_id,
        $tenant_id
    ]);
    return true;
}

/**
 * Record additional payment with accounting entry
 */
function recordPayment($pdo, $tenant_id, $user_id, $rec_id, $paymentData) {
    // Get current record
    $stmt = $pdo->prepare("SELECT * FROM vehicle_registrations WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$rec_id, $tenant_id]);
    $record = $stmt->fetch();
    
    if (!$record) return false;
    
    $previousPaid = floatval($record['amount_paid']);
    $paymentAmount = floatval($paymentData['amount'] ?? 0);
    $newTotalPaid = $previousPaid + $paymentAmount;
    $totalFees = floatval($record['total_amount']);
    $newBalance = max(0, $totalFees - $newTotalPaid);
    
    $pdo->prepare("
        UPDATE vehicle_registrations 
        SET amount_paid = ?, remaining_balance = ?
        WHERE id = ? AND tenant_id = ?
    ")->execute([$newTotalPaid, $newBalance, $rec_id, $tenant_id]);
    
    // Create accounting entry for additional payment
    if ($paymentAmount > 0) {
        $appNo = $record['application_no'];
        $date = $paymentData['payment_date'] ?? date('Y-m-d');
        
        $cashAccountId = 1;
        if (!empty($paymentData['payment_method']) && $paymentData['payment_method'] === 'bank_transfer' && !empty($paymentData['bank_account_id'])) {
            $stmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$paymentData['bank_account_id'], $tenant_id]);
            $cashAccountId = $stmt->fetchColumn() ?: 1;
        }
        
        // Debit: Cash/Bank
        $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Vehicle Registration - Additional Payment', 'vehicle_registrations', ?, ?, ?, ?, ?, 0)")
            ->execute([$tenant_id, $rec_id, $cashAccountId, $date, 'Additional Payment - ' . $appNo, $paymentAmount]);
        
        // Credit: Trade Debtors
        $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Vehicle Registration - Additional Payment', 'vehicle_registrations', ?, 2, ?, ?, 0, ?)")
            ->execute([$tenant_id, $rec_id, $date, 'Additional Payment - ' . $appNo, $paymentAmount]);
    }
    
    return ['new_balance' => $newBalance, 'amount_paid' => $newTotalPaid];
}

/**
 * Get complete registration summary
 */
function getRegistrationSummary($pdo, $tenant_id, $rec_id) {
    $stmt = $pdo->prepare("
        SELECT 
            id, application_no, registration_no, customer_name, product_name,
            reg_status, total_amount, amount_paid, remaining_balance,
            application_date, submitted_date, completed_date, delivery_date,
            expected_delivery_date, chassis_no, motor_no, colour, engine_cc, model_year
        FROM vehicle_registrations 
        WHERE id = ? AND tenant_id = ?
    ");
    $stmt->execute([$rec_id, $tenant_id]);
    $record = $stmt->fetch();
    
    if (!$record) return null;
    
    return array_merge($record, getRegistrationStatusDetails($record));
}

/**
 * Cancel registration and revert accounting entries
 */
function cancelRegistration($pdo, $tenant_id, $rec_id, $reason = null) {
    // Delete accounting entries
    $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'vehicle_registrations' AND reference_id = ? AND tenant_id = ?")->execute([$rec_id, $tenant_id]);
    
    // Update status to cancelled
    $sql = "UPDATE vehicle_registrations SET reg_status = 'CANCELLED'";
    if ($reason) {
        $sql .= ", remarks = ?";
    }
    $sql .= " WHERE id = ? AND tenant_id = ?";
    
    $params = $reason ? [$reason, $rec_id, $tenant_id] : [$rec_id, $tenant_id];
    $pdo->prepare($sql)->execute($params);
    
    return true;
}

/**
 * Get registration status report
 */
function getStatusReport($pdo, $tenant_id) {
    $stmt = $pdo->prepare("
        SELECT 
            reg_status as status,
            COUNT(*) as count,
            SUM(total_amount) as total_fees,
            SUM(amount_paid) as total_paid,
            SUM(remaining_balance) as total_pending
        FROM vehicle_registrations
        WHERE tenant_id = ?
        GROUP BY reg_status
    ");
    $stmt->execute([$tenant_id]);
    return $stmt->fetchAll();
}

// ── ACCOUNTING ────────────────────────────────────────────────────────────────
function saveAccounting($pdo, $tenant_id, $user_id, $rec_id, $data, $total, $amount_paid, $isUpdate) {
    if ($isUpdate) {
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'vehicle_registrations' AND reference_id = ? AND tenant_id = ?")->execute([$rec_id, $tenant_id]);
        $pdo->prepare("DELETE FROM accounting_ledger WHERE reference_table = 'receive_voucher' AND reference_id IN (SELECT id FROM receive_voucher WHERE reference_id = ? AND tenant_id = ?) AND tenant_id = ?")->execute([$rec_id, $tenant_id, $tenant_id]);
    }

    $appNo = $data['application_no'] ?? ('VR-' . $rec_id);
    $date  = $data['application_date'] ?: date('Y-m-d');

    // Debit: Trade Debtors (account_id = 2)
    $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Vehicle Registration', 'vehicle_registrations', ?, 2, ?, ?, ?, 0)")
        ->execute([$tenant_id, $rec_id, $date, 'Vehicle Reg Fees - ' . $appNo, $total]);

    // Credit: Service Revenue (account_id = 10)
    $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Vehicle Registration', 'vehicle_registrations', ?, 10, ?, ?, 0, ?)")
        ->execute([$tenant_id, $rec_id, $date, 'Vehicle Reg Fees - ' . $appNo, $total]);

    if ($amount_paid > 0) {
        // Generate receive voucher number
        $currentYear = date('Y');
        $voucherStmt = $pdo->prepare("SELECT voucher_number FROM receive_voucher WHERE tenant_id = ? AND voucher_number LIKE ? ORDER BY id DESC LIMIT 1");
        $voucherStmt->execute([$tenant_id, "RV-{$currentYear}-%"]);
        $lastVoucher = $voucherStmt->fetchColumn();

        if ($lastVoucher) {
            $lastNumber = (int) substr($lastVoucher, strrpos($lastVoucher, '-') + 1);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        $voucherNumber = 'RV-' . $currentYear . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);

        // Determine payment method ID (1=Cash, 2=Bank Transfer)
        $paymentMethodId = (!empty($data['payment_method']) && $data['payment_method'] === 'bank_transfer') ? 2 : 1;

        // Insert receive voucher
        $rvStmt = $pdo->prepare("
            INSERT INTO receive_voucher (
                tenant_id, currency_id, voucher_number, voucher_date, customer_id,
                bill_no, amount, payment_method_id, bank_account_id, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $rvStmt->execute([
            $tenant_id,
            2,
            $voucherNumber,
            $date,
            $data['customer_id'] ?? null,
            $appNo,
            $amount_paid,
            $paymentMethodId,
            !empty($data['bank_account_id']) ? (int)$data['bank_account_id'] : null,
            $user_id,
            $user_id
        ]);

        $voucher_id = $pdo->lastInsertId();

        // Get account_id for cash/bank
        if (!empty($data['payment_method']) && $data['payment_method'] === 'bank_transfer' && !empty($data['bank_account_id'])) {
            $bankStmt = $pdo->prepare("SELECT account_id FROM bank_accounts WHERE id = ? AND tenant_id = ?");
            $bankStmt->execute([$data['bank_account_id'], $tenant_id]);
            $cashAccountId = $bankStmt->fetchColumn() ?: 1;
        } else {
            $cashAccountId = 1;
        }

        // Debit: Cash/Bank Account
        $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Receive Voucher', 'receive_voucher', ?, ?, ?, ?, ?, 0)")
            ->execute([$tenant_id, $voucher_id, $cashAccountId, $date, 'Receive Voucher - ' . $voucherNumber, $amount_paid]);

        // Credit: Trade Debtors
        $pdo->prepare("INSERT INTO accounting_ledger (tenant_id, transaction_type, reference_table, reference_id, account_id, date, description, debit, credit) VALUES (?, 'Receive Voucher', 'receive_voucher', ?, 2, ?, ?, 0, ?)")
            ->execute([$tenant_id, $voucher_id, $date, 'Receive Voucher - ' . $voucherNumber, $amount_paid]);
    }
}
