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

try {
    $stmt = $pdo->prepare("
        SELECT so.id, so.bill_no, so.sale_date, c.customer_name
        FROM sale_order so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.tenant_id = ?
        ORDER BY so.id DESC
    ");
    $stmt->execute([$tenant_id]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'orders' => $orders]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
