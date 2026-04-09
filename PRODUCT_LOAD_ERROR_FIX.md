# Product Loading Error Fix - Product ID 1176

## Problem
When loading product ID 1176 (and potentially other products) in inventory/products/product-add.php, an error occurred:
```
TypeError: Cannot set properties of null (setting 'value')
at product-add.js:1811:65
```

## Root Cause
The `querySelector` for the `productType` radio button was returning `null` because the `product_type` field in the database was either:
- `NULL` 
- Empty string (`''`)
- An invalid value not matching 'physical' or 'service'

## Solution Implemented

### 1. Frontend Fix (product-add.js)
**File:** `client/assets/js/inventory/products/product-add.js` (lines 1803-1812)

Changed from:
```javascript
document.querySelector(`input[name="productType"][value="${product.product_type}"]`).checked = true;
```

To:
```javascript
// Handle product_type with null check - default to 'physical' if null or invalid
const productTypeValue = (product.product_type || 'physical').toLowerCase();
const productTypeElement = document.querySelector(`input[name="productType"][value="${productTypeValue}"]`);
if (productTypeElement) {
    productTypeElement.checked = true;
} else {
    // Fallback to physical if value not found
    document.querySelector(`input[name="productType"][value="physical"]`).checked = true;
}
```

**Benefits:**
- Handles null/undefined product_type values gracefully
- Normalizes the value (lowercase)
- Falls back to 'physical' if the value doesn't match any radio buttons
- Prevents the "Cannot set properties of null" error

### 2. Database Migration
**File:** `database/migrations/fix_product_type_null.sql`

Created a migration to fix all products in the database with null or invalid product_type values.

### 3. PHP Migration Runner
**File:** `run_product_type_migration.php`

Created a script to run the database migration and report on affected products.

## How to Apply the Fix

### Option A: Run the SQL Migration Directly
```sql
UPDATE products 
SET product_type = 'physical'
WHERE product_type IS NULL 
   OR product_type = '' 
   OR product_type NOT IN ('physical', 'service');
```

### Option B: Use the PHP Migration Runner
Visit: `http://localhost/ledgerone_erp/run_product_type_migration.php`

This will:
- Report how many products are affected
- Show a sample of affected products
- Update all affected products to have `product_type = 'physical'`

### Option C: Manual Fix for Product 1176
If you only want to fix product 1176:
```sql
UPDATE products 
SET product_type = 'physical'
WHERE id = 1176 AND (product_type IS NULL OR product_type = '');
```

## Testing
After applying the fix, try loading the product again:
`inventory/products/product-add.php?id=1176`

The product should now load without errors, and the "Physical Product" radio button will be selected.

## Notes
- The database schema defines `product_type` as `enum('physical','service')`  with a default of 'physical'
- The frontend fix is defensive and will work even if the database still contains invalid values
- The database migration is recommended to ensure data integrity
