<?php
session_start();
require_once 'includes/connection.php';

$tenant_id = $_SESSION['tenant_id'] ?? 1;

// Get a sample product that shows the issue
$debug_sql = "SELECT 
    p.id as product_id,
    p.name as product_name,
    sl.branch_id,
    b.branch_name,
    sl.account_id,
    a.name as account_name,
    sl.unit_id,
    u.uom_name,
    COUNT(*) as transaction_count,
    SUM(sl.qty_in) as total_in,
    SUM(sl.qty_out) as total_out,
    SUM(sl.qty_in - sl.qty_out) as net_stock
FROM stock_ledger sl
JOIN products p ON sl.product_id = p.id
LEFT JOIN branches b ON sl.branch_id = b.id
LEFT JOIN accounts a ON sl.account_id = a.id
LEFT JOIN uom u ON sl.unit_id = u.id
WHERE sl.tenant_id = ?
GROUP BY p.id, sl.branch_id, sl.account_id, sl.unit_id
ORDER BY p.name, sl.branch_id, sl.account_id
LIMIT 50";

$stmt = $pdo->prepare($debug_sql);
$stmt->execute([$tenant_id]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h1>Stock Ledger Debug Report</h1>";
echo "<p>Tenant ID: $tenant_id</p>";
echo "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse;'>";
echo "<tr>
    <th>Product ID</th>
    <th>Product Name</th>
    <th>Branch ID</th>
    <th>Branch Name</th>
    <th>Account ID</th>
    <th>Account Name</th>
    <th>Unit ID</th>
    <th>Unit Name</th>
    <th>Transactions</th>
    <th>Total In</th>
    <th>Total Out</th>
    <th>Net Stock</th>
</tr>";

foreach ($results as $row) {
    $highlight = '';
    if ($row['net_stock'] < 0) {
        $highlight = 'style="background-color: #ffcccc;"';
    } elseif ($row['account_id'] === null) {
        $highlight = 'style="background-color: #ffffcc;"';
    }
    
    echo "<tr $highlight>";
    echo "<td>{$row['product_id']}</td>";
    echo "<td>{$row['product_name']}</td>";
    echo "<td>{$row['branch_id']}</td>";
    echo "<td>" . ($row['branch_name'] ?? 'NULL') . "</td>";
    echo "<td>" . ($row['account_id'] ?? 'NULL') . "</td>";
    echo "<td>" . ($row['account_name'] ?? 'NULL') . "</td>";
    echo "<td>{$row['unit_id']}</td>";
    echo "<td>{$row['uom_name']}</td>";
    echo "<td>{$row['transaction_count']}</td>";
    echo "<td>{$row['total_in']}</td>";
    echo "<td>{$row['total_out']}</td>";
    echo "<td>{$row['net_stock']}</td>";
    echo "</tr>";
}

echo "</table>";

echo "<br><br><h2>Sample Transactions for First Product with Issue</h2>";

// Find first product with duplicate accounts
$problem_product = null;
$product_groups = [];
foreach ($results as $row) {
    $key = $row['product_id'] . '_' . $row['branch_id'];
    if (!isset($product_groups[$key])) {
        $product_groups[$key] = [];
    }
    $product_groups[$key][] = $row;
}

foreach ($product_groups as $key => $group) {
    if (count($group) > 1) {
        $problem_product = $group[0];
        break;
    }
}

if ($problem_product) {
    $trans_sql = "SELECT 
        sl.id,
        sl.transaction_date,
        sl.transaction_type,
        sl.reference_table,
        sl.reference_id,
        sl.account_id,
        a.name as account_name,
        sl.qty_in,
        sl.qty_out,
        sl.unit_cost,
        sl.stock_status
    FROM stock_ledger sl
    LEFT JOIN accounts a ON sl.account_id = a.id
    WHERE sl.tenant_id = ? 
        AND sl.product_id = ? 
        AND sl.branch_id = ?
    ORDER BY sl.transaction_date, sl.id";
    
    $trans_stmt = $pdo->prepare($trans_sql);
    $trans_stmt->execute([$tenant_id, $problem_product['product_id'], $problem_product['branch_id']]);
    $transactions = $trans_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Product: {$problem_product['product_name']} (ID: {$problem_product['product_id']})</p>";
    echo "<p>Branch: {$problem_product['branch_name']} (ID: {$problem_product['branch_id']})</p>";
    
    echo "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse;'>";
    echo "<tr>
        <th>ID</th>
        <th>Date</th>
        <th>Type</th>
        <th>Reference</th>
        <th>Account ID</th>
        <th>Account Name</th>
        <th>Qty In</th>
        <th>Qty Out</th>
        <th>Unit Cost</th>
        <th>Status</th>
    </tr>";
    
    foreach ($transactions as $trans) {
        $highlight = $trans['account_id'] === null ? 'style="background-color: #ffffcc;"' : '';
        echo "<tr $highlight>";
        echo "<td>{$trans['id']}</td>";
        echo "<td>{$trans['transaction_date']}</td>";
        echo "<td>{$trans['transaction_type']}</td>";
        echo "<td>{$trans['reference_table']}:{$trans['reference_id']}</td>";
        echo "<td>" . ($trans['account_id'] ?? 'NULL') . "</td>";
        echo "<td>" . ($trans['account_name'] ?? 'NULL') . "</td>";
        echo "<td>{$trans['qty_in']}</td>";
        echo "<td>{$trans['qty_out']}</td>";
        echo "<td>{$trans['unit_cost']}</td>";
        echo "<td>{$trans['stock_status']}</td>";
        echo "</tr>";
    }
    
    echo "</table>";
}

echo "<br><br><h2>Legend</h2>";
echo "<p><span style='background-color: #ffcccc; padding: 5px;'>Red</span> = Negative stock</p>";
echo "<p><span style='background-color: #ffffcc; padding: 5px;'>Yellow</span> = NULL account_id</p>";
?>
