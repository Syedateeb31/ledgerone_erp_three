<?php
require_once '../../../../includes/connection.php';

if (session_status() == PHP_SESSION_NONE) session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {

    // ── 1. All customers for dropdown ────────────────────────────────────────
    if (isset($_GET['action']) && $_GET['action'] === 'customers') {
        $stmt = $pdo->prepare("
            SELECT
                id,
                customer_name,
                primary_phone AS phone,
                email,
                address
            FROM customers
            WHERE tenant_id = ?
              AND status = 'ACTIVE'
            ORDER BY customer_name
        ");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'customers' => $stmt->fetchAll()]);
        exit;
    }

    // ── 2. Search invoices by bill_no ─────────────────────────────────────────
    if (isset($_GET['search'])) {
        $q    = trim($_GET['search']);
        // empty or '%' = show all (used when customer selected, field empty)
        $like = ($q === '' || $q === '%') ? '%' : '%' . $q . '%';

        $params        = [$tenant_id, $like];
        $customerWhere = '';

        if (!empty($_GET['customer_id'])) {
            $customerWhere = 'AND si.customer_id = ?';
            $params[]      = (int)$_GET['customer_id'];
        }

        $stmt = $pdo->prepare("
            SELECT
                si.id,
                si.bill_no,
                si.sale_date,
                c.customer_name,
                c.primary_phone AS phone,
                c.email,
                c.address
            FROM sale_invoice si
            LEFT JOIN customers c ON c.id = si.customer_id
            WHERE si.tenant_id = ?
              AND si.bill_no LIKE ?
              $customerWhere
            ORDER BY si.id DESC
            LIMIT 30
        ");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'invoices' => $stmt->fetchAll()]);
        exit;
    }

    // ── 3. Items (chassis / motor / colour) for a specific invoice ────────────
    if (isset($_GET['invoice_id'])) {
        $stmt = $pdo->prepare("
            SELECT
                sii.product_id,
                p.name      AS product_name,
                sii.chassis_no,
                sii.motor_no,
                sii.colour
            FROM sale_invoice_items sii
            LEFT JOIN products p ON p.id = sii.product_id
            WHERE sii.sale_invoice_id = ?
              AND sii.tenant_id       = ?
              AND sii.parent_row_id  IS NULL
        ");
        $stmt->execute([$_GET['invoice_id'], $tenant_id]);
        echo json_encode(['success' => true, 'items' => $stmt->fetchAll()]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Missing parameter']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
