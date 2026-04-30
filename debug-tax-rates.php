<?php
require_once 'includes/connection.php';
session_start();

$tenant_id = $_SESSION['tenant_id'] ?? 1;

// Check tax rates
$stmt = $pdo->prepare("
    SELECT 
        tr.id,
        tr.tax_regime_id,
        tr.rate_percentage,
        tr.transaction_type,
        tr.party_type,
        tr.is_filer,
        tr.is_active,
        tg.regime_name
    FROM tax_rates tr
    LEFT JOIN tax_regimes tg ON tr.tax_regime_id = tg.id
    WHERE tr.transaction_type = 'purchase'
    AND tr.is_active = 1
    ORDER BY tr.tax_regime_id, tr.party_type, tr.is_filer
");
$stmt->execute();
$rates = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<pre>";
echo "Current Purchase Invoice-Level Tax Rates:\n";
echo "==========================================\n";
foreach ($rates as $rate) {
    echo "ID: {$rate['id']} | Regime: {$rate['regime_name']} | Rate: {$rate['rate_percentage']}% | Party: {$rate['party_type']} | Filer: {$rate['is_filer']}\n";
}
echo "</pre>";

// Check suppliers
echo "<pre>";
echo "\nSuppliers:\n";
echo "==========================================\n";
$stmt = $pdo->prepare("
    SELECT id, supplier_code, supplier_name, is_sales_tax_registered, is_filer
    FROM suppliers
    WHERE tenant_id = ?
    LIMIT 5
");
$stmt->execute([$tenant_id]);
$suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($suppliers as $supp) {
    $party = $supp['is_sales_tax_registered'] ? 'registered_company' : 'unregistered';
    echo "ID: {$supp['id']} | {$supp['supplier_code']} | Registered: {$supp['is_sales_tax_registered']} | Filer: {$supp['is_filer']} | Party Type: {$party}\n";
}
echo "</pre>";
?>
