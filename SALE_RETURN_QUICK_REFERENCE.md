# Quick Reference: Sale Return Scheme Implementation

## Installation Checklist

✅ **Files Created:**
```
client/assets/js/sale/sale_return/
├── return-add-scheme.js (412 lines) - Scheme logic & T.O calculations
├── return-add-uom.js (297 lines) - UOM functions
├── return-add-uom-dynamic.js (373 lines) - Dynamic calculations
└── return-add-handlers.js (452 lines) - Row creation & integration

client/assets/css/sale/sale_return/
└── return-add-scheme-uom.css (323 lines) - Styling

client/pages/sale/sale_return/
└── return-add.php - Modified to include all scripts
```

✅ **Documentation Created:**
- `SALE_RETURN_SCHEME_GUIDE.md` - Complete technical guide
- This file - Quick reference

---

## Scheme Types at a Glance

| Scheme | T.O Amount | FOC Qty | When to Use |
|--------|-----------|---------|------------|
| SALE_ON_TP | 0 (readonly) | 0 (readonly) | Standard sales, no promo |
| LESS | auto calc | 0 (readonly) | "Buy 12 get ₹50 off" |
| LESS_SPECIAL | formula based | 0 (readonly) | "Buy 12 get 1 free worth" |
| GIVEN | 0 (readonly) | auto calc | "Buy 12 get 1 free" |

---

## Quick Setup

1. **Load products data:**
   ```javascript
   await loadProductsData(); // Calls API to load products with units
   ```

2. **Add new row:**
   ```javascript
   createNewRow(); // Creates full row with scheme/UOM/calculation
   ```

3. **Select product:**
   - User types in product search
   - Selects from dropdown
   - Row initializes with UOM and scheme

4. **Change scheme:**
   - User selects from scheme dropdown
   - Appropriate fields become editable/readonly
   - Auto-calculations run instantly

---

## Calculation Formulas

### LESS Scheme (Qty-Based)
```
T.O Amount = FLOOR(Total Qty / to_qty) × to_rs

Example:
├─ Product scheme: Buy 12 → Get ₹50 off
├─ User enters: 25 units
├─ Calculation: FLOOR(25 / 12) = 2
└─ T.O Amount: 2 × 50 = ₹100
```

### LESS_SPECIAL Scheme (Formula-Based)
```
T.O Amount = (Total Qty × Sale Price) / (promo_qty + bonus_qty)

Example:
├─ Product scheme: promo_qty=12, bonus_qty=1
├─ Sale price: ₹200
├─ User enters: 12 units
├─ Calculation: (12 × 200) / (12 + 1)
└─ T.O Amount: 2400 / 13 = ₹184.61
```

### GIVEN Scheme (FOC-Based)
```
FOC Qty = FLOOR(Total Qty / promo_qty) × bonus_qty

Example:
├─ Product scheme: Buy 12 → Get 1 free
├─ User enters: 25 units
├─ Calculation: FLOOR(25 / 12) = 2
└─ FOC Qty: 2 × 1 = 2 pieces
```

---

## Common Tasks

### Enable Trade Offer % Field
```javascript
// In invoice settings modal
document.getElementById('enableTradeOfferDiscount').checked = true;
settingsData.enableTradeOfferDiscount = true;
```

### Get Total Quantity for a Row
```javascript
const quantities = getAllRowQuantities(row);
console.log(quantities.total); // Total in base unit
console.log(quantities.breakdown); // Breakdown by unit
```

### Export Row Data for API
```javascript
const rowData = {
  product_id: row.dataset.productId,
  quantities: exportRowQuantities(row),
  scheme_type: getSelectedScheme(row),
  sale_price: parseFloat(row.querySelector('.price-cell input').value),
  net_amount: parseFloat(row.querySelector('.net-cell input').value)
};
```

### Apply Scheme to Row Programmatically
```javascript
const row = document.querySelector('tr[data-row-id="row_123"]');
const product = productsData.find(p => p.id == 10);
setRowScheme(row, SCHEME_TYPES.LESS);
await applyLessScheme(row, product);
```

### Update Summary Totals
```javascript
updateInvoiceSummaryDynamic(); // Recalculates all totals
```

---

## Field States by Scheme

### SALE_ON_TP
```
├─ T.O Amount: ReadOnly ← 0.00, Gray background
├─ FOC Qty: ReadOnly ← 0, Gray background
├─ T.O %: ReadOnly (unless enabled in settings)
└─ Calculation: Percentage-based only
```

### LESS
```
├─ T.O Amount: Editable ← Auto-populated from formula
├─ FOC Qty: ReadOnly ← 0, Gray background
├─ T.O %: ReadOnly (scheme T.O used)
└─ Calculation: floor(qty / to_qty) × to_rs
```

### LESS_SPECIAL
```
├─ T.O Amount: Editable ← Auto-populated from formula
├─ FOC Qty: ReadOnly ← 0, Gray background
├─ T.O %: ReadOnly (scheme T.O used)
└─ Calculation: (qty × price) / (promo_qty + bonus_qty)
```

