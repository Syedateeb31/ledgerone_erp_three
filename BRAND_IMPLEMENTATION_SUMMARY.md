# Brand Dropdown Implementation Summary

## Overview
Added Brand dropdown functionality to POS Invoice form that:
1. Displays brands fetched from suppliers table
2. Auto-populates brand when customer is selected (based on customer.brand_id)
3. Saves brand_id to sale_invoice table

## Files Modified/Created

### 1. HTML Form (pos-add.php)
**Location:** `client/pages/sale/pos_invoice/pos-add.php`

**Changes:**
- Added Brand dropdown field after Sub Account field
- Dropdown displays supplier names as brand options
- Added script reference to brand-autofill.js

```html
<div class="form-group" id="brandGroup">
    <label for="brand">Brand</label>
    <select id="brand" tabindex="-1">
        <option value="">Select Brand</option>
        <!-- Options loaded dynamically -->
    </select>
</div>
```

### 2. API Endpoint (get-brands.php)
**Location:** `server/api/sale/pos_invoice/get-brands.php`

**Purpose:** Fetches all active suppliers to populate brand dropdown

**Query:**
```sql
SELECT id, supplier_name, supplier_code
FROM suppliers
WHERE (tenant_id = ? OR tenant_id = 0) AND status = 'ACTIVE'
ORDER BY supplier_name
```

### 3. Customer API Update (get-customers.php)
**Location:** `server/api/sale/pos_invoice/get-customers.php`

**Changes:**
- Added `c.brand_id` to SELECT statement
- Now returns customer's associated brand_id for autofill

### 4. JavaScript - Main Script (pos-add.js)
**Location:** `client/assets/js/sale/pos_invoice/pos-add.js`

**Changes:**
- Added `brandsData` global variable
- Added `loadBrandsData()` function to fetch brands from API
- Updated Promise.all() to include `loadBrandsData()`
- Brands dropdown populated on page load

### 5. JavaScript - Brand Autofill (brand-autofill.js)
**Location:** `client/assets/js/sale/pos_invoice/brand-autofill.js`

**Purpose:** Handles automatic brand selection when customer is selected

**Functionality:**
- Listens for customer selection
- Finds customer's associated brand_id
- Auto-populates brand dropdown

## Database Mapping

### Relationship
- `customers.brand_id` → `suppliers.id`
- `sale_invoice.brand_id` → `suppliers.id`

### Data Flow
1. Customer selected → customer.brand_id retrieved
2. Brand dropdown auto-populated with matching supplier
3. On save → brand_id stored in sale_invoice table

## How It Works

### Step 1: Page Load
- Brands loaded from suppliers table via get-brands.php
- Brand dropdown populated with supplier names

### Step 2: Customer Selection
- User selects customer from dropdown
- Customer's brand_id is retrieved from customersData
- Brand dropdown automatically set to matching brand

### Step 3: Form Submission
- Brand ID included in form data
- Saved to sale_invoice.brand_id field

## Testing Checklist

- [ ] Brand dropdown displays all active suppliers
- [ ] Brand auto-populates when customer is selected
- [ ] Brand value is saved correctly to database
- [ ] Brand persists when editing existing invoice
- [ ] Brand dropdown works with all customer types
- [ ] No errors in browser console

## Notes

- Brand is optional (can be left blank)
- Brand dropdown uses supplier data (suppliers table)
- Auto-fill only works if customer has brand_id set
- Brand selection is independent of other fields
