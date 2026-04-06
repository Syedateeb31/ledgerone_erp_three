<?php
require_once 'includes/connection.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['tenant_id'] = 1;

$tenant_id = 1;

echo "<h2>Testing Production Order Materials Calculation</h2>";

// Test 1: Get a BOM
echo "<h3>1. Available BOMs:</h3>";
$stmt = $pdo->prepare("SELECT id, bom_code, finished_good_id, version FROM bill_of_materials WHERE tenant_id = ? LIMIT 5");
$stmt->execute([$tenant_id]);
$boms = $stmt->fetchAll();
echo "<pre>";
print_r($boms);
echo "</pre>";

if (!empty($boms)) {
    $bomId = $boms[0]['id'];
    $orderQty = 10;
    $branchId = 1;
    
    echo "<h3>2. Testing calculate_materials for BOM ID: {$bomId}, Order Qty: {$orderQty}, Branch: {$branchId}</h3>";
    
    // Get BOM materials with product UOM info
    $stmt = $pdo->prepare("
        SELECT 
            bm.raw_material_id,
            bm.quantity as bom_qty,
            bm.unit_id,
            p.code as material_code,
            p.name as material_name,
            p.uom_type,
            p.default_unit_id,
            p.uom_group_id,
            p.product_conversion_factor,
            u.uom_name,
            u.conversion_factor,
            u.is_base_unit,
            u.unit_scope
        FROM bom_materials bm
        JOIN products p ON bm.raw_material_id = p.id
        JOIN uom u ON bm.unit_id = u.id
        WHERE bm.bom_id = ?
    ");
    $stmt->execute([$bomId]);
    $materials = $stmt->fetchAll();
    
    echo "<h4>Raw Materials from BOM:</h4>";
    echo "<pre>";
    print_r($materials);
    echo "</pre>";
    
    // Group materials by product
    $groupedMaterials = [];
    foreach ($materials as $mat) {
        $productId = $mat['raw_material_id'];
        
        if (!isset($groupedMaterials[$productId])) {
            $groupedMaterials[$productId] = [
                'material_id' => $productId,
                'material_code' => $mat['material_code'],
                'material_name' => $mat['material_name'],
                'uom_type' => $mat['uom_type'],
                'units' => []
            ];
        }
        
        $requiredQty = $mat['bom_qty'] * $orderQty;
        
        // Get available stock from stock_ledger for this specific unit
        $stockStmt = $pdo->prepare("
            SELECT COALESCE(SUM(qty_in - qty_out), 0) as available_stock
            FROM stock_ledger
            WHERE tenant_id = ? 
            AND product_id = ? 
            AND branch_id = ?
            AND uom_id = ?
        ");
        $stockStmt->execute([$tenant_id, $productId, $branchId, $mat['unit_id']]);
        $stock = $stockStmt->fetch();
        
        $groupedMaterials[$productId]['units'][] = [
            'uom_id' => $mat['unit_id'],
            'uom_name' => $mat['uom_name'],
            'required_qty' => $requiredQty,
            'available_stock' => $stock['available_stock'],
            'conversion_factor' => $mat['unit_scope'] === 'per_product' ? $mat['product_conversion_factor'] : $mat['conversion_factor'],
            'is_base_unit' => $mat['is_base_unit']
        ];
    }
    
    // Convert to array
    $result = array_values($groupedMaterials);
    
    echo "<h4>Grouped Materials (Final Result):</h4>";
    echo "<pre>";
    print_r($result);
    echo "</pre>";
    
    echo "<h4>JSON Output:</h4>";
    echo "<pre>";
    echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
    echo "</pre>";
}

// Test 2: Check branches
echo "<hr><h3>3. Available Branches:</h3>";
$stmt = $pdo->prepare("SELECT id, branch_name FROM branches WHERE tenant_id = ? AND is_active = 1");
$stmt->execute([$tenant_id]);
$branches = $stmt->fetchAll();
echo "<pre>";
print_r($branches);
echo "</pre>";
?>
