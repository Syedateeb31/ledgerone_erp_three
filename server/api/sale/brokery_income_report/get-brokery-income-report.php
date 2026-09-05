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

$date_from   = $_GET['date_from']   ?? date('Y-m-01');
$date_to     = $_GET['date_to']     ?? date('Y-m-d');
$product_id  = $_GET['product_id']  ?? null;
$customer_id = $_GET['customer_id'] ?? null;

try {
    /*
     * Brokery is invoice-level. We distribute it proportionally to each item
     * based on item net_amount / invoice total net_amount.
     *
     * brokery_income_per_item = brokery_amount * (item.net_amount / invoice.net_amount)
     *
     * We fetch every item of every invoice that has brokery_amount > 0,
     * then group by product.
     */

    $params = [$tenant_id, $date_from, $date_to];
    $extraWhere = '';

    if ($product_id) {
        $extraWhere .= ' AND sii.product_id = ?';
        $params[] = $product_id;
    }
    if ($customer_id) {
        $extraWhere .= ' AND si.customer_id = ?';
        $params[] = $customer_id;
    }

    $sql = "
        SELECT
            p.id                                    AS product_id,
            p.code                                  AS product_code,
            p.name                                  AS product_name,
            COUNT(DISTINCT si.id)                   AS total_invoices,
            SUM(sii.quantity)                       AS total_qty,
            u.uom_name                              AS uom_name,
            SUM(sii.net_amount)                     AS total_net_amount,
            SUM(si.brokery_amount)                  AS brokery_income,
            GROUP_CONCAT(
                CONCAT(
                    si.bill_no,        '|',
                    si.sale_date,      '|',
                    c.customer_name,   '|',
                    sii.quantity,      '|',
                    u.uom_name,        '|',
                    sii.net_amount,    '|',
                    si.brokery_amount, '|',
                    COALESCE(si.brokery_rate_type,''), '|',
                    si.brokery_pct_mode, '|',
                    si.brokery_rate
                )
                ORDER BY si.sale_date
                SEPARATOR ';;'
            ) AS invoice_details
        FROM sale_invoice si
        JOIN sale_invoice_items sii ON sii.sale_invoice_id = si.id
        JOIN products p             ON p.id = sii.product_id
        JOIN customers c            ON c.id = si.customer_id
        LEFT JOIN uom u             ON u.id = sii.uom_id
        WHERE si.tenant_id = ?
          AND si.sale_date BETWEEN ? AND ?
          AND si.brokery_amount > 0
          AND si.status = 'Posted'
          AND sii.parent_row_id IS NULL
          $extraWhere
        GROUP BY p.id, p.code, p.name, u.uom_name
        ORDER BY brokery_income DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $rateTypeLabels = [
        'per_bag' => 'Per Bag',
        'per_kg'  => 'Per KG',
        '100_kg'  => '100 KG',
        'mon'     => 'MON',
        'ton'     => 'Ton',
    ];

    foreach ($rows as &$row) {
        $invoices = [];
        if ($row['invoice_details']) {
            foreach (explode(';;', $row['invoice_details']) as $inv) {
                $p          = explode('|', $inv);
                $isPct      = ($p[8] ?? 0) == 1;
                $rtKey      = $p[7] ?? '';
                $rateLabel  = $isPct ? '% of Net Amt' : ($rateTypeLabels[$rtKey] ?? $rtKey);

                $invoices[] = [
                    'bill_no'         => $p[0] ?? '',
                    'sale_date'       => $p[1] ?? '',
                    'customer_name'   => $p[2] ?? '',
                    'quantity'        => $p[3] ?? 0,
                    'uom_name'        => $p[4] ?? '',
                    'net_amount'      => floatval($p[5] ?? 0),
                    'brokery_amount'  => floatval($p[6] ?? 0),
                    'rate_type_label' => $rateLabel,
                    'is_pct_mode'     => $isPct,
                    'brokery_rate'    => floatval($p[9] ?? 0),
                ];
            }
        }
        $row['invoices']      = $invoices;
        unset($row['invoice_details']);
        $row['brokery_income'] = round(floatval($row['brokery_income']), 2);
    }
    unset($row);

    $grand_total_brokery    = array_sum(array_column($rows, 'brokery_income'));
    $grand_total_net_amount = array_sum(array_column($rows, 'total_net_amount'));

    echo json_encode([
        'success' => true,
        'data'    => $rows,
        'summary' => [
            'total_products'         => count($rows),
            'grand_total_net_amount' => round($grand_total_net_amount, 2),
            'grand_total_brokery'    => round($grand_total_brokery, 2),
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
