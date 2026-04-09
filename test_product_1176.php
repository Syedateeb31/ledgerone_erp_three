<?php
require_once 'includes/connection.php';

header('Content-Type: application/json');

try {
    // Get product 1176
    $stmt = $pdo->prepare("
        SELECT id, code, name, product_type, tenant_id 
        FROM products 
        WHERE id = 1176
    ");
    $stmt->execute([]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($product) {
        echo json_encode([
            'success' => true,
            'product' => $product,
            'product_type_is_null' => is_null($product['product_type']),
            'product_type_var_dump' => var_export($product['product_type'], true)
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
    }
    
    // Also check for any products with null product_type
    echo "\n\n--- Products with null product_type ---\n";
    $stmt = $pdo->prepare("
        SELECT id, code, name, product_type 
        FROM products 
        WHERE product_type IS NULL OR product_type = ''
        LIMIT 5
    ");
    $stmt->execute([]);
    $nullProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['null_products' => $nullProducts], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
