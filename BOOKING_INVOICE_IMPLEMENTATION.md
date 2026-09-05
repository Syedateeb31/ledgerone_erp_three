# Booking Invoice Type Implementation

## Overview
This implementation adds support for a "Booking" invoice type in the POS system. When a customer wants to book a bike/product but hasn't paid yet, you can create a Booking invoice. Stock is NOT deducted for Booking invoices.

When the customer later comes to pick up the bike and pays, you can edit the invoice and change the type to "Cash" or "Credit", which will then deduct the stock.

## Features

### Invoice Types
- **Cash**: Immediate payment, stock is deducted
- **Credit**: Payment on credit terms, stock is deducted
- **Booking**: Advance booking with partial/no payment, stock is NOT deducted

### Stock Management Logic
- Stock is only deducted when invoice type is "Cash" or "Credit"
- Stock is NOT deducted for "Booking" invoices
- When editing a Booking invoice and changing it to Cash/Credit, stock will be deducted
- When editing a Cash/Credit invoice and changing it to Booking, stock will be added back

## Database Changes

### sale_invoice Table
The `invoice_type` column already exists in the sale_invoice table with enum values:
```sql
invoice_type ENUM('Cash', 'Credit', 'Booking') DEFAULT 'Cash'
```

If you need to add this column or update it:
```sql
ALTER TABLE sale_invoice MODIFY COLUMN invoice_type ENUM('Cash', 'Credit', 'Booking') DEFAULT 'Cash';
```

## Files Modified/Created

### New Files
1. **server/api/sale/pos_invoice/stock-management.php**
   - Helper functions for stock ledger management
   - Functions:
     - `shouldAffectStock($invoiceType)` - Determines if stock should be deducted
     - `insertStockLedgerEntry()` - Inserts stock ledger entry based on invoice type
     - `insertFOCStockLedgerEntry()` - Inserts FOC stock ledger entry
     - `deleteInvoiceStockLedger()` - Deletes stock ledger entries for an invoice
     - `getCostPrice()` - Gets cost price based on valuation method

### Modified Files
1. **server/api/sale/pos_invoice/pos-add.php**
   - Now uses `stock-management.php` helper functions
   - Stock deduction is conditional based on invoice type
   - Removed duplicate `getCostPrice()` function

2. **server/api/sale/pos_invoice/pos-edit.php**
   - Now uses `stock-management.php` helper functions
   - Stock ledger is deleted and recreated based on new invoice type
   - Removed duplicate functions

## How It Works

### Creating a Booking Invoice
```javascript
// Frontend sends invoice data with invoiceType = 'Booking'
{
    invoiceType: 'Booking',
    items: [...],
    // ... other fields
}
```

**Backend Processing:**
1. Invoice is created in `sale_invoice` table with `invoice_type = 'Booking'`
2. Stock ledger entries are NOT created (because `shouldAffectStock('Booking')` returns false)
3. Accounting entries are created normally

### Editing Booking → Cash/Credit
When you edit a Booking invoice and change it to Cash or Credit:

1. Existing stock ledger entries are deleted
2. New stock ledger entries are created (because `shouldAffectStock('Cash'/'Credit')` returns true)
3. Stock is now deducted from inventory

### Editing Cash/Credit → Booking
When you edit a Cash/Credit invoice and change it to Booking:

1. Existing stock ledger entries are deleted
2. New stock ledger entries are NOT created (because `shouldAffectStock('Booking')` returns false)
3. Stock is added back to inventory

## Stock Ledger Behavior

### For Booking Invoices
```
No stock_ledger entries created
Stock remains unchanged
```

### For Cash/Credit Invoices
```
stock_ledger entry created with:
- qty_out = quantity sold
- transaction_type = 'Sale Invoice'
- reference_table = 'sale_invoice'
- reference_id = invoice_id
```

### For FOC (Free on Cost) Items
```
If focQty > 0 and invoice type is Cash/Credit:
- Additional stock_ledger entry created with:
  - qty_out = focQty
  - transaction_type = 'Sale Invoice - FOC'
  - unit_cost = 0
```

## API Endpoints

### POST /server/api/sale/pos_invoice/pos-add.php
Creates a new invoice. Stock deduction is based on `invoiceType` field.

**Request:**
```json
{
    "invoiceType": "Booking",
    "customerId": 1,
    "branchId": 1,
    "saleDate": "2026-01-15",
    "items": [
        {
            "productId": 1,
            "quantity": 1,
            "salePrice": 50000,
            "invoiceType": "Booking"
        }
    ]
}
```

### PUT /server/api/sale/pos_invoice/pos-edit.php
Updates an existing invoice. Stock ledger is recalculated based on new `invoiceType`.

**Request:**
```json
{
    "invoice_id": 1,
    "invoiceType": "Cash",
    "items": [...]
}
```

## Stock Calculation Examples

### Example 1: Create Booking Invoice
- Product: Bike (Stock: 10)
- Create Booking invoice for 1 bike
- Result: Stock remains 10 (no deduction)

### Example 2: Edit Booking → Cash
- Current: Booking invoice for 1 bike (Stock: 10)
- Edit: Change to Cash
- Result: Stock becomes 9 (1 bike deducted)

### Example 3: Edit Cash → Booking
- Current: Cash invoice for 1 bike (Stock: 9)
- Edit: Change to Booking
- Result: Stock becomes 10 (1 bike added back)

## Testing Checklist

- [ ] Create a Booking invoice - verify stock is NOT deducted
- [ ] Edit Booking invoice to Cash - verify stock IS deducted
- [ ] Edit Cash invoice to Booking - verify stock is added back
- [ ] Create Cash invoice - verify stock is deducted immediately
- [ ] Create Credit invoice - verify stock is deducted immediately
- [ ] Edit invoice with FOC items - verify FOC stock is handled correctly
- [ ] Delete Booking invoice - verify stock ledger is cleaned up
- [ ] Delete Cash invoice - verify stock ledger is cleaned up

## Troubleshooting

### Stock Not Deducting for Cash/Credit Invoices
1. Check that `invoice_type` is correctly set to 'Cash' or 'Credit'
2. Verify `stock_affects` flag on product is 1
3. Check that invoice status is 'Posted' (not 'Draft')
4. Verify stock_ledger table has entries

### Stock Deducting for Booking Invoices
1. Check that `invoice_type` is set to 'Booking'
2. Verify `shouldAffectStock()` function is being called
3. Check stock_ledger table - should have NO entries for Booking invoices

### Accounting Entries Not Created
1. Verify invoice status is 'Posted'
2. Check accounting_ledger table for entries
3. Verify user has permission to create accounting entries

## Future Enhancements

1. Add "Booking Confirmation" status to track when booking is confirmed
2. Add automatic stock reservation for Booking invoices (optional)
3. Add booking expiry date to automatically cancel old bookings
4. Add booking conversion report to track Booking → Cash/Credit conversions
5. Add stock availability check before allowing Booking creation
