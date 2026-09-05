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
$q = trim($_GET['q'] ?? '');

if (!in_array($type, ['customer', 'supplier'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid type']);
    exit;
}

try {
    if ($type === 'supplier') {
        // Suppliers not yet linked to any customer, for the "link this customer to an existing supplier" picker
        $sql = "
            SELECT s.id, s.supplier_code AS code, s.supplier_name AS name
            FROM suppliers s
            WHERE s.tenant_id = ? AND s.linked_customer_id IS NULL
        ";
        $params = [$tenant_id];
        if ($q !== '') {
            $sql .= " AND (s.supplier_name LIKE ? OR s.supplier_code LIKE ?)";
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        $sql .= " ORDER BY s.supplier_name LIMIT 50";
    } else {
        // Customers not yet linked to any supplier, for the "link this supplier to an existing customer" picker
        $sql = "
            SELECT c.id, c.customer_code AS code, c.customer_name AS name
            FROM customers c
            WHERE c.tenant_id = ? AND c.linked_supplier_id IS NULL
        ";
        $params = [$tenant_id];
        if ($q !== '') {
            $sql .= " AND (c.customer_name LIKE ? OR c.customer_code LIKE ?)";
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        $sql .= " ORDER BY c.customer_name LIMIT 50";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $parties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'parties' => $parties]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
