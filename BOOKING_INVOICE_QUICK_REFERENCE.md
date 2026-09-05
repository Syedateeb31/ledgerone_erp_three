# Booking Invoice Type - Quick Reference

## Stock Deduction Rules

| Invoice Type | Stock Deducted | When | Use Case |
|---|---|---|---|
| **Booking** | ❌ NO | Never | Customer books bike, pays later |
| **Cash** | ✅ YES | Immediately | Customer pays now, takes bike |
| **Credit** | ✅ YES | Immediately | Customer takes bike, pays later |

## Function Reference

### shouldAffectStock($invoiceType)
```php
// Returns true only for Cash and Credit
shouldAffectStock('Booking');  // false
shouldAffectStock('Cash');     // true
shouldAffectStock('Credit');   // true
```

### insertStockLedgerEntry()
```php
insertStockLedgerEntry(
    $pdo,                    // PDO connection
    $tenant_id,              // Tenant ID
    $invoice_id,             // Invoice ID
    $product_id,             // Product ID
    $quantity,               // Quantity sold
    $uom_id,                 // Unit of Measurement ID
    $branch_id,              // Branch ID
    $sale_date,              // Sale date
    $invoiceType             // 'Booking', 'Cash', or 'Credit'
);
// Returns: true if entry created, false if skipped
```

### insertFOCStockLedgerEntry()
```php
insertFOCStockLedgerEntry(
    $pdo,                    // PDO connection
    $tenant_id,              // Tenant ID
    $invoice_id,             // Invoice ID
    $product_id,             // Product ID
    $focQty,                 // FOC quantity
    $uom_id,                 // Unit of Measurement ID
    $branch_id,              // Branch ID
    $sale_date,              // Sale date
    $invoiceType             // 'Booking', 'Cash', or 'Credit'
);
// Returns: true if entry created, false if skipped
```

### deleteInvoiceStockLedger()
```php
deleteInvoiceStockLedger(
    $pdo,                    // PDO connection
    $tenant_id,              // Tenant ID
    $invoice_id              // Invoice ID
);
// Deletes all stock_ledger entries for this invoice
```

### getCostPrice()
```php
$costPrice = getCostPrice(
    $pdo,                    // PDO connection
    $tenant_id,              // Tenant ID
    $product_id,             // Product ID
    $branch_id               // Branch ID
);
// Returns: Cost price based on FIFO/LIFO/AVCO method
```

## Usage in pos-add.php

```php
// Include the helper
require_once 'stock-management.php';

// When creating invoice items
foreach ($input['items'] as $item) {
    // ... insert item into database ...
    
    // Handle stock ledger based on invoice type
    if ($status === 'Posted' && $item['stockAffects'] == 1) {
        insertStockLedgerEntry(
            $pdo, $tenant_id, $invoice_id, $item['productId'],
            $item['quantity'], $item['uomId'], $input['branchId'],
            $input['saleDate'], $input['invoiceType'] ?? 'Cash'
        );
        
        // Handle FOC if exists
        if (isset($item['focQty']) && $item['focQty'] > 0) {
            insertFOCStockLedgerEntry(
                $pdo, $tenant_id, $invoice_id, $item['productId'],
                $item['focQty'], $item['uomId'], $input['branchId'],
                $input['saleDate'], $input['invoiceType'] ?? 'Cash'
            );
        }
    }
}
```

## Usage in pos-edit.php

```php
// Include the helper
require_once 'stock-management.php';

// When editing invoice
// 1. Delete old stock ledger entries
deleteInvoiceStockLedger($pdo, $tenant_id, $invoice_id);

// 2. Recreate based on new invoice type
foreach ($input['items'] as $item) {
    // ... insert item into database ...
    
    if ($status === 'Posted') {
        insertStockLedgerEntry(
            $pdo, $tenant_id, $invoice_id, $item['productId'],
            $item['quantity'], $item['uomId'], $input['branchId'],
            $input['saleDate'], $input['invoiceType'] ?? 'Cash'
        );
        
        if (isset($item['focQty']) && $item['focQty'] > 0) {
            insertFOCStockLedgerEntry(
                $pdo, $tenant_id, $invoice_id, $item['productId'],
                $item['focQty'], $item['uomId'], $input['branchId'],
                $input['saleDate'], $input['invoiceType'] ?? 'Cash'
            );
        }
    }
}
```

## Stock Ledger Entry Structure

