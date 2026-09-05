<?php
require_once '../../../../includes/connection.php';

if (session_status() == PHP_SESSION_NONE) session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

try {

    // ── DELETE ───────────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM warranty_products       WHERE warranty_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->prepare("DELETE FROM warranty_coverage_items WHERE warranty_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->prepare("DELETE FROM warranty_registrations  WHERE id = ?          AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Deleted successfully']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) throw new Exception('Invalid JSON data');

    if (empty($data['customer_name']))       throw new Exception('Customer name is required');
    if (empty($data['warranty_type']))       throw new Exception('Warranty type is required');
    if (empty($data['warranty_period']))     throw new Exception('Warranty period is required');
    if (empty($data['warranty_start_date'])) throw new Exception('Warranty start date is required');

    $terms_json      = json_encode($data['terms'] ?? []);
    $customer_id     = !empty($data['customer_id'])     ? (int)$data['customer_id']     : null;
    $sale_invoice_id = !empty($data['sale_invoice_id']) ? (int)$data['sale_invoice_id'] : null;
    $products        = $data['products']       ?? [];
    $coverage_items  = $data['coverage_items'] ?? [];

    $pdo->beginTransaction();

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $pdo->prepare("
            UPDATE warranty_registrations SET
                registration_date    = ?,
                customer_id          = ?,
                customer_name        = ?,
                phone_number         = ?,
                email                = ?,
                address              = ?,
                sale_invoice_id      = ?,
                invoice_number       = ?,
                sale_date            = ?,
                warranty_type        = ?,
                warranty_period      = ?,
                warranty_start_date  = ?,
                warranty_expiry_date = ?,
                terms_json           = ?,
                notes                = ?,
                updated_by           = ?
            WHERE id = ? AND tenant_id = ?
        ")->execute([
            $data['registration_date']    ?: null,
            $customer_id,
            $data['customer_name'],
            $data['phone_number']         ?: null,
            $data['email']                ?: null,
            $data['address']              ?: null,
            $sale_invoice_id,
            $data['invoice_number']       ?: null,
            $data['sale_date']            ?: null,
            $data['warranty_type'],
            $data['warranty_period'],
            $data['warranty_start_date'],
            $data['warranty_expiry_date'] ?: null,
            $terms_json,
            $data['notes']                ?: null,
            $user_id,
            $id,
            $tenant_id
        ]);

        // Delete old child rows then re-insert
        $pdo->prepare("DELETE FROM warranty_products       WHERE warranty_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->prepare("DELETE FROM warranty_coverage_items WHERE warranty_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);

        saveProducts($pdo, $tenant_id, $id, $products);
        saveCoverageItems($pdo, $tenant_id, $id, $coverage_items);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Warranty updated successfully']);
        exit;
    }

    // ── INSERT ───────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $stmt = $pdo->prepare("SELECT warranty_no FROM warranty_registrations WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $last   = $stmt->fetchColumn();
        $newNum = $last ? ((int) substr($last, 3)) + 1 : 1;
        $warrantyNo = 'WR-' . str_pad($newNum, 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("
            INSERT INTO warranty_registrations (
                tenant_id, warranty_no, registration_date,
                customer_id, customer_name, phone_number, email, address,
                sale_invoice_id, invoice_number, sale_date,
                warranty_type, warranty_period, warranty_start_date, warranty_expiry_date,
                terms_json, notes, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $tenant_id,
            $warrantyNo,
            $data['registration_date']    ?: date('Y-m-d'),
            $customer_id,
            $data['customer_name'],
            $data['phone_number']         ?: null,
            $data['email']                ?: null,
            $data['address']              ?: null,
            $sale_invoice_id,
            $data['invoice_number']       ?: null,
            $data['sale_date']            ?: null,
            $data['warranty_type'],
            $data['warranty_period'],
            $data['warranty_start_date'],
            $data['warranty_expiry_date'] ?: null,
            $terms_json,
            $data['notes']                ?: null,
            $user_id,
            $user_id
        ]);

        $warranty_id = (int)$pdo->lastInsertId();

        saveProducts($pdo, $tenant_id, $warranty_id, $products);
        saveCoverageItems($pdo, $tenant_id, $warranty_id, $coverage_items);

        $pdo->commit();
        echo json_encode([
            'success'     => true,
            'message'     => 'Warranty saved successfully',
            'warranty_no' => $warrantyNo,
            'id'          => $warranty_id
        ]);
        exit;
    }

    $pdo->rollBack();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function saveProducts($pdo, $tenant_id, $warranty_id, $products) {
    if (empty($products)) return;
    $stmt = $pdo->prepare("
        INSERT INTO warranty_products (tenant_id, warranty_id, product_name, chassis_no, motor_no, colour)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    foreach ($products as $p) {
        if (empty(trim($p['product_name'] ?? ''))) continue;
        $stmt->execute([
            $tenant_id,
            $warranty_id,
            $p['product_name'],
            $p['chassis_no'] ?: null,
            $p['motor_no']   ?: null,
            $p['colour']     ?: null
        ]);
    }
}

function saveCoverageItems($pdo, $tenant_id, $warranty_id, $items) {
    if (empty($items)) return;
    $stmt = $pdo->prepare("
        INSERT INTO warranty_coverage_items (tenant_id, warranty_id, component_name, serial_no, warranty_type, period, start_date, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($items as $item) {
        if (empty(trim($item['component_name'] ?? ''))) continue;
        $stmt->execute([
            $tenant_id,
            $warranty_id,
            $item['component_name'],
            $item['serial_no']    ?: null,
            $item['warranty_type'],
            $item['period'],
            $item['start_date']   ?: null,
            $item['expiry_date']  ?: null
        ]);
    }
}
