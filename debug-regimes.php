<?php
require_once 'includes/connection.php';
session_start();

$tenant_id = $_SESSION['tenant_id'] ?? 1;

// Check tax regimes
$stmt = $pdo->prepare("
    SELECT 
        id,
        regime_name,
        application_level,
        is_active,
        effective_from,
        effective_to
    FROM tax_regimes
    WHERE is_active = 1
    ORDER BY id
");
$stmt->execute();
$regimes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<pre>";
echo "Tax Regimes:\n";
echo "==========================================\n";
foreach ($regimes as $regime) {
    echo "ID: {$regime['id']} | {$regime['regime_name']} | Level: {$regime['application_level']} | Active: {$regime['is_active']}\n";
}
echo "</pre>";
?>
