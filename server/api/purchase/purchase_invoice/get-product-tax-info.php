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
$date = $_GET['date'] ?? date('Y-m-d');

if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(tr.regime_code, 'standard') as tax_regime,
            p.mrp,
            p.hs_code,
            tr.is_tax_inclusive,
            tr.applies_at_stage,
            tr.downstream_exempt,
            COALESCE(SUM(t.rate_percentage), 0) as tax_rate,
            COALESCE(hst.gst_rate, 0) as hs_code_rate
        FROM products p
        LEFT JOIN tax_regimes tr ON p.tax_regime_id = tr.id
        LEFT JOIN tax_rates t ON t.tax_regime_id = tr.id 
            AND t.transaction_type IN ('purchase', 'all')
            AND t.tax_type = 'sales_tax'
            AND t.effective_from <= ?
            AND (t.effective_to IS NULL OR t.effective_to >= ?)
            AND t.is_active = 1
        LEFT JOIN hs_code_tax_rates hst ON p.hs_code = hst.hs_code
            AND hst.is_active = 1
            AND hst.effective_from <= ?
            AND (hst.effective_to IS NULL OR hst.effective_to >= ?)
        WHERE p.id = ? AND p.tenant_id = ?
        GROUP BY p.id
    ");
    $stmt->execute([$date, $date, $date, $date, $product_id, $tenant_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result) {
        echo json_encode([
            'success' => true,
            'tax_regime' => 'standard',
            'tax_rate' => 0,
            'mrp' => 0,
            'is_tax_inclusive' => false,
            'applies_at_stage' => 'all',
            'downstream_exempt' => false
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'tax_regime' => $result['tax_regime'] ?? 'standard',
        'tax_rate' => floatval($result['tax_rate'] ?? 0),
        'mrp' => floatval($result['mrp'] ?? 0),
        'is_tax_inclusive' => boolval($result['is_tax_inclusive'] ?? 0),
        'applies_at_stage' => $result['applies_at_stage'] ?? 'all',
        'downstream_exempt' => boolval($result['downstream_exempt'] ?? 0),
        'hs_code_rate' => floatval($result['hs_code_rate'] ?? 0)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
