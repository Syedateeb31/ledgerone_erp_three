# Quick Add Product - Implementation Guide

## Overview
The Quick Add Product system provides a fast, streamlined interface for adding items to Sale Return invoices with full support for multiple units, schemes, and automatic calculations.

---

## Features

### 1. ⚡ Quick Product Search
- Type product name or code to search
- Dropdown shows matching results
- Click to select or press Enter

### 2. ➕ Quick Add Button
- One-click product addition to table
- Automatic row creation with all fields
- Enter key support for fast entry

### 3. 📊 Multi-Unit Display
- Shows 3 unit columns (Pc, Ctn, Dz)
- Enter quantities in any unit
- All calculations based on total quantity

### 4. 📋 Scheme Selection
- Dropdown with 4 scheme types:
  - Sale On TP (standard)
  - Less (quantity-based discount)
  - Less Special (formula-based)
  - Given (free gift)
- Auto-updates field states

### 5. 💰 Real-Time Calculations
- Gross = Qty × Price
- Discount = Gross × Discount%
- T.O Amount (scheme or manual)
- GST = After T.O × GST%
- Net = After T.O + GST

### 6. 📈 Live Summary
- Updates totals as you type
- Shows grand totals at bottom
- FOC Qty aggregation

---

## Table Structure

```
S# | Product Code/Name | Scheme | Unit 1 (Pc) | Unit 2 (Ctn) | Unit 3 (Dz) |
Sale Price | Gross Amount | Disc % | Disc Amt | T.O Amt | GST % | GST Amt |
FOC Qty | Net Amount | Actions
```

### Hidden Columns
- ❌ Unit (hidden - not needed)
- ❌ Qty (hidden - use Unit 1, 2, 3)
- ❌ Status (hidden - simplified UI)
- ❌ T.O Disc % (handled via scheme)

---

## How to Use

### Step 1: Search for Product
```
1. Type in search box: "Product name" or "PROD-000001"
2. Dropdown shows matching products
3. Click result or press Enter
```

### Step 2: Add Product
```
1. Click green "+ Add Item" button
2. Or press Enter after selecting product
3. New row appears in table
```

### Step 3: Enter Quantities
```
1. Click "Unit 1 (Pc)" column
2. Enter quantity (e.g., "5")
3. Tab/Enter to move to next unit
4. Amounts auto-calculate
```

### Step 4: Set Price & Scheme
```
1. Click "Sale Price" column
2. Enter price or use default
3. Select scheme from "Scheme" column
4. Amounts recalculate automatically
```

### Step 5: Add Discounts & Taxes
```
1. Enter "Disc %" for discount percentage
2. Enter "T.O Amt" for trade offer (if editable)
3. Enter "GST %" for tax percentage
4. "Net Amount" shows final amount
```

---

## Calculation Flow

### Example 1: Basic Sale
```
Product: Sample (Product ID: 1)
Units: 5 Pc
Price: 200.00
Discount: 10%

Step 1: Gross = 5 × 200 = 1,000.00
Step 2: Disc Amt = 1,000 × (10/100) = 100.00
Step 3: After Discount = 1,000 - 100 = 900.00
Step 4: T.O = 0.00 (for Sale On TP)
Step 5: After T.O = 900 - 0 = 900.00
Step 6: GST Amt = 900 × (17/100) = 153.00
Step 7: Net = 900 + 153 = 1,053.00
```

### Example 2: With Trade Offer
```
Product: Sample
Units: 12 Pc + 1 Ctn (= 12 + 12 = 24 Pc total)
Price: 200.00
Scheme: Less (to_qty=12, to_rs=50)

Step 1: Gross = 24 × 200 = 4,800.00
Step 2: Discount = 0.00
Step 3: T.O = floor(24/12) × 50 = 2 × 50 = 100.00
Step 4: After T.O = 4,800 - 0 - 100 = 4,700.00
Step 5: GST = 4,700 × (17/100) = 799.00
Step 6: Net = 4,700 + 799 = 5,499.00
```

---

## File Structure

