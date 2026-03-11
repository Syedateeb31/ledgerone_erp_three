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
    $stmt = $pdo->prepare("
        SELECT id, branch_code, branch_name, parent_branch_id, branch_type
        FROM branches
        WHERE tenant_id = ? AND is_active = 1
        ORDER BY branch_name ASC
    ");
    $stmt->execute([$tenant_id]);
    $branches = $stmt->fetchAll();
    
    function buildHierarchy($branches, $parentId = null, $prefix = '') {
        $hierarchy = [];
        foreach ($branches as $branch) {
            if ($branch['parent_branch_id'] == $parentId) {
                $isParent = false;
                foreach ($branches as $b) {
                    if ($b['parent_branch_id'] == $branch['id']) {
                        $isParent = true;
                        break;
                    }
                }
                
                $hierarchy[] = [
                    'id' => $branch['id'],
                    'code' => $branch['branch_code'],
                    'name' => $prefix . $branch['branch_name'],
                    'type' => $branch['branch_type'],
                    'isParent' => $isParent
                ];
                $children = buildHierarchy($branches, $branch['id'], $prefix . '└─ ');
                $hierarchy = array_merge($hierarchy, $children);
            }
        }
        return $hierarchy;
    }
    
    $hierarchicalBranches = buildHierarchy($branches);
    
    echo json_encode([
        'success' => true,
        'branches' => $hierarchicalBranches
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching branches: ' . $e->getMessage()
    ]);
}
