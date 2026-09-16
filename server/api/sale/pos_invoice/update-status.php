<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$invoice_id = $input['id'] ?? null;
$status = $input['status'] ?? null;

if (!$invoice_id || !in_array($status, ['pending', 'confirmed'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid id or status']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE sale_invoice SET invoice_status = ?, updated_by = ? WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$status, $user_id, $invoice_id, $tenant_id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Status updated']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update status']);
}
