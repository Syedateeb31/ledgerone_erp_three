<?php
session_start();
require_once '../../../../includes/connection.php';
require_once '../../financial_reports/customer_ledger/currency-converter.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;
$customer_id = $_GET['customer_id'] ?? null;
$as_of_date = $_GET['as_of_date'] ?? date('Y-m-d'); // Default to today
$company_id = $_GET['company_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if (!$customer_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Customer ID required']);
    exit;
}

try {
    // Initialize currency converter
    $converter = new CurrencyConverter($pdo, $tenant_id);
    
    // Get base currency
    $stmt = $pdo->prepare("SELECT currency_id FROM tenant_currencies WHERE tenant_id = ? AND is_base_currency = 1");
    $stmt->execute([$tenant_id]);
    $baseCurrency = $stmt->fetch(PDO::FETCH_ASSOC);
    $target_currency_id = $baseCurrency['currency_id'];
    
    // Get customer opening balance
    $stmt = $pdo->prepare("SELECT opening_debit_amount, opening_credit_amount FROM customers WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$customer_id, $tenant_id]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$customer) {
        echo json_encode(['success' => false, 'message' => 'Customer not found']);
        exit;
    }
    
    $opening_debit = $customer['opening_debit_amount'];
    $opening_credit = $customer['opening_credit_amount'];
    $base_opening = $opening_debit - $opening_credit;
    
    $company_filter = ($company_id ? " AND company_id = ?" : "");
    
    // Get all transactions up to as_of_date
    // Sale invoices (Debit)
    $sql = "SELECT COALESCE(SUM(net_amount), 0) as total FROM sale_invoice 
            WHERE tenant_id = ? AND customer_id = ? AND sale_date <= ?{$company_filter}";
    $params = [$tenant_id, $customer_id, $as_of_date];
    if ($company_id) $params[] = $company_id;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $total_invoices = floatval($stmt->fetch()['total']);
    
    // Receive vouchers / Payments (Credit)
    $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM receive_voucher 
            WHERE tenant_id = ? AND customer_id = ? AND voucher_date <= ?{$company_filter}";
    $params = [$tenant_id, $customer_id, $as_of_date];
    if ($company_id) $params[] = $company_id;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $total_payments = floatval($stmt->fetch()['total']);
    
    // Payment vouchers (Debit - money given to customer)
    $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM payment_voucher 
            WHERE tenant_id = ? AND customer_id IS NOT NULL AND supplier_id IS NULL AND customer_id = ? AND voucher_date <= ?{$company_filter}";
    $params = [$tenant_id, $customer_id, $as_of_date];
    if ($company_id) $params[] = $company_id;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $total_payment_vouchers = floatval($stmt->fetch()['total']);
    
    // Sale returns (Credit)
    $sql = "SELECT COALESCE(SUM(net_amount - amount_refunded), 0) as credit FROM sale_return 
            WHERE tenant_id = ? AND customer_id = ? AND sale_date <= ? AND status = 'Posted'{$company_filter}";
    $params = [$tenant_id, $customer_id, $as_of_date];
    if ($company_id) $params[] = $company_id;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $total_returns = floatval($stmt->fetch()['credit']);
    
    // Calculate closing balance: Opening + Invoices + Payment Vouchers - Payments - Returns
    $closing_balance = $base_opening + $total_invoices + $total_payment_vouchers - $total_payments - $total_returns;
    
    // Determine if Dr or Cr
    $balance_type = $closing_balance >= 0 ? 'Dr' : 'Cr';
    $closing_balance_abs = abs($closing_balance);
    
    echo json_encode([
        'success' => true,
        'closing_balance' => round($closing_balance_abs, 2),
        'balance_type' => $balance_type,
        'opening_balance' => $base_opening,
        'total_invoices' => $total_invoices,
        'total_payments' => $total_payments,
        'total_payment_vouchers' => $total_payment_vouchers,
        'total_returns' => $total_returns
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
