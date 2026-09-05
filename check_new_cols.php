<?php
require_once 'includes/connection.php';
$stmt = $pdo->query("DESCRIBE purchase_invoice");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $col) {
    if (in_array($col['Field'], ['rpo_no', 'truck_no', 'payment_term_id'])) {
        echo $col['Field'] . ' | ' . $col['Type'] . ' | Null: ' . $col['Null'] . ' | Default: ' . $col['Default'] . "\n";
    }
}