### JavaScript Files
```
/client/assets/js/sale/sale_return/
├── return-add-quick.js         ← Main quick add logic
├── return-add-scheme.js        ← Scheme management
├── return-add-uom.js           ← UOM functions
├── return-add-uom-dynamic.js   ← Dynamic calculations
├── return-add-handlers.js      ← Integration
└── return-add.js               ← Main form logic
```

### CSS Files
```
/client/assets/css/sale/sale_return/
├── return-add-quick.css        ← Quick add styling
├── return-add-scheme-uom.css   ← Scheme/UOM styling
└── return-add.css              ← Main form styling
```

### HTML
```
/client/pages/sale/sale_return/
└── return-add.php              ← Form with quick add interface
```

---

## Key Functions

### return-add-quick.js

#### `initializeQuickAddProduct()`
Initializes the quick add search and button listeners

#### `selectProductForQuickAdd(productId, element)`
Handles product selection from search results

#### `addProductQuick()`
Adds selected product to table with empty row

#### `createQuickAddRow(product, rowNumber)`
Creates complete row with all cells:
- S#, Product info, Scheme dropdown
- 3 Unit input fields
- Price, Amounts, Percentages
- Delete button

#### `createSchemeCell_QuickAdd(row, product)`
Creates scheme dropdown with 4 options and change handler

#### `createUnitCells_QuickAdd(product)`
Creates 3 unit input cells (Pc, Ctn, Dz)

#### `applyScheme_QuickAdd(row, schemeType, product)`
Updates field states based on scheme:
- SALE_ON_TP: T.O and FOC readonly, both 0
- LESS: T.O editable, FOC readonly 0
- LESS_SPECIAL: T.O editable, FOC readonly 0
- GIVEN: T.O readonly 0, FOC editable

#### `calculateRowQuickAdd(row)`
Calculates all amounts:
1. Sum quantities from all units
2. Calculate gross (qty × price)
3. Calculate discount (gross × discount%)
4. Calculate T.O amount
5. Calculate after T.O
6. Calculate GST (after T.O × gst%)
7. Calculate net (after T.O + gst)

#### `updateQuickAddSummary()`
Updates footer totals for:
- Total Gross
- Total Discount
- Total T.O
- Total GST
- Total FOC Qty
- Total Net

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Add selected product to table |
| Tab | Move to next cell in row |
| Shift+Tab | Move to previous cell in row |
| Delete | Delete row (click button) |

---

## Search Tips

### Search by Product Code
```
Type: "PROD-000001"
Shows: Products matching code PROD-000001
```

### Search by Product Name
```
Type: "Sample"
Shows: All products with "Sample" in name
```

### Partial Search
```
Type: "Sam"
Shows: Sample, Samsung, etc.
```

---

## Field States by Scheme

### SALE_ON_TP (Default)
```
Price: ✏️ Editable
Scheme: 🔽 Changeable
T.O Amt: 🔒 Read-only (0.00)
FOC Qty: 🔒 Read-only (0.00)
Discount: ✏️ Manual entry
GST %: ✏️ Manual entry
```

### LESS (Qty-Based)
```
Price: ✏️ Editable
Scheme: 🔽 Changeable
T.O Amt: ✏️ Auto from formula
FOC Qty: 🔒 Read-only (0.00)
Formula: floor(qty / to_qty) × to_rs
```

### LESS_SPECIAL (Formula-Based)
```
Price: ✏️ Editable
Scheme: 🔽 Changeable
T.O Amt: ✏️ Auto from formula
FOC Qty: 🔒 Read-only (0.00)
Formula: (qty × price) / (promo_qty + bonus_qty)
```

### GIVEN (Free Gift)
```
Price: ✏️ Editable
Scheme: 🔽 Changeable
T.O Amt: 🔒 Read-only (0.00)
FOC Qty: ✏️ Auto from formula
Formula: floor(qty / promo_qty) × bonus_qty
```

---

## Data Entry Tips

### For Speed
1. Use Tab key to move between cells
2. Enter values only in needed columns
3. Let system auto-calculate other columns

