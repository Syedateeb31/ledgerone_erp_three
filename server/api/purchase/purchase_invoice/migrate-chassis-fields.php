<?php
require_once '../../../../includes/connection.php';
header('Content-Type: application/json');

try {
    $pdo->exec("
        ALTER TABLE purchase_invoice_items
        ADD COLUMN IF NOT EXISTS chassis_no VARCHAR(100) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS motor_no VARCHAR(100) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS colour VARCHAR(100) NULL DEFAULT NULL
    ");
    echo json_encode(['success' => true, 'message' => 'Columns added successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
