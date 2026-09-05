<?php
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }

require_once '../../../../includes/connection.php';
$stmt = $pdo->prepare("SELECT c.symbol FROM tenant_currencies tc JOIN ledgerone_public.currencies c ON tc.currency_id = c.id WHERE tc.tenant_id = ? AND tc.is_base_currency = 1");
$stmt->execute([$_SESSION['tenant_id']]);
$cur = $stmt->fetch();
$currency_symbol = $cur['symbol'] ?? 'Rs';

$comp_stmt = $pdo->prepare("SELECT company_name, address, phone FROM companies WHERE tenant_id = ? LIMIT 1");
$comp_stmt->execute([$_SESSION['tenant_id']]);
$company = $comp_stmt->fetch();

$date_from  = $_GET['date_from']  ?? date('Y-m-01');
$date_to    = $_GET['date_to']    ?? date('Y-m-d');
$product_id = $_GET['product_id'] ?? null;
$party_id   = $_GET['party_id']   ?? null;
$type       = $_GET['type']       ?? 'both';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Brokery Income Report - Product Wise</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; padding:20px; color:#333; font-size:12px; }
        .print-header { text-align:center; margin-bottom:18px; border-bottom:2px solid #333; padding-bottom:10px; }
        .print-header h1 { font-size:19px; }
        .print-header h2 { font-size:14px; color:#555; margin-top:3px; }
        .print-header p  { font-size:11px; color:#777; margin-top:2px; }
        .meta { display:flex; justify-content:space-between; margin-bottom:14px; font-size:11px; }
        .summary-row { display:flex; gap:16px; margin-bottom:16px; }
        .sbox { border:1px solid #ddd; padding:8px 14px; flex:1; text-align:center; }
        .sbox .lbl { font-size:10px; color:#777; }
        .sbox .val { font-size:15px; font-weight:700; margin-top:2px; }
        .product-section { margin-bottom:18px; page-break-inside:avoid; }
        .product-title { background:#1a1a2e; color:#fff; padding:6px 12px; font-size:12px; font-weight:700; display:flex; justify-content:space-between; }
        .product-subtitle { background:#f0f4ff; padding:4px 12px; font-size:11px; display:flex; gap:20px; border-bottom:1px solid #ddd; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        thead th { background:#444; color:#fff; padding:5px 8px; text-align:left; }
        tbody td { padding:5px 8px; border-bottom:1px solid #eee; }
        tfoot td { padding:5px 8px; background:#f0f4ff; font-weight:700; border-top:2px solid #1a1a2e; }
        .tr { text-align:right; }
        .grand-total { margin-top:18px; border-top:2px solid #333; padding-top:10px; display:flex; justify-content:flex-end; gap:40px; font-size:13px; font-weight:700; }
        .footer { text-align:center; font-size:10px; color:#888; margin-top:24px; border-top:1px solid #ddd; padding-top:8px; }
        .print-btn { padding:7px 18px; background:#1f7bff; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-bottom:14px; font-size:13px; }
        @media print { .print-btn { display:none; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print</button>

    <div class="print-header">
        <h1><?php echo htmlspecialchars($company['company_name'] ?? 'LedgerOne ERP'); ?></h1>
        <h2>Brokery Income Report — Product Wise</h2>
        <p><?php echo htmlspecialchars($company['address'] ?? ''); ?><?php if (!empty($company['phone'])) echo ' | ' . htmlspecialchars($company['phone']); ?></p>
    </div>

    <div class="meta">
        <span><strong>Period:</strong> <?php echo date('d M Y', strtotime($date_from)); ?> &mdash; <?php echo date('d M Y', strtotime($date_to)); ?></span>
        <span><strong>Generated:</strong> <?php echo date('d M Y h:i A'); ?></span>
    </div>

    <div class="summary-row">
        <div class="sbox"><div class="lbl">Total Products</div><div class="val" id="s_products">-</div></div>
        <div class="sbox"><div class="lbl">Total Net Sale Amount</div><div class="val" id="s_net">-</div></div>
        <div class="sbox"><div class="lbl">Total Brokery Income</div><div class="val" id="s_brokery">-</div></div>
    </div>

    <div id="report-body"></div>

    <div class="footer">LedgerOne ERP &bull; Brokery Income Report (Product Wise) &bull; Confidential</div>

<script>
const CURRENCY  = '<?php echo $currency_symbol; ?>';
const dateFrom  = '<?php echo $date_from; ?>';
const dateTo    = '<?php echo $date_to; ?>';
const productId = '<?php echo $product_id; ?>';
const partyId   = '<?php echo $party_id; ?>';
const txnType   = '<?php echo htmlspecialchars($type); ?>';

function fmt(v) {
    return parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function load() {
    let url = `../../../../server/api/financial_reports/brokery_income_report/get-brokery-income-report.php?type=${txnType}&date_from=${dateFrom}&date_to=${dateTo}`;
    if (productId) url += `&product_id=${productId}`;
    if (partyId)   url += `&party_id=${partyId}`;

    const res    = await fetch(url);
    const result = await res.json();
    if (!result.success) return;

    const s = result.summary;
    document.getElementById('s_products').textContent = s.total_products;
    document.getElementById('s_net').textContent      = CURRENCY + fmt(s.grand_total_net_amount);
    document.getElementById('s_brokery').textContent  = CURRENCY + fmt(s.grand_total_brokery);

    let html = '';
    result.data.forEach((prod, idx) => {
        html += `
        <div class="product-section">
            <div class="product-title">
                <span>${idx + 1}. [${prod.product_code}] ${prod.product_name} &nbsp;&mdash;&nbsp; ${prod.total_invoices} invoice${prod.total_invoices > 1 ? 's' : ''}</span>
                <span>Brokery Income: ${CURRENCY}${fmt(prod.brokery_income)}</span>
            </div>
            <div class="product-subtitle">
                <span>Brokery Income: <strong>${CURRENCY}${fmt(prod.brokery_income)}</strong></span>
            </div>
            <table>
                <thead><tr>
                    <th>#</th><th>Type</th><th>Bill No</th><th>Date</th><th>Party</th>
                    <th>Mode</th><th>Rate Type</th>
                    <th class="tr">Brokery Rate</th>
                    <th class="tr">Brokery Amount</th>
                    <th>Remarks</th>
                </tr></thead>
                <tbody>
                    ${prod.invoices.map((inv, i) => `<tr>
                        <td>${i + 1}</td>
                        <td>${inv.transaction_type}</td>
                        <td>${inv.bill_no}</td>
                        <td>${inv.txn_date}</td>
                        <td>${inv.party_name}</td>
                        <td>${inv.is_pct_mode ? '% Mode' : 'Rate Mode'}</td>
                        <td>${inv.rate_type_label}</td>
                        <td class="tr">${fmt(inv.brokery_rate)}${inv.is_pct_mode ? '%' : ''}</td>
                        <td class="tr"><strong>${CURRENCY}${fmt(inv.brokery_amount)}</strong></td>
                        <td>${esc(inv.remarks) || '-'}</td>
                    </tr>`).join('')}
                </tbody>
                <tfoot><tr>
                    <td colspan="5"><strong>Product Total</strong></td>
                    <td colspan="3"></td>
                    <td class="tr">${CURRENCY}${fmt(prod.brokery_income)}</td>
                    <td></td>
                </tr></tfoot>
            </table>
        </div>`;
    });

    html += `<div class="grand-total">
        <span>Grand Total Net Sale: ${CURRENCY}${fmt(s.grand_total_net_amount)}</span>
        <span>Grand Total Brokery Income: ${CURRENCY}${fmt(s.grand_total_brokery)}</span>
    </div>`;

    document.getElementById('report-body').innerHTML = html;
}

load();
</script>
</body>
</html>
