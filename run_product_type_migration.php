<?php
/**
 * Database Migration Runner
 * Fixes products with null or invalid product_type values
 */

require_once 'includes/connection.php';

header('Content-Type: application/json');

try {
    // First, let's count how many products have the issue
    $countStmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM products 
        WHERE product_type IS NULL 
           OR product_type = '' 
           OR product_type NOT IN ('physical', 'service')
    ");
    $countStmt->execute([]);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $affectedCount = $countResult['count'];
    
    // Get details of affected products
    $detailStmt = $pdo->prepare("
        SELECT id, code, name, product_type 
        FROM products 
        WHERE product_type IS NULL 
           OR product_type = '' 
           OR product_type NOT IN ('physical', 'service')
        LIMIT 20
    ");
    $detailStmt->execute([]);
    $affectedProducts = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Update all products with null or invalid product_type to 'physical'
    $updateStmt = $pdo->prepare("
        UPDATE products 
        SET product_type = 'physical'
        WHERE product_type IS NULL 
           OR product_type = '' 
           OR product_type NOT IN ('physical', 'service')
    ");
    $updateStmt->execute([]);
    $updatedCount = $updateStmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => 'Migration completed successfully',
        'affected_count' => $affectedCount,
        'updated_count' => $updatedCount,
        'affected_products_sample' => $affectedProducts
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Migration failed',
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
