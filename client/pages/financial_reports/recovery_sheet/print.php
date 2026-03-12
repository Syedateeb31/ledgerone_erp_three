<?php
require_once '../../../../includes/connection.php';
session_start();

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    header('Location: ../../auth/login.html');
    exit();
}

// Get base currency symbol
$stmt = $pdo->prepare("
    SELECT c.symbol 
    FROM tenant_currencies tc 
    JOIN ledgerone_public.currencies c ON tc.currency_id = c.id 
    WHERE tc.tenant_id = ? AND tc.is_base_currency = 1
");
$stmt->execute([$tenant_id]);
$currency = $stmt->fetch();
$currency_symbol = $currency['symbol'];

// Get user name
$stmt = $pdo->prepare("SELECT full_name FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();
$user_name = $user['full_name'];

// Get filters from URL
$date_from = $_GET['date_from'] ?? null;
$date_to = $_GET['date_to'] ?? null;
$recovery_officer_id = $_GET['recovery_officer_id'] ?? null;
$country_id = $_GET['country_id'] ?? null;
$region_id = $_GET['region_id'] ?? null;
$city_id = $_GET['city_id'] ?? null;
$city_zone_id = $_GET['city_zone_id'] ?? null;
$area_id = $_GET['area_id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

// Get company info
if ($company_id) {
    $stmt = $pdo->prepare("SELECT company_name, address, phone, email FROM companies WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$company_id, $tenant_id]);
    $company = $stmt->fetch();
} else {
    $stmt = $pdo->prepare("SELECT company_name, address, phone, email FROM companies WHERE tenant_id = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$tenant_id]);
    $company = $stmt->fetch();
}
$company_name = $company['company_name'] ?? 'Company Name';
$company_address = $company['address'] ?? '';
$company_phone = $company['phone'] ?? '';
$company_email = $company['email'] ?? '';

// Get filter names
$recovery_officer_name = '';
if ($recovery_officer_id) {
    $stmt = $pdo->prepare("SELECT full_name FROM employees WHERE id = ?");
    $stmt->execute([$recovery_officer_id]);
    $officer = $stmt->fetch();
    $recovery_officer_name = $officer['full_name'] ?? '';
}

$country_name = '';
if ($country_id) {
    $stmt = $pdo->prepare("SELECT country_name FROM countries WHERE id = ?");
    $stmt->execute([$country_id]);
    $country = $stmt->fetch();
    $country_name = $country['country_name'] ?? '';
}

$region_name = '';
if ($region_id) {
    $stmt = $pdo->prepare("SELECT region_name FROM regions WHERE id = ?");
    $stmt->execute([$region_id]);
    $region = $stmt->fetch();
    $region_name = $region['region_name'] ?? '';
}

$city_name = '';
if ($city_id) {
    $stmt = $pdo->prepare("SELECT city_name FROM cities WHERE id = ?");
    $stmt->execute([$city_id]);
    $city = $stmt->fetch();
    $city_name = $city['city_name'] ?? '';
}

$city_zone_name = '';
if ($city_zone_id) {
    $stmt = $pdo->prepare("SELECT city_zone_name FROM city_zones WHERE id = ?");
    $stmt->execute([$city_zone_id]);
    $zone = $stmt->fetch();
    $city_zone_name = $zone['city_zone_name'] ?? '';
}

$area_name = '';
if ($area_id) {
    $stmt = $pdo->prepare("SELECT area_name FROM areas WHERE id = ?");
    $stmt->execute([$area_id]);
    $area = $stmt->fetch();
    $area_name = $area['area_name'] ?? '';
}

// Fetch data
$query = "
    SELECT 
        c.customer_name,
        c.address,
        c.primary_phone,
        obi.invoice_number as bill_no,
        obi.debit - COALESCE((
            SELECT SUM(rv.amount)
            FROM receive_voucher rv
            WHERE rv.bill_no = obi.invoice_number
            AND rv.tenant_id = ?
        ), 0) as current_balance
    FROM opening_balance_invoices obi
    JOIN customers c ON obi.customer_id = c.id
    WHERE obi.tenant_id = ?
    AND c.status = 'ACTIVE'
    AND obi.debit > 0
    " . ($company_id ? " AND c.company_id = ?" : "") . "
    " . ($country_id ? " AND c.country_id = ?" : "") . "
    " . ($region_id ? " AND c.region_id = ?" : "") . "
    " . ($city_id ? " AND c.city_id = ?" : "") . "
    " . ($city_zone_id ? " AND c.city_zone_id = ?" : "") . "
    " . ($area_id ? " AND c.area_id = ?" : "") . "
    
    UNION ALL
    
    SELECT 
        c.customer_name,
        c.address,
        c.primary_phone,
        si.bill_no,
        si.net_amount - COALESCE((
            SELECT SUM(rv.amount)
            FROM receive_voucher rv
            WHERE rv.bill_no = si.bill_no
            AND rv.tenant_id = ?
        ), 0) as current_balance
    FROM sale_invoice si
    JOIN customers c ON si.customer_id = c.id
    WHERE si.tenant_id = ?
    AND c.status = 'ACTIVE'
    AND si.status = 'Posted'
    AND si.net_amount > 0
    " . ($company_id ? " AND si.company_id = ?" : "") . "
    " . ($country_id ? " AND c.country_id = ?" : "") . "
    " . ($region_id ? " AND c.region_id = ?" : "") . "
    " . ($city_id ? " AND c.city_id = ?" : "") . "
    " . ($city_zone_id ? " AND c.city_zone_id = ?" : "") . "
    " . ($area_id ? " AND c.area_id = ?" : "") . "
    
    ORDER BY customer_name
";

$params = [$tenant_id, $tenant_id];
if ($company_id) $params[] = $company_id;
if ($country_id) $params[] = $country_id;
if ($region_id) $params[] = $region_id;
if ($city_id) $params[] = $city_id;
if ($city_zone_id) $params[] = $city_zone_id;
if ($area_id) $params[] = $area_id;

$params[] = $tenant_id;
$params[] = $tenant_id;
if ($company_id) $params[] = $company_id;
if ($country_id) $params[] = $country_id;
if ($region_id) $params[] = $region_id;
if ($city_id) $params[] = $city_id;
if ($city_zone_id) $params[] = $city_zone_id;
if ($area_id) $params[] = $area_id;

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total_balance = 0;
foreach ($customers as $customer) {
    $total_balance += $customer['current_balance'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recovery Sheet Report - Print</title>
    <style>
        @media print {
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .header h1 {
            font-size: 18pt;
            margin-bottom: 5px;
        }
        
        .header h2 {
            font-size: 16pt;
            margin-bottom: 5px;
            margin-top: 15px;
        }
        
        .header p {
            font-size: 10pt;
            color: #666;
        }
        
        .filter-info {
            margin-bottom: 15px;
            font-size: 9pt;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #000;
            padding: 8px 5px;
            text-align: left;
        }
        
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 9pt;
        }
        
        td {
            font-size: 9pt;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .signature-cell {
            height: 40px;
            border: 1px dashed #999;
        }
        
        .footer {
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
        }
        
        .summary {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 11pt;
        }
        
        .no-print {
            margin-bottom: 20px;
        }
        
        @media print {
            .no-print {
                display: none;
            }
        }
        
        .btn {
            padding: 10px 20px;
            background-color: #1f7bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
        }
        
        .btn:hover {
            background-color: #1a6cdc;
        }
        
        .btn-secondary {
            background-color: #6c757d;
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="btn" onclick="window.print()">Print</button>
        <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
    
    <div class="header">
        <h1><?php echo htmlspecialchars($company_name); ?></h1>
        <?php if ($company_address): ?><p><?php echo htmlspecialchars($company_address); ?></p><?php endif; ?>
        <?php if ($company_phone || $company_email): ?>
        <p>
            <?php if ($company_phone): ?>Phone: <?php echo htmlspecialchars($company_phone); ?><?php endif; ?>
            <?php if ($company_phone && $company_email): ?> | <?php endif; ?>
            <?php if ($company_email): ?>Email: <?php echo htmlspecialchars($company_email); ?><?php endif; ?>
        </p>
        <?php endif; ?>
        <h2>Recovery Sheet Report</h2>
        <p>Date Range: <?php echo $date_from ? date('d/m/Y', strtotime($date_from)) : 'All'; ?> - <?php echo $date_to ? date('d/m/Y', strtotime($date_to)) : 'All'; ?></p>
        <?php if ($recovery_officer_name): ?><p>Recovery Officer: <?php echo htmlspecialchars($recovery_officer_name); ?></p><?php endif; ?>
        <?php if ($country_name || $region_name || $city_name || $city_zone_name || $area_name): ?>
        <p>Territory: 
            <?php 
            $territory_parts = array_filter([$country_name, $region_name, $city_name, $city_zone_name, $area_name]);
            echo htmlspecialchars(implode(' > ', $territory_parts));
            ?>
        </p>
        <?php endif; ?>
        <p>Generated on: <?php echo date('d/m/Y h:i A'); ?> | Generated by: <?php echo htmlspecialchars($user_name); ?></p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width: 5%;">S#</th>
                <th style="width: 12%;">Bill No</th>
                <th style="width: 18%;">Customer Name</th>
                <th style="width: 20%;">Address</th>
                <th style="width: 10%;">Phone</th>
                <th class="text-right" style="width: 10%;">Balance</th>
                <th style="width: 10%;">Received</th>
                <th style="width: 10%;">Return</th>
                <th style="width: 5%;">Sign</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($customers as $index => $customer): ?>
            <tr>
                <td class="text-center"><?php echo $index + 1; ?></td>
                <td><?php echo htmlspecialchars($customer['bill_no']); ?></td>
                <td><?php echo htmlspecialchars($customer['customer_name']); ?></td>
                <td><?php echo htmlspecialchars($customer['address'] ?? ''); ?></td>
                <td><?php echo htmlspecialchars($customer['primary_phone'] ?? ''); ?></td>
                <td class="text-right"><?php echo $currency_symbol . number_format($customer['current_balance'], 2); ?></td>
                <td></td>
                <td></td>
                <td><div class="signature-cell"></div></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    
    <div class="footer">
        <div class="summary">
            <div>Total Records: <?php echo count($customers); ?></div>
            <div>Total Balance: <?php echo $currency_symbol . number_format($total_balance, 2); ?></div>
        </div>
    </div>
</body>
</html>
