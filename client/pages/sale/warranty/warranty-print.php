<?php
require_once '../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$user_id || !$tenant_id) { header('Location: ../../auth/login.html'); exit(); }

$id = (int)($_GET['id'] ?? 0);
if (!$id) { echo 'Invalid ID'; exit; }

// Visibility from localStorage passed as URL params
$showChassis = ($_GET['sc'] ?? '1') !== '0';
$showMotor   = ($_GET['sm'] ?? '1') !== '0';
$showColour  = ($_GET['so'] ?? '1') !== '0';

$stmt = $pdo->prepare("SELECT * FROM warranty_registrations WHERE id = ? AND tenant_id = ?");
$stmt->execute([$id, $tenant_id]);
$w = $stmt->fetch();
if (!$w) { echo 'Warranty not found'; exit; }

$stmt = $pdo->prepare("SELECT * FROM warranty_products WHERE warranty_id = ? AND tenant_id = ? ORDER BY id");
$stmt->execute([$id, $tenant_id]);
$products = $stmt->fetchAll();

$stmt = $pdo->prepare("SELECT * FROM warranty_coverage_items WHERE warranty_id = ? AND tenant_id = ? ORDER BY id");
$stmt->execute([$id, $tenant_id]);
$coverage = $stmt->fetchAll();

$terms = json_decode($w['terms_json'] ?? '[]', true) ?: [];

$stmt = $pdo->prepare("SELECT company_name, logo_url, address, phone, email, website FROM companies WHERE tenant_id = ? AND is_active = 1 LIMIT 1");
$stmt->execute([$tenant_id]);
$company = $stmt->fetch();
if (!$company) {
    $stmt = $pdo->prepare("SELECT company_name, company_logo AS logo_url, address_line1 AS address, phone_1 AS phone, email, website FROM company_settings LIMIT 1");
    $stmt->execute();
    $company = $stmt->fetch();
}

function fd($d) {
    if (!$d || $d === '0000-00-00') return '-';
    return date('d M Y', strtotime($d));
}
function e($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }

$today    = new DateTime();
$expiry   = !empty($w['warranty_expiry_date']) ? new DateTime($w['warranty_expiry_date']) : null;
$expired  = $expiry && $expiry < $today;
$expiring = $expiry && !$expired && $today->diff($expiry)->days <= 30;
$statusTxt = $expired ? 'EXPIRED' : ($expiring ? 'EXPIRING SOON' : 'ACTIVE');
$sCls      = $expired ? 'status-expired' : ($expiring ? 'status-expiring' : 'status-active');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Warranty — <?= e($w['warranty_no']) ?></title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #222; background: #f4f4f4; }

