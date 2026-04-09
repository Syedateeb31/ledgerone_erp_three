-- Test Query for Detailed Ledger
-- Run this in phpMyAdmin to verify FOC transactions are returned
-- Replace tenant_id = 2 with your actual tenant_id if different

SELECT 
    sl.id,
    sl.transaction_date,
    p.name as product_name,
    b.branch_name,
    sl.transaction_type,
    sl.qty_in,
    sl.qty_out,
    sl.unit_cost,
    COALESCE(u.uom_name, 'L') as unit_symbol,
    p.product_type,
    sl.reference_table,
    sl.reference_id
FROM stock_ledger sl
JOIN products p ON sl.product_id = p.id
JOIN branches b ON sl.branch_id = b.id
LEFT JOIN uom u ON sl.unit_id = u.id
WHERE sl.tenant_id = 2 
    AND p.product_type = 'physical'
    AND p.id = 1179  -- OR remove this line to see all products
ORDER BY sl.transaction_date ASC, sl.id ASC;

-- Expected result: Should see both rows 7830 (Sale Invoice) and 7831 (Sale Invoice - FOC)
