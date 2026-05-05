<?php
require_once 'includes/connection.php';

echo "=== SUPPLIERS TABLE STRUCTURE ===\n\n";

// Get table structure
$stmt = $pdo->query("DESCRIBE suppliers");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($columns, JSON_PRETTY_PRINT) . "\n\n";

// Get sample supplier data
echo "=== SAMPLE SUPPLIER DATA ===\n";
$stmt = $pdo->query("SELECT * FROM suppliers LIMIT 1");
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($supplier, JSON_PRETTY_PRINT) . "\n\n";

// Check tax_rates table structure
echo "=== TAX_RATES TABLE STRUCTURE ===\n";
$stmt = $pdo->query("DESCRIBE tax_rates");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($columns, JSON_PRETTY_PRINT) . "\n\n";

// Get sample tax_rate data
echo "=== SAMPLE TAX_RATE DATA ===\n";
$stmt = $pdo->query("SELECT * FROM tax_rates LIMIT 1");
$rate = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($rate, JSON_PRETTY_PRINT) . "\n";
?>
