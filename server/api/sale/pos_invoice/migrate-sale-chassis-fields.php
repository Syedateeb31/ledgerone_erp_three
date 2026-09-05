<?php
require_once '../../../../includes/connection.php';
header('Content-Type: application/json');

try {
    $pdo->exec("
        ALTER TABLE sale_invoice_items
        ADD COLUMN IF NOT EXISTS chassis_no VARCHAR(100) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS motor_no VARCHAR(100) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS colour VARCHAR(100) NULL DEFAULT NULL
    ");
    echo json_encode(['success' => true, 'message' => 'Columns added to sale_invoice_items']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
