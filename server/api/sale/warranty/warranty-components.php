<?php
require_once '../../../../includes/connection.php';

if (session_status() == PHP_SESSION_NONE) session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$user_id   = $_SESSION['user_id']   ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ── GET all components ────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT id, component_name
            FROM warranty_components
            WHERE tenant_id = ?
            ORDER BY component_name
        ");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'components' => $stmt->fetchAll()]);
        exit;
    }

    // ── POST add component ────────────────────────────────────────────────────
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['component_name'] ?? '');

        if (!$name) throw new Exception('Component name is required');

        // Check duplicate
        $chk = $pdo->prepare("SELECT id FROM warranty_components WHERE tenant_id = ? AND component_name = ?");
        $chk->execute([$tenant_id, $name]);
        if ($chk->fetch()) throw new Exception('Component already exists');

        $stmt = $pdo->prepare("INSERT INTO warranty_components (tenant_id, component_name, created_by) VALUES (?, ?, ?)");
        $stmt->execute([$tenant_id, $name, $user_id]);

        echo json_encode([
            'success'        => true,
            'message'        => 'Component added',
            'id'             => (int)$pdo->lastInsertId(),
            'component_name' => $name
        ]);
        exit;
    }

    // ── DELETE component ──────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');

        $stmt = $pdo->prepare("DELETE FROM warranty_components WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(['success' => true, 'message' => 'Deleted']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
