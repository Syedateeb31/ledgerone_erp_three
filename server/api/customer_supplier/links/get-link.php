<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

session_start();
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$type = $_GET['type'] ?? '';
$id = intval($_GET['id'] ?? 0);

if (!in_array($type, ['customer', 'supplier'], true) || !$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
    exit;
}

try {
    if ($type === 'customer') {
        $stmt = $pdo->prepare("
            SELECT s.id, s.supplier_code AS code, s.supplier_name AS name
            FROM customers c
            JOIN suppliers s ON s.id = c.linked_supplier_id
            WHERE c.tenant_id = ? AND c.id = ?
        ");
    } else {
        $stmt = $pdo->prepare("
            SELECT c.id, c.customer_code AS code, c.customer_name AS name
            FROM suppliers s
            JOIN customers c ON c.id = s.linked_customer_id
            WHERE s.tenant_id = ? AND s.id = ?
        ");
    }
    $stmt->execute([$tenant_id, $id]);
    $linked = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($linked) {
        echo json_encode(['success' => true, 'linked' => true, 'party' => $linked]);
    } else {
        echo json_encode(['success' => true, 'linked' => false]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
