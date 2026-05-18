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
    $supplier_man_id = $_GET['supplier_man_id'] ?? null;
    $vendor_id = $_GET['vendor_id'] ?? null;
    $company_id = $_GET['company_id'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    $invoice_type = $_GET['invoice_type'] ?? null;
    $city_id = $_GET['city_id'] ?? null;
    $city_zone_id = $_GET['city_zone_id'] ?? null;
    $area_id = $_GET['area_id'] ?? null;

    if ($report_type === 'item-wise') {
        // Item-wise report query - get all unit variations
        $sql = "SELECT 
                    p.id,
                    p.name as product,
                    p.parent_product_id,
                    u.uom_name as unit,
                    sii.quantity as qty,
                    sii.foc_quantity as foc_qty,
                    sii.sale_price as rate,
                    sii.net_amount as amount,
                    CASE WHEN sii.parent_row_id IS NOT NULL THEN 1 ELSE 0 END as is_child
                FROM sale_invoice_items sii
                JOIN sale_invoice si ON sii.sale_invoice_id = si.id
                JOIN products p ON sii.product_id = p.id
                LEFT JOIN uom u ON sii.uom_id = u.id
                LEFT JOIN customers c ON si.customer_id = c.id
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
        if ($supplier_man_id) {
            $sql .= " AND si.supplier_man_id = ?";
            $params[] = $supplier_man_id;
        }
        if ($vendor_id) {
            $sql .= " AND p.vendor_id = ?";
            $params[] = $vendor_id;
        }
        if ($company_id) {
            $sql .= " AND si.company_id = ?";
            $params[] = $company_id;
        }
        if ($invoice_type === 'OutStation') {
            $sql .= " AND c.is_out_station = 1";
        } elseif ($invoice_type) {
            $sql .= " AND si.invoice_type = ?";
            $params[] = $invoice_type;
        }
        if ($city_id) {
            $sql .= " AND c.city_id = ?";
            $params[] = $city_id;
        }
        if ($city_zone_id) {
            $sql .= " AND c.city_zone_id = ?";
            $params[] = $city_zone_id;
        }
        if ($area_id) {
            $sql .= " AND c.area_id = ?";
            $params[] = $area_id;
        }
        
        $sql .= " ORDER BY p.id, u.uom_name";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group by product and combine units with quantities
        $grouped = [];
        foreach ($rawData as $item) {
            $key = $item['id'];
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'id' => $item['id'],
                    'product' => $item['product'],
                    'parent_product_id' => $item['parent_product_id'],
                    'is_child' => $item['is_child'],
                    'foc_qty' => 0,
                    'rate' => $item['rate'],
                    'amount' => 0,
                    'units' => []
                ];
            }
            
            $unitName = $item['unit'] ?? '-';
            // Check if this unit already exists for this product
            $unitExists = false;
            foreach ($grouped[$key]['units'] as &$existingUnit) {
                if ($existingUnit['unit'] === $unitName) {
                    $existingUnit['qty'] += $item['qty'];
                    $unitExists = true;
                    break;
                }
            }
            
            // If unit doesn't exist, add it
            if (!$unitExists) {
                $grouped[$key]['units'][] = [
                    'unit' => $unitName,
                    'qty' => $item['qty']
                ];
            }
            
            $grouped[$key]['foc_qty'] += $item['foc_qty'];
            $grouped[$key]['amount'] += $item['amount'];
        }
        
        $data = array_values($grouped);
        
        // Add serial numbers
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
        if ($supplier_man_id) {
            $sql .= " AND si.supplier_man_id = ?";
            $params[] = $supplier_man_id;
        }
        if ($company_id) {
            $sql .= " AND si.company_id = ?";
            $params[] = $company_id;
        }
        if ($invoice_type === 'OutStation') {
            $sql .= " AND c.is_out_station = 1";
        } elseif ($invoice_type) {
            $sql .= " AND si.invoice_type = ?";
            $params[] = $invoice_type;
        }
        if ($city_id) {
            $sql .= " AND c.city_id = ?";
            $params[] = $city_id;
        }
        if ($city_zone_id) {
            $sql .= " AND c.city_zone_id = ?";
            $params[] = $city_zone_id;
        }
        if ($area_id) {
            $sql .= " AND c.area_id = ?";
            $params[] = $area_id;
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
