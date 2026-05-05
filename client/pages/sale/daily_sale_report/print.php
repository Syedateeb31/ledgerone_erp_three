<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id) {
    header('Location: ../../auth/login.html');
    exit();
}

require_once '../../../../includes/connection.php';

// Get currency symbol
$stmt = $pdo->prepare("
    SELECT c.symbol 
    FROM tenant_currencies tc 
    JOIN ledgerone_public.currencies c ON tc.currency_id = c.id 
    WHERE tc.tenant_id = ? AND tc.is_base_currency = 1
");
$stmt->execute([$tenant_id]);
$currency = $stmt->fetch();
$currency_symbol = $currency['symbol'];

// Get tenant info
$stmt = $pdo->prepare("SELECT company_name, address, phone, email FROM companies WHERE tenant_id = ? AND is_active = 1 LIMIT 1");
$stmt->execute([$tenant_id]);
$tenant = $stmt->fetch();

// Get report parameters
$report_type = $_GET['report_type'] ?? 'item-wise';
$reference = $_GET['reference'] ?? null;
$sales_officer_id = $_GET['sales_officer_id'] ?? null;
$vendor_id = $_GET['vendor_id'] ?? null;
$company_id = $_GET['company_id'] ?? null;
$date_from = $_GET['date_from'] ?? null;
$date_to = $_GET['date_to'] ?? null;

// Get sales officer name
$sales_officer_name = 'All';
if ($sales_officer_id) {
    $stmt = $pdo->prepare("SELECT full_name FROM employees WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$sales_officer_id, $tenant_id]);
    $officer = $stmt->fetch();
    if ($officer) $sales_officer_name = $officer['full_name'];
}

// Get vendor name
$vendor_name = 'All';
if ($vendor_id) {
    $stmt = $pdo->prepare("SELECT supplier_name FROM suppliers WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$vendor_id, $tenant_id]);
    $vendor = $stmt->fetch();
    if ($vendor) $vendor_name = $vendor['supplier_name'];
}

$company_name = 'All';
if ($company_id) {
    $stmt = $pdo->prepare("SELECT company_name FROM companies WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$company_id, $tenant_id]);
    $company = $stmt->fetch();
    if ($company) $company_name = $company['company_name'];
}

// Fetch report data
if ($report_type === 'item-wise') {
    $sql = "SELECT 
                p.id,
                p.name as product,
                p.parent_product_id,
                u.uom_name as unit,
                sii.quantity as qty,
                sii.foc_quantity as foc_qty,
                sii.sale_price as rate,
                sii.net_amount as amount,
                CASE WHEN sii.parent_row_id IS NOT NULL THEN 1 ELSE 0 END as is_child
            FROM sale_invoice_items sii
            JOIN sale_invoice si ON sii.sale_invoice_id = si.id
            JOIN products p ON sii.product_id = p.id
            LEFT JOIN uom u ON sii.uom_id = u.id
            WHERE si.tenant_id = ? AND si.status = 'Posted'";
    
    $params = [$tenant_id];
    
    if ($date_from) {
        $sql .= " AND si.sale_date >= ?";
        $params[] = $date_from;
    }
    if ($date_to) {
        $sql .= " AND si.sale_date <= ?";
        $params[] = $date_to;
    }
    if ($sales_officer_id) {
        $sql .= " AND si.sale_officer_id = ?";
        $params[] = $sales_officer_id;
    }
    if ($vendor_id) {
        $sql .= " AND p.vendor_id = ?";
        $params[] = $vendor_id;
    }
    if ($company_id) {
        $sql .= " AND si.company_id = ?";
        $params[] = $company_id;
    }
    
    $sql .= " ORDER BY p.id, u.uom_name";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $grouped = [];
    foreach ($rawData as $item) {
        $key = $item['id'];
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'id' => $item['id'],
                'product' => $item['product'],
                'parent_product_id' => $item['parent_product_id'],
                'is_child' => $item['is_child'],
                'foc_qty' => 0,
                'rate' => $item['rate'],
                'amount' => 0,
                'units' => []
            ];
        }
        
        $unitName = $item['unit'] ?? '-';
        // Check if this unit already exists for this product
        $unitExists = false;
        foreach ($grouped[$key]['units'] as &$existingUnit) {
            if ($existingUnit['unit'] === $unitName) {
                $existingUnit['qty'] += $item['qty'];
                $unitExists = true;
                break;
            }
        }
        
        // If unit doesn't exist, add it
        if (!$unitExists) {
            $grouped[$key]['units'][] = [
                'unit' => $unitName,
                'qty' => $item['qty']
            ];
        }
        
        $grouped[$key]['foc_qty'] += $item['foc_qty'];
        $grouped[$key]['amount'] += $item['amount'];
    }
    
    $data = array_values($grouped);
} else {
    $sql = "SELECT 
                si.bill_no as invoiceNo,
                c.customer_code as custCode,
                c.customer_name as custName,
                c.address,
                si.total_bill as billAmount,
                0 as returnAmount,
                si.net_amount as netAmount
            FROM sale_invoice si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.tenant_id = ? AND si.status = 'Posted'";
    
    $params = [$tenant_id];
    
    if ($date_from) {
        $sql .= " AND si.sale_date >= ?";
        $params[] = $date_from;
    }
    if ($date_to) {
        $sql .= " AND si.sale_date <= ?";
        $params[] = $date_to;
    }
    if ($sales_officer_id) {
        $sql .= " AND si.sale_officer_id = ?";
        $params[] = $sales_officer_id;
    }
    if ($company_id) {
        $sql .= " AND si.company_id = ?";
        $params[] = $company_id;
    }
    
    $sql .= " ORDER BY si.bill_no DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Sales Report - Print</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #000;
        }
        
        .print-container {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 12px;
            color: #333;
        }
        
        .report-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px;
            text-align: center;
        }
        
        .report-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .summary {
            margin-top: 20px;
            text-align: right;
        }
        
        .summary-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
            font-size: 13px;
        }
        
        .summary-label {
            width: 150px;
            font-weight: bold;
        }
        
        .summary-value {
            width: 120px;
            text-align: right;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #000;
            font-size: 11px;
            text-align: center;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .no-print {
                display: none;
            }
        }
        
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #1f7bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .print-btn:hover {
            background-color: #1a6cdc;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">Print Report</button>
    
    <div class="print-container">
        <div class="header">
            <div class="company-name"><?php echo htmlspecialchars($tenant['company_name'] ?? 'Company Name'); ?></div>
            <div class="company-details">
                <?php echo htmlspecialchars($tenant['address'] ?? ''); ?><br>
                Phone: <?php echo htmlspecialchars($tenant['phone'] ?? ''); ?> | Email: <?php echo htmlspecialchars($tenant['email'] ?? ''); ?>
            </div>
        </div>
        
        <div class="report-title">
            <?php echo $report_type === 'item-wise' ? 'Item-wise Daily Sales Report' : 'Bill-wise Daily Sales Report'; ?>
        </div>
        
        <div class="report-info">
            <div>
                <strong>Reference #:</strong> <?php echo htmlspecialchars($reference ?? 'N/A'); ?><br>
                <strong>Sales Officer:</strong> <?php echo htmlspecialchars($sales_officer_name); ?><br>
                <strong>Vendor:</strong> <?php echo htmlspecialchars($vendor_name); ?><br>
                <strong>Company:</strong> <?php echo htmlspecialchars($company_name); ?>
            </div>
            <div>
                <strong>Date Range:</strong> <?php echo $date_from ? date('d-M-Y', strtotime($date_from)) : 'N/A'; ?> to <?php echo $date_to ? date('d-M-Y', strtotime($date_to)) : 'N/A'; ?>
            </div>
            <div>
                <strong>Print Date:</strong> <?php echo date('d-M-Y h:i A'); ?>
            </div>
        </div>
        
        <?php if ($report_type === 'item-wise'): ?>
            <table>
                <thead>
                    <tr>
                        <th class="text-center">S#</th>
                        <th>Product</th>
                        <th class="text-right">Quantity</th>
                        <th class="text-right">FOC Qty</th>
                        <th class="text-right">Rate</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $totalAmount = 0;
                    foreach ($data as $index => $item): 
                        if (!$item['is_child']) {
                            $totalAmount += $item['amount'];
                        }
                        $indent = $item['is_child'] ? 'padding-left: 30px;' : '';
                        $arrow = $item['is_child'] ? '↳ ' : '';
                    ?>
                        <tr>
                            <td class="text-center"><?php echo $index + 1; ?></td>
                            <td style="<?php echo $indent; ?>"><?php echo $arrow . htmlspecialchars($item['product']); ?></td>
                            <td class="text-right"><?php echo implode(', ', array_map(function($u) { return $u['unit'] . ' ' . intval($u['qty']); }, $item['units'])); ?></td>
                            <td class="text-right"><?php echo number_format($item['foc_qty'], 2); ?></td>
                            <td class="text-right"><?php echo $currency_symbol . number_format($item['rate'], 2); ?></td>
                            <td class="text-right"><?php echo $currency_symbol . number_format($item['amount'], 2); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <div class="summary-label">Total Amount:</div>
                    <div class="summary-value"><?php echo $currency_symbol . number_format($totalAmount, 2); ?></div>
                </div>
            </div>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th class="text-center">S#</th>
                        <th>Invoice No</th>
                        <th>Customer Code</th>
                        <th>Customer Name</th>
                        <th>Address</th>
                        <th class="text-right">Net Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $totalBillAmount = 0;
                    $totalReturnAmount = 0;
                    $totalNetAmount = 0;
                    foreach ($data as $index => $item): 
                        $totalBillAmount += $item['billAmount'];
                        $totalReturnAmount += $item['returnAmount'];
                        $totalNetAmount += $item['netAmount'];
                    ?>
                        <tr>
                            <td class="text-center"><?php echo $index + 1; ?></td>
                            <td><?php echo htmlspecialchars($item['invoiceNo']); ?></td>
                            <td><?php echo htmlspecialchars($item['custCode']); ?></td>
                            <td><?php echo htmlspecialchars($item['custName']); ?></td>
                            <td><?php echo htmlspecialchars($item['address'] ?? '-'); ?></td>
                            <td class="text-right"><?php echo $currency_symbol . number_format($item['netAmount'], 2); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <div class="summary-label">Total Bills:</div>
                    <div class="summary-value"><?php echo count($data); ?></div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">Net Amount:</div>
                    <div class="summary-value"><?php echo $currency_symbol . number_format($totalNetAmount, 2); ?></div>
                </div>
            </div>
        <?php endif; ?>
        
        <div class="footer">
            Generated by LedgerOne ERP | <?php echo date('d-M-Y h:i A'); ?>
        </div>
    </div>
</body>
</html>
