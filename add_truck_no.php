<?php
require_once 'includes/connection.php';
try {
    // Check if column already exists
    $check = $pdo->query("SHOW COLUMNS FROM purchase_order LIKE 'truck_no'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE purchase_order ADD COLUMN truck_no VARCHAR(100) NULL AFTER transport_name");
        echo "SUCCESS: truck_no column added to purchase_order table.";
    } else {
        echo "INFO: truck_no column already exists.";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
