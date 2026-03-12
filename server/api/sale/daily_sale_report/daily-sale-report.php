<?php
session_start();
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $report_type = $_GET['report_type'] ?? 'item-wise';
    $sales_officer_id = $_GET['sales_officer_id'] ?? null;
    $vendor_id = $_GET['vendor_id'] ?? null;
    $company_id = $_GET['company_id'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;

    if ($report_type === 'item-wise') {
        // Item-wise report query
        $sql = "SELECT 
                    p.id,
                    p.name as product,
                    p.parent_product_id,
                    u.uom_name as unit,
                    SUM(sii.quantity) as qty,
                    SUM(sii.foc_quantity) as foc_qty,
                    AVG(sii.sale_price) as rate,
                    SUM(sii.net_amount) as amount,
                    CASE WHEN sii.parent_row_id IS NOT NULL THEN 1 ELSE 0 END as is_child
                FROM sale_invoice_items sii
                JOIN sale_invoice si ON sii.sale_invoice_id = si.id
                JOIN products p ON sii.product_id = p.id
                LEFT JOIN uom u ON sii.uom_id = u.id
                WHERE si.tenant_id = ? AND si.status = 'Posted'";
        
        $params = [$tenant_id];
        
        if ($date_from) {
            $sql .= " AND si.sale_date >= ?";
            $params[] = $date_from;
        }
        if ($date_to) {
            $sql .= " AND si.sale_date <= ?";
            $params[] = $date_to;
        }
        if ($sales_officer_id) {
            $sql .= " AND si.sale_officer_id = ?";
            $params[] = $sales_officer_id;
        }
        if ($vendor_id) {
            $sql .= " AND p.vendor_id = ?";
            $params[] = $vendor_id;
        }
        if ($company_id) {
            $sql .= " AND si.company_id = ?";
            $params[] = $company_id;
        }
        
        $sql .= " GROUP BY p.id, p.name, p.parent_product_id, u.uom_name, is_child ORDER BY p.parent_product_id IS NULL DESC, p.parent_product_id, amount DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add serial numbers and indentation flag
        $data = array_map(function($item, $index) {
            return array_merge(['sNo' => $index + 1, 'isChild' => (bool)$item['is_child']], $item);
        }, $data, array_keys($data));
        
        echo json_encode(['success' => true, 'data' => $data]);
        
    } else {
        // Bill-wise report query
        $sql = "SELECT 
                    si.id,
                    si.bill_no as invoiceNo,
                    c.customer_code as custCode,
                    c.customer_name as custName,
                    c.address,
                    si.total_bill as billAmount,
                    0 as returnAmount,
                    si.net_amount as netAmount
                FROM sale_invoice si
                JOIN customers c ON si.customer_id = c.id
                WHERE si.tenant_id = ? AND si.status = 'Posted'";
        
        $params = [$tenant_id];
        
        if ($date_from) {
            $sql .= " AND si.sale_date >= ?";
            $params[] = $date_from;
        }
        if ($date_to) {
            $sql .= " AND si.sale_date <= ?";
            $params[] = $date_to;
        }
        if ($sales_officer_id) {
            $sql .= " AND si.sale_officer_id = ?";
            $params[] = $sales_officer_id;
        }
        if ($company_id) {
            $sql .= " AND si.company_id = ?";
            $params[] = $company_id;
        }
        
        $sql .= " ORDER BY si.bill_no DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add serial numbers
        $data = array_map(function($item, $index) {
            return array_merge(['sNo' => $index + 1], $item);
        }, $data, array_keys($data));
        
        echo json_encode(['success' => true, 'data' => $data]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}