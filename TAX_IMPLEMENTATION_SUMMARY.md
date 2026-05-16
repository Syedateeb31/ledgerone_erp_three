# Tax % and Tax Amt Implementation Summary

## Changes Made

### 1. Frontend Changes (counter-return.php)
- Added TAX% and TAX AMT columns to the items table
- Updated grid template columns to accommodate new fields
- Updated footer totals to include tax calculations

### 2. JavaScript Changes (counter-return.js)
- Added `taxPercent` and `taxAmount` fields to item objects
- Created `updateItemTaxPercent()` function to handle tax % changes
- Updated `recalculateItem()` to calculate tax amount: `(gross - discount) * (taxPercent / 100)`
- Updated `updateSummary()` to display total tax
- Updated `loadInvoiceData()` to autopopulate tax from sale_invoice_items.tax_percent
- Updated `saveReturn()` to include taxPercent and taxAmount in API payload
- Updated grid template to include 2 additional columns for tax fields

### 3. Backend API Changes (return-add.php)
- Updated INSERT statement to save `tax_percent` and `tax_amount` columns
- Changed accounting entries to use tax instead of GST:
  - Dr: Sales Returns & Allowances (Net Amount excluding Tax)
  - Dr: Sales Tax Payable (Tax reversal)
  - Cr: Trade Debtors (Total Net Amount)

### 4. Backend API Changes (return-edit.php)
- Updated GET response to include tax_percent and tax_amount from sale_return_items
- Updated INSERT statement to save tax fields
- Updated accounting entries to use tax instead of GST

### 5. Database Migration
- Created migration file: `add_tax_fields_to_sale_return_items.php`
- Adds `tax_percent` DECIMAL(5,2) column after discount_amount
- Adds `tax_amount` DECIMAL(12,2) column after tax_percent
- Optionally drops old gst_percent and gst_amount columns

## How It Works

### Autopopulation from Sale Invoice
When loading a sale invoice:
1. System fetches sale_invoice_items with tax_percent and tax_amount
2. Tax values are automatically populated in the return form
3. NET amount is recalculated: `Gross - Discount + Tax - Trade Offer`

### Tax Calculation
- Tax % is editable per item
- Tax Amount is calculated automatically: `(Gross Amount - Discount Amount) × (Tax % / 100)`
- Total Tax is summed across all items
- NET Amount includes tax: `Gross - Discount + Tax - Trade Offer`

### Accounting Entries
When posting a sale return:
1. Dr: Sales Returns & Allowances (Net Amount - Total Tax)
2. Dr: Sales Tax Payable (Total Tax reversal)
3. Cr: Trade Debtors (Total Net Amount)

## Database Schema

```sql
ALTER TABLE sale_return_items 
ADD COLUMN tax_percent DECIMAL(5, 2) DEFAULT 0.00 AFTER discount_amount;

ALTER TABLE sale_return_items 
ADD COLUMN tax_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER tax_percent;
```

## Running the Migration

```bash
php server/migrations/add_tax_fields_to_sale_return_items.php
```

## Files Modified
1. client/pages/sale/sale_return/counter-return.php
2. client/assets/js/sale/sale_return/counter-return.js
3. server/api/sale/sale_return/return-add.php
4. server/api/sale/sale_return/return-edit.php
5. server/migrations/add_tax_fields_to_sale_return_items.php (NEW)

## Testing Checklist
- [ ] Add new sale return and verify tax columns appear
- [ ] Load sale invoice and verify tax % and tax amount autopopulate
- [ ] Edit tax % and verify tax amount recalculates
- [ ] Verify NET amount includes tax: Gross - Discount + Tax - Trade Offer
- [ ] Save return and verify tax fields are stored in database
- [ ] Verify accounting entries are created correctly
- [ ] Run migration and verify columns are added to database
