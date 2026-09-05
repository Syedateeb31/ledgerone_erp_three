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
$product_id = $_GET['product_id'] ?? null;
$party_id   = $_GET['party_id']   ?? null; // customer_id when type=sale, supplier_id when type=purchase
$type       = strtolower($_GET['type'] ?? 'both'); // sale | purchase | both

if (!in_array($type, ['sale', 'purchase', 'both'], true)) {
    $type = 'both';
}

/*
 * Brokery is invoice-level. We distribute it proportionally to each item
 * based on item net_amount / invoice total net_amount, so a multi-product
 * (or multi-line) invoice's brokery is split across its lines instead of
 * being counted in full against every product on that invoice.
 *
 * brokery_income_per_item = brokery_amount * (item.net_amount / invoice.net_amount)
 */

$rateTypeLabels = [
    'per_bag' => 'Per Bag',
    'per_kg'  => 'Per KG',
    '100_kg'  => '100 KG',
    'mon'     => 'MON',
    'ton'     => 'Ton',
];

function fetchGroupedRows(PDO $pdo, $txnType, $tenant_id, $date_from, $date_to, $product_id, $party_id, $rateTypeLabels) {
    if ($txnType === 'sale') {
        $invoiceTable = 'sale_invoice';
        $itemsTable   = 'sale_invoice_items';
        $fkColumn     = 'sale_invoice_id';
        $dateColumn   = 'sale_date';
        $partyTable   = 'customers';
        $partyFk      = 'customer_id';
        $partyNameCol = 'customer_name';
        $statusCheck  = "si.status = 'Posted'";
    } else {
        $invoiceTable = 'purchase_invoice';
        $itemsTable   = 'purchase_invoice_items';
        $fkColumn     = 'purchase_invoice_id';
        $dateColumn   = 'purchase_date';
        $partyTable   = 'suppliers';
        $partyFk      = 'supplier_id';
        $partyNameCol = 'supplier_name';
        $statusCheck  = "si.status = 'confirmed'";
    }

    $params = [$tenant_id, $date_from, $date_to];
    $extraWhere = '';
    if ($product_id) {
        $extraWhere .= ' AND sii.product_id = ?';
        $params[] = $product_id;
    }
    if ($party_id) {
        $extraWhere .= " AND si.$partyFk = ?";
        $params[] = $party_id;
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
            SUM(si.brokery_amount * sii.net_amount / NULLIF(itot.items_total, 0)) AS brokery_income,
            GROUP_CONCAT(
                CONCAT(
                    si.bill_no,        '|',
                    si.$dateColumn,    '|',
                    party.$partyNameCol, '|',
                    sii.quantity,      '|',
                    u.uom_name,        '|',
                    sii.net_amount,    '|',
                    (si.brokery_amount * sii.net_amount / NULLIF(itot.items_total, 0)), '|',
                    COALESCE(si.brokery_rate_type,''), '|',
                    si.brokery_pct_mode, '|',
                    si.brokery_rate,    '|',
                    REPLACE(REPLACE(COALESCE(si.remarks, ''), '|', ' '), ';;', ' ')
                )
                ORDER BY si.$dateColumn
                SEPARATOR ';;'
            ) AS invoice_details
        FROM $invoiceTable si
        JOIN $itemsTable sii ON sii.$fkColumn = si.id
        JOIN products p      ON p.id = sii.product_id
        JOIN $partyTable party ON party.id = si.$partyFk
        LEFT JOIN uom u      ON u.id = sii.uom_id
        -- Each invoice's own item-total (goods value before charges like brokery
        -- are folded in), used as the split ratio's denominator. si.net_amount
        -- can't be used directly: on purchase_invoice it already includes
        -- brokery_amount (net_amount = total_bill + total_charges), which would
        -- make the ratio self-referential and under-count the split.
        JOIN (
            SELECT $fkColumn AS inv_id, SUM(net_amount) AS items_total
            FROM $itemsTable
            WHERE parent_row_id IS NULL
            GROUP BY $fkColumn
        ) itot ON itot.inv_id = si.id
        WHERE si.tenant_id = ?
          AND si.$dateColumn BETWEEN ? AND ?
          AND si.brokery_amount > 0
          AND $statusCheck
          AND sii.parent_row_id IS NULL
          $extraWhere
        GROUP BY p.id, p.code, p.name, u.uom_name
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $label = $txnType === 'sale' ? 'Sale' : 'Purchase';
    foreach ($rows as &$row) {
        $invoices = [];
        if ($row['invoice_details']) {
            foreach (explode(';;', $row['invoice_details']) as $inv) {
                $p         = explode('|', $inv);
                $isPct     = ($p[8] ?? 0) == 1;
                $rtKey     = $p[7] ?? '';
                $rateLabel = $isPct ? '% of Net Amt' : ($rateTypeLabels[$rtKey] ?? $rtKey);

                $invoices[] = [
                    'transaction_type' => $label,
                    'bill_no'          => $p[0] ?? '',
                    'txn_date'         => $p[1] ?? '',
                    'party_name'       => $p[2] ?? '',
                    'quantity'         => $p[3] ?? 0,
                    'uom_name'         => $p[4] ?? '',
                    'net_amount'       => floatval($p[5] ?? 0),
                    'brokery_amount'   => floatval($p[6] ?? 0),
                    'rate_type_label'  => $rateLabel,
                    'is_pct_mode'      => $isPct,
                    'brokery_rate'     => floatval($p[9] ?? 0),
                    'remarks'          => $p[10] ?? '',
                ];
            }
        }
        $row['invoices'] = $invoices;
        unset($row['invoice_details']);
        $row['brokery_income'] = round(floatval($row['brokery_income']), 2);
        $row['total_net_amount'] = round(floatval($row['total_net_amount']), 2);
    }
    unset($row);

    return $rows;
}

