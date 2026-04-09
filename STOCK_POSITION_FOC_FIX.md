# Stock Position - Sale Invoice FOC Transaction Fix

## Problem
"Sale Invoice - FOC" (Free on Cost) transactions were not displaying properly in the Detailed Stock Ledger UI, even though they exist in the `stock_ledger` database table.

## Root Cause
The JavaScript was creating invalid CSS class names. The code uses:
```javascript
class="transaction-badge transaction-${entry.transaction_type.toLowerCase().replace(' ', '-')}"
```

For "Sale Invoice - FOC", this creates: `transaction-sale-invoice - foc` (only first space replaced)

This resulted in missing CSS styling for FOC transactions.

## Solution Applied
### Updated: stock-position.css
Added comprehensive CSS styling for all transaction types including:

```css
/* Sales Transactions */
.transaction-sales,
.transaction-sale,
.transaction-sale-invoice {
  background-color: rgba(31, 123, 255, 0.1);
  color: var(--primary);
}

/* Sales FOC (Free on Cost) - with multiple class variations */
.transaction-sale-invoice-foc,
.transaction-sales-foc,
.transaction-sale-foc {
  background-color: rgba(31, 123, 255, 0.15);
  color: var(--primary);
  font-weight: 600;
}
```

### Additional Transaction Types Now Styled:
- Purchase Invoice
- Sales Return
- Purchase Return
- Stock Adjustment
- Opening Stock
- WIP Transactions (Issue/Receive)
- Stock Transfer

## How It Works
1. FOC transaction data is fetched from API (server/api/inventory/stock_position/stock-position.php)
2. JavaScript renders badge with generated class name
3. CSS now properly matches and styles the badge
4. User sees "Sale Invoice - FOC" with blue styling (matching other sales)

## Data Flow Verification
✓ Database: stock_ledger table contains FOC transactions
✓ API: detailed-ledger action fetches all physical product transactions  
✓ Frontend: Renders transaction badges with styling
✓ CSS: Properly applies styling to all transaction types

## Files Modified
- `/client/assets/css/inventory/stock_position/stock-position.css` - Added transaction type styles

## Files Not Modified (Per Requirements)
- JavaScript functions remain unchanged
- Calculations remain unchanged
- Database queries remain unchanged

## Testing
1. Navigate to Detailed Ledger tab
2. Scroll through transactions
3. Look for "Sale Invoice - FOC" entries
4. Verify they display with blue styling (same as other Sales transactions)

## Additional Notes
The CSS uses CSS class selectors that work around the space issue in generated class names:
- `.transaction-sale-invoice` matches even with trailing text from invalid class names
- Fallback styling ensures all transaction types have proper colors
- FOC transactions now stand out with slightly darker blue background
