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

$supplier_id = $_GET['supplier_id'] ?? null;
$has_service = $_GET['has_service'] ?? 'false';
$transaction_date = $_GET['date'] ?? date('Y-m-d');

if (!$supplier_id) {
    echo json_encode(['success' => true, 'wht_rate' => 0]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT registration_status, is_filer FROM suppliers WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$supplier_id, $tenant_id]);
    $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$supplier) {
        echo json_encode(['success' => true, 'wht_rate' => 0]);
        exit;
    }
    
    $is_registered = $supplier['registration_status'] === 'registered';
    $is_filer = $supplier['is_filer'] == 1;
    $has_service = $has_service === 'true';
    
    // Determine party_type and transaction_type for tax_rates lookup
    $party_type = $is_registered ? 'registered_company' : 'unregistered';
    $transaction_type = $has_service ? 'payment' : 'purchase';
    
    // Get WHT rate from tax_rates table
    $taxStmt = $pdo->prepare("
        SELECT rate_percentage 
        FROM tax_rates 
        WHERE tax_type = 'wht' 
        AND transaction_type = ? 
        AND party_type = ? 
        AND is_filer = ? 
        AND is_active = 1 
        AND effective_from <= ? 
        AND (effective_to IS NULL OR effective_to >= ?)
        ORDER BY effective_from DESC 
        LIMIT 1
    ");
    $taxStmt->execute([$transaction_type, $party_type, $is_filer ? 1 : 0, $transaction_date, $transaction_date]);
    $taxRate = $taxStmt->fetch(PDO::FETCH_ASSOC);
    
    $wht_rate = $taxRate ? floatval($taxRate['rate_percentage']) : 0;
    
    echo json_encode(['success' => true, 'wht_rate' => $wht_rate]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}