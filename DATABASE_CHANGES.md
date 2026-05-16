# Sale Return - T.O Amt & FOC Qty Implementation

## Database Changes

### 1. sale_return_items Table
The following fields are already in the table and are being used:
- `trade_offer_amount` - Stores the Trade Offer Amount from sale_invoice_items
- `foc_quantity` - Stores the Free of Charge Quantity from sale_invoice_items

### 2. stock_ledger Table
Two types of entries are created for Sale Returns:

#### Entry Type 1: Regular Sale Return
```sql
INSERT INTO stock_ledger (
    tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
    qty_in, unit_cost, unit_id, stock_status, transaction_type, transaction_date
) VALUES (
    ?, ?, ?, ?, 'sale_return', ?, ?, ?, ?, ?, 'Sale Return', ?
);
```
- `qty_in`: Quantity returned (from unitEntries)
- `unit_cost`: Sale price of the product
- `unit_id`: UOM ID (Piece, Dozen, Carton, etc.)
- `transaction_type`: 'Sale Return'

#### Entry Type 2: FOC Quantity (if focQuantity > 0)
```sql
INSERT INTO stock_ledger (
    tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
    qty_in, unit_cost, unit_id, stock_status, transaction_type, transaction_date
) VALUES (
    ?, ?, ?, ?, 'sale_return', ?, ?, ?, ?, ?, 'Sale Return - FOC', ?
);
```
- `qty_in`: FOC Quantity returned
- `unit_cost`: 0 (FOC items have no cost)
- `unit_id`: UOM ID (typically Piece)
- `transaction_type`: 'Sale Return - FOC'

## Data Flow

### Frontend (counter-return.js)
1. User enters T.O Amt and FOC Qty in the item row
2. Values are stored in item object:
   - `item.tradeOfferAmount` - Trade Offer Amount
   - `item.focQuantity` - Free of Charge Quantity

3. When loading invoice, values are auto-populated from sale_invoice_items:
   ```javascript
   tradeOfferAmount: parseFloat(firstItem.trade_offer_amount || 0),
   focQuantity: parseFloat(firstItem.foc_quantity || 0)
   ```

### Backend (return-add.php)
1. **sale_return_items insertion**:
   - `trade_offer_amount`: Proportionally distributed based on unit quantities
   - `foc_quantity`: Proportionally distributed based on unit quantities

2. **stock_ledger entries**:
   - Regular return: One entry per unit with actual quantity
   - FOC return: Separate entry with transaction_type = 'Sale Return - FOC'

## Calculation Logic

### Trade Offer Amount Distribution
```
proportionOfTotal = qtyInPieces / totalQtyInPieces
trade_offer_amount_for_unit = item.tradeOfferAmount * proportionOfTotal
```

### FOC Quantity Distribution
```
foc_quantity_for_unit = item.focQuantity * proportionOfTotal
```

### Net Amount Calculation
```
net_amount = gross_amount - discount_amount + gst_amount - trade_offer_amount
```

## Example

**Sale Return with multiple units:**
- Product: ABC-001
- Quantity: 2 Cartons (16 pieces each) + 1 Dozen (12 pieces) = 44 pieces total
- Trade Offer Amount: 100
- FOC Quantity: 5

**sale_return_items entries:**
1. Carton entry: trade_offer_amount = 100 * (32/44) = 72.73, foc_quantity = 5 * (32/44) = 3.64
2. Dozen entry: trade_offer_amount = 100 * (12/44) = 27.27, foc_quantity = 5 * (12/44) = 1.36

**stock_ledger entries:**
1. Sale Return (Carton): qty_in = 2, unit_id = 16, transaction_type = 'Sale Return'
2. Sale Return (Dozen): qty_in = 1, unit_id = 10, transaction_type = 'Sale Return'
3. Sale Return - FOC: qty_in = 5, unit_id = 9, transaction_type = 'Sale Return - FOC'

## Notes

- T.O Amt is deducted from NET amount (not from GROSS)
- FOC Qty is tracked separately in stock_ledger with zero unit cost
- Both values are auto-populated when loading from sale_invoice
- Values can be manually edited before saving
- Totals are calculated and displayed in the footer
