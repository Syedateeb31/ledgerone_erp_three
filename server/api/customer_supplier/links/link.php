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
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login again']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $type = $input['type'] ?? '';
    $partyId = intval($input['partyId'] ?? 0);
    $mode = $input['mode'] ?? '';

    if (!in_array($type, ['customer', 'supplier'], true) || !$partyId) {
        throw new Exception('Invalid party');
    }
    if (!in_array($mode, ['existing', 'new'], true)) {
        throw new Exception('Invalid link mode');
    }

    // Confirm the source party belongs to this tenant, and isn't already linked
    // (uses the same linked_supplier_id/linked_customer_id + is_both columns as
    // the "Customer + Supplier (Both)" entry page, so a party linked from either
    // place is recognized by both).
    if ($type === 'customer') {
        $stmt = $pdo->prepare("SELECT id, linked_supplier_id FROM customers WHERE id = ? AND tenant_id = ?");
    } else {
        $stmt = $pdo->prepare("SELECT id, linked_customer_id FROM suppliers WHERE id = ? AND tenant_id = ?");
    }
    $stmt->execute([$partyId, $tenant_id]);
    $sourceParty = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$sourceParty) {
        throw new Exception(ucfirst($type) . ' not found');
    }
    if (!empty($sourceParty['linked_supplier_id']) || !empty($sourceParty['linked_customer_id'])) {
        throw new Exception(ucfirst($type) . ' is already linked');
    }

    $pdo->beginTransaction();

    if ($mode === 'existing') {
        $targetId = intval($input['targetId'] ?? 0);
        if (!$targetId) {
            throw new Exception('Please select a party to link');
        }

        $otherTable = $type === 'customer' ? 'suppliers' : 'customers';
        $otherLinkColumn = $type === 'customer' ? 'linked_customer_id' : 'linked_supplier_id';
        $stmt = $pdo->prepare("SELECT id, `$otherLinkColumn` FROM `$otherTable` WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$targetId, $tenant_id]);
        $targetParty = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$targetParty) {
            throw new Exception('Selected party not found');
        }
        if (!empty($targetParty[$otherLinkColumn])) {
            throw new Exception('Selected party is already linked to something else');
        }

        $customerId = $type === 'customer' ? $partyId : $targetId;
        $supplierId = $type === 'customer' ? $targetId : $partyId;
    } else {
        // Create a new counterpart record (Supplier if linking from a Customer, or vice versa)
        $newParty = $input['newParty'] ?? [];
        if (empty($newParty['name'])) {
            throw new Exception('Name is required to create the new record');
        }
        if (empty($newParty['companyId'])) {
            throw new Exception('Company is required to create the new record');
        }

        if ($type === 'customer') {
            // Creating a Supplier counterpart for this Customer
            $stmt = $pdo->prepare("SELECT supplier_code FROM suppliers WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
            $stmt->execute([$tenant_id]);
            $last = $stmt->fetch();
            $nextNum = $last ? ((int)substr($last['supplier_code'], 5) + 1) : 1;
            $newCode = 'SUPP-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT);

            $stmt = $pdo->prepare("SELECT COALESCE(MAX(id), 0) + 1 AS new_id FROM suppliers");
            $stmt->execute();
            $newId = $stmt->fetch()['new_id'];

            $stmt = $pdo->prepare("
                INSERT INTO suppliers (id, tenant_id, company_id, supplier_code, supplier_name, address, primary_phone, secondary_phone, identity_card_no, email, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $newId,
                $tenant_id,
                (int)$newParty['companyId'],
                $newCode,
                trim($newParty['name']),
                !empty($newParty['address']) ? trim($newParty['address']) : null,
                !empty($newParty['primaryPhone']) ? trim($newParty['primaryPhone']) : null,
                !empty($newParty['secondaryPhone']) ? trim($newParty['secondaryPhone']) : null,
                !empty($newParty['identityCard']) ? trim($newParty['identityCard']) : null,
                !empty($newParty['email']) ? trim($newParty['email']) : null,
                $user_id,
                $user_id
            ]);

            $customerId = $partyId;
            $supplierId = $newId;
        } else {
            // Creating a Customer counterpart for this Supplier
            $stmt = $pdo->prepare("SELECT customer_code FROM customers WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
            $stmt->execute([$tenant_id]);
            $last = $stmt->fetch();
            $nextNum = $last ? ((int)substr($last['customer_code'], 5) + 1) : 1;
            $newCode = 'CUST-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT);

            $stmt = $pdo->prepare("SELECT COALESCE(MAX(id), 0) + 1 AS new_id FROM customers");
            $stmt->execute();
            $newId = $stmt->fetch()['new_id'];

            $stmt = $pdo->prepare("
                INSERT INTO customers (id, tenant_id, company_id, customer_code, customer_name, address, primary_phone, secondary_phone, identity_card_no, email, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $newId,
                $tenant_id,
                (int)$newParty['companyId'],
                $newCode,
                trim($newParty['name']),
                !empty($newParty['address']) ? trim($newParty['address']) : null,
                !empty($newParty['primaryPhone']) ? trim($newParty['primaryPhone']) : null,
                !empty($newParty['secondaryPhone']) ? trim($newParty['secondaryPhone']) : null,
                !empty($newParty['identityCard']) ? trim($newParty['identityCard']) : null,
                !empty($newParty['email']) ? trim($newParty['email']) : null,
                $user_id,
                $user_id
            ]);

            $customerId = $newId;
            $supplierId = $partyId;
        }
    }

    $pdo->prepare("UPDATE customers SET linked_supplier_id = ?, is_both = 1 WHERE id = ? AND tenant_id = ?")
        ->execute([$supplierId, $customerId, $tenant_id]);
    $pdo->prepare("UPDATE suppliers SET linked_customer_id = ?, is_both = 1 WHERE id = ? AND tenant_id = ?")
        ->execute([$customerId, $supplierId, $tenant_id]);

    // Return the linked party's info for the UI to display
    if ($type === 'customer') {
        $stmt = $pdo->prepare("SELECT id, supplier_code AS code, supplier_name AS name FROM suppliers WHERE id = ?");
        $stmt->execute([$supplierId]);
    } else {
        $stmt = $pdo->prepare("SELECT id, customer_code AS code, customer_name AS name FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
    }
    $party = $stmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Linked successfully', 'party' => $party]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
