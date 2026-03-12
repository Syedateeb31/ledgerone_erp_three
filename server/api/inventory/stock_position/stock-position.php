<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $currency_sql = "SELECT c.symbol FROM tenant_currencies tc 
                     JOIN ledgerone_public.currencies c ON tc.currency_id = c.id 
                     WHERE tc.tenant_id = ? AND tc.is_base_currency = 1";
    $currency_stmt = $pdo->prepare($currency_sql);
    $currency_stmt->execute([$tenant_id]);
    $currency = $currency_stmt->fetch(PDO::FETCH_ASSOC);
    $currency_symbol = $currency['symbol'] ?? '$';
    
    $action = $_GET['action'] ?? 'position';
    
    switch ($action) {
        case 'position':
            $branch_id = $_GET['branch_id'] ?? null;
            $product_id = $_GET['product_id'] ?? null;
            $company_id = $_GET['company_id'] ?? null;
            $inventory_type_id = $_GET['inventory_type_id'] ?? null;
            $vendor_id = $_GET['vendor_id'] ?? null;
            $stock_status = $_GET['stock_status'] ?? null;
            $status = $_GET['status'] ?? null;
            $from_date = $_GET['from_date'] ?? '1900-01-01';
            $to_date = $_GET['to_date'] ?? date('Y-m-d');
            $valuation_method = $_GET['valuation_method'] ?? 'AVCO';
            
            $allowed_methods = ['AVCO', 'FIFO', 'LIFO'];
            if (!in_array($valuation_method, $allowed_methods, true)) {
                $valuation_method = 'AVCO';
            }
            
            $cost_calculation = "COALESCE(
                (COALESCE(so.opening_qty, 0) * COALESCE(so.opening_price, 0) + COALESCE(SUM(sl.qty_in * sl.unit_cost), 0)) / 
                NULLIF(COALESCE(so.opening_qty, 0) + COALESCE(SUM(sl.qty_in), 0), 0), 
                so.opening_price, 0
            )";
            if ($valuation_method === 'FIFO') {
                $cost_calculation = "COALESCE((SELECT unit_cost FROM stock_ledger WHERE tenant_id = sl.tenant_id AND product_id = sl.product_id AND branch_id = sl.branch_id AND account_id = sl.account_id AND qty_in > 0 AND transaction_type != 'Opening Stock' ORDER BY transaction_date ASC, id ASC LIMIT 1), so.opening_price, 0)";
            } elseif ($valuation_method === 'LIFO') {
                $cost_calculation = "COALESCE((SELECT unit_cost FROM stock_ledger WHERE tenant_id = sl.tenant_id AND product_id = sl.product_id AND branch_id = sl.branch_id AND account_id = sl.account_id AND qty_in > 0 AND transaction_type != 'Opening Stock' ORDER BY transaction_date DESC, id DESC LIMIT 1), so.opening_price, 0)";
            }
            
            $sql = "SELECT 
                        p.id as product_id,
                        p.name as product_name,
                        p.parent_product_id,
                        pp.name as parent_product_name,
                        b.branch_name,
                        b.branch_type,
                        pb.branch_name as parent_branch_name,
                        u.uom_name as unit_symbol,
                        COALESCE(a.name, acc_opening.name) as account_name,
                        COALESCE(so.opening_qty, 0) as opening_balance,
                        COALESCE(SUM(CASE WHEN sl.transaction_date >= ? AND sl.transaction_date <= ? THEN sl.qty_in ELSE 0 END), 0) as total_qty_in,
                        COALESCE(SUM(CASE WHEN sl.transaction_date >= ? AND sl.transaction_date <= ? THEN sl.qty_out ELSE 0 END), 0) as total_qty_out,
                        COALESCE(so.opening_qty, 0) + COALESCE(SUM(sl.qty_in), 0) - COALESCE(SUM(sl.qty_out), 0) as current_stock,
                        {$cost_calculation} as unit_cost,
                        (COALESCE(so.opening_qty, 0) + COALESCE(SUM(sl.qty_in), 0) - COALESCE(SUM(sl.qty_out), 0)) * {$cost_calculation} as stock_value,
                        p.min_stock_level,
                        p.max_stock_level
                    FROM products p
                    LEFT JOIN products pp ON p.parent_product_id = pp.id
                    LEFT JOIN stock_opening so ON p.id = so.product_id AND p.tenant_id = so.tenant_id
                    LEFT JOIN branches b ON so.branch_id = b.id
                    LEFT JOIN accounts acc_opening ON p.inventory_account_id = acc_opening.id
                    LEFT JOIN stock_ledger sl ON p.id = sl.product_id AND p.tenant_id = sl.tenant_id AND so.branch_id = sl.branch_id AND sl.transaction_type != 'Opening Stock'
                    LEFT JOIN accounts a ON sl.account_id = a.id
                    LEFT JOIN branches pb ON b.parent_branch_id = pb.id
                    LEFT JOIN uom u ON p.default_unit_id = u.id
                    LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                    LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                    WHERE p.tenant_id = ? AND p.product_type = 'physical'";
            
            $params = [$from_date, $to_date, $from_date, $to_date, $tenant_id];
            
            if ($branch_id) {
                $sql .= " AND (sl.branch_id = ? OR b.parent_branch_id = ?)";
                $params[] = $branch_id;
                $params[] = $branch_id;
            }
            
            if ($product_id) {
                $sql .= " AND sl.product_id = ?";
                $params[] = $product_id;
            }
            
            if ($vendor_id) {
                $sql .= " AND p.vendor_id = ?";
                $params[] = $vendor_id;
            }
            
            if ($stock_status) {
                $sql .= " AND sl.stock_status = ?";
                $params[] = $stock_status;
            }
            
            if ($inventory_type_id) {
                $sql .= " AND sl.account_id = ?";
                $params[] = $inventory_type_id;
            }
            
            if ($company_id) {
                $sql .= " AND (pi.company_id = ? OR si.company_id = ?)";
                $params[] = $company_id;
                $params[] = $company_id;
            }
            
            $sql .= " GROUP BY p.id, so.branch_id, a.id, u.uom_name ORDER BY COALESCE(p.parent_product_id, p.id), p.parent_product_id IS NULL DESC, p.name";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $positions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($positions as &$position) {
                $stock = $position['current_stock'];
                $min_level = $position['min_stock_level'] ?? 0;
                $max_level = $position['max_stock_level'] ?? 0;
                
                $type_map = [
                    'head_office' => 'Head Office',
                    'petrol_station' => 'Petrol Station', 
                    'convenience_store' => 'Convenience Store',
                    'car_wash' => 'Car Wash',
                    'fuel_tank' => 'Fuel Tank',
                    'warehouse' => 'Warehouse'
                ];
                $type_display = $type_map[$position['branch_type']] ?? $position['branch_type'];
                $branch_display = $position['branch_name'] . ' (' . $type_display . ')';
                if ($position['parent_branch_name']) {
                    $branch_display = $position['parent_branch_name'] . ' > ' . $branch_display;
                }
                $position['branch_display'] = $branch_display;
                $position['inventory_type'] = $position['account_name'];
                
                if ($stock <= 0) {
                    $position['status'] = 'out-of-stock';
                } elseif ($stock < $min_level) {
                    $position['status'] = 'low-stock';
                } elseif ($max_level > 0 && $stock > $max_level) {
                    $position['status'] = 'overstock';
                } else {
                    $position['status'] = 'in-stock';
                }
            }
            
            if ($status) {
                $positions = array_filter($positions, function($pos) use ($status) {
                    return $pos['status'] === $status;
                });
                $positions = array_values($positions);
            }
            
            echo json_encode(['success' => true, 'data' => $positions, 'currency' => $currency_symbol]);
            break;
            
        case 'ledger':
            $product_id = $_GET['product_id'] ?? null;
            $company_id = $_GET['company_id'] ?? null;
            $from_date = $_GET['from_date'] ?? null;
            $to_date = $_GET['to_date'] ?? null;
            
            if (!$product_id) {
                echo json_encode(['success' => false, 'message' => 'Product ID required']);
                exit;
            }
            
            $bbf = 0;
            if ($from_date) {
                $bbf_sql = "SELECT COALESCE(SUM(sl.qty_in), 0) - COALESCE(SUM(sl.qty_out), 0) as bbf 
                           FROM stock_ledger sl
                           LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                           LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                           WHERE sl.tenant_id = ? AND sl.product_id = ?" . ($company_id ? " AND (pi.company_id = ? OR si.company_id = ?)" : "") . " AND sl.transaction_date < ?";
                $bbf_stmt = $pdo->prepare($bbf_sql);
                $bbf_params = [$tenant_id, $product_id];
                if ($company_id) {
                    $bbf_params[] = $company_id;
                    $bbf_params[] = $company_id;
                }
                $bbf_params[] = $from_date;
                $bbf_stmt->execute($bbf_params);
                $bbf = $bbf_stmt->fetch(PDO::FETCH_ASSOC)['bbf'];
            }
            
            $sql = "SELECT 
                        sl.transaction_date,
                        sl.transaction_type,
                        sl.qty_in,
                        sl.qty_out,
                        sl.unit_cost,
                        u.uom_name as unit_symbol,
                        CASE 
                            WHEN sl.reference_table = 'purchase_invoice' THEN s.supplier_name
                            WHEN sl.reference_table = 'sale_invoice' THEN c.customer_name
                            ELSE NULL
                        END as party_name
                    FROM stock_ledger sl
                    LEFT JOIN uom u ON sl.unit_id = u.id
                    LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                    LEFT JOIN suppliers s ON pi.supplier_id = s.id
                    LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                    LEFT JOIN customers c ON si.customer_id = c.id
                    WHERE sl.tenant_id = ? AND sl.product_id = ?";
            
            $params = [$tenant_id, $product_id];
            
            if ($from_date) {
                $sql .= " AND sl.transaction_date >= ?";
                $params[] = $from_date;
            }
            
            if ($to_date) {
                $sql .= " AND sl.transaction_date <= ?";
                $params[] = $to_date;
            }
            
            if ($company_id) {
                $sql .= " AND (pi.company_id = ? OR si.company_id = ?)";
                $params[] = $company_id;
                $params[] = $company_id;
            }
            
            $sql .= " ORDER BY sl.transaction_date ASC, sl.id ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $ledger = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $balance = $bbf;
            foreach ($ledger as &$entry) {
                $balance += $entry['qty_in'] - $entry['qty_out'];
                $entry['balance'] = $balance;
                $entry['value'] = $balance * $entry['unit_cost'];
            }
            
            echo json_encode(['success' => true, 'data' => $ledger, 'bbf' => $bbf, 'currency' => $currency_symbol]);
            break;
            
        case 'branch-ledger':
            $branch_id = $_GET['branch_id'] ?? null;
            $company_id = $_GET['company_id'] ?? null;
            $from_date = $_GET['from_date'] ?? null;
            $to_date = $_GET['to_date'] ?? null;
            
            if (!$branch_id) {
                echo json_encode(['success' => false, 'message' => 'Branch ID required']);
                exit;
            }
            
            $sql = "SELECT 
                        sl.transaction_date,
                        p.name as product_name,
                        sl.transaction_type,
                        sl.qty_in,
                        sl.qty_out,
                        sl.unit_cost,
                        u.uom_name as unit_symbol
                    FROM stock_ledger sl
                    JOIN products p ON sl.product_id = p.id
                    LEFT JOIN uom u ON sl.unit_id = u.id
                    LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                    LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                    WHERE sl.tenant_id = ? AND sl.branch_id = ? AND p.product_type = 'physical'";
            
            $child_sql = "SELECT id FROM branches WHERE (id = ? OR parent_branch_id = ?) AND tenant_id = ?";
            $child_stmt = $pdo->prepare($child_sql);
            $child_stmt->execute([$branch_id, $branch_id, $tenant_id]);
            $branch_ids = $child_stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (!empty($branch_ids)) {
                $placeholders = str_repeat('?,', count($branch_ids) - 1) . '?';
                $sql = str_replace('sl.branch_id = ?', "sl.branch_id IN ($placeholders)", $sql);
                $params = array_merge([$tenant_id], $branch_ids);
            } else {
                $params = [$tenant_id, $branch_id];
            }
            
            if ($from_date) {
                $sql .= " AND sl.transaction_date >= ?";
                $params[] = $from_date;
            }
            
            if ($to_date) {
                $sql .= " AND sl.transaction_date <= ?";
                $params[] = $to_date;
            }
            
            if ($company_id) {
                $sql .= " AND (pi.company_id = ? OR si.company_id = ?)";
                $params[] = $company_id;
                $params[] = $company_id;
            }
            
            $sql .= " ORDER BY sl.transaction_date DESC, sl.id DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $ledger = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $ledger, 'currency' => $currency_symbol]);
            break;
            
        case 'stats':
            $company_id = $_GET['company_id'] ?? null;
            
            $stats_sql = "SELECT 
                            SUM(COALESCE(stock_data.stock_value, 0)) as total_value,
                            SUM(CASE WHEN stock_data.status = 'in-stock' THEN 1 ELSE 0 END) as in_stock,
                            SUM(CASE WHEN stock_data.status = 'low-stock' THEN 1 ELSE 0 END) as low_stock,
                            SUM(CASE WHEN stock_data.status = 'out-of-stock' THEN 1 ELSE 0 END) as out_of_stock,
                            SUM(CASE WHEN stock_data.status = 'overstock' THEN 1 ELSE 0 END) as overstock
                        FROM (
                            SELECT 
                                (COALESCE(so.opening_qty, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_out ELSE 0 END), 0)) * 
                                COALESCE(
                                    (COALESCE(so.opening_qty, 0) * COALESCE(so.opening_price, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in * sl.unit_cost ELSE 0 END), 0)) / 
                                    NULLIF(COALESCE(so.opening_qty, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in ELSE 0 END), 0), 0),
                                    so.opening_price, 0
                                ) as stock_value,
                                p.min_stock_level,
                                p.max_stock_level,
                                CASE 
                                    WHEN (COALESCE(so.opening_qty, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_out ELSE 0 END), 0)) <= 0 THEN 'out-of-stock'
                                    WHEN (COALESCE(so.opening_qty, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_out ELSE 0 END), 0)) < COALESCE(p.min_stock_level, 0) THEN 'low-stock'
                                    WHEN p.max_stock_level > 0 AND (COALESCE(so.opening_qty, 0) + COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_in ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN sl.transaction_type != 'Opening Stock' THEN sl.qty_out ELSE 0 END), 0)) > p.max_stock_level THEN 'overstock'
                                    ELSE 'in-stock'
                                END as status
                            FROM products p
                            LEFT JOIN stock_opening so ON p.id = so.product_id AND p.tenant_id = so.tenant_id
                            LEFT JOIN stock_ledger sl ON p.id = sl.product_id AND p.tenant_id = sl.tenant_id AND so.branch_id = sl.branch_id
                            LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                            LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                            WHERE p.tenant_id = ?" . ($company_id ? " AND (pi.company_id = ? OR si.company_id = ?)" : "") . " AND p.product_type = 'physical'
                            GROUP BY p.id, so.branch_id
                        ) as stock_data";
            
            $stats_stmt = $pdo->prepare($stats_sql);
            $stats_params = [$tenant_id];
            if ($company_id) {
                $stats_params[] = $company_id;
                $stats_params[] = $company_id;
            }
            $stats_stmt->execute($stats_params);
            $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $stats, 'currency' => $currency_symbol]);
            break;
            
        case 'branches':
            $branches_sql = "SELECT b.id, b.branch_name, b.branch_type, b.parent_branch_id, pb.branch_name as parent_name FROM branches b LEFT JOIN branches pb ON b.parent_branch_id = pb.id WHERE b.tenant_id = ? AND b.is_active = 1 ORDER BY COALESCE(pb.branch_name, b.branch_name), b.parent_branch_id, b.branch_name";
            $branches_stmt = $pdo->prepare($branches_sql);
            $branches_stmt->execute([$tenant_id]);
            $branches = $branches_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($branches as &$branch) {
                $type_map = [
                    'head_office' => 'Head Office',
                    'petrol_station' => 'Petrol Station', 
                    'convenience_store' => 'Convenience Store',
                    'car_wash' => 'Car Wash',
                    'fuel_tank' => 'Fuel Tank',
                    'warehouse' => 'Warehouse',
                    'distribution_center' => 'Distribution Center'
                ];
                $type_display = $type_map[$branch['branch_type']] ?? $branch['branch_type'];
                $branch['display_name'] = $branch['branch_name'] . ' (' . $type_display . ')';
                if ($branch['parent_branch_id']) {
                    $branch['display_name'] = $branch['parent_name'] . ' > ' . $branch['display_name'];
                }
            }
            
            echo json_encode(['success' => true, 'data' => $branches]);
            break;
            
        case 'products':
            $products_sql = "SELECT id, name FROM products WHERE tenant_id = ? AND is_active = 1 AND product_type = 'physical'";
            $products_stmt = $pdo->prepare($products_sql);
            $products_stmt->execute([$tenant_id]);
            $products = $products_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $products]);
            break;
            
        case 'inventory-types':
            $types_sql = "SELECT DISTINCT a.id, a.name FROM accounts a JOIN stock_ledger sl ON a.id = sl.account_id WHERE sl.tenant_id = ? ORDER BY a.name";
            $types_stmt = $pdo->prepare($types_sql);
            $types_stmt->execute([$tenant_id]);
            $types = $types_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $types]);
            break;
            
        case 'distributions':
            $dist_sql = "SELECT DISTINCT s.id, s.supplier_name FROM suppliers s JOIN products p ON s.id = p.vendor_id WHERE s.tenant_id = ? AND s.status = 'ACTIVE' ORDER BY s.supplier_name";
            $dist_stmt = $pdo->prepare($dist_sql);
            $dist_stmt->execute([$tenant_id]);
            $distributions = $dist_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $distributions]);
            break;
            
        case 'companies':
            $companies_sql = "SELECT id, company_name FROM companies WHERE tenant_id = ? AND is_active = 1 ORDER BY company_name";
            $companies_stmt = $pdo->prepare($companies_sql);
            $companies_stmt->execute([$tenant_id]);
            $companies = $companies_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $companies]);
            break;
            
        case 'detailed-ledger':
            $company_id = $_GET['company_id'] ?? null;
            
            $sql = "SELECT 
                        sl.transaction_date,
                        p.name as product_name,
                        b.branch_name,
                        sl.transaction_type,
                        sl.qty_in,
                        sl.qty_out,
                        sl.unit_cost,
                        u.uom_name as unit_symbol
                    FROM stock_ledger sl
                    JOIN products p ON sl.product_id = p.id
                    JOIN branches b ON sl.branch_id = b.id
                    LEFT JOIN uom u ON sl.unit_id = u.id
                    LEFT JOIN purchase_invoice pi ON sl.reference_table = 'purchase_invoice' AND sl.reference_id = pi.id
                    LEFT JOIN sale_invoice si ON sl.reference_table = 'sale_invoice' AND sl.reference_id = si.id
                    WHERE sl.tenant_id = ? AND p.product_type = 'physical'";
            
            $params = [$tenant_id];
            
            if ($company_id) {
                $sql .= " AND (pi.company_id = ? OR si.company_id = ?)";
                $params[] = $company_id;
                $params[] = $company_id;
            }
            
            $sql .= " ORDER BY sl.transaction_date ASC, sl.id ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $ledger = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $ledger, 'currency' => $currency_symbol]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    error_log('Stock Position API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
