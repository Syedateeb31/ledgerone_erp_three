<?php
require_once '../../../../includes/connection.php';
try {
    $pdo->exec("ALTER TABLE purchase_invoice ADD COLUMN IF NOT EXISTS aiq_status ENUM('Booking','Received') NULL DEFAULT NULL");
    echo "OK: aiq_status column added";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
