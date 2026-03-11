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
$transaction_date = $_GET['transaction_date'] ?? date('Y-m-d');

if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    exit;
}

try {
    // Get product's tax regime and HS code
    $productStmt = $pdo->prepare("SELECT tax_regime_id, tax_regime, hs_code FROM products WHERE id = ? AND tenant_id = ?");
    $productStmt->execute([$product_id, $tenant_id]);
    $product = $productStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        echo json_encode(['success' => true, 'tax_rates' => [], 'regime' => null]);
        exit;
    }
    
    $taxRates = [];
    $regime = null;
    
    // If product has HS code, get HS code-based rates
    if (!empty($product['hs_code'])) {
        $hsStmt = $pdo->prepare("
            SELECT 
                id,
                CONCAT(hs_code, ' - ', hs_code_description) as tax_name,
                'customs_duty' as tax_type,
                gst_rate as rate_percentage,
                input_tax_claimable as is_adjustable,
                is_refundable,
                0 as is_final_tax,
                'customs' as deducted_by,
                NULL as debit_account_id,
                NULL as credit_account_id
            FROM hs_code_tax_rates
            WHERE hs_code = ?
            AND is_active = 1
            AND effective_from <= ?
            AND (effective_to IS NULL OR effective_to >= ?)
            LIMIT 1
        ");
        $hsStmt->execute([$product['hs_code'], $transaction_date, $transaction_date]);
        $hsRate = $hsStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($hsRate) {
            $taxRates[] = $hsRate;
        }
    }
    
    // Get tax regime-based rates if tax_regime_id exists
    if ($product['tax_regime_id']) {
        $regimeStmt = $pdo->prepare("SELECT * FROM tax_regimes WHERE id = ? AND is_active = 1");
        $regimeStmt->execute([$product['tax_regime_id']]);
        $regime = $regimeStmt->fetch(PDO::FETCH_ASSOC);
        
        $stmt = $pdo->prepare("
            SELECT 
                tr.id,
                tr.tax_name,
                tr.tax_type,
                tr.rate_percentage,
                tr.is_adjustable,
                tr.is_refundable,
                tr.is_final_tax,
                tr.deducted_by,
                tr.debit_account_id,
                tr.credit_account_id
            FROM tax_rates tr
            WHERE tr.tax_regime_id = ?
            AND tr.transaction_type IN ('purchase', 'all')
            AND tr.is_active = 1
            AND tr.effective_from <= ?
            AND (tr.effective_to IS NULL OR tr.effective_to >= ?)
            ORDER BY 
                CASE tr.tax_type
                    WHEN 'sales_tax' THEN 1
                    WHEN 'value_addition_tax' THEN 2
                    WHEN 'wht' THEN 3
                    WHEN 'advance_tax' THEN 4
                    ELSE 5
                END
        ");
        $stmt->execute([$product['tax_regime_id'], $transaction_date, $transaction_date]);
        $regimeRates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $taxRates = array_merge($taxRates, $regimeRates);
    }
    
    echo json_encode([
        'success' => true,
        'tax_rates' => $taxRates,
        'regime' => $regime
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
