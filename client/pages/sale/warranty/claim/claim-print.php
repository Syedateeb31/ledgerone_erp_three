<?php
require_once '../../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$user_id || !$tenant_id) { header('Location: ../../../auth/login.html'); exit(); }

$id = (int)($_GET['id'] ?? 0);
if (!$id) { echo 'Invalid ID'; exit; }

$stmt = $pdo->prepare("SELECT * FROM warranty_claims WHERE id = ? AND tenant_id = ?");
$stmt->execute([$id, $tenant_id]);
$c = $stmt->fetch();
if (!$c) { echo 'Claim not found'; exit; }

// Fetch claim items from separate table
$stmt = $pdo->prepare("SELECT * FROM warranty_claim_items WHERE claim_id = ? AND tenant_id = ? ORDER BY id");
$stmt->execute([$id, $tenant_id]);
$claimItems = $stmt->fetchAll();

$stmt = $pdo->prepare("SELECT company_name, logo_url, address, phone, email FROM companies WHERE tenant_id = ? AND is_active = 1 LIMIT 1");
$stmt->execute([$tenant_id]);
$company = $stmt->fetch();
if (!$company) {
    $stmt = $pdo->prepare("SELECT company_name, company_logo AS logo_url, address_line1 AS address, phone_1 AS phone, email FROM company_settings LIMIT 1");
    $stmt->execute();
    $company = $stmt->fetch();
}

function fd($d) { return ($d && $d !== '0000-00-00') ? date('d M Y', strtotime($d)) : '-'; }
function e($s)  { return htmlspecialchars($s ?? '', ENT_QUOTES); }

$statusColors = [
    'Pending'          => ['bg'=>'#fef9c3','color'=>'#854d0e','border'=>'#fde047'],
    'Under Inspection' => ['bg'=>'#dbeafe','color'=>'#1d4ed8','border'=>'#93c5fd'],
    'Approved'         => ['bg'=>'#dcfce7','color'=>'#166534','border'=>'#86efac'],
    'Rejected'         => ['bg'=>'#fee2e2','color'=>'#991b1b','border'=>'#fca5a5'],
    'Completed'        => ['bg'=>'#d1fae5','color'=>'#065f46','border'=>'#6ee7b7'],
];
$sc = $statusColors[$c['claim_status']] ?? $statusColors['Pending'];

$priorityColors = [
    'Low'      => '#16a34a',
    'Medium'   => '#d97706',
    'High'     => '#dc2626',
    'Critical' => '#7c3aed',
];
$pc = $priorityColors[$c['claim_priority']] ?? '#475569';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Claim — <?= e($c['claim_no']) ?></title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #222; background: #f4f4f4; }

