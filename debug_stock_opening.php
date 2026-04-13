<?php
// Debug file to check stock opening issue
require_once 'includes/connection.php';

header('Content-Type: application/json');

// Get last few error log entries from database directly
try {
    $stmt = $pdo->prepare("
        SELECT * FROM stock_opening 
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $stmt->execute([]);
    $stockOpening = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt2 = $pdo->prepare("
        SELECT * FROM stock_ledger 
        ORDER BY created_at DESC 
        LIMIT 10
    ");
    $stmt2->execute([]);
    $stockLedger = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'stock_opening_latest' => $stockOpening,
        'stock_ledger_latest' => $stockLedger
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
