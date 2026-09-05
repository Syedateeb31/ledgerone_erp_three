<?php
ob_start();
session_start();
require_once '../../../../includes/connection.php';
ob_end_clean();

ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$tenant_id) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, term_name, days FROM payment_terms WHERE (tenant_id = ? OR tenant_id = 0) AND is_active = 1 ORDER BY days ASC");
    $stmt->execute([$tenant_id]);
    echo json_encode(['success' => true, 'payment_terms' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
