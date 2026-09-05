<?php
require_once 'includes/connection.php';
try {
    $result = $pdo->query("SELECT id, bill_no, bilty_no, transport_name, truck_no FROM purchase_order ORDER BY id DESC LIMIT 5");
    $rows = $result->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($rows);
    echo "</pre>";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
