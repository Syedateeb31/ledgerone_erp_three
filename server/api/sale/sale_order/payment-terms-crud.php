<?php
ob_start();
session_start();
require_once '../../../../includes/connection.php';
ob_end_clean();

ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$tenant_id = $_SESSION['tenant_id'] ?? null;
if (!$tenant_id) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Get all active + inactive for management list
        $stmt = $pdo->prepare("SELECT id, term_name, days, is_active FROM payment_terms WHERE tenant_id = ? ORDER BY days ASC");
        $stmt->execute([$tenant_id]);
        echo json_encode(['success' => true, 'payment_terms' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $term_name = trim($data['term_name'] ?? '');
        $days = intval($data['days'] ?? 0);

        if (!$term_name) {
            echo json_encode(['success' => false, 'message' => 'Term name is required']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO payment_terms (tenant_id, term_name, days, is_active) VALUES (?, ?, ?, 1)");
        $stmt->execute([$tenant_id, $term_name, $days]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

    } elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id'] ?? 0);
        $term_name = trim($data['term_name'] ?? '');
        $days = intval($data['days'] ?? 0);

        if (!$id || !$term_name) {
            echo json_encode(['success' => false, 'message' => 'ID and term name are required']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE payment_terms SET term_name = ?, days = ? WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$term_name, $days, $id, $tenant_id]);
        echo json_encode(['success' => true]);

    } elseif ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID is required']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM payment_terms WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
