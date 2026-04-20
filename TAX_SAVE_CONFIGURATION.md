# Tax Columns - Save Configuration

## Issue
Tax % and Tax Amount were not being saved because:
- Frontend sends: `taxPercent`, `taxAmount`
- Database expected: `tax_percent`, `tax_amount` (NEW COLUMNS)
- Old columns only had: `gst_percent`, `gst_amount`

## Solution

### 1. New Migration File Created ✅
**File:** `database/migrations/add_tax_columns_to_sale_invoice_items.sql`

```sql
-- Add flexible tax columns (supports any tax type, not just GST)
ALTER TABLE `sale_invoice_items` 
ADD COLUMN `tax_percent` DECIMAL(10,2) DEFAULT 0.00 AFTER `gst_amount`,
ADD COLUMN `tax_amount` DECIMAL(15,2) DEFAULT 0.00 AFTER `tax_percent`;

-- Add tax type column for future use
ALTER TABLE `sale_invoice_items`
ADD COLUMN `tax_type` VARCHAR(50) DEFAULT 'standard_gst' AFTER `tax_amount`;
```

### 2. New Table Columns
After running migration, `sale_invoice_items` table will have:

| Column Name | Type | Default | Purpose |
|---|---|---|---|
| `tax_percent` | DECIMAL(10,2) | 0.00 | Tax percentage for any tax regime |
| `tax_amount` | DECIMAL(15,2) | 0.00 | Calculated tax amount |
| `tax_type` | VARCHAR(50) | 'standard_gst' | Tax regime type (GST, Third Schedule, etc.) |

### 3. PHP Backend Updated ✅
**File:** `server/api/sale/pos_invoice/pos-add.php`

**Changes:**
- Added `tax_percent` and `tax_amount` to INSERT query
- Updated execute() statement to pass these values from frontend

**Columns saved (in order):**
```php
tenant_id, sale_invoice_id, product_id, uom_id,
quantity, sale_price, gross_amount, discount_percent,
discount_amount, trade_offer_percent, trade_offer_amount,
gst_percent, gst_amount,
tax_percent, tax_amount,          // ← NEW
foc_quantity, net_amount, parent_row_id,
piece, carton, dozen, scheme, created_by, updated_by
```

### 4. Frontend (JavaScript)
**File:** `client/assets/js/sale/pos_invoice/pos-add.js`

Frontend already sends:
```javascript
{
    taxPercent: parseFloat(taxPercentInput.value) || 0,
    taxAmount: parseFloat(taxAmountInput.value) || 0,
    // ... other fields
}
```

✅ **No changes needed** - Already compatible!

## How to Implement

### Step 1: Run the Migration
```bash
# Login to MySQL
mysql -u root -p

# Select tenant database
USE ledgerone_tenant;

# Run migration
source database/migrations/add_tax_columns_to_sale_invoice_items.sql;
```

### Step 2: Verify
```sql
DESCRIBE sale_invoice_items;
-- Should show columns: tax_percent, tax_amount, tax_type
```

### Step 3: Test
1. Create new POS invoice
2. Select product with tax
3. Verify Tax % and Tax Amt are displayed
4. Save invoice
5. Check database - should show tax_percent and tax_amount values saved

## Column Structure After Migration
```
sale_invoice_items {
    id
    tenant_id
    sale_invoice_id
    product_id
    uom_id
    quantity
    sale_price
    gross_amount
    discount_percent
    discount_amount
    net_amount
    trade_offer_percent
    trade_offer_amount
    gst_percent          (old GST-specific)
    gst_amount           (old GST-specific)
    tax_percent          (NEW - flexible for any tax)
    tax_amount           (NEW - flexible for any tax)
    tax_type             (NEW - identifies tax regime)
    foc_quantity
    parent_row_id
    piece
    carton
    dozen
    scheme
    created_by
    updated_by
    created_at
    updated_at
}
```

## Why This Design?
- **Future-proof:** `tax_percent` and `tax_amount` work for any tax type (Standard GST, Third Schedule, VAT, etc.)
- **Backward compatible:** Old `gst_percent` and `gst_amount` columns still exist for legacy data
- **Flexible:** `tax_type` column allows tracking which tax regime was used for each item
- **Clear:** Distinguishes between GST-specific columns and general tax columns

## Testing
After migration, when saving a POS invoice:
```
SELECT tax_percent, tax_amount, tax_type FROM sale_invoice_items 
WHERE sale_invoice_id = [your_invoice_id];
```

Should show:
```
tax_percent: 17.00    (or whatever tax rate)
tax_amount: 85.00     (calculated)
tax_type: standard_gst  (or other regime)
```