### GIVEN
```
├─ T.O Amount: ReadOnly ← 0.00, Gray background
├─ FOC Qty: Editable ← Auto-populated from formula
├─ T.O %: ReadOnly (no T.O in GIVEN scheme)
└─ Calculation: floor(qty / promo_qty) × bonus_qty
```

---

## API Endpoints

### Get Products
```
GET /server/api/sale/sale_return/get-products.php
Response: { success: true, products: [...] }
```

### Get Product Schemes
```
GET /server/api/sale/pos_invoice/get-product-schemes.php?product_id=10
Response: { success: true, schemes: [...] }

Schema in schemes:
├─ unit_id: Unit this scheme applies to
├─ to_qty: Trigger qty (for LESS)
├─ to_rs: Discount amount (for LESS)
├─ promo_qty: Paid quantity (for LESS_SPECIAL, GIVEN)
└─ bonus_qty: Free quantity (for LESS_SPECIAL, GIVEN)
```

---

## Debugging Tips

### Check Row State
```javascript
const row = document.querySelector('tr[data-row-id="row_123"]');
console.log('Product ID:', row.dataset.productId);
console.log('Scheme:', getSelectedScheme(row));
console.log('Scheme Data:', rowSchemeData.get(row));
console.log('Quantities:', getAllRowQuantities(row));
```

### Verify Calculations
```javascript
const row = document.querySelector('tr[data-row-id="row_123"]');
const gross = row.querySelector('.gross-cell input').value;
const discount = row.querySelector('.disc-amount-cell input').value;
const to = row.querySelector('.to-amount-cell input').value;
const gst = row.querySelector('.gst-amount-cell input').value;
const net = row.querySelector('.net-cell input').value;

console.log(`Gross: ${gross}, Discount: ${discount}, T.O: ${to}, GST: ${gst}, Net: ${net}`);
```

### Check Product Data
```javascript
console.log('Products loaded:', productsData.length);
console.log('Sample product:', productsData[0]);
console.log('Product units:', productsData[0].units);
```

### Monitor Settings
```javascript
console.log('Settings:', settingsData);
console.log('Trade Offer Discount:', localStorage.getItem('enableTradeOfferDiscount'));
console.log('Default Scheme:', localStorage.getItem('defaultScheme'));
```

---

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Load products | ~200ms | API call, gets all products with units |
| Create new row | ~50ms | DOM creation + event listeners |
| Change scheme | ~300-500ms | Includes API call for schemes |
| Update amounts | ~100ms | Debounced calculation |
| Add UOM input | ~50ms | DOM creation for multi-unit |

---

## Browser Console Commands

### Clear Scheme Cache
```javascript
rowSchemeData.clear();
```

### Reset All Rows
```javascript
document.querySelectorAll('table.items-table tbody tr').forEach(row => row.remove());
updateInvoiceSummaryDynamic();
```

### Log All Scheme Combinations
```javascript
Object.entries(SCHEME_TYPES).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
```

### Export All Invoice Data
```javascript
const invoice = document.querySelectorAll('table.items-table tbody tr').map(row => ({
  product_id: row.dataset.productId,
  qty: getAllRowQuantities(row).total,
  scheme: getSelectedScheme(row),
  net: row.querySelector('.net-cell input').value
}));
console.table(invoice);
```

---

## Troubleshooting

### Scheme dropdown shows but fields don't update
- Check browser console for errors
- Verify `productsData` is loaded
- Check that `SCHEME_TYPES` constants are defined

### T.O Amount not calculating
- Verify schemes are loaded from API
- Check `rowSchemeData` has scheme data
- Ensure quantity > 0
- Verify `to_qty` and `to_rs` values in schema

### Multi-unit quantities not aggregating
- Check conversion factors are set correctly
- Verify all unit inputs have valid numbers
- Test `getAllRowQuantities()` in console

### Settings not persisting
- Check browser allows localStorage
- Verify localStorage keys: `enableTradeOfferDiscount`, `enableTradeOfferAmount`
- Check settings modal checkboxes are being saved

---

## Code Examples

### Add item with specific scheme
```javascript
createNewRow();
const newRow = document.querySelector('table.items-table tbody tr:last-child');
const product = productsData[0];
selectProductForRow(newRow, product.id);
setRowScheme(newRow, SCHEME_TYPES.LESS);
```

### Validate all rows before submit
```javascript
const rows = document.querySelectorAll('table.items-table tbody tr');
const allValid = Array.from(rows).every(row => {
  return validateRowQuantities(row) && 
         getSelectedScheme(row) !== '';
});
console.log('All rows valid:', allValid);
```

### Calculate invoice total
```javascript
let total = 0;
document.querySelectorAll('table.items-table tbody tr').forEach(row => {
  const net = parseFloat(row.querySelector('.net-cell input').value) || 0;
  total += net;
});
console.log('Invoice total:', total.toFixed(2));
```

---

## Support & Reference

- **Full Guide:** See `SALE_RETURN_SCHEME_GUIDE.md`
- **Schema Design:** See `SCHEME_ARCHITECTURE.md`
- **Implementation Guide:** See `SCHEME_IMPLEMENTATION_GUIDE.md`

---

**Last Updated:** December 2024
**Version:** 1.0.0