### Regular Item (Cash/Credit)
```sql
INSERT INTO stock_ledger (
    tenant_id,              -- Tenant ID
    account_id,             -- Inventory account ID
    branch_id,              -- Branch ID
    product_id,             -- Product ID
    reference_table,        -- 'sale_invoice'
    reference_id,           -- Invoice ID
    qty_out,                -- Quantity sold
    unit_cost,              -- Cost price
    unit_id,                -- UOM ID
    transaction_type,       -- 'Sale Invoice'
    transaction_date        -- Sale date
) VALUES (...)
```

### FOC Item (Cash/Credit)
```sql
INSERT INTO stock_ledger (
    tenant_id,              -- Tenant ID
    account_id,             -- Inventory account ID
    branch_id,              -- Branch ID
    product_id,             -- Product ID
    reference_table,        -- 'sale_invoice'
    reference_id,           -- Invoice ID
    qty_out,                -- FOC quantity
    unit_cost,              -- 0 (free)
    unit_id,                -- UOM ID
    transaction_type,       -- 'Sale Invoice - FOC'
    transaction_date        -- Sale date
) VALUES (...)
```

### Booking Invoice
```
NO stock_ledger entries created
```

## Common Scenarios

### Scenario 1: Create Booking
```
POST /pos-add.php
{
    "invoiceType": "Booking",
    "items": [{"productId": 1, "quantity": 1}]
}

Result:
- Invoice created with type = 'Booking'
- NO stock_ledger entries
- Stock unchanged
```

### Scenario 2: Edit Booking → Cash
```
PUT /pos-edit.php
{
    "invoice_id": 1,
    "invoiceType": "Cash",
    "items": [{"productId": 1, "quantity": 1}]
}

Result:
- Old stock_ledger entries deleted (none exist)
- New stock_ledger entry created
- Stock deducted
```

### Scenario 3: Edit Cash → Booking
```
PUT /pos-edit.php
{
    "invoice_id": 1,
    "invoiceType": "Booking",
    "items": [{"productId": 1, "quantity": 1}]
}

Result:
- Old stock_ledger entry deleted
- NO new stock_ledger entries created
- Stock added back
```

## Debugging Tips

### Check if stock_ledger entry exists
```sql
SELECT * FROM stock_ledger 
WHERE reference_table = 'sale_invoice' 
AND reference_id = {invoice_id};
```

### Check invoice type
```sql
SELECT id, bill_no, invoice_type, status 
FROM sale_invoice 
WHERE id = {invoice_id};
```

### Check stock position
```sql
SELECT product_id, SUM(qty_in) - SUM(qty_out) as balance
FROM stock_ledger
WHERE product_id = {product_id}
GROUP BY product_id;
```

### Verify shouldAffectStock logic
```php
// In PHP
var_dump(shouldAffectStock('Booking'));  // false
var_dump(shouldAffectStock('Cash'));     // true
var_dump(shouldAffectStock('Credit'));   // true
```

## Error Handling

### If stock_ledger not created for Cash invoice
1. Check `shouldAffectStock()` returns true
2. Verify `$status === 'Posted'`
3. Check `$item['stockAffects'] == 1`
4. Verify product exists in database

### If stock_ledger created for Booking invoice
1. Check `invoiceType` is exactly 'Booking'
2. Verify `shouldAffectStock()` is being called
3. Check for typos in invoice type

### If stock not deducted after edit
1. Verify `deleteInvoiceStockLedger()` was called
2. Check new stock_ledger entries were created
3. Verify invoice status is 'Posted'

## Performance Considerations

- `shouldAffectStock()` - O(1) array lookup
- `insertStockLedgerEntry()` - 1 database query
- `insertFOCStockLedgerEntry()` - 2 database queries (1 lookup + 1 insert)
- `deleteInvoiceStockLedger()` - 1 database query
- `getCostPrice()` - 1-2 database queries depending on method

Total per invoice: ~5-10 queries (same as before)

## Migration Checklist

- [ ] Copy `stock-management.php` to server/api/sale/pos_invoice/
- [ ] Update `pos-add.php` with new code
- [ ] Update `pos-edit.php` with new code
- [ ] Test creating Booking invoice
- [ ] Test editing Booking → Cash
- [ ] Test editing Cash → Booking
- [ ] Verify stock_ledger entries
- [ ] Verify accounting entries
- [ ] Test with FOC items
- [ ] Test with multiple items
- [ ] Verify no breaking changes
