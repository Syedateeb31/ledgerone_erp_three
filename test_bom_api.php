<?php
// Test BOM API
require_once 'includes/connection.php';

session_start();
$_SESSION['user_id'] = 1; // Test user
$_SESSION['tenant_id'] = 1; // Test tenant

echo "<h2>Testing BOM API</h2>";

// Test 1: Get raw materials
echo "<h3>1. Raw Materials:</h3>";
$stmt = $pdo->prepare("SELECT id, code, name, uom_type, default_unit_id, uom_group_id, product_conversion_factor FROM products WHERE tenant_id = 1 AND inventory_account_id = 115 AND is_active = 1 LIMIT 5");
$stmt->execute();
$materials = $stmt->fetchAll();
echo "<pre>";
print_r($materials);
echo "</pre>";

// Test 2: Get product UOM for first material
if (!empty($materials)) {
    $productId = $materials[0]['id'];
    echo "<h3>2. UOM Config for Product ID: {$productId}</h3>";
    
    $stmt = $pdo->prepare("SELECT uom_type, default_unit_id, uom_group_id, product_conversion_factor FROM products WHERE id = ? AND tenant_id = 1");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    echo "<h4>Product Info:</h4>";
    echo "<pre>";
    print_r($product);
    echo "</pre>";
    
    $units = [];
    
    // Check for 'single' or 'unit' (both mean single unit)
    if (($product['uom_type'] === 'single' || $product['uom_type'] === 'unit') && $product['default_unit_id']) {
        echo "<h4>Single/Unit Mode:</h4>";
        $stmt = $pdo->prepare("SELECT id, uom_name, conversion_factor, is_base_unit, unit_scope FROM uom WHERE id = ?");
        $stmt->execute([$product['default_unit_id']]);
        $unit = $stmt->fetch();
        echo "<pre>";
        print_r($unit);
        echo "</pre>";
        if ($unit) {
            if ($unit['unit_scope'] === 'per_product' && $product['product_conversion_factor']) {
                echo "<p style='color:blue;'>Using per_product conversion: {$product['product_conversion_factor']}</p>";
                $unit['conversion_factor'] = $product['product_conversion_factor'];
            } else {
                echo "<p style='color:green;'>Using universal conversion: {$unit['conversion_factor']}</p>";
            }
            $units[] = $unit;
        }
    } else if ($product['uom_type'] === 'group' && $product['uom_group_id']) {
        echo "<h4>Group Unit Mode (Group ID: {$product['uom_group_id']}):</h4>";
        $stmt = $pdo->prepare("
            SELECT u.id, u.uom_name, u.conversion_factor, u.is_base_unit, u.unit_scope
            FROM uom_group_units ugu
            JOIN uom u ON ugu.uom_id = u.id
            WHERE ugu.uom_group_id = ?
            ORDER BY u.is_base_unit DESC, u.id ASC
        ");
        $stmt->execute([$product['uom_group_id']]);
        $units = $stmt->fetchAll();
        
        echo "<p>Found " . count($units) . " units in group</p>";
        
        foreach ($units as &$unit) {
            if ($unit['unit_scope'] === 'per_product' && $product['product_conversion_factor']) {
                echo "<p style='color:blue;'>{$unit['uom_name']}: Using per_product conversion: {$product['product_conversion_factor']}</p>";
                $unit['conversion_factor'] = $product['product_conversion_factor'];
            } else {
                echo "<p style='color:green;'>{$unit['uom_name']}: Using universal conversion: {$unit['conversion_factor']}</p>";
            }
        }
    } else {
        echo "<p style='color:red;'>No UOM type found or invalid configuration!</p>";
    }
    
    echo "<h4>Final Units Array:</h4>";
    echo "<pre>";
    print_r($units);
    echo "</pre>";
}

echo "<hr>";
echo "<h3>3. Testing with different products:</h3>";
foreach ($materials as $mat) {
    echo "<h4>Product: {$mat['code']} - {$mat['name']}</h4>";
    echo "<p>UOM Type: {$mat['uom_type']}, Default Unit ID: {$mat['default_unit_id']}, Group ID: {$mat['uom_group_id']}, Product CF: {$mat['product_conversion_factor']}</p>";
}
?>
