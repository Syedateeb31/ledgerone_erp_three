# Invoice-Level Dynamic Taxes - Implementation Guide

## How It Works - Step by Step

### 1. **Tax Regime Configuration in Database**

When you have these tax regimes configured:

```
tax_regimes table:
id | regime_code | regime_name | application_level | is_active
1  | STD_GST     | Standard GST| invoice           | 1
2  | GEN_GST     | General GST | invoice           | 1
3  | ITEM_TAX    | Item Tax    | item              | 1
```

**Important:** Only regimes with `application_level = 'invoice'` will show in Invoice Summary!

---

### 2. **Tax Rates Configuration**

Each regime has rates per customer type:

```
tax_rates table:
id | tax_regime_id | tax_name      | rate_percentage | customer_type_id | is_active
1  | 1             | Standard GST  | 18.00           | 1 (Retail)       | 1
2  | 1             | Standard GST  | 16.00           | 2 (Wholesale)    | 1
3  | 2             | General GST   | 5.00            | 1 (Retail)       | 1
4  | 2             | General GST   | 4.00            | 2 (Wholesale)    | 1
```

---

### 3. **Customer Selection Triggers Dynamic Tax Loading**

```
User Action: Select Customer "ABC Retail" (customer_type_id = 1)
                           ↓
             loadTaxRatesForCustomer() called
                           ↓
       loadInvoiceLevelTaxRegimes(customerId) called
                           ↓
         API Fetches: SELECT FROM tax_regimes 
         WHERE application_level = 'invoice' AND is_active = 1
                           ↓
         API Also Fetches: SELECT tax_rate.rate_percentage
         FROM tax_rates WHERE customer_type_id = 1 AND tax_regime_id IN (...)
                           ↓
         Returns: [
           { id: 1, regime_name: "Standard GST", rate_percentage: 18.00 },
           { id: 2, regime_name: "General GST", rate_percentage: 5.00 }
         ]
                           ↓
         JavaScript Creates Two Columns Per Regime:
         - "STANDARD GST %" → Shows 18.00
         - "STANDARD GST AMOUNT" → Shows 0.00 (until invoice calculated)
         - "GENERAL GST %" → Shows 5.00
         - "GENERAL GST AMOUNT" → Shows 0.00
```

---

### 4. **Calculation When Items Are Entered**

```
User enters items:
- Item 1: Qty 2, Price 5,000 = 10,000
- Item 2: Qty 1, Price 5,000 = 5,000
Total Bill Amount = 15,000

Apply Discounts:
- Invoice Discount: 1,000
Net Amount = 15,000 - 1,000 = 14,000

Calculate Invoice-Level Taxes:
                           ↓
Standard GST = 14,000 × (18 / 100) = 2,520
General GST = 14,000 × (5 / 100) = 700
Total Invoice-Level Tax = 2,520 + 700 = 3,220
                           ↓
Net Receivable = 14,000 - 3,220 = 10,780
```

**Display in Invoice Summary:**
```
TOTAL BILL: 15,000.00
DISCOUNT: 1,000.00
NET AMOUNT: 14,000.00

STANDARD GST %: 18.00
STANDARD GST AMOUNT: 2,520.00

GENERAL GST %: 5.00
GENERAL GST AMOUNT: 700.00

NET RECEIVABLE: 10,780.00 ← Final amount customer pays
```

---

### 5. **Real-Time Updates**

When user modifies any value:

```
User Changes Discount to 2,000
                    ↓
updateInvoiceSummary() called
                    ↓
Recalculates:
  Net Amount = 15,000 - 2,000 = 13,000
                    ↓
calculateInvoiceLevelTaxes() recalculates:
  Standard GST = 13,000 × 0.18 = 2,340
  General GST = 13,000 × 0.05 = 650
  Total = 2,990
                    ↓
Net Receivable = 13,000 - 2,990 = 10,010
                    ↓
All fields updated instantly
```

---

## Different Scenarios

### Scenario 1: Multiple Tax Regimes
```
Customer: ABC Retail
Applicable Regimes: Standard GST (18%), General GST (5%), Cess (2%)

Invoice Summary Columns Added:
┌─────────────────────┬──────────────┐
│ Standard GST %      │ 18.00        │
│ Standard GST Amount │ XXX.XX       │
├─────────────────────┼──────────────┤
│ General GST %       │ 5.00         │
│ General GST Amount  │ XXX.XX       │
├─────────────────────┼──────────────┤
│ Cess %              │ 2.00         │
│ Cess Amount         │ XXX.XX       │
└─────────────────────┴──────────────┘
```

---

### Scenario 2: No Invoice-Level Taxes
```
Customer: XYZ Wholesale
Tax Regimes: Only Item-level tax (application_level = 'item')

Invoice Summary:
- No extra dynamic columns added
- Net Amount = Net Receivable (since no invoice-level taxes)
- Only item-level taxes appear in items table
```

---

### Scenario 3: Mixed Tax Regimes
```
Customer: ABC Retail
Regimes Configured:
- Standard GST: application_level = 'invoice' ✅
- Item Tax: application_level = 'item' ✅

Result:
- Invoice-Level Taxes: Show as dynamic columns in summary
- Item-Level Taxes: Show in each item row
- Both are applied independently
```

---

## Editing Invoice

When editing an existing invoice:

```
User clicks Edit on Invoice #001
                    ↓
loadInvoiceData(invoiceId) called
                    ↓
Customer ID loaded from invoice
                    ↓
loadInvoiceLevelTaxRegimes(customer_id) called
                    ↓
Dynamic columns created for that customer
                    ↓
updateInvoiceSummary() called
                    ↓
Invoice Summary shows same calculations as original
```

---

## API Endpoint: get-invoice-level-taxes.php