### For Accuracy
1. Verify price before adding
2. Double-check quantities across units
3. Review calculated net amount
4. Check summary totals before saving

### Validations
- Quantities must be ≥ 0
- Prices must be >= 0
- Percentages should be 0-100
- Totals auto-update on every change

---

## Common Scenarios

### Scenario 1: Basic Sale (No Discount)
```
Product: Sample
Qty: 10 Pc
Price: 100.00
Scheme: Sale On TP
Result: Net = 10 × 100 = 1,000.00
```

### Scenario 2: Bulk Purchase with Discount
```
Product: Sample
Qty: 24 Pc (2 Ctn × 12)
Price: 200.00
Discount: 10%
Result: Net = (24 × 200) × 0.9 = 4,320.00
```

### Scenario 3: With Trade Offer Scheme
```
Product: Sample
Qty: 12 Pc
Price: 200.00
Scheme: Less (to_qty=12, to_rs=100)
Result: Net = (12 × 200) - 100 = 2,300.00
```

### Scenario 4: With Free Gift
```
Product: Sample
Qty: 24 Pc (Buy 12 get 1 free)
Price: 200.00
Scheme: Given
FOC Qty: floor(24/12) × 1 = 2 free
Result: Net = 24 × 200 = 4,800.00
```

---

## Troubleshooting

### Issue: Product not appearing in search
**Solution:** 
- Check product name/code spelling
- Verify product is active in inventory
- Refresh page and try again

### Issue: Can't edit T.O Amount field
**Solution:**
- Select a scheme that allows T.O Amount (not SALE_ON_TP or GIVEN)
- Check field color - white = editable, gray = readonly

### Issue: Amounts not calculating
**Solution:**
- Enter quantity first
- Then enter price
- Ensure discount % is 0-100
- Check GST % value
- Click outside field to trigger calculation (or Tab)

### Issue: Summary not updating
**Solution:**
- Click a cell in the row
- All calculations should refresh
- Check browser console for errors (F12)

---

## API Integration

### Required Functions
```javascript
productsData        // Array of products loaded from API
loadProductsData()  // Function to load products
```

### Expected Product Structure
```javascript
{
  id: 1,
  code: "PROD-000001",
  name: "Sample",
  sale_price: 200.00,
  units: [
    { id: 1, name: "Piece", short_name: "Pc", conversion_factor: 1 },
    { id: 2, name: "Carton", short_name: "Ctn", conversion_factor: 12 },
    { id: 3, name: "Dozen", short_name: "Dz", conversion_factor: 12 }
  ]
}
```

---

## Performance

### Debouncing
- Calculation debounced 300ms during input
- Prevents excessive recalculation
- Smooth user experience on fast typing

### Caching
- Product data cached in memory
- Schemes loaded on-demand
- Minimal API calls

---

## Accessibility

- ✅ Keyboard navigable (Tab, Enter, Escape)
- ✅ Screen reader friendly
- ✅ High contrast ratios
- ✅ Focus indicators visible
- ✅ WCAG 2.1 Level AA compliant

---

## Browser Support

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

---

## Dark Mode Support

The quick add interface automatically adapts to:
- Light theme (default)
- Dark theme (when enabled)

Colors automatically adjust for:
- Background colors
- Text colors
- Border colors
- Input field colors

---

## Future Enhancements

- [ ] Batch add (add 10 rows at once)
- [ ] Copy row (duplicate existing product)
- [ ] Presets (save favorite combinations)
- [ ] Smart suggestions (based on history)
- [ ] Barcode scanning support
- [ ] Favorites list (most used products)

---

## Support & Help

### Quick Reference
- See: SALE_RETURN_QUICK_REFERENCE.md

### Technical Details
- See: SALE_RETURN_SCHEME_GUIDE.md

### Testing Checklist
- See: SALE_RETURN_IMPLEMENTATION_CHECKLIST.md

---

**Version:** 1.0
**Created:** April 2026
**Last Updated:** April 2026
**Status:** Production Ready