try {
    $saleRows = ($type === 'sale' || $type === 'both')
        ? fetchGroupedRows($pdo, 'sale', $tenant_id, $date_from, $date_to, $product_id, $type === 'sale' ? $party_id : null, $rateTypeLabels)
        : [];
    $purchaseRows = ($type === 'purchase' || $type === 'both')
        ? fetchGroupedRows($pdo, 'purchase', $tenant_id, $date_from, $date_to, $product_id, $type === 'purchase' ? $party_id : null, $rateTypeLabels)
        : [];

    // Merge sale + purchase rows per product (by product_id + uom_name) so a
    // product's total brokery income reflects both sides, while each
    // individual transaction line still carries its own Sale/Purchase tag.
    $merged = [];
    foreach (array_merge($saleRows, $purchaseRows) as $row) {
        $key = $row['product_id'] . '|' . $row['uom_name'];
        if (!isset($merged[$key])) {
            $merged[$key] = $row;
        } else {
            $merged[$key]['total_invoices']   += $row['total_invoices'];
            $merged[$key]['total_qty']        += $row['total_qty'];
            $merged[$key]['total_net_amount'] += $row['total_net_amount'];
            $merged[$key]['brokery_income']    = round($merged[$key]['brokery_income'] + $row['brokery_income'], 2);
            $merged[$key]['invoices']          = array_merge($merged[$key]['invoices'], $row['invoices']);
        }
    }

    $rows = array_values($merged);
    foreach ($rows as &$row) {
        usort($row['invoices'], function ($a, $b) {
            return strtotime($a['txn_date']) <=> strtotime($b['txn_date']);
        });
    }
    unset($row);

    usort($rows, function ($a, $b) {
        return $b['brokery_income'] <=> $a['brokery_income'];
    });

    $grand_total_brokery    = array_sum(array_column($rows, 'brokery_income'));
    $grand_total_net_amount = array_sum(array_column($rows, 'total_net_amount'));

    echo json_encode([
        'success' => true,
        'type'    => $type,
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