.toolbar { background: #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 99; }
.toolbar button { padding: 7px 16px; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-p { background: #2563eb; color: #fff; }
.btn-b { background: #475569; color: #e2e8f0; }
.toolbar span { color: #94a3b8; font-size: 12px; }

.page { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; border: 1px solid #ddd; padding: 12mm 14mm 10mm; }

/* Header */
.doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #1e3a5f; margin-bottom: 14px; }
.co-left { display: flex; align-items: center; gap: 12px; }
.co-logo { width: 52px; height: 52px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-shrink: 0; }
.co-logo img { width: 100%; height: 100%; object-fit: contain; }
.co-logo span { font-size: 22px; font-weight: 900; color: #1e3a5f; }
.co-name { font-size: 16px; font-weight: 700; color: #1e3a5f; }
.co-detail { font-size: 10px; color: #555; margin-top: 3px; line-height: 1.6; }
.doc-right { text-align: right; }
.doc-title { font-size: 18px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; letter-spacing: 2px; }
.doc-no { font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 4px; }
.doc-badges { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
.doc-badge { display: inline-block; padding: 3px 12px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; border: 1.5px solid; }

/* Info bar */
.info-bar { display: flex; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
.ib-item { flex: 1; padding: 7px 10px; border-right: 1px solid #e2e8f0; background: #f8fafc; }
.ib-item:last-child { border-right: none; }
.ib-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.ib-val   { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 2px; }

/* Section */
.sec-title { font-size: 10px; font-weight: 700; color: #fff; background: #1e3a5f; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 0; }

/* Tables */
.info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #e2e8f0; border-top: none; }
.info-table td { padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; vertical-align: top; }
.info-table td.lbl { font-weight: 700; color: #64748b; width: 20%; background: #fafafa; white-space: nowrap; }
.info-table td.val { color: #1e293b; }
.info-table tr:last-child td { border-bottom: none; }

.desc-box { border: 1px solid #e2e8f0; border-top: none; padding: 8px 10px; margin-bottom: 10px; font-size: 11px; color: #334155; line-height: 1.6; background: #fafafa; }

/* Signatures */
.sig-row { display: flex; gap: 20px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.sig-box { flex: 1; text-align: center; }
.sig-line { height: 40px; border-bottom: 1.5px solid #94a3b8; margin-bottom: 5px; }
.sig-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

/* Footer */
.doc-footer { margin-top: 14px; padding-top: 8px; border-top: 2px solid #1e3a5f; display: flex; justify-content: space-between; }
.doc-footer p { font-size: 9px; color: #94a3b8; }
.doc-footer strong { color: #475569; }

@media print {
    @page { size: A4; margin: 10mm; }
    body { background: #fff; }
    .toolbar { display: none !important; }
    .page { margin: 0; border: none; padding: 0; width: 100%; min-height: auto; }
    .sec-title, .doc-badge, .ib-item { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>

<div class="toolbar">
    <button class="btn-b" onclick="window.close()">&#8592; Back</button>
    <span>Warranty Claim — <?= e($c['claim_no']) ?></span>
    <button class="btn-p" onclick="window.print()">&#128438; Print</button>
</div>

<div class="page">

    <!-- HEADER -->
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
            <div class="doc-title">Warranty Claim</div>
            <div class="doc-no"><?= e($c['claim_no']) ?></div>
            <div class="doc-badges">
                <span class="doc-badge" style="background:<?= $sc['bg'] ?>;color:<?= $sc['color'] ?>;border-color:<?= $sc['border'] ?>;"><?= e($c['claim_status']) ?></span>
                <span class="doc-badge" style="color:<?= $pc ?>;border-color:<?= $pc ?>;background:#fff;"><?= e($c['claim_priority']) ?></span>
            </div>
        </div>
    </div>

    <!-- INFO BAR -->
    <div class="info-bar">
        <div class="ib-item"><div class="ib-label">Claim Date</div><div class="ib-val"><?= fd($c['claim_date']) ?></div></div>
        <div class="ib-item"><div class="ib-label">Claim Type</div><div class="ib-val"><?= e($c['claim_type']) ?></div></div>
        <div class="ib-item"><div class="ib-label">Fault Category</div><div class="ib-val"><?= e($c['fault_category']) ?></div></div>
        <div class="ib-item"><div class="ib-label">Warranty No</div><div class="ib-val"><?= e($c['warranty_no'] ?: '-') ?></div></div>
        <div class="ib-item"><div class="ib-label">Warranty Type</div><div class="ib-val"><?= e($c['warranty_type'] ?: '-') ?></div></div>
    </div>

    <!-- CUSTOMER -->
    <div class="sec-title">Customer Information</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Customer Name</td><td class="val"><strong><?= e($c['customer_name']) ?></strong></td>
            <td class="lbl">Phone</td><td class="val"><?= e($c['phone_number'] ?: '-') ?></td>
        </tr>
        <tr>
            <td class="lbl">Email</td><td class="val"><?= e($c['email'] ?: '-') ?></td>
            <td class="lbl">Address</td><td class="val"><?= e($c['address'] ?: '-') ?></td>
        </tr>
    </table>

    <!-- PRODUCT -->
    <div class="sec-title">Product Information</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Product Name</td><td class="val"><strong><?= e($c['product_name']) ?></strong></td>
            <td class="lbl">Invoice No</td><td class="val"><?= e($c['invoice_no'] ?: '-') ?></td>
        </tr>
        <tr>
            <td class="lbl">Chassis No</td><td class="val"><?= e($c['chassis_no'] ?: '-') ?></td>
            <td class="lbl">Motor No</td><td class="val"><?= e($c['motor_no'] ?: '-') ?></td>
        </tr>
        <tr>
            <td class="lbl">Colour</td><td class="val"><?= e($c['colour'] ?: '-') ?></td>
            <td class="lbl">Sale Date</td><td class="val"><?= fd($c['sale_date']) ?></td>
        </tr>
    </table>

    <!-- WARRANTY VALIDITY -->
    <div class="sec-title">Warranty Validity</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Warranty No</td><td class="val"><?= e($c['warranty_no'] ?: '-') ?></td>
            <td class="lbl">Warranty Type</td><td class="val"><?= e($c['warranty_type'] ?: '-') ?></td>
        </tr>
        <tr>
            <td class="lbl">Start Date</td><td class="val"><?= fd($c['warranty_start_date']) ?></td>
            <td class="lbl">Expiry Date</td><td class="val"><?= fd($c['warranty_expiry_date']) ?></td>
        </tr>
    </table>

    <!-- PROBLEM -->
    <div class="sec-title">Problem Description</div>
    <div class="desc-box"><?= nl2br(e($c['problem_description'])) ?></div>

    <?php if (!empty($c['customer_complaint'])): ?>
    <div class="sec-title">Customer Complaint</div>
    <div class="desc-box"><?= nl2br(e($c['customer_complaint'])) ?></div>
    <?php endif; ?>

    <!-- INSPECTION -->
    <?php if ($c['inspection_date'] || $c['inspected_by'] || $c['inspection_findings']): ?>
    <div class="sec-title">Inspection Details</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Inspection Date</td><td class="val"><?= fd($c['inspection_date']) ?></td>
            <td class="lbl">Inspected By</td><td class="val"><?= e($c['inspected_by'] ?: '-') ?></td>
        </tr>
    </table>
    <?php if (!empty($c['inspection_findings'])): ?>
    <div class="desc-box"><?= nl2br(e($c['inspection_findings'])) ?></div>
    <?php endif; ?>
    <?php endif; ?>

    <!-- RESOLUTION -->
    <?php if ($c['resolution_date'] || $c['resolved_by'] || $c['resolution_details']): ?>
    <div class="sec-title">Resolution</div>
    <table class="info-table">
        <tr>
            <td class="lbl">Resolution Date</td><td class="val"><?= fd($c['resolution_date']) ?></td>
            <td class="lbl">Resolved By</td><td class="val"><?= e($c['resolved_by'] ?: '-') ?></td>
        </tr>
    </table>
    <?php if (!empty($c['resolution_details'])): ?>
    <div class="desc-box"><?= nl2br(e($c['resolution_details'])) ?></div>
    <?php endif; ?>
    <?php endif; ?>

    <!-- CLAIM ITEMS -->
    <?php if (!empty($claimItems)): ?>
    <div class="sec-title">Claim Items / Components</div>
    <table class="info-table" style="border-top:1px solid #e2e8f0;">
        <thead>
            <tr style="background:#f1f5f9;">
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">#</th>
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">Component / Part</th>
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">Serial No</th>
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">Warranty Status</th>
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;">Issue Description</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($claimItems as $i => $item): ?>
            <tr>
                <td class="val" style="width:30px;"><?= $i + 1 ?></td>
                <td class="val"><strong><?= e($item['component_name']) ?></strong></td>
                <td class="val"><?= e($item['serial_no'] ?: '-') ?></td>
                <td class="val"><?= e($item['warranty_status'] ?: '-') ?></td>
                <td class="val"><?= e($item['issue_description'] ?: '-') ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <!-- SIGNATURES -->
    <div class="sig-row">
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Customer Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Technician Signature</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">Authorized Signature</div></div>
    </div>

    <!-- FOOTER -->
    <div class="doc-footer">
        <p>Claim No: <strong><?= e($c['claim_no']) ?></strong> &nbsp;|&nbsp; Date: <strong><?= fd($c['claim_date']) ?></strong></p>
        <p><?= e($company['company_name'] ?? '') ?> &copy; <?= date('Y') ?> — All rights reserved</p>
    </div>

</div>
</body>
</html>
