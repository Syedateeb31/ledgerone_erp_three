<?php
require_once '../../../includes/connection.php';

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    die('Unauthorized');
}

$backupName = $_GET['name'] ?? 'backup_' . date('Y_m_d_H_i_s');
$backupName = preg_replace('/[^a-zA-Z0-9_-]/', '', $backupName);

$filename = $backupName . '.sql';

// Set headers for download
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');

try {
    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $output = "-- Database Backup for Tenant ID: {$tenant_id}\n";
    $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
    
    foreach ($tables as $table) {
        // Get table structure
        $stmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
        $row = $stmt->fetch(PDO::FETCH_NUM);
        $output .= "\n\n-- Table: {$table}\n";
        $output .= $row[1] . ";\n\n";
        
        // Check if table has tenant_id column
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE 'tenant_id'");
        $hasTenantId = $stmt->rowCount() > 0;
        
        if ($hasTenantId) {
            // Export only data for this tenant
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE tenant_id = ?");
            $stmt->execute([$tenant_id]);
        } else {
            // Export all data for tables without tenant_id
            $stmt = $pdo->query("SELECT * FROM `{$table}`");
        }
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $output .= "INSERT INTO `{$table}` (";
            $output .= implode(', ', array_map(function($col) { return "`{$col}`"; }, array_keys($row)));
            $output .= ") VALUES (";
            $output .= implode(', ', array_map(function($val) use ($pdo) { return $pdo->quote($val); }, array_values($row)));
            $output .= ");\n";
        }
    }
    
    echo $output;
} catch (Exception $e) {
    http_response_code(500);
    die('Backup failed: ' . $e->getMessage());
}
exit;