.toolbar { background: #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 99; }
.toolbar button { padding: 7px 16px; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-p { background: #2563eb; color: #fff; }
.btn-b { background: #475569; color: #e2e8f0; }
.toolbar span { color: #94a3b8; font-size: 12px; margin-left: 4px; }

.page { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; border: 1px solid #ddd; padding: 14mm 14mm 10mm; }

.doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #1e3a5f; margin-bottom: 14px; }
.co-left { display: flex; align-items: center; gap: 12px; }
.co-logo { width: 52px; height: 52px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-shrink: 0; }
.co-logo img { width: 100%; height: 100%; object-fit: contain; }
.co-logo span { font-size: 22px; font-weight: 900; color: #1e3a5f; }
.co-name { font-size: 16px; font-weight: 700; color: #1e3a5f; line-height: 1.2; }
.co-detail { font-size: 10px; color: #555; margin-top: 3px; line-height: 1.6; }
.doc-right { text-align: right; }
.doc-title { font-size: 18px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; letter-spacing: 2px; }
.doc-no { font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 4px; }
.doc-status { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 1px; border: 1.5px solid; }
.status-active   { color: #16a34a; border-color: #16a34a; }
.status-expired  { color: #dc2626; border-color: #dc2626; }
.status-expiring { color: #d97706; border-color: #d97706; }

.validity-bar { display: flex; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
.vb-item { flex: 1; padding: 7px 12px; border-right: 1px solid #e2e8f0; background: #f8fafc; }
.vb-item:last-child { border-right: none; }
.vb-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.vb-val   { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 2px; }

.sec-title { font-size: 10px; font-weight: 700; color: #fff; background: #1e3a5f; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 0; }

.info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #e2e8f0; border-top: none; }
.info-table td { padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; vertical-align: top; }
.info-table td.lbl { font-weight: 700; color: #64748b; width: 22%; background: #fafafa; white-space: nowrap; }
.info-table td.val { color: #1e293b; }
.info-table tr:last-child td { border-bottom: none; }

.data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; border: 1px solid #e2e8f0; border-top: none; }
.data-table thead tr { background: #f1f5f9; }
.data-table thead th { padding: 6px 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 10px; text-transform: uppercase; }
.data-table thead th:last-child { border-right: none; }
.data-table tbody td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
.data-table tbody td:last-child { border-right: none; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:nth-child(even) { background: #fafafa; }

.tbadge { display: inline-block; padding: 1px 8px; border-radius: 3px; font-size: 9px; font-weight: 700; border: 1px solid; }
.tb-r { color: #1d4ed8; border-color: #93c5fd; background: #eff6ff; }
.tb-p { color: #be185d; border-color: #f9a8d4; background: #fdf2f8; }
.tb-s { color: #065f46; border-color: #6ee7b7; background: #ecfdf5; }

.terms-box { border: 1px solid #e2e8f0; border-top: none; padding: 8px 12px; margin-bottom: 12px; }
.terms-box ol { padding-left: 16px; margin: 0; }
.terms-box ol li { font-size: 11px; color: #475569; padding: 2px 0; line-height: 1.5; }

.sig-row { display: flex; gap: 20px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.sig-box { flex: 1; text-align: center; }
.sig-line { height: 40px; border-bottom: 1.5px solid #94a3b8; margin-bottom: 5px; }
.sig-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

.doc-footer { margin-top: 16px; padding-top: 8px; border-top: 2px solid #1e3a5f; display: flex; justify-content: space-between; align-items: center; }
.doc-footer p { font-size: 9px; color: #94a3b8; }
.doc-footer strong { color: #475569; }

@media print {
    @page { size: A4; margin: 10mm; }
    body { background: #fff; }
    .toolbar { display: none !important; }
    .page { margin: 0; border: none; padding: 0; width: 100%; min-height: auto; }
    .doc-status, .tbadge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sec-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .vb-item { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>

<div class="toolbar">
    <button class="btn-b" onclick="window.close()">&#8592; Back</button>
    <span>Warranty Card — <?= e($w['warranty_no']) ?></span>
    <button class="btn-p" onclick="window.print()">&#128438; Print</button>
</div>

<div class="page">

    <div class="doc-header">
        <div class="co-left">
            <div class="co-logo">
                <?php if (!empty($company['logo_url'])): ?>
                    <img src="/ledgerone_erp_two/client/assets/uploads/company_logo/<?= e($company['logo_url']) ?>" alt="Logo">
                <?php else: ?>
                    <span><?= strtoupper(substr($company['company_name'] ?? 'C', 0, 1)) ?></span>
                <?php endif; ?>
            </div>
            <div>
                <div class="co-name"><?= e($company['company_name'] ?? 'Company Name') ?></div>
                <div class="co-detail">
                    <?= e($company['address'] ?? '') ?>
                    <?php if (!empty($company['phone'])): ?> | <?= e($company['phone']) ?><?php endif; ?>
                    <?php if (!empty($company['email'])): ?><br><?= e($company['email']) ?><?php endif; ?>
                </div>
            </div>
        </div>
        <div class="doc-right">
            <div class="doc-title">Warranty Card</div>
            <div class="doc-no"><?= e($w['warranty_no']) ?></div>
            <div class="doc-status <?= $sCls ?>"><?= $statusTxt ?></div>
        </div>
    </div>

    <div class="validity-bar">
        <div class="vb-item"><div class="vb-label">Warranty Type</div><div class="vb-val"><?= e($w['warranty_type']) ?></div></div>
        <div class="vb-item"><div class="vb-label">Period</div><div class="vb-val"><?= e($w['warranty_period']) ?></div></div>
        <div class="vb-item"><div class="vb-label">Start Date</div><div class="vb-val"><?= fd($w['warranty_start_date']) ?></div></div>
        <div class="vb-item"><div class="vb-label">Expiry Date</div><div class="vb-val"><?= fd($w['warranty_expiry_date']) ?></div></div>
        <div class="vb-item"><div class="vb-label">Reg. Date</div><div class="vb-val"><?= fd($w['registration_date']) ?></div></div>
    </div>

    <div class="sec-title">Customer Information</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Customer Name</td><td class="val"><strong><?= e($w['customer_name']) ?></strong></td>
            <td class="lbl">Phone</td><td class="val"><?= e($w['phone_number'] ?: '-') ?></td>
        </tr>
        <tr>
            <td class="lbl">Email</td><td class="val"><?= e($w['email'] ?: '-') ?></td>
            <td class="lbl">Address</td><td class="val"><?= e($w['address'] ?: '-') ?></td>
        </tr>
    </table>

    <div class="sec-title">Sale Details</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Invoice Number</td><td class="val"><?= e($w['invoice_number'] ?: '-') ?></td>
            <td class="lbl">Sale Date</td><td class="val"><?= fd($w['sale_date']) ?></td>
        </tr>
    </table>

    <?php if (!empty($products)): ?>
    <div class="sec-title">Product Information</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Product Name</th>
                <?php if ($showChassis): ?><th>Chassis No</th><?php endif; ?>
                <?php if ($showMotor):   ?><th>Motor No</th><?php endif; ?>
                <?php if ($showColour):  ?><th>Colour</th><?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($products as $i => $p): ?>
            <tr>
                <td><?= $i + 1 ?></td>
                <td><strong><?= e($p['product_name']) ?></strong></td>
                <?php if ($showChassis): ?><td><?= e($p['chassis_no'] ?: '-') ?></td><?php endif; ?>
                <?php if ($showMotor):   ?><td><?= e($p['motor_no']   ?: '-') ?></td><?php endif; ?>
                <?php if ($showColour):  ?><td><?= e($p['colour']     ?: '-') ?></td><?php endif; ?>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <?php if (!empty($coverage)): ?>
    <div class="sec-title">Warranty Coverage Items / Parts</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th><th>Component / Part</th><th>Serial No</th>
                <th>Type</th><th>Period</th><th>Start Date</th><th>Expiry Date</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($coverage as $i => $c):
                $tc = ['Repair'=>'tb-r','Replacement'=>'tb-p','Service'=>'tb-s'][$c['warranty_type']] ?? '';
            ?>
            <tr>
                <td><?= $i + 1 ?></td>
                <td><strong><?= e($c['component_name']) ?></strong></td>
                <td><?= e($c['serial_no'] ?: '-') ?></td>
                <td><span class="tbadge <?= $tc ?>"><?= e($c['warranty_type']) ?></span></td>
                <td><?= e($c['period']) ?></td>
                <td><?= fd($c['start_date']) ?></td>
                <td><?= fd($c['expiry_date']) ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <?php if (!empty($terms)): ?>
    <div class="sec-title">Terms &amp; Conditions</div>
    <div class="terms-box">
        <ol><?php foreach ($terms as $t): ?><li><?= e($t) ?></li><?php endforeach; ?></ol>
    </div>
    <?php endif; ?>

    <?php if (!empty($w['notes'])): ?>
    <div class="sec-title">Notes</div>
    <div class="terms-box"><p style="font-size:11px;color:#475569;line-height:1.6;"><?= e($w['notes']) ?></p></div>
    <?php endif; ?>

    <div class="sig-row">
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Customer Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Authorized Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Company Stamp</div></div>
    </div>

    <div class="doc-footer">
        <p>Issued: <strong><?= fd($w['registration_date']) ?></strong> &nbsp;|&nbsp; Warranty No: <strong><?= e($w['warranty_no']) ?></strong></p>
        <p><?= e($company['company_name'] ?? '') ?> &copy; <?= date('Y') ?> — All rights reserved</p>
    </div>

</div>
</body>
</html>
