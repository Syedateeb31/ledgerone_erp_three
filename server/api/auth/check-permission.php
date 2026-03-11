<?php
require_once '../../../includes/connection.php';

header('Content-Type: application/json');

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    echo json_encode(['success' => false, 'permissions' => []]);
    exit;
}

$category = $_GET['category'] ?? '';
$form_name = $_GET['form_name'] ?? '';

if (!$category || !$form_name) {
    echo json_encode(['success' => false, 'permissions' => []]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT rp.sub_permission, rp.allowed
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id AND ur.tenant_id = rp.tenant_id
        WHERE ur.user_id = ? 
        AND ur.tenant_id = ? 
        AND ur.is_active = 1
        AND rp.category = ?
        AND rp.form_name = ?
        AND rp.allowed = 1
    ");
    $stmt->execute([$user_id, $tenant_id, $category, $form_name]);
    $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($permissions)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'redirect' => true]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'permissions' => $permissions
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'permissions' => []]);
}
?>