### Request
```
GET /server/api/sale/pos_invoice/get-invoice-level-taxes.php?customer_id=5
```

### Response (Success)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "regime_code": "STD_GST",
      "regime_name": "Standard GST",
      "rate_percentage": 18,
      "tax_name": "Standard GST"
    },
    {
      "id": 2,
      "regime_code": "GEN_GST",
      "regime_name": "General GST",
      "rate_percentage": 5,
      "tax_name": "General GST"
    }
  ]
}
```

### Response (No Invoice-Level Taxes)
```json
{
  "success": true,
  "data": []
}
```

### Response (Error)
```json
{
  "success": false,
  "message": "Missing required parameters"
}
```

---

## Functions Overview

### loadInvoiceLevelTaxRegimes(customerId)
**What it does:**
- Fetches invoice-level tax regimes for the customer
- Creates dynamic HTML columns in Invoice Summary
- Stores regimes in `window.invoiceLevelTaxRegimes`

**When called:**
- When customer is selected
- When invoice is loaded in edit mode

**Returns:** 
- Promise (async function)

---

### calculateInvoiceLevelTaxes()
**What it does:**
- Iterates through `window.invoiceLevelTaxRegimes`
- Gets current Net Amount from Invoice Summary
- Calculates: Net Amount × (rate_percentage / 100)
- Updates display elements
- Returns total invoice-level tax amount

**When called:**
- Inside updateInvoiceSummary() for every summary update

**Returns:** 
- Number (total invoice-level tax)

---

### updateInvoiceSummary()
**Modified Logic:**
```javascript
1. Calculate item totals
2. Apply invoice-level discount
3. Add shipping fees
4. Get Net Amount
5. Calculate Invoice-Level Taxes ← NEW
6. Net Receivable = Net Amount - Invoice-Level Taxes ← UPDATED
7. Auto-fill Amount Paid if enabled
8. Update Remaining Balance
```

---

## CSS Classes

### invoice-tax-item
Applied to dynamically created tax columns

```css
.invoice-tax-item {
  background: Linear gradient with primary color tint;
  border: 1px solid (subtle primary color);
  border-radius: 6px;
  padding: 12px;
  
  /* On hover */
  border-color: primary color;
  box-shadow: subtle shadow;
  background-color: primary tint;
}
```

---

## Testing the Implementation

### Test 1: Verify Dynamic Columns Appear
```
1. Open POS Invoice page
2. Select a customer (that has invoice-level tax regimes)
3. Verify new tax columns appear in Invoice Summary
4. Check that column names match database regime_name
5. Verify tax percentages match database rates
```

### Test 2: Verify Tax Calculations
```
1. Enter item: Price 1,000, Qty 1
2. Check Net Amount = 1,000
3. If Standard GST = 18%:
   Expected Tax = 1,000 × 0.18 = 180.00
   Expected Net Receivable = 1,000 - 180 = 820.00
4. Verify actual amounts match expected
```

### Test 3: Verify Real-Time Updates
```
1. Add item, note totals
2. Apply discount
3. Verify all taxes recalculated
4. Change discount amount
5. Verify taxes recalculated again
6. Remove all items
7. Verify tax columns still show 0.00
```

### Test 4: Verify Edit Mode
```
1. Create and save invoice with taxes
2. Click Edit on that invoice
3. Verify tax columns appear
4. Verify calculations match original
5. Modify an item
6. Verify taxes recalculate
7. Save and reload
```

### Test 5: Different Customers
```
1. Select Customer A (has 2 invoice-level taxes)
2. Verify 4 columns appear (2 tax % + 2 tax amount)
3. Change to Customer B (has 1 invoice-level tax)
4. Verify only 2 columns appear (1 tax % + 1 tax amount)
5. Change to Customer C (has 0 invoice-level taxes)
6. Verify no extra columns appear
```

---

## Troubleshooting

### Issue: Tax columns not appearing after customer selection
**Check:**
- Is the API endpoint accessible? Check browser console for errors
- Does customer have a customer_type_id set?
- Does the tax_regime have application_level = 'invoice'?
- Is the tax_regime marked as is_active = 1?

### Issue: Tax percentages showing 0.00
**Check:**
- Do tax_rates exist for this customer_type_id?
- Are tax_rates marked as is_active = 1?
- Are effective_from and effective_to dates valid?
- Does tax_regime_id in tax_rates match the regime being displayed?

### Issue: Tax amounts calculated incorrectly
**Check:**
- Is Net Amount correct? (Total Bill - Discount + Shipping)
- Is rate_percentage numeric? (Not text or NULL)
- Manual calculation: Net Amount × (rate_percentage / 100)

### Issue: Columns appear but don't update when values change
**Check:**
- Browser console for JavaScript errors
- Is updateInvoiceSummary() being called?
- Is calculateInvoiceLevelTaxes() completing?
- Are the display element IDs correct? (invoiceTax_{id}_percent/amount)

---

## Future Enhancements

Possible improvements to this system:

1. **Save invoice-level taxes to database**
   - Add tax_regime_id and tax_amount columns to sale_invoice
   - Store which taxes were applied when invoice was created

2. **Tax breakdowns in invoice print**
   - Show detailed tax breakdowns in PDF/print view
   - Display each tax separately in receipt

3. **Tax exemption per customer**
   - Add ability to exempt specific customers from certain taxes
   - Override tax regimes at customer level

4. **Tax refund tracking**
   - Track refundable taxes separately
   - Generate tax return reports

5. **Dynamic tax rules**
   - Apply different tax regimes based on:
     - Sale amount brackets
     - Product categories
     - Geographic location
     - Sale season/promotion

6. **Tax ledger integration**
   - Auto-create ledger entries for each tax
   - Separate GL accounts per tax regime
   - Tax reconciliation reports
