<?php
require_once '../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }

require_once '../../../../includes/connection.php';
$stmt = $pdo->prepare("SELECT c.symbol FROM tenant_currencies tc JOIN ledgerone_public.currencies c ON tc.currency_id = c.id WHERE tc.tenant_id = ? AND tc.is_base_currency = 1");
$stmt->execute([$_SESSION['tenant_id']]);
$currency = $stmt->fetch();
$currency_symbol = $currency['symbol'] ?? 'Rs';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Brokery Tax Collection Report</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; color: #333; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .page-header { background: #fff; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .page-header h1 { font-size: 20px; color: #1a1a2e; }
        .filters { background: #fff; border-radius: 8px; padding: 16px 24px; margin-bottom: 20px; display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-group label { font-size: 12px; font-weight: 600; color: #555; }
        .filter-group input, .filter-group select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; min-width: 160px; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: #1f7bff; color: #fff; }
        .btn-primary:hover { background: #1a6cdc; }
        .btn-secondary { background: #f0f0f0; color: #333; }
        .btn-secondary:hover { background: #e0e0e0; }
        .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .summary-card { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-left: 4px solid #1f7bff; }
        .summary-card .label { font-size: 12px; color: #888; margin-bottom: 6px; }
        .summary-card .value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
        .customer-block { background: #fff; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); overflow: hidden; }
        .customer-header { padding: 12px 20px; background: #f8f9ff; border-bottom: 1px solid #e8eaf0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .customer-header h3 { font-size: 14px; color: #1a1a2e; }
        .customer-header .customer-totals { display: flex; gap: 24px; font-size: 13px; }
        .customer-header .customer-totals span { color: #555; }
        .customer-header .customer-totals strong { color: #1f7bff; }
        .customer-body { padding: 0; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { background: #1a1a2e; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
        tbody td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #f8f9ff; }
        tfoot td { padding: 10px 12px; background: #f0f4ff; font-weight: 700; border-top: 2px solid #1f7bff; }
        .mode-badge { display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; }
        .mode-pct { background:#fff3cd; color:#856404; }
        .mode-rate { background:#d1ecf1; color:#0c5460; }
        .text-right { text-align: right; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #e8f0fe; color: #1f7bff; }
        #loading { text-align: center; padding: 40px; color: #888; }
        #no-data { text-align: center; padding: 40px; color: #888; display: none; }
        .collapsed .customer-body { display: none; }
    </style>
</head>
<body>
<div class="container">
    <div class="page-header">
        <h1><i class="fas fa-file-invoice-dollar"></i> Brokery Tax Collection Report</h1>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" onclick="printReport()"><i class="fas fa-print"></i> Print</button>
        </div>
    </div>

    <div class="filters">
        <div class="filter-group">
            <label>Date From</label>
            <input type="date" id="date_from" value="<?php echo date('Y-m-01'); ?>">
        </div>
        <div class="filter-group">
            <label>Date To</label>
            <input type="date" id="date_to" value="<?php echo date('Y-m-d'); ?>">
        </div>
        <div class="filter-group">
            <label>Customer</label>
            <select id="customer_id">
                <option value="">All Customers</option>
            </select>
        </div>
        <div class="filter-group" style="justify-content:flex-end;">
            <button class="btn btn-primary" onclick="loadReport()"><i class="fas fa-filter"></i> Apply</button>
        </div>
    </div>

    <div class="summary-cards">
        <div class="summary-card">
            <div class="label">Total Customers</div>
            <div class="value" id="sum_customers">0</div>
        </div>
        <div class="summary-card" style="border-color:#28a745;">
            <div class="label">Total Brokery Amount</div>
            <div class="value" id="sum_brokery"><?php echo $currency_symbol; ?>0.00</div>
        </div>
        <div class="summary-card" style="border-color:#dc3545;">
            <div class="label">Total Brokery Tax Collected</div>
            <div class="value" id="sum_tax"><?php echo $currency_symbol; ?>0.00</div>
        </div>
    </div>

    <div id="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    <div id="no-data"><i class="fas fa-inbox fa-2x"></i><br>No brokery tax data found for selected period.</div>
    <div id="report-container"></div>
</div>

<script>
const CURRENCY = '<?php echo $currency_symbol; ?>';

async function loadCustomers() {
    try {
        const res = await fetch('../../../../server/api/sale/pos_invoice/get-customers.php');
        const data = await res.json();
        const sel = document.getElementById('customer_id');
        (data.customers || data || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = (c.customer_code ? c.customer_code + ' - ' : '') + c.customer_name;
            sel.appendChild(opt);
        });
    } catch(e) {}
}

async function loadReport() {
    const date_from   = document.getElementById('date_from').value;
    const date_to     = document.getElementById('date_to').value;
    const customer_id = document.getElementById('customer_id').value;

    document.getElementById('loading').style.display = 'block';
    document.getElementById('no-data').style.display = 'none';
    document.getElementById('report-container').innerHTML = '';

    let url = `../../../../server/api/sale/brokery_tax_report/get-brokery-tax-report.php?date_from=${date_from}&date_to=${date_to}`;
    if (customer_id) url += `&customer_id=${customer_id}`;

    try {
        const res = await fetch(url);
        const result = await res.json();
        document.getElementById('loading').style.display = 'none';

        if (!result.success || !result.data.length) {
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('sum_customers').textContent = '0';
            document.getElementById('sum_brokery').textContent = CURRENCY + '0.00';
            document.getElementById('sum_tax').textContent = CURRENCY + '0.00';
            return;
        }

        const s = result.summary;
        document.getElementById('sum_customers').textContent = s.total_customers;
        document.getElementById('sum_brokery').textContent = CURRENCY + fmt(s.grand_total_brokery);
        document.getElementById('sum_tax').textContent = CURRENCY + fmt(s.grand_total_brokery_tax);

        const container = document.getElementById('report-container');
        result.data.forEach(customer => {
            const block = document.createElement('div');
            block.className = 'customer-block';
            block.innerHTML = `
                <div class="customer-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h3>
                        <span class="badge">${customer.customer_code}</span>
                        &nbsp;${customer.customer_name}
                        &nbsp;<small style="color:#888;">(${customer.total_invoices} invoice${customer.total_invoices > 1 ? 's' : ''})</small>
                    </h3>
                    <div class="customer-totals">
                        <span>Brokery: <strong>${CURRENCY}${fmt(customer.total_brokery_amount)}</strong></span>
                        <span>Tax Collected: <strong style="color:#dc3545;">${CURRENCY}${fmt(customer.total_brokery_tax_amount)}</strong></span>
                    </div>
                </div>
                <div class="customer-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Bill No</th>
                                <th>Sale Date</th>
                                <th>Mode</th>
                                <th>Rate Type</th>
                                <th class="text-right">Brokery Rate</th>
                                <th class="text-right">Net Amount</th>
                                <th class="text-right">Brokery Amount</th>
                                <th class="text-right">Tax %</th>
                                <th class="text-right">Tax Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customer.invoices.map(inv => `
                                <tr>
                                    <td>${inv.bill_no}</td>
                                    <td>${inv.sale_date}</td>
                                    <td><span class="mode-badge ${inv.is_pct_mode ? 'mode-pct' : 'mode-rate'}">${inv.is_pct_mode ? '% Mode' : 'Rate Mode'}</span></td>
                                    <td>${inv.brokery_rate_label || '-'}</td>
                                    <td class="text-right">${fmt(inv.brokery_rate)}${inv.is_pct_mode ? '%' : ''}</td>
                                    <td class="text-right">${CURRENCY}${fmt(inv.net_amount)}</td>
                                    <td class="text-right">${CURRENCY}${fmt(inv.brokery_amount)}</td>
                                    <td class="text-right">${fmt(inv.brokery_tax_percent)}%</td>
                                    <td class="text-right">${CURRENCY}${fmt(inv.brokery_tax_amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="6"><strong>Customer Total</strong></td>
                                <td class="text-right">${CURRENCY}${fmt(customer.total_brokery_amount)}</td>
                                <td></td>
                                <td class="text-right">${CURRENCY}${fmt(customer.total_brokery_tax_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            container.appendChild(block);
        });

    } catch(e) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-data').style.display = 'block';
    }
}

function fmt(val) {
    return parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function printReport() {
    const date_from   = document.getElementById('date_from').value;
    const date_to     = document.getElementById('date_to').value;
    const customer_id = document.getElementById('customer_id').value;
    window.open(`print.php?date_from=${date_from}&date_to=${date_to}&customer_id=${customer_id}`, '_blank');
}

loadCustomers();
loadReport();
</script>
</body>
</html>
