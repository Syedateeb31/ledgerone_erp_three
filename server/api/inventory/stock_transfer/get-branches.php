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
    $query = "SELECT id, branch_code, branch_name, parent_branch_id, branch_type 
              FROM branches 
              WHERE tenant_id = :tenant_id AND is_active = 1 AND allows_inventory = 1
              ORDER BY parent_branch_id, branch_name";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute(['tenant_id' => $tenant_id]);
    $branches = $stmt->fetchAll();
    
    // Build hierarchy
    $hierarchical = [];
    foreach ($branches as $branch) {
        if ($branch['parent_branch_id'] === null) {
            // Add parent as non-selectable reference
            $hierarchical[] = [
                'id' => null,
                'code' => $branch['branch_code'],
                'name' => $branch['branch_name'],
                'display' => $branch['branch_name'],
                'level' => 0,
                'selectable' => false
            ];
            
            // Add children
            foreach ($branches as $child) {
                if ($child['parent_branch_id'] == $branch['id']) {
                    $hierarchical[] = [
                        'id' => $child['id'],
                        'code' => $child['branch_code'],
                        'name' => $child['branch_name'],
                        'display' => '  └─ ' . $child['branch_name'],
                        'level' => 1,
                        'selectable' => true
                    ];
                }
            }
        }
    }
    
    echo json_encode(['success' => true, 'branches' => $hierarchical]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
