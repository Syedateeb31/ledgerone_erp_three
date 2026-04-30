<?php
require_once 'includes/connection.php';

echo "=== ADDING INVOICE-LEVEL TAX RATES ===\n\n";

// Add tax rate for regime 1 (Standard GST Regime) - invoice level
$stmt = $pdo->prepare("
    INSERT INTO tax_rates (
        tenant_id, tax_authority, tax_type, transaction_type, legal_section, 
        finance_act_year, tax_name, customer_type_id, party_type, is_filer, 
        rate_percentage, tax_regime_id, is_adjustable, is_refundable, is_final_tax, 
        deducted_by, description, is_active, effective_from, currency, created_by
    ) VALUES (
        ?, 'FBR', 'sales_tax', 'purchase', 'Sec 3(1)', 2024, 
        'GST - Invoice Level (All Suppliers)', NULL, 'all', NULL, 
        18.0000, 1, 1, 0, 0, 'seller', 
        'Invoice-level GST at 18% for all suppliers on purchase', 1, CURDATE(), 'PKR', 1
    )
");
$result = $stmt->execute([1]);
echo "Added tax rate for regime 1 (Standard GST): " . ($result ? "SUCCESS" : "FAILED") . "\n";

// Add tax rate for regime 2 (Third Schedule MRP Regime) - invoice level
$stmt = $pdo->prepare("
    INSERT INTO tax_rates (
        tenant_id, tax_authority, tax_type, transaction_type, legal_section, 
        finance_act_year, tax_name, customer_type_id, party_type, is_filer, 
        rate_percentage, tax_regime_id, is_adjustable, is_refundable, is_final_tax, 
        deducted_by, description, is_active, effective_from, currency, created_by
    ) VALUES (
        ?, 'FBR', 'sales_tax', 'purchase', 'Sec 3(1)', 2024, 
        'GST - Invoice Level MRP (All Suppliers)', NULL, 'all', NULL, 
        17.0000, 2, 1, 0, 0, 'seller', 
        'Invoice-level GST at 17% for MRP regime on purchase', 1, CURDATE(), 'PKR', 1
    )
");
$result = $stmt->execute([1]);
echo "Added tax rate for regime 2 (MRP Regime): " . ($result ? "SUCCESS" : "FAILED") . "\n\n";

// Verify
echo "=== VERIFICATION ===\n";
$stmt = $pdo->query("
    SELECT tr.id, tr.tax_regime_id, tr.rate_percentage, tr.transaction_type, tr.party_type, 
           reg.regime_name, reg.application_level
    FROM tax_rates tr
    JOIN tax_regimes reg ON tr.tax_regime_id = reg.id
    WHERE reg.application_level = 'invoice' AND tr.transaction_type = 'purchase'
");
$rates = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rates, JSON_PRETTY_PRINT) . "\n";
?>
