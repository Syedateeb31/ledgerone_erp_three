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

if (!$user_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $hs_code = $_GET['hs_code'] ?? '';
    
    if (empty($hs_code)) {
        echo json_encode(['success' => false, 'message' => 'HS Code is required']);
        exit;
    }
    
    $stmt = $pdo->prepare("
        SELECT gst_rate, legal_reference, sro_reference 
        FROM hs_code_tax_rates 
        WHERE hs_code = ? 
        AND schedule = 'eighth_schedule'
        AND is_active = 1 
        AND (effective_to IS NULL OR effective_to >= CURDATE())
        ORDER BY effective_from DESC
        LIMIT 1
    ");
    $stmt->execute([$hs_code]);
    $rate = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($rate) {
        echo json_encode([
            'success' => true, 
            'rate' => $rate['gst_rate'],
            'legal_reference' => $rate['legal_reference'] ?: $rate['sro_reference'] ?: 'N/A'
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'HS Code not found in Eighth Schedule'
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
