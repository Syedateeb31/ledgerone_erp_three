# Branch-wise Opening Stock Fix

## Problem
Branch-wise opening stock entries are not being saved when adding/editing products.

## Root Causes Identified
1. **No validation** - Users could save products without selecting a branch or entering quantities
2. **No error feedback** - Users didn't know if their stock entries were incomplete
3. **No debugging** - Difficult to determine where the issue was occurring (frontend or backend)

## Fixes Applied

### 1. Frontend Validation (product-add.js)

**Enhanced `validateForm()` function:**
- Validates that if a stock entry has quantity or price, a branch must be selected
- Shows error message: "Branch selection is required"
- Highlights invalid branch dropdowns with error styling
- Prevents form submission if stock entries are incomplete

**Improved Console Logging:**
- Logs stock entry data for each entry:
  - Branch ID
  - Quantity values 
  - Opening price
- Added "Stock entries count" to help debug submission

```javascript
// NEW: Validates branch-wise opening stock
const stockEntries = document.querySelectorAll('.stock-entry');
stockEntries.forEach((entry, index) => {
    // Check branch is selected if qty or price is provided
    if (hasQty || price) {
        if (!branchId) {
            isValid = false;
            // Add error styling and message
        }
    }
});
```

### 2. Backend Logging (product-add.php)

**Added comprehensive debug logging:**

```php
// Logs what data is received from frontend
error_log('Branch isset: ' . (isset($_POST['branch']) ? 'YES' : 'NO'));
error_log('Branch count: ' . count($_POST['branch'] ?? 0));
error_log('OpeningQty count: ' . count($_POST['openingQty'] ?? 0));
```

**Track successful inserts:**
- Added try-catch around stock insertion
- Logs when each entry is successfully saved: "Stock opening saved successfully for branch X"
- Logs errors if insertion fails
- Counter shows total entries saved

**Entry-level logging:**
```php
error_log("Entry $i: Branch={$branchId}, OriginalQty={$originalQty}, TotalInBaseUnits={$totalQtyInBaseUnits}");
```

## How to Verify the Fix

### Step 1: Test in Browser Console
1. Open Firefox/Chrome DevTools (F12 → Console tab)
2. Add product with branch-wise opening stock
3. Fill in:
   - Branch: Select a branch
   - Opening Qty: Enter amount
   - Opening Price: Enter price
4. Submit form
5. Check console for stock data logging:
   ```
   Stock entries count: 1
   Stock Entry 0: {branch: "5", qty: Array(1), price: "100"}
   ```

### Step 2: Check Error Log
1. Open PHP error log: `C:\xampp\php\logs\php_error_log`
2. Search for "=== STOCK OPENING DEBUG ==="
3. Verify:
   - Branch isset: YES
   - Branch count: 1
   - OpeningQty count: 1
   - OpeningPrice count: 1
4. Look for "Stock opening saved successfully for branch X"

### Step 3: Validate Database
Run this query to check if stock was saved:
```sql
SELECT so.*, p.name 
FROM stock_opening so
JOIN products p ON so.product_id = p.id
WHERE so.product_id = [NEW_PRODUCT_ID]
ORDER BY so.created_at DESC;
```

## Error Messages You May See

### In Browser Console:
- **"Branch selection is required"** - User didn't select a branch but entered quantity/price
- **Stock entries count: 0** - No stock data being sent to server

### In PHP Error Log:
- **"No branch stock data found in POST"** - Stock arrays are empty (form not submitting data)
- **"Error saving stock opening: ..."** - Database error during insert
- **"Stock opening entries saved: 0"** - No entries met the criteria to be saved

## Troubleshooting

### Issue: Stock still not saving
**Check this in browser console:**
```javascript
// Run in console
const stockEntries = document.querySelectorAll('.stock-entry');
stockEntries.forEach((e, i) => {
  const branch = e.querySelector('input[type="hidden"]').value;
  const qty = e.querySelector('input[name*="openingQty"]')?.value;
  console.log(`Entry ${i}: branch=${branch}, qty=${qty}`);
});
```

### Issue: Branch not being selected
**The branch dropdown might not be populating hidden input:**
```javascript
// Run in console
const branchHidden = document.querySelector('input[type="hidden"][name="branch[]"]');
console.log('Branch value:', branchHidden?.value); // Should show a number, not empty
```

### Issue: Quantity not being sent
**Check FormData collection:**
```javascript
// Run in console before submit
const formData = new FormData(document.getElementById('productForm'));
Array.from(formData.entries())
  .filter(e => e[0].includes('openingQty'))
  .forEach(e => console.log(e[0] + '=' + e[1]));
```

## Files Modified

1. **frontend:** [client/assets/js/inventory/products/product-add.js](client/assets/js/inventory/products/product-add.js)
   - Enhanced validateForm() with branch validation
   - Added stock entry console logging

2. **backend:** [server/api/inventory/products/product-add.php](server/api/inventory/products/product-add.php)
   - Added debug logging for stock opening data
   - Added try-catch and error handling
   - Added entry counter

## Next Steps

1. **Test** the fix with branch-wise opening stock entries
2. **Check error logs** if issues persist using the troubleshooting steps above
3. **Report** specific error messages if stock still doesn't save
