<?php
require_once '../../../../includes/connection.php';

if (session_status() == PHP_SESSION_NONE) session_start();
$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$user_id || !$tenant_id) {
    header('Location: ../../auth/login.html');
    exit;
}

$id = (int)($_GET['id'] ?? 0);
if (!$id) { echo 'Invalid quotation ID'; exit; }

// Load quotation header
$stQ = $pdo->prepare("
    SELECT q.*,
           c.customer_name, c.customer_code, c.primary_phone, c.address AS customer_address, c.email AS customer_email,
           CONCAT(e.full_name) AS salesman_name,
           pt.term_name AS payment_term
    FROM quotations q
    LEFT JOIN customers  c  ON c.id = q.customer_id  AND c.tenant_id  = q.tenant_id
    LEFT JOIN employees  e  ON e.id = q.salesman_id  AND e.tenant_id  = q.tenant_id
    LEFT JOIN payment_terms pt ON pt.id = q.payment_term_id
    WHERE q.id = ? AND q.tenant_id = ? AND q.is_deleted = 0
");
$stQ->execute([$id, $tenant_id]);
$q = $stQ->fetch(PDO::FETCH_ASSOC);
if (!$q) { echo 'Quotation not found'; exit; }

// Load items
$stI = $pdo->prepare("
    SELECT qi.*, p.code AS product_code, p.name AS product_name
    FROM quotation_items qi
    LEFT JOIN products p ON p.id = qi.product_id AND p.tenant_id = qi.tenant_id
    WHERE qi.quotation_id = ? AND qi.tenant_id = ?
    ORDER BY qi.sort_order
");
$stI->execute([$id, $tenant_id]);
$items = $stI->fetchAll(PDO::FETCH_ASSOC);

// Load company info
$stC = $pdo->prepare("SELECT * FROM tenants WHERE id = ? LIMIT 1");
$stC->execute([$tenant_id]);
$company = $stC->fetch(PDO::FETCH_ASSOC) ?: [];

function fmtDate($d) {
    if (!$d) return '—';
    $parts = explode('-', $d);
    return count($parts)===3 ? $parts[2].'/'.$parts[1].'/'.$parts[0] : $d;
}
function fmtNum($n) {
    return number_format((float)$n, 2, '.', ',');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Quotation <?= htmlspecialchars($q['quotation_number']) ?></title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11.5px; color: #1a1a2e; background:#fff; }

/* ── PAGE LAYOUT ── */
.page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 14mm 18mm; display: flex; flex-direction: column; }

/* ── COMPANY HEADER ── */
.co-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2.5px solid #1f7bff; }
.co-name { font-size: 20px; font-weight: 800; color: #0e1a2b; letter-spacing: .3px; }
.co-sub  { font-size: 10px; color: #6b7280; margin-top: 2px; }
.co-contact { text-align: right; font-size: 10.5px; color: #4b5563; line-height: 1.65; }

/* ── DOC TITLE BAND ── */
.doc-band { background: #1f7bff; color: #fff; text-align: center; padding: 7px 0; border-radius: 5px; margin-bottom: 12px; }
.doc-band h2 { font-size: 15px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
.doc-band span { font-size: 11px; opacity: .85; }

/* ── META GRID ── */
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #d1d9e6; border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
.meta-box { padding: 7px 12px; }
.meta-box:nth-child(odd) { background: #f8fafc; border-right: 1px solid #d1d9e6; }
.meta-box:nth-child(even) { background: #fff; }
.meta-box + .meta-box { border-top: 1px solid #ecf0f6; }
.meta-box:nth-child(2) { border-top: none; }
.meta-lbl { font-size: 9.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; }
.meta-val { font-size: 11.5px; color: #0e1a2b; font-weight: 600; margin-top: 1px; }

/* ── SECTION LABEL ── */
.sec-lbl { font-size: 9.5px; font-weight: 800; color: #1f7bff; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1.5px solid #dbeafe; }

/* ── ITEMS TABLE ── */
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
.items-table thead tr { background: #1f7bff; }
.items-table thead th { padding: 7px 7px; text-align: left; font-size: 9.5px; font-weight: 700; color: #fff; letter-spacing: .3px; white-space: nowrap; }
.items-table thead th.r { text-align: right; }
.items-table thead th.c { text-align: center; }
.items-table tbody tr { border-bottom: 1px solid #e8edf4; }
.items-table tbody tr:nth-child(even) { background: #f8fafc; }
.items-table tbody tr:last-child { border-bottom: 2px solid #1f7bff; }
.items-table tbody td { padding: 6px 7px; vertical-align: top; color: #2f3b4c; }
.items-table tbody td.r { text-align: right; }
.items-table tbody td.c { text-align: center; }
.item-code { font-family: "Courier New", monospace; font-size: 9.5px; color: #6b7280; }
.item-name { font-weight: 600; color: #0e1a2b; }
.item-desc { font-size: 9.5px; color: #6b7280; margin-top: 1px; }

/* ── TOTALS ── */
.totals-section { display: flex; justify-content: flex-end; margin-bottom: 14px; }
.totals-table { min-width: 260px; border-collapse: collapse; }
.totals-table tr td { padding: 4px 10px; font-size: 11px; }
.totals-table tr td:first-child { color: #5a6472; font-weight: 600; }
.totals-table tr td:last-child  { text-align: right; font-weight: 700; color: #0e1a2b; font-family: "Courier New", monospace; }
.totals-table tr.grand-row td  { background: #1f7bff; color: #fff !important; font-size: 12.5px; font-weight: 800; border-radius: 0; padding: 6px 10px; }
.totals-table tr.divider td { border-top: 1.5px solid #d1d9e6; padding-top: 5px; }

/* ── TERMS & CONDITIONS ── */
.terms-box { border: 1px solid #d1d9e6; border-radius: 5px; padding: 8px 12px; margin-bottom: 12px; background: #f8fafc; }
.terms-text { font-size: 10px; color: #4b5563; line-height: 1.7; white-space: pre-wrap; }

/* ── FOOTER NOTE ── */
.footer-note { border-left: 3px solid #1f7bff; padding: 7px 12px; background: #f0f6ff; border-radius: 0 5px 5px 0; margin-bottom: 14px; font-size: 10.5px; color: #2f3b4c; font-style: italic; line-height: 1.6; }

/* ── SIGNATURE ROW ── */
.sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: auto; padding-top: 16px; border-top: 1px solid #d1d9e6; }
.sig-box { text-align: center; }
.sig-line { border-top: 1.5px solid #9aa1ae; margin-bottom: 5px; padding-top: 40px; }
.sig-lbl { font-size: 9.5px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }

/* ── STATUS BADGE ── */
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
.s-draft     { background: #fef9c3; color: #a16207; }
.s-approved  { background: #ecfdf5; color: #065f46; }
.s-converted { background: #eff6ff; color: #1d4ed8; }
.s-rejected  { background: #fef2f2; color: #991b1b; }

/* ── PRINT ── */
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .page { margin: 0; padding: 10mm 12mm 14mm; }
}
</style>
</head>
<body>

<!-- Print Button (hidden on print) -->
<div class="no-print" style="text-align:right;padding:10px 20px;background:#f0f3f8;border-bottom:1px solid #d1d9e6">
  <button onclick="window.print()" style="background:#1f7bff;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px">
    <i style="margin-right:5px">🖨</i> Print
  </button>
  <button onclick="window.close()" style="background:#eff2f7;border:1px solid #c9cfda;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">
    Close
  </button>
</div>

<div class="page">

  <!-- ── Company Header ── -->
  <div class="co-header">
    <div>
      <div class="co-name"><?= htmlspecialchars($company['company_name'] ?? 'LedgerOne ERP') ?></div>
      <div class="co-sub"><?= htmlspecialchars($company['address'] ?? '') ?></div>
    </div>
    <div class="co-contact">
      <?php if(!empty($company['phone'])): ?>Phone: <?= htmlspecialchars($company['phone']) ?><br><?php endif; ?>
      <?php if(!empty($company['email'])): ?>Email: <?= htmlspecialchars($company['email']) ?><br><?php endif; ?>
      <?php if(!empty($company['website'])): ?><?= htmlspecialchars($company['website']) ?><?php endif; ?>
    </div>
  </div>

  <!-- ── Document Title ── -->
  <div class="doc-band">
    <h2>Quotation / Price Offer</h2>
    <span><?= htmlspecialchars($q['quotation_number']) ?></span>
  </div>

  <!-- ── Meta Grid ── -->
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-lbl">Quotation No.</div>
      <div class="meta-val"><?= htmlspecialchars($q['quotation_number']) ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Date</div>
      <div class="meta-val"><?= fmtDate($q['quotation_date']) ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Valid Till</div>
      <div class="meta-val"><?= $q['valid_till'] ? fmtDate($q['valid_till']) : '—' ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Status</div>
      <div class="meta-val">
        <?php
        $smap = ['draft'=>'s-draft','approved'=>'s-approved','converted'=>'s-converted','rejected'=>'s-rejected'];
        $scls = $smap[$q['status']] ?? 's-draft';
        ?>
        <span class="status-badge <?= $scls ?>"><?= ucfirst($q['status']) ?></span>
      </div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Customer</div>
      <div class="meta-val"><?= htmlspecialchars($q['customer_name'] ?? '—') ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Contact Person</div>
      <div class="meta-val"><?= htmlspecialchars($q['contact_person'] ?? '—') ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Payment Terms</div>
      <div class="meta-val"><?= htmlspecialchars($q['payment_term'] ?? '—') ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Salesman</div>
      <div class="meta-val"><?= htmlspecialchars($q['salesman_name'] ?? '—') ?></div>
    </div>
    <?php if (!empty($q['party_type'])): ?>
    <div class="meta-box">
      <div class="meta-lbl">Party Type</div>
      <div class="meta-val"><?= htmlspecialchars($q['party_type']) ?></div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">&nbsp;</div>
      <div class="meta-val">&nbsp;</div>
    </div>
    <?php endif; ?>
  </div>

  <!-- ── Items Table ── -->
  <div class="sec-lbl">Quotation Items</div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:28px" class="c">#</th>
        <th style="width:90px">Code</th>
        <th>Item / Description</th>
        <th style="width:55px" class="c">Pack</th>
        <th style="width:50px" class="r">Qty</th>
        <th style="width:72px" class="r">Rate</th>
        <th style="width:78px" class="r">Excl. Tax</th>
        <th style="width:44px" class="r">ST%</th>
        <th style="width:72px" class="r">ST Amt</th>
        <th style="width:44px" class="r">FT%</th>
        <th style="width:72px" class="r">FT Amt</th>
        <th style="width:82px" class="r">Amount</th>
      </tr>
    </thead>
    <tbody>
    <?php if (empty($items)): ?>
      <tr><td colspan="12" style="text-align:center;padding:16px;color:#9aa1ae">No items</td></tr>
    <?php else: ?>
      <?php foreach ($items as $i => $it): ?>
      <tr>
        <td class="c" style="color:#9aa1ae"><?= $i+1 ?></td>
        <td class="item-code"><?= htmlspecialchars($it['item_code'] ?: ($it['product_code'] ?? '—')) ?></td>
        <td>
          <div class="item-name"><?= htmlspecialchars($it['item_name'] ?: ($it['product_name'] ?? '—')) ?></div>
          <?php if (!empty($it['description'])): ?>
          <div class="item-desc"><?= htmlspecialchars($it['description']) ?></div>
          <?php endif; ?>
        </td>
        <td class="c"><?= htmlspecialchars($it['pack_type'] ?? 'Qty') ?></td>
        <td class="r"><?= fmtNum($it['quantity']) ?></td>
        <td class="r"><?= fmtNum($it['rate']) ?></td>
        <td class="r"><?= fmtNum($it['excl_tax']) ?></td>
        <td class="r"><?= $it['sales_tax_pct'] > 0 ? fmtNum($it['sales_tax_pct']).'%' : '—' ?></td>
        <td class="r"><?= $it['sales_tax_amt'] > 0 ? fmtNum($it['sales_tax_amt']) : '—' ?></td>
        <td class="r"><?= $it['further_tax_pct'] > 0 ? fmtNum($it['further_tax_pct']).'%' : '—' ?></td>
        <td class="r"><?= $it['further_tax_amt'] > 0 ? fmtNum($it['further_tax_amt']) : '—' ?></td>
        <td class="r" style="font-weight:700"><?= fmtNum($it['line_total']) ?></td>
      </tr>
      <?php endforeach; ?>
    <?php endif; ?>
    </tbody>
  </table>

  <!-- ── Totals ── -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td><?= fmtNum($q['subtotal']) ?></td>
      </tr>
      <?php if ($q['total_sales_tax'] > 0): ?>
      <tr>
        <td>Sales Tax</td>
        <td><?= fmtNum($q['total_sales_tax']) ?></td>
      </tr>
      <?php endif; ?>
      <?php if ($q['total_further_tax'] > 0): ?>
      <tr>
        <td>Further Tax</td>
        <td><?= fmtNum($q['total_further_tax']) ?></td>
      </tr>
      <?php endif; ?>
      <tr class="divider grand-row">
        <td>Grand Total</td>
        <td><?= fmtNum($q['grand_total']) ?></td>
      </tr>
    </table>
  </div>

  <!-- ── Terms & Conditions ── -->
  <?php if (!empty($q['terms_conditions'])): ?>
  <div class="sec-lbl">Terms &amp; Conditions</div>
  <div class="terms-box">
    <div class="terms-text"><?= htmlspecialchars($q['terms_conditions']) ?></div>
  </div>
  <?php endif; ?>

  <!-- ── Remarks ── -->
  <?php if (!empty($q['remarks'])): ?>
  <div style="margin-bottom:10px">
    <div class="sec-lbl">Remarks</div>
    <div style="font-size:10.5px;color:#4b5563;line-height:1.6"><?= htmlspecialchars($q['remarks']) ?></div>
  </div>
  <?php endif; ?>

  <!-- ── Footer Note ── -->
  <?php if (!empty($q['footer_note'])): ?>
  <div class="footer-note"><?= htmlspecialchars($q['footer_note']) ?></div>
  <?php endif; ?>

  <!-- ── Signature Row ── -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-lbl">Prepared By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-lbl">Authorized By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-lbl">Customer Signature</div>
    </div>
  </div>

</div><!-- /page -->
</body>
</html>
