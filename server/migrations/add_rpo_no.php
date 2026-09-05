<?php
session_start();
require_once '../../../includes/connection.php';

try {
    $pdo->exec("ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS rpo_no VARCHAR(100) DEFAULT NULL AFTER bill_no");
    echo "Success: rpo_no column added (or already exists)";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
