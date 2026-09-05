<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (session_status() == PHP_SESSION_NONE) session_start();

$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$tenant_id) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$date_from  = $_GET['date_from']  ?? date('Y-m-01');
$date_to    = $_GET['date_to']    ?? date('Y-m-d');
$customer_id = $_GET['customer_id'] ?? null;

try {
    $params = [$tenant_id, $date_from, $date_to];
    $customerWhere = '';
    if ($customer_id) {
        $customerWhere = ' AND si.customer_id = ?';
        $params[] = $customer_id;
    }

    $sql = "
        SELECT
            c.id                       AS customer_id,
            c.customer_code,
            c.customer_name,
            COUNT(si.id)               AS total_invoices,
            SUM(si.brokery_amount)     AS total_brokery_amount,
            SUM(si.brokery_tax_amount) AS total_brokery_tax_amount,
            GROUP_CONCAT(
                CONCAT(
                    si.bill_no, '|',
                    si.sale_date, '|',
                    COALESCE(si.brokery_rate_type,''), '|',
                    si.brokery_pct_mode, '|',
                    si.brokery_rate, '|',
                    si.brokery_amount, '|',
                    si.brokery_tax_percent, '|',
                    si.brokery_tax_amount, '|',
                    si.net_amount
                )
                ORDER BY si.sale_date
                SEPARATOR ';;'
            ) AS invoice_details
        FROM sale_invoice si
        JOIN customers c ON si.customer_id = c.id
        WHERE si.tenant_id = ?
          AND si.sale_date BETWEEN ? AND ?
          AND si.brokery_tax_amount > 0
          $customerWhere
        GROUP BY c.id, c.customer_code, c.customer_name
        ORDER BY c.customer_name
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Rate type labels
    $rateTypeLabels = [
        'per_bag' => 'Per Bag',
        'per_kg'  => 'Per KG',
        '100_kg'  => '100 KG',
        'mon'     => 'MON',
        'ton'     => 'Ton',
    ];

    // Parse invoice_details into array
    foreach ($rows as &$row) {
        $invoices = [];
        if ($row['invoice_details']) {
            foreach (explode(';;', $row['invoice_details']) as $inv) {
                $parts = explode('|', $inv);
                $isPct       = ($parts[3] ?? 0) == 1;
                $rateTypeKey = $parts[2] ?? '';
                $rateLabel   = $isPct ? '% of Net Amount' : ($rateTypeLabels[$rateTypeKey] ?? $rateTypeKey);
                $invoices[] = [
                    'bill_no'             => $parts[0] ?? '',
                    'sale_date'           => $parts[1] ?? '',
                    'brokery_rate_type'   => $rateTypeKey,
                    'brokery_rate_label'  => $rateLabel,
                    'is_pct_mode'         => $isPct,
                    'brokery_rate'        => $parts[4] ?? 0,
                    'brokery_amount'      => $parts[5] ?? 0,
                    'brokery_tax_percent' => $parts[6] ?? 0,
                    'brokery_tax_amount'  => $parts[7] ?? 0,
                    'net_amount'          => $parts[8] ?? 0,
                ];
            }
        }
        $row['invoices'] = $invoices;
        unset($row['invoice_details']);
    }
    unset($row);

    // Summary totals
    $grand_total_brokery     = array_sum(array_column($rows, 'total_brokery_amount'));
    $grand_total_brokery_tax = array_sum(array_column($rows, 'total_brokery_tax_amount'));

    echo json_encode([
        'success' => true,
        'data'    => $rows,
        'summary' => [
            'total_customers'         => count($rows),
            'grand_total_brokery'     => $grand_total_brokery,
            'grand_total_brokery_tax' => $grand_total_brokery_tax,
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
