<?php
ob_start();

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../../../includes/connection.php';

ob_end_clean();

$user_id = $_SESSION['user_id'] ?? 1;
$tenant_id = $_SESSION['tenant_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'next_wastage_no') {
        $stmt = $pdo->prepare("SELECT wastage_no FROM production_wastage WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $lastNo = $stmt->fetchColumn();

        if ($lastNo && preg_match('/WE-(\d+)/', $lastNo, $matches)) {
            $nextNum = intval($matches[1]) + 1;
        } else {
            $nextNum = 1;
        }

        echo json_encode(['success' => true, 'wastage_no' => 'WE-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT)]);
        exit;
    }

    if ($action === 'production_orders') {
        $stmt = $pdo->prepare("
            SELECT po.id, po.order_no, po.status, p.name as product_name
            FROM production_orders po
            JOIN products p ON po.product_id = p.id
            WHERE po.tenant_id = ?
            AND po.status IN ('In Progress', 'Completed')
            ORDER BY po.created_at DESC
        ");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    if ($action === 'load_materials' && isset($_GET['po_id'])) {
        $stmt = $pdo->prepare("
            SELECT
                pom.material_id,
                pom.required_qty as ordered_qty,
                pom.uom_id,
                p.code as material_code,
                p.name as material_name,
                COALESCE(u.uom_name, 'N/A') as uom_name
            FROM production_order_materials pom
            JOIN products p ON pom.material_id = p.id
            LEFT JOIN uom u ON pom.uom_id = u.id
            WHERE pom.production_order_id = ?
        ");
        $stmt->execute([$_GET['po_id']]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $wastage_no         = $data['wastage_no'] ?? null;
    $production_order_id = $data['production_order_id'] ?? null;
    $wastage_date       = $data['wastage_date'] ?? null;
    $wastage_type       = $data['wastage_type'] ?? 'quantity';
    $remarks            = $data['remarks'] ?? null;
    $items              = $data['items'] ?? [];

    if (!$wastage_no || !$production_order_id || !$wastage_date || empty($items)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    if (!in_array($wastage_type, ['percentage', 'quantity'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid wastage type']);
        exit;
    }

    // Get branch_id from the production order for stock_ledger
    $poStmt = $pdo->prepare("SELECT branch_id FROM production_orders WHERE id = ? AND tenant_id = ?");
    $poStmt->execute([$production_order_id, $tenant_id]);
    $po = $poStmt->fetch(PDO::FETCH_ASSOC);

    if (!$po) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Production order not found']);
        exit;
    }

    $branch_id = $po['branch_id'];

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO production_wastage
            (tenant_id, wastage_no, production_order_id, wastage_date, wastage_type, remarks, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tenant_id, $wastage_no, $production_order_id, $wastage_date, $wastage_type, $remarks, $user_id]);
        $wastage_id = $pdo->lastInsertId();

        $itemStmt = $pdo->prepare("
            INSERT INTO production_wastage_items
            (wastage_id, material_id, uom_id, ordered_qty, wastage_input, wastage_qty)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stockStmt = $pdo->prepare("
            INSERT INTO stock_ledger
            (tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
             qty_out, unit_cost, unit_id, transaction_type, transaction_date, created_at)
            VALUES (?, 116, ?, ?, 'production_wastage', ?, ?, 0, ?, 'WASTAGE', ?, NOW())
        ");

        foreach ($items as $item) {
            $wastage_qty = floatval($item['wastage_qty'] ?? 0);
            if ($wastage_qty <= 0) continue;

            $itemStmt->execute([
                $wastage_id,
                $item['material_id'],
                $item['uom_id'],
                $item['ordered_qty'],
                $item['wastage_input'],
                $wastage_qty
            ]);

            $stockStmt->execute([
                $tenant_id,
                $branch_id,
                $item['material_id'],
                $wastage_id,
                $wastage_qty,
                $item['uom_id'],
                $wastage_date
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Wastage entry saved successfully', 'wastage_id' => $wastage_id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
