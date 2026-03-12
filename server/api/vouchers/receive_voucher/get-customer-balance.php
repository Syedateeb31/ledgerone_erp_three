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

$customer_code = $_GET['customer_code'] ?? '';
$bill_no = $_GET['bill_no'] ?? '';

if (!$customer_code) {
    echo json_encode(['success' => true, 'balance' => 0]);
    exit();
}

try {
    // Get customer ID
    $stmt = $pdo->prepare("SELECT id, opening_debit_amount, opening_credit_amount FROM customers WHERE tenant_id = ? AND customer_code = ?");
    $stmt->execute([$tenant_id, $customer_code]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$customer) {
        echo json_encode(['success' => true, 'balance' => 0]);
        exit();
    }
    
    $customer_id = $customer['id'];
    $opening_balance = $customer['opening_debit_amount'] - $customer['opening_credit_amount'];
    
    // If bill_no is provided, calculate balance up to that bill
    if ($bill_no) {
        // Get the bill date
        $stmt = $pdo->prepare("SELECT sale_date FROM sale_invoice WHERE tenant_id = ? AND customer_id = ? AND bill_no = ?");
        $stmt->execute([$tenant_id, $customer_id, $bill_no]);
        $bill = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bill) {
            // Check opening balance invoices
            $stmt = $pdo->prepare("SELECT invoice_date as sale_date FROM opening_balance_invoices WHERE tenant_id = ? AND customer_id = ? AND invoice_number = ?");
            $stmt->execute([$tenant_id, $customer_id, $bill_no]);
            $bill = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if ($bill) {
            $bill_date = $bill['sale_date'];
            
            // Get invoices up to and including this bill
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM sale_invoice WHERE tenant_id = ? AND customer_id = ? AND sale_date <= ?");
            $stmt->execute([$tenant_id, $customer_id, $bill_date]);
            $total_invoices = $stmt->fetch()['total'];
            
            // Get opening balance invoices up to this date
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(debit), 0) as total FROM opening_balance_invoices WHERE tenant_id = ? AND customer_id = ? AND invoice_date <= ?");
            $stmt->execute([$tenant_id, $customer_id, $bill_date]);
            $total_invoices += $stmt->fetch()['total'];
            
            // Get payments up to this bill date
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM receive_voucher WHERE tenant_id = ? AND customer_id = ? AND voucher_date <= ?");
            $stmt->execute([$tenant_id, $customer_id, $bill_date]);
            $total_payments = $stmt->fetch()['total'];
            
            // Get returns up to this bill date
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount - amount_refunded), 0) as total FROM sale_return WHERE tenant_id = ? AND customer_id = ? AND status = 'Posted' AND sale_date <= ?");
            $stmt->execute([$tenant_id, $customer_id, $bill_date]);
            $total_returns = $stmt->fetch()['total'];
            
            $balance = $opening_balance + $total_invoices - $total_payments - $total_returns;
            
            echo json_encode(['success' => true, 'balance' => $balance]);
            exit();
        }
    }
    
    // Get total invoices
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM sale_invoice WHERE tenant_id = ? AND customer_id = ?");
    $stmt->execute([$tenant_id, $customer_id]);
    $total_invoices = $stmt->fetch()['total'];
    
    // Get total payments
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM receive_voucher WHERE tenant_id = ? AND customer_id = ?");
    $stmt->execute([$tenant_id, $customer_id]);
    $total_payments = $stmt->fetch()['total'];
    
    // Get total returns (credit)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount - amount_refunded), 0) as total FROM sale_return WHERE tenant_id = ? AND customer_id = ? AND status = 'Posted'");
    $stmt->execute([$tenant_id, $customer_id]);
    $total_returns = $stmt->fetch()['total'];
    
    $balance = $opening_balance + $total_invoices - $total_payments - $total_returns;
    
    echo json_encode(['success' => true, 'balance' => $balance]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
?>
