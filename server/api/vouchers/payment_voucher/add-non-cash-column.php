<?php
require_once '../../../../includes/connection.php';
try {
    $pdo->exec("ALTER TABLE payment_voucher ADD COLUMN IF NOT EXISTS non_cash TINYINT(1) NOT NULL DEFAULT 0");
    echo "Column added successfully";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
