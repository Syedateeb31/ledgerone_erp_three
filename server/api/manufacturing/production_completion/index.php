<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$user_id = $_SESSION['user_id'] ?? 1;
$tenant_id = $_SESSION['tenant_id'] ?? 1;

// GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    // Load Production Orders (In Progress only)
    if ($action === 'production_orders') {
        $stmt = $pdo->prepare("
            SELECT 
                po.id,
                po.order_no,
                po.status,
                p.name as product_name
            FROM production_orders po
            JOIN products p ON po.product_id = p.id
            WHERE po.tenant_id = ?
            AND po.status = 'In Progress'
            ORDER BY po.created_at DESC
        ");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }
    
    // Get Next Completion Number
    if ($action === 'next_completion_no') {
        $stmt = $pdo->prepare("SELECT completion_no FROM production_completions WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $lastNo = $stmt->fetchColumn();
        
        if ($lastNo && preg_match('/PC-(\d+)/', $lastNo, $matches)) {
            $nextNum = intval($matches[1]) + 1;
        } else {
            $nextNum = 1;
        }
        $completionNo = 'PC-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
        
        echo json_encode(['success' => true, 'completion_no' => $completionNo]);
        exit;
    }
    
    // Load Order Details
    if ($action === 'order_details' && isset($_GET['po_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                po.*,
                b.branch_name,
                m.machine_name
            FROM production_orders po
            JOIN branches b ON po.branch_id = b.id
            LEFT JOIN machines m ON po.machine_id = m.id
            WHERE po.id = ? AND po.tenant_id = ?
        ");
        $stmt->execute([$_GET['po_id'], $tenant_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetch(PDO::FETCH_ASSOC)]);
        exit;
    }
    
    // Load Products with WIP Cost
    if ($action === 'products' && isset($_GET['po_id'])) {
        $poId = $_GET['po_id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                po.product_id,
                po.order_qty,
                p.code as product_code,
                p.name as product_name,
                p.default_unit_id,
                p.purchase_price as unit_cost,
                u.uom_name
            FROM production_orders po
            JOIN products p ON po.product_id = p.id
            LEFT JOIN uom u ON p.default_unit_id = u.id
            WHERE po.id = ? AND po.tenant_id = ?
        ");
        $stmt->execute([$poId, $tenant_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product) {
            $compStmt = $pdo->prepare("
                SELECT COALESCE(SUM(cp.completed_qty), 0) as completed_qty
                FROM completed_products cp
                JOIN production_completions pc ON cp.production_completion_id = pc.id
                WHERE pc.production_order_id = ?
            ");
            $compStmt->execute([$poId]);
            $comp = $compStmt->fetch(PDO::FETCH_ASSOC);
            
            $product['completed_qty'] = $comp['completed_qty'];
            $product['uom_id'] = $product['default_unit_id'];
            
            echo json_encode(['success' => true, 'data' => [$product]]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
        }
        exit;
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

// POST - Complete Production
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $po_id = $data['po_id'] ?? null;
    $branch_id = $data['branch_id'] ?? null;
    $complete_date = $data['complete_date'] ?? null;
    $products = $data['products'] ?? [];
    
    if (!$po_id || !$branch_id || !$complete_date || empty($products)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get next completion number
        $stmt = $pdo->prepare("SELECT completion_no FROM production_completions WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $lastNo = $stmt->fetchColumn();
        
        if ($lastNo && preg_match('/PC-(\d+)/', $lastNo, $matches)) {
            $nextNum = intval($matches[1]) + 1;
        } else {
            $nextNum = 1;
        }
        $completionNo = 'PC-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
        
        // Get machine_id from production order
        $stmt = $pdo->prepare("SELECT machine_id, order_qty FROM production_orders WHERE id = ?");
        $stmt->execute([$po_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        $machine_id = $order['machine_id'];
        $planned_qty = $order['order_qty'];
        
        // Calculate totals
        $totalProducts = count($products);
        $totalQuantity = 0;
        $totalCost = 0;
        
        foreach ($products as $prod) {
            $totalQuantity += $prod['completed_qty'];
            $totalCost += $prod['completed_qty'] * $prod['unit_cost'];
        }
        
        // Insert production_completions (header)
        $stmt = $pdo->prepare("
            INSERT INTO production_completions
            (tenant_id, completion_no, production_order_id, branch_id, machine_id, 
             complete_date, total_products, total_quantity, total_cost, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $tenant_id,
            $completionNo,
            $po_id,
            $branch_id,
            $machine_id,
            $complete_date,
            $totalProducts,
            $totalQuantity,
            $totalCost,
            $user_id
        ]);
        $completion_id = $pdo->lastInsertId();
        
        // Get previous completed qty
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(completed_qty), 0) as total_completed FROM completed_products cp JOIN production_completions pc ON cp.production_completion_id = pc.id WHERE pc.production_order_id = ?");
        $stmt->execute([$po_id]);
        $prev = $stmt->fetch(PDO::FETCH_ASSOC);
        $remaining_qty = $planned_qty - $prev['total_completed'];
        
        foreach ($products as $prod) {
            $prodTotalCost = $prod['completed_qty'] * $prod['unit_cost'];
            
            // Insert completed_products (details)
            $stmt = $pdo->prepare("
                INSERT INTO completed_products
                (production_completion_id, product_id, planned_qty, remaining_qty, 
                 completed_qty, uom_id, unit_cost, total_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $completion_id,
                $prod['product_id'],
                $planned_qty,
                $remaining_qty,
                $prod['completed_qty'],
                $prod['uom_id'],
                $prod['unit_cost'],
                $prodTotalCost
            ]);
            
            $remaining_qty -= $prod['completed_qty'];
            
            // Get WIP materials from work_in_progress_items
            $wipStmt = $pdo->prepare("
                SELECT wpi.material_id, wpi.issue_qty, wpi.uom_id, wpi.unit_cost
                FROM work_in_progress_items wpi
                JOIN work_in_progress wp ON wpi.work_in_progress_id = wp.id
                WHERE wp.production_order_id = ?
            ");
            $wipStmt->execute([$po_id]);
            $wipMaterials = $wipStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 1. WIP OUT for each material (account_id = 116)
            foreach ($wipMaterials as $mat) {
                $stmt = $pdo->prepare("
                    INSERT INTO stock_ledger
                    (tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                     qty_out, unit_cost, unit_id, transaction_type, transaction_date, created_at)
                    VALUES (?, 116, ?, ?, 'production_completions', ?, ?, ?, ?, 'WIP_OUT', ?, NOW())
                ");
                $stmt->execute([
                    $tenant_id,
                    $branch_id,
                    $mat['material_id'],
                    $completion_id,
                    $mat['issue_qty'],
                    $mat['unit_cost'],
                    $mat['uom_id'],
                    $complete_date
                ]);
            }
            
            // 2. Finished Goods IN (account_id = 117)
            $stmt = $pdo->prepare("
                INSERT INTO stock_ledger
                (tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
                 qty_in, unit_cost, unit_id, transaction_type, transaction_date, created_at)
                VALUES (?, 117, ?, ?, 'production_completions', ?, ?, ?, ?, 'PRODUCTION_RECEIVE', ?, NOW())
            ");
            $stmt->execute([
                $tenant_id,
                $branch_id,
                $prod['product_id'],
                $completion_id,
                $prod['completed_qty'],
                $prod['unit_cost'],
                $prod['uom_id'],
                $complete_date
            ]);
        }
        
        // Check if fully completed
        $stmt = $pdo->prepare("
            SELECT order_qty, 
                   (SELECT COALESCE(SUM(cp.completed_qty), 0) 
                    FROM completed_products cp 
                    JOIN production_completions pc ON cp.production_completion_id = pc.id 
                    WHERE pc.production_order_id = ?) as total_completed
            FROM production_orders WHERE id = ?
        ");
        $stmt->execute([$po_id, $po_id]);
        $check = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($check['total_completed'] >= $check['order_qty']) {
            $stmt = $pdo->prepare("UPDATE production_orders SET status = 'Completed', updated_at = NOW() WHERE id = ?");
            $stmt->execute([$po_id]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Production completed successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
