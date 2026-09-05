<?php
// Simple migration runner
require_once 'includes/connection.php';

$migrationFile = 'database/migrations/add_status_to_purchase_invoice.sql';

if (!file_exists($migrationFile)) {
    die("Migration file not found: $migrationFile\n");
}

$sql = file_get_contents($migrationFile);

try {
    // Execute the migration
    $pdo->exec($sql);
    echo "✓ Migration executed successfully!\n";
    echo "✓ Status column added to purchase_invoice table\n";
} catch (PDOException $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
