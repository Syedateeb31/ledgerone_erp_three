<?php
ob_start();
require_once '../../../../includes/connection.php';
if (session_status() == PHP_SESSION_NONE) session_start();
ob_end_clean();

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

    // ── DELETE ────────────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM warranty_claim_items WHERE claim_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->prepare("DELETE FROM warranty_claims       WHERE id = ?      AND tenant_id = ?")->execute([$id, $tenant_id]);
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Deleted']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) throw new Exception('Invalid JSON');

    if (empty($data['customer_name']))       throw new Exception('Customer name is required');
    if (empty($data['claim_status']))        throw new Exception('Claim status is required');
    if (empty($data['claim_priority']))      throw new Exception('Priority is required');
    if (empty($data['product_name']))        throw new Exception('Product name is required');
    if (empty($data['claim_type']))          throw new Exception('Claim type is required');
    if (empty($data['fault_category']))      throw new Exception('Fault category is required');
    if (empty($data['problem_description'])) throw new Exception('Problem description is required');

    $customer_id = !empty($data['customer_id']) ? (int)$data['customer_id'] : null;
    $warranty_id = !empty($data['warranty_id']) ? (int)$data['warranty_id'] : null;
    $claim_items = $data['claim_items'] ?? [];

    $pdo->beginTransaction();

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $pdo->prepare("
            UPDATE warranty_claims SET
                claim_date            = ?,
                claim_status          = ?,
                claim_priority        = ?,
                warranty_id           = ?,
                warranty_no           = ?,
                warranty_type         = ?,
                warranty_start_date   = ?,
                warranty_expiry_date  = ?,
                customer_id           = ?,
                customer_name         = ?,
                phone_number          = ?,
                email                 = ?,
                address               = ?,
                product_name          = ?,
                chassis_no            = ?,
                motor_no              = ?,
                colour                = ?,
                sale_date             = ?,
                invoice_no            = ?,
                claim_type            = ?,
                fault_category        = ?,
                problem_description   = ?,
                customer_complaint    = ?,
                inspection_date       = ?,
                inspected_by          = ?,
                inspection_findings   = ?,
                resolution_date       = ?,
                resolved_by           = ?,
                resolution_details    = ?,
                notes                 = ?,
                updated_by            = ?
            WHERE id = ? AND tenant_id = ?
        ")->execute([
            $data['claim_date']           ?: date('Y-m-d'),
            $data['claim_status'],
            $data['claim_priority'],
            $warranty_id,
            $data['warranty_no']          ?: null,
            $data['warranty_type']        ?: null,
            $data['warranty_start_date']  ?: null,
            $data['warranty_expiry_date'] ?: null,
            $customer_id,
            $data['customer_name'],
            $data['phone_number']         ?: null,
            $data['email']                ?: null,
            $data['address']              ?: null,
            $data['product_name'],
            $data['chassis_no']           ?: null,
            $data['motor_no']             ?: null,
            $data['colour']               ?: null,
            $data['sale_date']            ?: null,
            $data['invoice_no']           ?: null,
            $data['claim_type'],
            $data['fault_category'],
            $data['problem_description'],
            $data['customer_complaint']   ?: null,
            $data['inspection_date']      ?: null,
            $data['inspected_by']         ?: null,
            $data['inspection_findings']  ?: null,
            $data['resolution_date']      ?: null,
            $data['resolved_by']          ?: null,
            $data['resolution_details']   ?: null,
            $data['notes']                ?: null,
            $user_id,
            $id,
            $tenant_id
        ]);

        // Delete old items then re-insert
        $pdo->prepare("DELETE FROM warranty_claim_items WHERE claim_id = ? AND tenant_id = ?")->execute([$id, $tenant_id]);
        saveClaimItems($pdo, $tenant_id, $id, $claim_items);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Claim updated']);
        exit;
    }

    // ── INSERT ────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $stmt = $pdo->prepare("SELECT claim_no FROM warranty_claims WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $last    = $stmt->fetchColumn();
        $newNum  = $last ? ((int)substr($last, 4)) + 1 : 1;
        $claimNo = 'CLM-' . str_pad($newNum, 4, '0', STR_PAD_LEFT);

        $pdo->prepare("
            INSERT INTO warranty_claims (
                tenant_id, claim_no, claim_date, claim_status, claim_priority,
                warranty_id, warranty_no, warranty_type, warranty_start_date, warranty_expiry_date,
                customer_id, customer_name, phone_number, email, address,
                product_name, chassis_no, motor_no, colour, sale_date, invoice_no,
                claim_type, fault_category, problem_description, customer_complaint,
                inspection_date, inspected_by, inspection_findings,
                resolution_date, resolved_by, resolution_details,
                notes, created_by, updated_by
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?
            )
        ")->execute([
            $tenant_id,
            $claimNo,
            $data['claim_date']           ?: date('Y-m-d'),
            $data['claim_status'],
            $data['claim_priority'],
            $warranty_id,
            $data['warranty_no']          ?: null,
            $data['warranty_type']        ?: null,
            $data['warranty_start_date']  ?: null,
            $data['warranty_expiry_date'] ?: null,
            $customer_id,
            $data['customer_name'],
            $data['phone_number']         ?: null,
            $data['email']                ?: null,
            $data['address']              ?: null,
            $data['product_name'],
            $data['chassis_no']           ?: null,
            $data['motor_no']             ?: null,
            $data['colour']               ?: null,
            $data['sale_date']            ?: null,
            $data['invoice_no']           ?: null,
            $data['claim_type'],
            $data['fault_category'],
            $data['problem_description'],
            $data['customer_complaint']   ?: null,
            $data['inspection_date']      ?: null,
            $data['inspected_by']         ?: null,
            $data['inspection_findings']  ?: null,
            $data['resolution_date']      ?: null,
            $data['resolved_by']          ?: null,
            $data['resolution_details']   ?: null,
            $data['notes']                ?: null,
            $user_id,
            $user_id
        ]);

        $claim_id = (int)$pdo->lastInsertId();
        saveClaimItems($pdo, $tenant_id, $claim_id, $claim_items);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Claim saved', 'claim_no' => $claimNo, 'id' => $claim_id]);
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

// ── HELPER ────────────────────────────────────────────────────────────────────
function saveClaimItems($pdo, $tenant_id, $claim_id, $items) {
    if (empty($items)) return;
    $stmt = $pdo->prepare("
        INSERT INTO warranty_claim_items (tenant_id, claim_id, component_name, serial_no, warranty_status, issue_description)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    foreach ($items as $item) {
        if (empty(trim($item['component_name'] ?? ''))) continue;
        $stmt->execute([
            $tenant_id,
            $claim_id,
            $item['component_name'],
            $item['serial_no']         ?: null,
            $item['warranty_status']   ?: null,
            $item['issue_description'] ?: null
        ]);
    }
}
