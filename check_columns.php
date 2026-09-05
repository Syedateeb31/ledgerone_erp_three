<?php
require_once 'includes/connection.php';
try {
    $result = $pdo->query("SHOW COLUMNS FROM purchase_order WHERE Field IN ('bilty_no', 'transport_name', 'truck_no')");
    $cols = $result->fetchAll(PDO::FETCH_ASSOC);
    if (empty($cols)) {
        echo "MISSING: None of these columns exist!";
    } else {
        foreach ($cols as $col) {
            echo "EXISTS: " . $col['Field'] . " (" . $col['Type'] . ")\n";
        }
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
