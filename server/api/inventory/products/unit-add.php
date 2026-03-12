<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $uom_name = $_POST['unitName'] ?? '';
    $uom_type = $_POST['unitType'] ?? 'count';
    $is_base_unit = isset($_POST['isBaseUnit']) ? 1 : 0;
    $base_unit_id = $_POST['baseUnit'] ?? null;
    $conversion_factor = $_POST['conversionFactor'] ?? 1;
    
    if (empty($uom_name)) {
        echo json_encode(['success' => false, 'message' => 'Unit name is required']);
        exit;
    }
    
    if (!$is_base_unit && (empty($base_unit_id) || empty($conversion_factor))) {
        echo json_encode(['success' => false, 'message' => 'Base unit and conversion factor are required for non-base units']);
        exit;
    }
    
    // Validate base unit exists and belongs to same tenant
    if (!$is_base_unit && $base_unit_id) {
        $stmt = $pdo->prepare("SELECT id FROM uom WHERE id = ? AND (tenant_id = ? OR tenant_id = 0) AND is_base_unit = 1");
        $stmt->execute([$base_unit_id, $tenant_id]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Invalid base unit selected']);
            exit;
        }
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO uom (tenant_id, uom_name, uom_type, base_unit_id, conversion_factor, is_base_unit)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    // Set base_unit_id to null if it's empty or if it's a base unit
    $base_unit_param = ($is_base_unit || empty($base_unit_id)) ? null : $base_unit_id;
    
    $stmt->execute([$tenant_id, $uom_name, $uom_type, $base_unit_param, $conversion_factor, $is_base_unit]);
    $unit_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Unit added successfully',
        'unit' => [
            'id' => $unit_id,
            'name' => $uom_name,
            'type' => $uom_type
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}