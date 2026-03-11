<?php
require_once '../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? 1;

if (!$user_id) {
    header('Location: ../../auth/login.html');
    exit();
}

$wip_id = $_GET['id'] ?? null;
if (!$wip_id) {
    echo "Invalid WIP ID";
    exit();
}

// Get WIP Details
$stmt = $pdo->prepare("
    SELECT 
        wip.*,
        po.order_no,
        b.branch_name,
        m.machine_name
    FROM work_in_progress wip
    JOIN production_orders po ON wip.production_order_id = po.id
    JOIN branches b ON wip.branch_id = b.id
    LEFT JOIN machines m ON wip.machine_id = m.id
    WHERE wip.id = ? AND wip.tenant_id = ?
");
$stmt->execute([$wip_id, $tenant_id]);
$wip = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$wip) {
    echo "WIP not found";
    exit();
}

// Get WIP Items
$itemsStmt = $pdo->prepare("
    SELECT 
        wi.*,
        p.code as material_code,
        p.name as material_name,
        u.uom_name
    FROM work_in_progress_items wi
    JOIN products p ON wi.material_id = p.id
    LEFT JOIN uom u ON wi.uom_id = u.id
    WHERE wi.work_in_progress_id = ?
");
$itemsStmt->execute([$wip_id]);
$items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print WIP - <?php echo $wip['wip_number']; ?></title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-group {
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .total-row {
            font-weight: bold;
            background: #f9f9f9;
        }
        @media print {
            body {
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print</button>
        <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer;">Close</button>
    </div>

    <div class="header">
        <h1>Work In Progress Issue</h1>
        <p>WIP #: <?php echo $wip['wip_number']; ?></p>
    </div>

    <div class="info-section">
        <div>
            <div class="info-group">
                <span class="info-label">Production Order:</span>
                <span><?php echo $wip['order_no']; ?></span>
            </div>
            <div class="info-group">
                <span class="info-label">Branch:</span>
                <span><?php echo $wip['branch_name']; ?></span>
            </div>
            <div class="info-group">
                <span class="info-label">Machine:</span>
                <span><?php echo $wip['machine_name'] ?? '-'; ?></span>
            </div>
        </div>
        <div>
            <div class="info-group">
                <span class="info-label">Issue Date:</span>
                <span><?php echo date('d-M-Y', strtotime($wip['issue_date'])); ?></span>
            </div>
            <div class="info-group">
                <span class="info-label">Total Items:</span>
                <span><?php echo $wip['total_items']; ?></span>
            </div>
            <div class="info-group">
                <span class="info-label">Total Cost:</span>
                <span><?php echo number_format($wip['total_cost'], 2); ?></span>
            </div>
        </div>
    </div>

    <h3>Materials Issued</h3>
    <table>
        <thead>
            <tr>
                <th>Material</th>
                <th>Required</th>
                <th>Issued</th>
                <th>Available</th>
                <th>Issue Qty</th>
                <th>UOM</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
            <tr>
                <td><?php echo $item['material_code'] . ' - ' . $item['material_name']; ?></td>
                <td><?php echo $item['required_qty']; ?></td>
                <td><?php echo $item['issued_qty']; ?></td>
                <td><?php echo $item['available_qty']; ?></td>
                <td><?php echo $item['issue_qty']; ?></td>
                <td><?php echo $item['uom_name']; ?></td>
                <td><?php echo number_format($item['unit_cost'], 2); ?></td>
                <td><?php echo number_format($item['total_cost'], 2); ?></td>
            </tr>
            <?php endforeach; ?>
            <tr class="total-row">
                <td colspan="7" style="text-align: right;">Grand Total:</td>
                <td><?php echo number_format($wip['total_cost'], 2); ?></td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 50px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 5px; margin-top: 50px;">Prepared By</div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 5px; margin-top: 50px;">Checked By</div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 5px; margin-top: 50px;">Approved By</div>
            </div>
        </div>
    </div>
</body>
</html>
