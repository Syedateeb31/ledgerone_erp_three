# Scheme Integration - Complete Setup Guide

## ✅ What's Been Done

1. **scheme-functions.js** - Completely rewritten with:
   - Separate sections for each unit in UOM Group mode
   - No Save button in modal (schemes save with product)
   - `collectAllSchemes()` function to gather all scheme data

2. **scheme-modal.php** - Updated with:
   - Removed Save button
   - Added info message: "Schemes will be saved when you save the product"
   - Dynamic sections for each unit

## 🔧 Integration Steps

### Step 1: Update product-add.js handleFormSubmit()

Find this section in `product-add.js`:

```javascript
function handleFormSubmit(e) {
    e.preventDefault();

    // Basic validation
    if (!validateForm()) {
        return;
    }

    // Disable submit button and show loading state
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

    // Prepare form data
    const formData = new FormData(document.getElementById('productForm'));
    const editId = document.getElementById('productForm').dataset.editId;
    
    if (editId) {
        formData.append('id', editId);
    }
    
    // ⬇️ ADD THIS CODE HERE ⬇️
```

**Add this code right after `if (editId) { formData.append('id', editId); }`:**

```javascript
    // Collect and add schemes if modal exists
    if (typeof collectAllSchemes === 'function') {
        const schemes = collectAllSchemes();
        if (schemes.length > 0) {
            schemes.forEach((scheme, index) => {
                formData.append(`schemes[${index}][unit_id]`, scheme.unit_id);
                formData.append(`schemes[${index}][promo_qty]`, scheme.promo_qty);
                formData.append(`schemes[${index}][bonus_qty]`, scheme.bonus_qty);
                formData.append(`schemes[${index}][to_qty]`, scheme.to_qty);
                formData.append(`schemes[${index}][to_rs]`, scheme.to_rs);
            });
        }
    }
```

### Step 2: Verify Files Are In Place

✓ `client/pages/inventory/products/scheme-modal.php` - Updated
✓ `client/assets/js/inventory/products/scheme-functions.js` - Rewritten
✓ `server/api/inventory/products/scheme-save.php` - Already exists
✓ `server/migrations/create_product_schemes_table.sql` - Already exists

### Step 3: Verify product-add.php Includes

In `client/pages/inventory/products/product-add.php`, verify:

```php
<!-- Include scheme modal -->
<?php include 'scheme-modal.php'; ?>

<!-- At the end, before closing body -->
<script src="../../assets/js/inventory/products/scheme-functions.js"></script>
```

## 🎯 How It Works Now

### Default Unit Mode:
```
1. Select Unit (e.g., Pcs)
2. Click "Manage Schemes"
3. Modal opens with single section:
   
   Pcs
   ┌─────────────────────────────────────┐
   │ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │
   ├─────────────────────────────────────┤
   │ [input]   │ [input]   │ [input]│[input]│
   │ [input]   │ [input]   │ [input]│[input]│
   └─────────────────────────────────────┘
   [+ Add Row]
   
4. Add schemes
5. Close modal (no save button)
6. Save product → Schemes save automatically
```

### UOM Group Mode:
```
1. Select Group (e.g., Standard with Pcs, Ctn, Box)
2. Click "Manage Schemes"
3. Modal opens with separate sections:
   
   Pcs
   ┌─────────────────────────────────────┐
   │ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │
   ├─────────────────────────────────────┤
   │ [input]   │ [input]   │ [input]│[input]│
   └─────────────────────────────────────┘
   [+ Add Row]
   
   Ctn
   ┌─────────────────────────────────────┐
   │ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │
   ├─────────────────────────────────────┤
   │ [input]   │ [input]   │ [input]│[input]│
   └─────────────────────────────────────┘
   [+ Add Row]
   
   Box
   ┌─────────────────────────────────────┐
   │ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │
   ├─────────────────────────────────────┤
   │ [input]   │ [input]   │ [input]│[input]│
   └─────────────────────────────────────┘
   [+ Add Row]
   
4. Add schemes for each unit
5. Close modal (no save button)
6. Save product → All schemes save automatically
```

## 📊 Data Flow

```
User fills scheme data in modal
        ↓
User closes modal (no save needed)
        ↓
User clicks "Save Product"
        ↓
handleFormSubmit() called
        ↓
collectAllSchemes() gathers all data
        ↓
Schemes appended to FormData
        ↓
Product + Schemes sent to API
        ↓
API saves product and schemes together
        ↓
Success message shown
```

## 🔑 Key Functions

### collectAllSchemes()
Collects all scheme data from modal sections:
```javascript
function collectAllSchemes() {
    const schemes = [];
    
    document.querySelectorAll('.scheme-unit-tbody').forEach(tbody => {
        const unitId = tbody.dataset.unitId;
        
        tbody.querySelectorAll('tr').forEach(row => {
            const promoQty = row.querySelector('.scheme-promo-qty').value;
            const bonusQty = row.querySelector('.scheme-bonus-qty').value;
            const toQty = row.querySelector('.scheme-to-qty').value;
            const toRs = row.querySelector('.scheme-to-rs').value;
            
            if (promoQty || bonusQty || toQty || toRs) {
                schemes.push({
                    unit_id: unitId,
                    promo_qty: promoQty || 0,
                    bonus_qty: bonusQty || 0,
                    to_qty: toQty || 0,
                    to_rs: toRs || 0
                });
            }
        });
    });
    
    return schemes;
}
```

### displayGroupSchemeSections()
Creates separate section for each unit in group:
```javascript
currentSchemeUnits.forEach(unit => {
    // Create section with heading
    // Create table with 4 columns
    // Add + Add Row button
});
```

## ✨ Features

✅ **No Save Button in Modal** - Schemes save with product
✅ **Separate Sections** - Each unit has its own section with heading
✅ **Dynamic Rows** - Add/Remove rows for each unit
✅ **Automatic Collection** - collectAllSchemes() gathers all data
✅ **Form Integration** - Schemes sent with product data
✅ **Clean UI** - Professional appearance with proper spacing

## 🧪 Testing

### Test Default Unit:
1. Create product
2. Select Unit type
3. Select Pcs unit
4. Click "Manage Schemes"
5. Add: Promo=10, Bonus=2
6. Close modal
7. Save product
8. Check DB: `SELECT * FROM product_schemes WHERE product_id=X`

### Test UOM Group:
1. Create product
2. Select Group type
3. Select Standard group (Pcs, Ctn, Box)
4. Click "Manage Schemes"
5. Add Pcs: Promo=10, Bonus=2
6. Add Ctn: TO Qty=5, TO Rs=50
7. Add Box: Promo=2
8. Close modal
9. Save product
10. Check DB: `SELECT * FROM product_schemes WHERE product_id=X`

## 📋 Checklist

- [ ] Updated scheme-functions.js (rewritten)
- [ ] Updated scheme-modal.php (removed save button)
- [ ] Added scheme collection code to handleFormSubmit()
- [ ] Verified product-add.php includes both files
- [ ] Tested Default Unit mode
- [ ] Tested UOM Group mode
- [ ] Verified schemes save to database
- [ ] Verified separate sections for each unit

## 🚀 Ready to Deploy

All files are ready. Just:
1. Add the scheme collection code to handleFormSubmit()
2. Test both modes
3. Deploy

Done! ✅
