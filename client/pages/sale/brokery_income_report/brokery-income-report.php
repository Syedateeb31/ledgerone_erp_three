<?php
require_once '../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }

require_once '../../../../includes/connection.php';
$stmt = $pdo->prepare("SELECT c.symbol FROM tenant_currencies tc JOIN ledgerone_public.currencies c ON tc.currency_id = c.id WHERE tc.tenant_id = ? AND tc.is_base_currency = 1");
$stmt->execute([$_SESSION['tenant_id']]);
$cur = $stmt->fetch();
$currency_symbol = $cur['symbol'] ?? 'Rs';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Brokery Income Report (Product Wise)</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; background:#f5f7fa; color:#333; }
        .container { max-width:1500px; margin:0 auto; padding:20px; }
        .page-header { background:#fff; border-radius:8px; padding:18px 24px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .page-header h1 { font-size:19px; color:#1a1a2e; }
        .filters { background:#fff; border-radius:8px; padding:14px 24px; margin-bottom:18px; display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .fg { display:flex; flex-direction:column; gap:4px; }
        .fg label { font-size:12px; font-weight:600; color:#555; }
        .fg input, .fg select { padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:13px; min-width:160px; }
        .btn { padding:8px 16px; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:6px; }
        .btn-primary { background:#1f7bff; color:#fff; }
        .btn-primary:hover { background:#1a6cdc; }
        .btn-secondary { background:#f0f0f0; color:#333; }
        .btn-secondary:hover { background:#e0e0e0; }
        .summary-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:18px; }
        .sc { background:#fff; border-radius:8px; padding:14px 18px; box-shadow:0 1px 4px rgba(0,0,0,.08); border-left:4px solid #1f7bff; }
        .sc .lbl { font-size:12px; color:#888; margin-bottom:5px; }
        .sc .val { font-size:21px; font-weight:700; color:#1a1a2e; }
        .product-block { background:#fff; border-radius:8px; margin-bottom:14px; box-shadow:0 1px 4px rgba(0,0,0,.08); overflow:hidden; }
        .product-header { padding:11px 18px; background:#f0f4ff; border-bottom:1px solid #e0e8ff; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; }
        .product-header:hover { background:#e8eeff; }
        .ph-left { display:flex; align-items:center; gap:10px; }
        .ph-left .pcode { background:#1a1a2e; color:#fff; padding:2px 9px; border-radius:10px; font-size:11px; font-weight:700; }
        .ph-left .pname { font-size:14px; font-weight:700; color:#1a1a2e; }
        .ph-left .pinv { font-size:12px; color:#888; }
        .ph-right { display:flex; gap:22px; font-size:13px; }
        .ph-right span { color:#555; }
        .ph-right strong { color:#1f7bff; }
        .ph-right .income-val { color:#28a745; font-weight:700; font-size:14px; }
        .product-body { padding:0; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        thead th { background:#1a1a2e; color:#fff; padding:9px 12px; text-align:left; font-weight:600; white-space:nowrap; }
        tbody td { padding:8px 12px; border-bottom:1px solid #f0f0f0; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover { background:#f8f9ff; }
        tfoot td { padding:9px 12px; background:#f0f4ff; font-weight:700; border-top:2px solid #1f7bff; }
        .tr { text-align:right; }
        .badge-pct { display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:#fff3cd; color:#856404; }
        .badge-rate { display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:#d1ecf1; color:#0c5460; }
        .badge-sale { display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:#d4edda; color:#155724; }
        .badge-purchase { display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:#ffe5d0; color:#8a4b00; }
        .rank-badge { display:inline-block; width:22px; height:22px; border-radius:50%; background:#1f7bff; color:#fff; font-size:11px; font-weight:700; text-align:center; line-height:22px; margin-right:6px; }
        #loading { text-align:center; padding:40px; color:#888; }
        #no-data { text-align:center; padding:40px; color:#888; display:none; }
        .collapsed .product-body { display:none; }
        .chevron { transition:transform .2s; }
        .collapsed .chevron { transform:rotate(-90deg); }
    </style>
</head>
<body>
<div class="container">
    <div class="page-header">
        <h1><i class="fas fa-boxes"></i> Brokery Income Report — Product Wise</h1>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" onclick="printReport()"><i class="fas fa-print"></i> Print</button>
        </div>
    </div>

    <div class="filters">
        <div class="fg">
            <label>Type</label>
            <select id="txn_type" onchange="onTypeChange()">
                <option value="both" selected>Both (Sale + Purchase)</option>
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
            </select>
        </div>
        <div class="fg">
            <label>Date From</label>
            <input type="date" id="date_from" value="<?php echo date('Y-m-01'); ?>">
        </div>
        <div class="fg">
            <label>Date To</label>
            <input type="date" id="date_to" value="<?php echo date('Y-m-d'); ?>">
        </div>
        <div class="fg">
            <label>Product</label>
            <select id="product_id">
                <option value="">All Products</option>
            </select>
        </div>
        <div class="fg" id="party_fg">
            <label id="party_label">Party</label>
            <select id="party_id">
                <option value="">All Parties</option>
            </select>
        </div>
        <div class="fg" style="justify-content:flex-end;">
            <button class="btn btn-primary" onclick="loadReport()"><i class="fas fa-filter"></i> Apply</button>
        </div>
    </div>

    <div class="summary-cards">
        <div class="sc">
            <div class="lbl">Total Products</div>
            <div class="val" id="s_products">0</div>
        </div>
        <div class="sc" style="border-color:#28a745;">
            <div class="lbl">Total Net Sale Amount</div>
            <div class="val" id="s_net"><?php echo $currency_symbol; ?>0.00</div>
        </div>
        <div class="sc" style="border-color:#fd7e14;">
            <div class="lbl">Total Brokery Income</div>
            <div class="val" id="s_brokery"><?php echo $currency_symbol; ?>0.00</div>
        </div>
    </div>

    <div id="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    <div id="no-data"><i class="fas fa-inbox fa-2x"></i><br>No brokery income data found for selected period.</div>
    <div id="report-container"></div>
</div>

<script>
const CURRENCY = '<?php echo $currency_symbol; ?>';

function fmt(v) {
    return parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// Remarks is free-text typed by users on the invoice, so escape it before
// interpolating into innerHTML (unlike bill_no/dates/amounts, it isn't
// constrained to a safe character set).
function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function loadDropdowns() {
    try {
        const pRes = await fetch('../../../../server/api/sale/pos_invoice/get-products.php');
        const pData = await pRes.json();
        const pSel = document.getElementById('product_id');
        (pData.products || []).forEach(p => {
            const o = document.createElement('option');
            o.value = p.id;
            o.textContent = p.code + ' - ' + p.name;
            pSel.appendChild(o);
        });
    } catch(e) {}
    await loadPartyDropdown();
}

// The "Party" filter means Customer when viewing Sale, Supplier when viewing
// Purchase. When viewing Both, party filtering doesn't map to a single id
// space, so it's disabled.
async function loadPartyDropdown() {
    const type = document.getElementById('txn_type').value;
    const partySel = document.getElementById('party_id');
    const partyLabel = document.getElementById('party_label');
    partySel.innerHTML = '<option value="">All Parties</option>';

    if (type === 'both') {
        partySel.disabled = true;
        partyLabel.textContent = 'Party';
        return;
    }
    partySel.disabled = false;

    try {
        if (type === 'sale') {
            partyLabel.textContent = 'Customer';
            const res = await fetch('../../../../server/api/sale/pos_invoice/get-customers.php');
            const data = await res.json();
            (data.customers || data || []).forEach(c => {
                const o = document.createElement('option');
                o.value = c.id;
                o.textContent = (c.customer_code ? c.customer_code + ' - ' : '') + c.customer_name;
                partySel.appendChild(o);
            });
        } else {
            partyLabel.textContent = 'Supplier';
            const res = await fetch('../../../../server/api/purchase/purchase_invoice/get-suppliers.php');
            const data = await res.json();
            (data.suppliers || []).forEach(s => {
                const o = document.createElement('option');
                o.value = s.id;
                o.textContent = (s.supplier_code ? s.supplier_code + ' - ' : '') + s.supplier_name;
                partySel.appendChild(o);
            });
        }
    } catch(e) {}
}

function onTypeChange() {
    loadPartyDropdown();
}

async function loadReport() {
    const type       = document.getElementById('txn_type').value;
    const date_from  = document.getElementById('date_from').value;
    const date_to    = document.getElementById('date_to').value;
    const product_id = document.getElementById('product_id').value;
    const party_id   = document.getElementById('party_id').disabled ? '' : document.getElementById('party_id').value;

    document.getElementById('loading').style.display = 'block';
    document.getElementById('no-data').style.display = 'none';
    document.getElementById('report-container').innerHTML = '';

    let url = `../../../../server/api/financial_reports/brokery_income_report/get-brokery-income-report.php?type=${type}&date_from=${date_from}&date_to=${date_to}`;
    if (product_id) url += `&product_id=${product_id}`;
    if (party_id)   url += `&party_id=${party_id}`;

    try {
        const res    = await fetch(url);
        const result = await res.json();
        document.getElementById('loading').style.display = 'none';

        if (!result.success || !result.data.length) {
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('s_products').textContent = '0';
            document.getElementById('s_net').textContent      = CURRENCY + '0.00';
            document.getElementById('s_brokery').textContent  = CURRENCY + '0.00';
            return;
        }

        const s = result.summary;
        document.getElementById('s_products').textContent = s.total_products;
        document.getElementById('s_net').textContent      = CURRENCY + fmt(s.grand_total_net_amount);
        document.getElementById('s_brokery').textContent  = CURRENCY + fmt(s.grand_total_brokery);

        const container = document.getElementById('report-container');

        result.data.forEach((prod, idx) => {
            const block = document.createElement('div');
            block.className = 'product-block';
            block.innerHTML = `
                <div class="product-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <div class="ph-left">
                        <span class="rank-badge">${idx + 1}</span>
                        <span class="pcode">${prod.product_code}</span>
                        <span class="pname">${prod.product_name}</span>
                        <span class="pinv">(${prod.total_invoices} invoice${prod.total_invoices > 1 ? 's' : ''})</span>
                        <i class="fas fa-chevron-down chevron" style="color:#888;font-size:12px;"></i>
                    </div>
                    <div class="ph-right">
                        <span>Brokery Income: <span class="income-val">${CURRENCY}${fmt(prod.brokery_income)}</span></span>
                    </div>
                </div>
                <div class="product-body">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type</th>
                                <th>Bill No</th>
                                <th>Date</th>
                                <th>Party</th>
                                <th>Mode</th>
                                <th>Rate Type</th>
                                <th class="tr">Brokery Rate</th>
                                <th class="tr">Brokery Amount</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prod.invoices.map((inv, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><span class="${inv.transaction_type === 'Sale' ? 'badge-sale' : 'badge-purchase'}">${inv.transaction_type}</span></td>
                                    <td><strong>${inv.bill_no}</strong></td>
                                    <td>${inv.txn_date}</td>
                                    <td>${inv.party_name}</td>
                                    <td><span class="${inv.is_pct_mode ? 'badge-pct' : 'badge-rate'}">${inv.is_pct_mode ? '% Mode' : 'Rate Mode'}</span></td>
                                    <td>${inv.rate_type_label}</td>
                                    <td class="tr">${fmt(inv.brokery_rate)}${inv.is_pct_mode ? '%' : ''}</td>
                                    <td class="tr" style="color:#28a745;font-weight:700;">${CURRENCY}${fmt(inv.brokery_amount)}</td>
                                    <td style="color:#777;font-size:12px;">${esc(inv.remarks) || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="5"><strong>Product Total</strong></td>
                                <td colspan="3"></td>
                                <td class="tr" style="color:#28a745;">${CURRENCY}${fmt(prod.brokery_income)}</td>
                                <td></td>
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
        console.error(e);
    }
}

function printReport() {
    const type       = document.getElementById('txn_type').value;
    const date_from  = document.getElementById('date_from').value;
    const date_to    = document.getElementById('date_to').value;
    const product_id = document.getElementById('product_id').value;
    const party_id   = document.getElementById('party_id').disabled ? '' : document.getElementById('party_id').value;
    window.open(`print.php?type=${type}&date_from=${date_from}&date_to=${date_to}&product_id=${product_id}&party_id=${party_id}`, '_blank');
}

loadDropdowns();
loadReport();
</script>
</body>
</html>
