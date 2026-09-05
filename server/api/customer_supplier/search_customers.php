<?php
header('Content-Type: application/json');
require_once '../../../includes/connection.php';

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode(['success' => false, 'customers' => []]);
    exit;
}

try {
    $searchTerm = '%' . $query . '%';
    
    $sql = "SELECT id, name, phone, email, address, cnic
            FROM customers
            WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
            LIMIT 10";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sss', $searchTerm, $searchTerm, $searchTerm);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $customers = [];
    
    while ($row = $result->fetch_assoc()) {
        $customers[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'customers' => $customers
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
