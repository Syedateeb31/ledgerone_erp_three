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
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $type = $input['type'] ?? '';
    $partyId = intval($input['partyId'] ?? 0);

    if (!in_array($type, ['customer', 'supplier'], true) || !$partyId) {
        throw new Exception('Invalid party');
    }

    $pdo->beginTransaction();

    if ($type === 'customer') {
        $stmt = $pdo->prepare("SELECT linked_supplier_id FROM customers WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$partyId, $tenant_id]);
        $linkedId = $stmt->fetchColumn();

        $pdo->prepare("UPDATE customers SET linked_supplier_id = NULL, is_both = 0 WHERE id = ? AND tenant_id = ?")
            ->execute([$partyId, $tenant_id]);
        if ($linkedId) {
            $pdo->prepare("UPDATE suppliers SET linked_customer_id = NULL, is_both = 0 WHERE id = ? AND tenant_id = ?")
                ->execute([$linkedId, $tenant_id]);
        }
    } else {
        $stmt = $pdo->prepare("SELECT linked_customer_id FROM suppliers WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$partyId, $tenant_id]);
        $linkedId = $stmt->fetchColumn();

        $pdo->prepare("UPDATE suppliers SET linked_customer_id = NULL, is_both = 0 WHERE id = ? AND tenant_id = ?")
            ->execute([$partyId, $tenant_id]);
        if ($linkedId) {
            $pdo->prepare("UPDATE customers SET linked_supplier_id = NULL, is_both = 0 WHERE id = ? AND tenant_id = ?")
                ->execute([$linkedId, $tenant_id]);
        }
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Unlinked successfully']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
