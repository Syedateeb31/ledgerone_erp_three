<?php
require_once 'includes/connection.php';

echo "=== CHECKING INVOICE-LEVEL TAX DATA ===\n\n";

// Check tax_regimes with application_level = 'invoice'
echo "1. Tax Regimes (application_level = 'invoice'):\n";
$stmt = $pdo->query("SELECT id, regime_name, application_level, is_active FROM tax_regimes WHERE application_level = 'invoice'");
$regimes = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($regimes, JSON_PRETTY_PRINT) . "\n\n";

// Check all tax_regimes
echo "2. All Tax Regimes:\n";
$stmt = $pdo->query("SELECT id, regime_name, application_level, is_active FROM tax_regimes");
$allRegimes = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($allRegimes, JSON_PRETTY_PRINT) . "\n\n";

// Check tax_rates for invoice-level
echo "3. Tax Rates (transaction_type = 'purchase'):\n";
$stmt = $pdo->query("SELECT tr.id, tr.tax_regime_id, tr.rate_percentage, tr.transaction_type, tr.party_type, tr.is_active FROM tax_rates tr WHERE tr.transaction_type = 'purchase' LIMIT 10");
$rates = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rates, JSON_PRETTY_PRINT) . "\n\n";

// Check suppliers
echo "4. Suppliers (first 5):\n";
$stmt = $pdo->query("SELECT id, supplier_code, supplier_name, is_sales_tax_registered, is_filer FROM suppliers LIMIT 5");
$suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($suppliers, JSON_PRETTY_PRINT) . "\n\n";

// Test the API query
echo "5. Testing API Query for Supplier 152:\n";
$supplierId = 152;
$companyId = null;

$suppStmt = $pdo->prepare("
    SELECT 
        supplier_type_id,
        is_sales_tax_registered,
        is_filer
    FROM suppliers
    WHERE id = ? AND tenant_id = ?
");
$suppStmt->execute([$supplierId, 1]);
$supplier = $suppStmt->fetch(PDO::FETCH_ASSOC);
echo "Supplier Data: " . json_encode($supplier, JSON_PRETTY_PRINT) . "\n\n";

if ($supplier) {
    $supplier_type_id = $supplier['supplier_type_id'];
    $is_registered = $supplier['is_sales_tax_registered'] ?? 0;
    $is_filer = $supplier['is_filer'] ?? 0;
    $party_type = $is_registered ? 'registered_company' : 'unregistered';
    
    echo "Derived Values:\n";
    echo "- supplier_type_id: $supplier_type_id\n";
    echo "- is_registered: $is_registered\n";
    echo "- is_filer: $is_filer\n";
    echo "- party_type: $party_type\n\n";
    
    // Test the full query
    $baseQuery = "
        SELECT 
            tr.id,
            tr.regime_code,
            tr.regime_name,
            COALESCE(
                (SELECT tr_rate.rate_percentage 
                 FROM tax_rates tr_rate 
                 WHERE tr_rate.tax_regime_id = tr.id
                   AND tr_rate.transaction_type = 'purchase'
                   AND tr_rate.is_active = 1
                   AND (tr_rate.effective_from IS NULL OR tr_rate.effective_from <= NOW())
                   AND (tr_rate.effective_to IS NULL OR tr_rate.effective_to >= NOW())
                   AND (
                       (tr_rate.party_type = 'all')
                       OR (tr_rate.supplier_type_id = ? AND tr_rate.party_type = ?)
                       OR (tr_rate.supplier_type_id = ? AND tr_rate.party_type = 'all')
                   )
                 LIMIT 1),
                0
            ) as rate_percentage
        FROM tax_regimes tr
        WHERE tr.application_level = 'invoice'
            AND tr.is_active = 1
            AND (tr.effective_from IS NULL OR tr.effective_from <= NOW())
            AND (tr.effective_to IS NULL OR tr.effective_to >= NOW())
        ORDER BY tr.regime_name
    ";
    
    $stmt = $pdo->prepare($baseQuery);
    $stmt->execute([$supplier_type_id, $party_type, $supplier_type_id]);
    $taxRegimes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Invoice-Level Tax Regimes Result:\n";
    echo json_encode($taxRegimes, JSON_PRETTY_PRINT) . "\n";
}
?>
