<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$product_id = $_GET['product_id'] ?? null;
$branch_id = $_GET['branch_id'] ?? null;

if (!$product_id) {
    echo json_encode(['success' => true, 'stock' => 0]);
    exit;
}

try {
    // Get product's inventory account and default unit
    $accountStmt = $pdo->prepare("SELECT inventory_account_id, default_unit_id FROM products WHERE id = ?");
    $accountStmt->execute([$product_id]);
    $product = $accountStmt->fetch(PDO::FETCH_ASSOC);
    $inventoryAccountId = $product['inventory_account_id'];
    $defaultUnitId = $product['default_unit_id'];
    
    // Get stock ledger with unit details
    $query = "
        SELECT 
            sl.unit_id,
            COALESCE(SUM(sl.qty_in), 0) - COALESCE(SUM(sl.qty_out), 0) as qty,
            u.is_base_unit,
            u.base_unit_id,
            u.unit_scope,
            COALESCE(u.conversion_factor, 1) as uom_conversion_factor,
            COALESCE(puc.conversion_factor, 1) as product_conversion_factor
        FROM stock_ledger sl
        LEFT JOIN uom u ON sl.unit_id = u.id
        LEFT JOIN product_uom_conversions puc ON puc.product_id = sl.product_id AND puc.uom_id = sl.unit_id
        WHERE sl.tenant_id = ? AND sl.product_id = ? AND sl.account_id = ?
    ";
    
    $params = [$tenant_id, $product_id, $inventoryAccountId];
    
    if ($branch_id) {
        $query .= " AND sl.branch_id = ?";
        $params[] = $branch_id;
    }
    
    $query .= " GROUP BY sl.unit_id";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $stockByUnit = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $totalStock = 0;
    foreach ($stockByUnit as $row) {
        $qty = floatval($row['qty']);
        if ($qty == 0) continue;
        
        // Determine conversion factor
        $conversionFactor = 1;
        if ($row['is_base_unit'] == 0) {
            if ($row['unit_scope'] == 'per_product') {
                $conversionFactor = floatval($row['product_conversion_factor']);
            } else {
                $conversionFactor = floatval($row['uom_conversion_factor']);
            }
        }
        
        $totalStock += $qty * $conversionFactor;
    }
    
    echo json_encode(['success' => true, 'stock' => floatval($totalStock)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
