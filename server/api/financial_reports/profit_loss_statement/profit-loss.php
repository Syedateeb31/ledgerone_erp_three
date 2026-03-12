<?php
session_start();
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$start_date = $_GET['start_date'] ?? null;
$end_date = $_GET['end_date'] ?? null;
$branch_id = $_GET['branch_id'] ?? null;
$company_id = !empty($_GET['company_id']) ? $_GET['company_id'] : null;

if (!$start_date || !$end_date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Start date and end date are required']);
    exit;
}

try {
    // Build branch filter condition
    $branch_condition = '';
    $branch_params = [];
    if ($branch_id && $branch_id !== 'all') {
        $branch_condition = ' AND (b.id = ? OR b.parent_branch_id = ?)';
        $branch_params = [$branch_id, $branch_id];
    }

    // Get Sales Revenue from station_daily_usage (fuel products)
    $sql = "
        SELECT 
            p.name as account,
            SUM(sdu.total_revenue) as amount
        FROM station_daily_usage sdu
        JOIN products p ON sdu.product_id = p.id
        JOIN branches b ON sdu.branch_id = b.id
        WHERE sdu.tenant_id = ?
        AND sdu.usage_date BETWEEN ? AND ?
        $branch_condition
        GROUP BY p.id, p.name
        ORDER BY amount DESC
    ";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$tenant_id, $start_date, $end_date], $branch_params);
    $stmt->execute($params);
    $sales_revenue = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get additional Sales Revenue from sale_invoice (non-fuel physical products)
    $sql = "
        SELECT 
            p.name as account,
            SUM(sii.net_amount) as amount
        FROM sale_invoice si
        JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id
        JOIN products p ON sii.product_id = p.id
        JOIN branches b ON si.branch_id = b.id
        WHERE si.tenant_id = ? 
        AND si.sale_date BETWEEN ? AND ?
        AND p.product_type = 'physical'
        AND (p.subcategory_id NOT IN (12, 13, 14) OR p.subcategory_id IS NULL)
        $branch_condition
        " . ($company_id ? " AND si.company_id = ?" : "") . "
        GROUP BY p.id, p.name
        ORDER BY amount DESC
    ";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$tenant_id, $start_date, $end_date], $branch_params);
    if ($company_id) $params[] = $company_id;
    $stmt->execute($params);
    $other_sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Merge both arrays
    $sales_revenue = array_merge($sales_revenue, $other_sales);

    // Get Service Revenue
    $sql = "
        SELECT 
            p.name as account,
            SUM(sii.net_amount) as amount
        FROM sale_invoice si
        JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id
        JOIN products p ON sii.product_id = p.id
        JOIN branches b ON si.branch_id = b.id
        WHERE si.tenant_id = ? 
        AND si.sale_date BETWEEN ? AND ?
        AND p.product_type = 'service'
        $branch_condition
        " . ($company_id ? " AND si.company_id = ?" : "") . "
        GROUP BY p.id, p.name
        ORDER BY amount DESC
    ";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$tenant_id, $start_date, $end_date], $branch_params);
    if ($company_id) $params[] = $company_id;
    $stmt->execute($params);
    $service_revenue = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get Rent Income
    $sql = "SELECT 'Rent Income' as account, SUM(al.credit) as amount
            FROM accounting_ledger al
            WHERE al.tenant_id = ? AND al.account_id = 147 
            AND al.date BETWEEN ? AND ?
            GROUP BY al.account_id
            HAVING amount > 0";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tenant_id, $start_date, $end_date]);
    $rent_income = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log('Service Revenue Count: ' . count($service_revenue));
    error_log('Service Revenue: ' . json_encode($service_revenue));

    // Get Cost of Goods Sold based on quantities sold from station_daily_usage
    $sql = "
        SELECT 
            p.id,
            p.name as account,
            SUM(sdu.total_dispensed) as qty_sold
        FROM station_daily_usage sdu
        JOIN products p ON sdu.product_id = p.id
        JOIN branches b ON sdu.branch_id = b.id
        WHERE sdu.tenant_id = ?
        AND sdu.usage_date BETWEEN ? AND ?
        $branch_condition
        GROUP BY p.id, p.name
    ";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$tenant_id, $start_date, $end_date], $branch_params);
    $stmt->execute($params);
    $sold_items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get sold quantities from sale_invoice for non-fuel products
    $sql = "
        SELECT 
            p.id,
            p.name as account,
            SUM(sii.quantity) as qty_sold
        FROM sale_invoice si
        JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id
        JOIN products p ON sii.product_id = p.id
        JOIN branches b ON si.branch_id = b.id
        WHERE si.tenant_id = ? 
        AND si.sale_date BETWEEN ? AND ?
        AND p.product_type = 'physical'
        AND (p.subcategory_id NOT IN (12, 13, 14) OR p.subcategory_id IS NULL)
        $branch_condition
        " . ($company_id ? " AND si.company_id = ?" : "") . "
        GROUP BY p.id, p.name
    ";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$tenant_id, $start_date, $end_date], $branch_params);
    if ($company_id) $params[] = $company_id;
    $stmt->execute($params);
    $other_sold = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Merge both arrays
    $sold_items = array_merge($sold_items, $other_sold);

    $cogs = [];
    foreach ($sold_items as $item) {
        // Get average cost INCLUDING opening stock
        $stock_opening_filter = $company_id ? " AND so.product_id IN (SELECT id FROM products WHERE company_id = ?)" : "";
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(
                    (
                        COALESCE(SUM(pii.net_amount), 0) + 
                        COALESCE((SELECT SUM(so.opening_qty * so.opening_price) 
                                  FROM stock_opening so
                                  JOIN products p ON so.product_id = p.id
                                  WHERE so.product_id = ? 
                                  AND so.tenant_id = ?
                                  $stock_opening_filter), 0)
                    ) / NULLIF(
                        COALESCE(SUM(pii.quantity), 0) + 
                        COALESCE((SELECT SUM(so.opening_qty) 
                                  FROM stock_opening so
                                  JOIN products p ON so.product_id = p.id
                                  WHERE so.product_id = ? 
                                  AND so.tenant_id = ?
                                  $stock_opening_filter), 0)
                    , 0), 0
                ) as avg_cost
            FROM purchase_invoice pi
            JOIN purchase_invoice_items pii ON pi.id = pii.purchase_invoice_id
            WHERE pii.product_id = ?
            AND pi.tenant_id = ?
            AND pi.purchase_date <= ?
            " . ($company_id ? " AND pi.company_id = ?" : "") . "
        ");
        $params_cogs = [$item['id'], $tenant_id];
        if ($company_id) $params_cogs[] = $company_id;
        $params_cogs[] = $item['id'];
        $params_cogs[] = $tenant_id;
        if ($company_id) $params_cogs[] = $company_id;
        $params_cogs[] = $item['id'];
        $params_cogs[] = $tenant_id;
        $params_cogs[] = $end_date;
        if ($company_id) $params_cogs[] = $company_id;
        $stmt->execute($params_cogs);
        $cost_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $avg_cost = (float)$cost_data['avg_cost'];
        $qty_sold = (float)$item['qty_sold'];
        $cogs_amount = $avg_cost * $qty_sold;
        
        if ($cogs_amount > 0) {
            $cogs[] = [
                'account' => $item['account'],
                'amount' => $cogs_amount
            ];
        }
    }

    // Get Operating Expenses from accounting_ledger
    $expense_filter = "";
    if ($company_id) {
        $expense_filter = " AND (
            (al.reference_table = 'sale_invoice' AND al.reference_id IN (SELECT id FROM sale_invoice WHERE company_id = ?))
            OR (al.reference_table = 'purchase_invoice' AND al.reference_id IN (SELECT id FROM purchase_invoice WHERE company_id = ?))
            OR (al.reference_table = 'payment_voucher' AND al.reference_id IN (SELECT id FROM payment_voucher WHERE company_id = ?))
            OR (al.reference_table = 'receive_voucher' AND al.reference_id IN (SELECT id FROM receive_voucher WHERE company_id = ?))
            OR (al.reference_table = 'expense_voucher' AND al.reference_id IN (SELECT id FROM expense_voucher WHERE company_id = ?))
            OR (al.reference_table = 'journal_voucher' AND al.reference_id IN (SELECT id FROM journal_voucher WHERE company_id = ?))
            OR (al.reference_table = 'stock_adjustment' AND al.reference_id IN (SELECT id FROM stock_adjustment WHERE company_id = ?))
        )";
    }
    $stmt = $pdo->prepare("
        SELECT 
            a.name as account,
            SUM(al.debit) - SUM(al.credit) as amount
        FROM accounting_ledger al
        JOIN accounts a ON al.account_id = a.id
        JOIN sub_accounts sa ON a.sub_account_id = sa.id
        WHERE al.tenant_id = ?
        AND al.date BETWEEN ? AND ?
        AND sa.account_head_id = 5
        AND al.account_id != 19
        $expense_filter
        GROUP BY a.id, a.name
        HAVING amount > 0
        ORDER BY amount DESC
    ");
    $params_exp = [$tenant_id, $start_date, $end_date];
    if ($company_id) {
        $params_exp = array_merge($params_exp, [$company_id, $company_id, $company_id, $company_id, $company_id, $company_id, $company_id]);
    }
    $stmt->execute($params_exp);
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get Other Income (Purchase Discounts Received)
    $income_filter = "";
    if ($company_id) {
        $income_filter = " AND (
            (al.reference_table = 'sale_invoice' AND al.reference_id IN (SELECT id FROM sale_invoice WHERE company_id = ?))
            OR (al.reference_table = 'purchase_invoice' AND al.reference_id IN (SELECT id FROM purchase_invoice WHERE company_id = ?))
            OR (al.reference_table = 'payment_voucher' AND al.reference_id IN (SELECT id FROM payment_voucher WHERE company_id = ?))
            OR (al.reference_table = 'receive_voucher' AND al.reference_id IN (SELECT id FROM receive_voucher WHERE company_id = ?))
            OR (al.reference_table = 'expense_voucher' AND al.reference_id IN (SELECT id FROM expense_voucher WHERE company_id = ?))
            OR (al.reference_table = 'journal_voucher' AND al.reference_id IN (SELECT id FROM journal_voucher WHERE company_id = ?))
            OR (al.reference_table = 'stock_adjustment' AND al.reference_id IN (SELECT id FROM stock_adjustment WHERE company_id = ?))
        )";
    }
    $stmt = $pdo->prepare("
        SELECT 
            a.name as account,
            SUM(al.credit) as amount
        FROM accounting_ledger al
        JOIN accounts a ON al.account_id = a.id
        WHERE al.tenant_id = ?
        AND al.date BETWEEN ? AND ?
        AND a.id = 103
        $income_filter
        GROUP BY a.id, a.name
        HAVING amount > 0
    ");
    $params_inc = [$tenant_id, $start_date, $end_date];
    if ($company_id) {
        $params_inc = array_merge($params_inc, [$company_id, $company_id, $company_id, $company_id, $company_id, $company_id, $company_id]);
    }
    $stmt->execute($params_inc);
    $other_income = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert amounts to float
    foreach ($sales_revenue as &$item) {
        $item['amount'] = (float)$item['amount'];
    }
    foreach ($service_revenue as &$item) {
        $item['amount'] = (float)$item['amount'];
    }
    foreach ($rent_income as &$item) {
        $item['amount'] = (float)$item['amount'];
    }
    foreach ($cogs as &$item) {
        $item['amount'] = (float)$item['amount'];
    }
    foreach ($expenses as &$item) {
        $item['amount'] = (float)$item['amount'];
    }
    foreach ($other_income as &$item) {
        $item['amount'] = (float)$item['amount'];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'sales_revenue' => $sales_revenue,
            'service_revenue' => $service_revenue,
            'rent_income' => $rent_income,
            'cogs' => $cogs,
            'expenses' => $expenses,
            'other_income' => $other_income
        ],
        'debug' => [
            'sales_revenue_count' => count($sales_revenue),
            'service_revenue_count' => count($service_revenue),
            'sold_items' => $sold_items ?? [],
            'cogs_count' => count($cogs),
            'expenses_count' => count($expenses)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
