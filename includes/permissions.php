<?php
function hasPermission($pdo, $role_id, $category, $form_name) {
    $stmt = $pdo->prepare("
        SELECT allowed 
        FROM role_permissions 
        WHERE role_id = ? 
        AND category = ? 
        AND form_name = ?
        AND allowed = 1
    ");
    $stmt->execute([$role_id, $category, $form_name]);
    return $stmt->fetch() !== false;
}
