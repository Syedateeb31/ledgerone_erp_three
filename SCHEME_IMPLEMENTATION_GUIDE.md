# Scheme Implementation Guide

## Overview
Proper scheme system for POS Invoice with three modes: **Sale On TP**, **Less**, and **Given**.

## Files Created/Modified

### 1. **scheme-handler.js** (NEW)
Location: `client/assets/js/sale/pos_invoice/scheme-handler.js`

**Key Functions:**

#### `loadProductSchemes()`
- Loads all product schemes from API
- Stores in `productSchemesData` array

#### `getSchemeForProductUnit(productId, unitId)`
- Returns scheme for specific product and unit combination
- Used to lookup promo_qty, bonus_qty, to_qty, to_rs

#### `calculateFOCFromScheme(quantity, scheme)`
- Formula: `Math.floor(quantity / promo_qty) * bonus_qty`
- Example: If promo_qty=5, bonus_qty=1, quantity=10 → FOC=2

#### `calculateTOAmountFromScheme(quantity, scheme)`
- Formula: `Math.floor(quantity / to_qty) * to_rs`
- Example: If to_qty=10, to_rs=100, quantity=20 → T.O Amt=200

#### `addSchemeDropdown(row, product)`
- Adds dropdown with 3 options: Sale On TP, Less, Given
- Placed after Product Code/Name cell
- Default: Sale On TP

#### `handleSchemeChange(row, schemeType)`
- **Sale On TP**: T.O Amt & FOC Qty readonly, values = 0.00
- **Less**: T.O Amt & FOC Qty editable, auto-calculated from schemes
- **Given**: T.O Amt & FOC Qty editable, manual entry

#### `recalculateSchemeValues(row)`
- Triggered when "Less" mode is active and unit quantities change
- Sums FOC and T.O amounts across all units
- Updates row amounts

---

## How It Works

### Single Unit Products (uom_type = 'unit')
```
Product: Jelly
UOM Type: unit
Default Unit ID: 5 (Pcs)

Product Schemes:
- product_id: 1, unit_id: 5, promo_qty: 5, bonus_qty: 1, to_qty: 10, to_rs: 20

User enters: Pcs = 10
Less mode selected:
- FOC Qty = floor(10/5) * 1 = 2
- T.O Amt = floor(10/10) * 20 = 20
```

### Group Unit Products (uom_type = 'group')
```
Product: Jelly
UOM Type: group
UOM Group ID: 3

Group Units: Pcs (id:5), Ctn (id:8)

Product Schemes:
- product_id: 1, unit_id: 5, promo_qty: 5, bonus_qty: 1, to_qty: 10, to_rs: 20
- product_id: 1, unit_id: 8, promo_qty: 10, bonus_qty: 5, to_qty: 10, to_rs: 10

User enters: Pcs = 10, Ctn = 10
Less mode selected:
- FOC Qty = floor(10/5)*1 + floor(10/10)*5 = 2 + 5 = 7
- T.O Amt = floor(10/10)*20 + floor(10/10)*10 = 20 + 10 = 30
```

---

## Integration Points

### 1. pos-add-uom.js
- Modified `updateRowUnitCells()` to add scheme dropdown
- Modified unit input listener to trigger scheme recalculation in "Less" mode

### 2. pos-add.js
- Added `loadProductSchemes()` to initialization Promise.all()

### 3. pos-add.php
- Added script reference: `scheme-handler.js`

---

## Database Schema

### product_schemes table
```sql
id              INT PRIMARY KEY
tenant_id       INT
product_id      INT (FK to products)
unit_id         INT (FK to uom)
promo_qty       DECIMAL (quantity threshold for FOC)
bonus_qty       DECIMAL (FOC quantity given)
to_qty          DECIMAL (quantity threshold for T.O)
to_rs           DECIMAL (T.O amount given)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## Testing Checklist

- [ ] Single unit product with scheme works in "Less" mode
- [ ] Group unit product with multiple schemes works in "Less" mode
- [ ] FOC calculation correct: floor(qty/promo_qty) * bonus_qty
- [ ] T.O calculation correct: floor(qty/to_qty) * to_rs
- [ ] "Sale On TP" mode: T.O Amt & FOC Qty readonly and = 0.00
- [ ] "Given" mode: T.O Amt & FOC Qty editable, no auto-calculation
- [ ] Scheme dropdown appears after product selection
- [ ] Changing unit quantities recalculates in "Less" mode
- [ ] Row amounts update correctly after scheme calculation

---

## Notes

- Scheme calculations use `Math.floor()` for integer division
- Multiple units in group mode sum their individual scheme calculations
- Scheme recalculation only triggers in "Less" mode
- "Given" mode allows manual entry without auto-calculation
