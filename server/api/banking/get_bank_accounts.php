<?php
header('Content-Type: application/json');
require_once '../../../includes/connection.php';

try {
    $sql = "SELECT id, bank_name, account_no, account_type
            FROM bank_accounts
            WHERE status = 'Active'
            ORDER BY bank_name ASC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception('Query failed: ' . $conn->error);
    }
    
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        $accounts[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'accounts' => $accounts
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
