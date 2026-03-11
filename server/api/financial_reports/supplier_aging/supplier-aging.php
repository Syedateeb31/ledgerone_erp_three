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

try {
    $company_id = !empty($_GET['company_id']) ? $_GET['company_id'] : null;
    
    // Get currency symbol
    $stmt = $pdo->prepare("
        SELECT c.symbol 
        FROM tenant_currencies tc 
        JOIN ledgerone_public.currencies c ON tc.currency_id = c.id 
        WHERE tc.tenant_id = ? AND tc.is_base_currency = 1
    ");
    $stmt->execute([$tenant_id]);
    $currency = $stmt->fetch();
    $currency_symbol = $currency['symbol'] ?? '$';

    // Calculate aging for each invoice
    $stmt = $pdo->prepare("
        SELECT 
            pi.id,
            pi.bill_no,
            pi.purchase_date,
            pi.net_amount,
            s.supplier_code,
            s.supplier_name,
            s.address,
            COALESCE(SUM(pv.amount), 0) as paid_amount,
            DATEDIFF(CURDATE(), pi.purchase_date) as days_overdue,
            'Purchase Invoice' as invoice_type
        FROM purchase_invoice pi
        JOIN suppliers s ON pi.supplier_id = s.id
        LEFT JOIN payment_voucher pv ON pv.bill_no = pi.bill_no AND pv.tenant_id = ?
        WHERE pi.tenant_id = ?
        " . ($company_id ? " AND pi.company_id = ?" : "") . "
        GROUP BY pi.id
        HAVING (pi.net_amount - paid_amount) > 0 AND DATEDIFF(CURDATE(), pi.purchase_date) >= 15
        
        ORDER BY days_overdue DESC
    ");
    $params = [$tenant_id, $tenant_id];
    if ($company_id) $params[] = $company_id;
    $stmt->execute($params);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reportData = [];
    $summary = [
        'total_overdue' => 0,
        'bucket_15' => 0,
        'bucket_25' => 0,
        'bucket_45' => 0,
        'count_15' => 0,
        'count_25' => 0,
        'count_45' => 0
    ];

    foreach ($invoices as $index => $invoice) {
        $outstanding = $invoice['net_amount'] - $invoice['paid_amount'];
        $days = (int)$invoice['days_overdue'];
        
        // Determine bucket
        $bucket = '<15';
        if ($days >= 45) {
            $bucket = '45+';
            $summary['bucket_45'] += $outstanding;
            $summary['count_45']++;
        } elseif ($days >= 35) {
            $bucket = '35+';
        } elseif ($days >= 25) {
            $bucket = '25+';
            $summary['bucket_25'] += $outstanding;
            $summary['count_25']++;
        } elseif ($days >= 15) {
            $bucket = '15+';
            $summary['bucket_15'] += $outstanding;
            $summary['count_15']++;
        }

        $summary['total_overdue'] += $outstanding;

        $reportData[] = [
            'id' => $index + 1,
            'supplierCode' => $invoice['supplier_code'],
            'supplierName' => $invoice['supplier_name'],
            'address' => $invoice['address'] ?? 'N/A',
            'invoiceNo' => $invoice['bill_no'],
            'type' => $invoice['invoice_type'],
            'amount' => $currency_symbol . number_format($outstanding, 2),
            'daysOverdue' => $days,
            'bucket' => $bucket
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $reportData,
        'summary' => [
            'total_overdue' => $currency_symbol . number_format($summary['total_overdue'], 2),
            'bucket_15' => $currency_symbol . number_format($summary['bucket_15'], 2),
            'bucket_25' => $currency_symbol . number_format($summary['bucket_25'], 2),
            'bucket_45' => $currency_symbol . number_format($summary['bucket_45'], 2),
            'count_15' => $summary['count_15'],
            'count_25' => $summary['count_25'],
            'count_45' => $summary['count_45']
        ],
        'currency_symbol' => $currency_symbol
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}