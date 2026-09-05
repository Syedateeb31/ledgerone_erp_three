<?php
header('Content-Type: application/json');
require_once '../../../includes/connection.php';

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode(['success' => false, 'invoices' => []]);
    exit;
}

try {
    $searchTerm = '%' . $query . '%';
    
    $sql = "SELECT si.id, si.invoice_no, si.sale_date, p.name as product_name
            FROM sale_invoices si
            LEFT JOIN sale_invoice_items sii ON si.id = sii.invoice_id
            LEFT JOIN products p ON sii.product_id = p.id
            WHERE si.invoice_no LIKE ? OR p.name LIKE ?
            LIMIT 10";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $searchTerm, $searchTerm);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $invoices = [];
    
    while ($row = $result->fetch_assoc()) {
        $invoices[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'invoices' => $invoices
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
