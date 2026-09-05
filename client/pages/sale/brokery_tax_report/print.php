<?php
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }

require_once '../../../../includes/connection.php';
$stmt = $pdo->prepare("SELECT c.symbol FROM tenant_currencies tc JOIN ledgerone_public.currencies c ON tc.currency_id = c.id WHERE tc.tenant_id = ? AND tc.is_base_currency = 1");
$stmt->execute([$_SESSION['tenant_id']]);
$currency = $stmt->fetch();
$currency_symbol = $currency['symbol'] ?? 'Rs';

// Get company info
$comp_stmt = $pdo->prepare("SELECT company_name, address, phone FROM companies WHERE tenant_id = ? LIMIT 1");
$comp_stmt->execute([$_SESSION['tenant_id']]);
$company = $comp_stmt->fetch();

$date_from   = $_GET['date_from']   ?? date('Y-m-01');
$date_to     = $_GET['date_to']     ?? date('Y-m-d');
$customer_id = $_GET['customer_id'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Brokery Tax Collection Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 12px; }
        .print-header h1 { font-size: 20px; }
        .print-header h2 { font-size: 15px; color: #555; margin-top: 4px; }
        .print-header p { font-size: 11px; color: #777; margin-top: 2px; }
        .report-meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; }
        .summary-row { display: flex; gap: 20px; margin-bottom: 16px; }
        .summary-box { border: 1px solid #ddd; padding: 10px 16px; flex: 1; text-align: center; }
        .summary-box .lbl { font-size: 10px; color: #777; }
        .summary-box .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
        .customer-section { margin-bottom: 20px; page-break-inside: avoid; }
        .customer-title { background: #1a1a2e; color: #fff; padding: 7px 12px; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        thead th { background: #444; color: #fff; padding: 6px 10px; text-align: left; }
        tbody td { padding: 6px 10px; border-bottom: 1px solid #eee; }
        tfoot td { padding: 6px 10px; background: #f0f4ff; font-weight: 700; border-top: 2px solid #1a1a2e; }
        .text-right { text-align: right; }
        .grand-total { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; display: flex; justify-content: flex-end; gap: 40px; font-size: 13px; font-weight: 700; }
        .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        .print-btn { padding: 8px 20px; background: #1f7bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 16px; font-size: 13px; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print</button>

    <div class="print-header">
        <h1><?php echo htmlspecialchars($company['company_name'] ?? 'LedgerOne ERP'); ?></h1>
        <h2>Brokery Tax Collection Report</h2>
        <p><?php echo htmlspecialchars($company['address'] ?? ''); ?><?php if(!empty($company['phone'])) echo ' | ' . htmlspecialchars($company['phone']); ?></p>
    </div>

    <div class="report-meta">
        <span><strong>Period:</strong> <?php echo date('d M Y', strtotime($date_from)); ?> &mdash; <?php echo date('d M Y', strtotime($date_to)); ?></span>
        <span><strong>Generated:</strong> <?php echo date('d M Y h:i A'); ?></span>
    </div>

    <div class="summary-row">
        <div class="summary-box"><div class="lbl">Total Customers</div><div class="val" id="s_customers">-</div></div>
        <div class="summary-box"><div class="lbl">Total Brokery Amount</div><div class="val" id="s_brokery">-</div></div>
        <div class="summary-box"><div class="lbl">Total Brokery Tax Collected</div><div class="val" id="s_tax">-</div></div>
    </div>

    <div id="report-body"></div>

    <div class="footer">LedgerOne ERP &bull; Brokery Tax Collection Report &bull; Confidential</div>

<script>
const CURRENCY = '<?php echo $currency_symbol; ?>';
const dateFrom   = '<?php echo $date_from; ?>';
const dateTo     = '<?php echo $date_to; ?>';
const customerId = '<?php echo $customer_id; ?>';

function fmt(val) {
    return parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function load() {
    let url = `../../../../server/api/sale/brokery_tax_report/get-brokery-tax-report.php?date_from=${dateFrom}&date_to=${dateTo}`;
    if (customerId) url += `&customer_id=${customerId}`;

    const res    = await fetch(url);
    const result = await res.json();
    if (!result.success) return;

    const s = result.summary;
    document.getElementById('s_customers').textContent = s.total_customers;
    document.getElementById('s_brokery').textContent   = CURRENCY + fmt(s.grand_total_brokery);
    document.getElementById('s_tax').textContent       = CURRENCY + fmt(s.grand_total_brokery_tax);

    let html = '';
    result.data.forEach(c => {
        html += `
        <div class="customer-section">
            <div class="customer-title">
                <span>${c.customer_code} &mdash; ${c.customer_name} (${c.total_invoices} invoice${c.total_invoices > 1 ? 's' : ''})</span>
                <span>Tax: ${CURRENCY}${fmt(c.total_brokery_tax_amount)}</span>
            </div>
            <table>
                <thead><tr>
                    <th>Bill No</th><th>Sale Date</th>
                    <th>Mode</th>
                    <th>Rate Type</th>
                    <th class="text-right">Brokery Rate</th>
                    <th class="text-right">Net Amount</th>
                    <th class="text-right">Brokery Amount</th>
                    <th class="text-right">Tax %</th>
                    <th class="text-right">Tax Amount</th>
                </tr></thead>
                <tbody>
                    ${c.invoices.map(inv => `<tr>
                        <td>${inv.bill_no}</td>
                        <td>${inv.sale_date}</td>
                        <td>${inv.is_pct_mode ? '% Mode' : 'Rate Mode'}</td>
                        <td>${inv.brokery_rate_label || '-'}</td>
                        <td class="text-right">${fmt(inv.brokery_rate)}${inv.is_pct_mode ? '%' : ''}</td>
                        <td class="text-right">${CURRENCY}${fmt(inv.net_amount)}</td>
                        <td class="text-right">${CURRENCY}${fmt(inv.brokery_amount)}</td>
                        <td class="text-right">${fmt(inv.brokery_tax_percent)}%</td>
                        <td class="text-right">${CURRENCY}${fmt(inv.brokery_tax_amount)}</td>
                    </tr>`).join('')}
                </tbody>
                <tfoot><tr>
                    <td colspan="6"><strong>Total</strong></td>
                    <td class="text-right">${CURRENCY}${fmt(c.total_brokery_amount)}</td>
                    <td></td>
                    <td class="text-right">${CURRENCY}${fmt(c.total_brokery_tax_amount)}</td>
                </tr></tfoot>
            </table>
        </div>`;
    });

    html += `<div class="grand-total">
        <span>Grand Total Brokery: ${CURRENCY}${fmt(s.grand_total_brokery)}</span>
        <span>Grand Total Tax: ${CURRENCY}${fmt(s.grand_total_brokery_tax)}</span>
    </div>`;

    document.getElementById('report-body').innerHTML = html;
}

load();
</script>
</body>
</html>
