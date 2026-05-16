# T.O Amt (Trade Offer Amount) Calculation - Fixed

## Issue Fixed
T.O Amt was not being deducted from NET amount. Now it's properly calculated.

## Calculation Formula

### Before (Incorrect)
```
NET = GROSS - DISCOUNT + GST
```

### After (Correct)
```
NET = GROSS - DISCOUNT + GST - T.O AMT
```

## Implementation Details

### 1. Frontend Calculation (counter-return.js)

**recalculateItem() function:**
```javascript
function recalculateItem(item) {
    item.gross = item.qty * item.price;
    item.discountAmount = item.gross * (item.discountPercent / 100);
    item.gstAmount = (item.gross - item.discountAmount) * (item.gstPercent / 100);
    item.net = item.gross - item.discountAmount + item.gstAmount - (item.tradeOfferAmount || 0);
}
```

**updateItemTradeOfferAmount() function:**
```javascript
window.updateItemTradeOfferAmount = function(itemId, newAmount) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) {
        item.tradeOfferAmount = parseFloat(newAmount) || 0;
        recalculateItem(item);      // Recalculate NET
        renderItems();              // Re-render table
        updateSummary();            // Update totals
    }
};
```

### 2. Example Calculation

**Scenario:**
- Quantity: 10 pieces @ 100 each
- Discount: 10%
- GST: 18%
- T.O Amt: 50

**Calculation:**
```
GROSS = 10 × 100 = 1000
DISCOUNT = 1000 × 10% = 100
GST = (1000 - 100) × 18% = 162
T.O AMT = 50

NET = 1000 - 100 + 162 - 50 = 1012
```

### 3. Summary Panel Update

The NET AMOUNT in the summary panel now reflects:
```
NET AMOUNT = SUM(all item nets) - RETURN DISCOUNT
           = SUM(GROSS - DISCOUNT + GST - T.O AMT) - RETURN DISCOUNT
```

### 4. Stock Ledger Entry

T.O Amt is stored in `sale_return_items.trade_offer_amount` but does NOT affect stock quantity. Stock is tracked separately:
- Regular return quantity: From `unitEntries`
- FOC quantity: From `focQuantity`

## User Workflow

1. **Enter T.O Amt** in the T.O AMT column
2. **NET amount automatically updates** (GROSS - DISCOUNT + GST - T.O AMT)
3. **Summary panel reflects** the new NET AMOUNT
4. **Save** - T.O Amt is stored in database

## Database Storage

**sale_return_items table:**
- `trade_offer_amount`: Stores the T.O Amt value
- `foc_quantity`: Stores the FOC Qty value
- `net_amount`: Stores the calculated NET (after T.O Amt deduction)

## Notes

✅ T.O Amt is deducted from NET (not from GROSS)
✅ T.O Amt does NOT affect stock quantity
✅ T.O Amt is auto-populated from sale_invoice_items
✅ T.O Amt can be manually edited
✅ Changes to T.O Amt immediately update NET and totals
✅ FOC Qty is tracked separately for stock purposes
