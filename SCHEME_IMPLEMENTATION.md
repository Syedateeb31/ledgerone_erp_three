# Scheme Management System - Implementation Summary

## Overview
Complete promotional scheme management system for products supporting both **Default Unit** and **UOM Group** modes.

## Key Features

### 1. Default Unit Mode
- Single unit per product
- One "Manage Schemes" button appears after selecting a unit
- Schemes apply only to that specific unit
- Example: Jelly product with Pcs unit

### 2. UOM Group Mode
- Multiple units per product (e.g., Pcs, Ctn, Box)
- One "Manage Schemes" button appears after selecting a UOM Group
- Modal displays table with Unit column for each scheme row
- Can add different schemes for each unit in the group
- Example: Standard group with Pcs (9), Ctn (16), Box (10)

## Database Structure

### Table: `product_schemes`
```sql
CREATE TABLE `product_schemes` (
  `id` int(11) PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `promo_qty` int(11) DEFAULT 0,      -- FOC quantity
  `bonus_qty` int(11) DEFAULT 0,      -- Bonus items
  `to_qty` int(11) DEFAULT 0,         -- Trade Offer quantity condition
  `to_rs` decimal(10,2) DEFAULT 0.00, -- Trade Offer rupees
  `created_at` timestamp,
  `updated_at` timestamp,
  UNIQUE KEY `unique_scheme` (tenant_id, product_id, unit_id, promo_qty, to_qty),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES uom(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**Migration File:** `server/migrations/create_product_schemes_table.sql`

## Files Modified/Created

### New Files Created:
1. **scheme-functions.js** - All scheme management functions
   - `initSchemeButton()` - Initialize buttons for both modes
   - `handleDefaultUnitChangeWithScheme()` - Show button for Default Unit mode
   - `handleUomGroupChangeWithScheme()` - Show button for UOM Group mode
   - `openSchemeModal()` - Open modal with appropriate table structure
   - `displayUnitSchemeTable()` - Table for Default Unit mode
   - `displayGroupSchemeTable()` - Table with Unit column for UOM Group mode
   - `addSchemeRow()` - Add row with unit dropdown for group mode
   - `saveSchemes()` - Save schemes for all units
   - `closeSchemeModal()` - Close modal

2. **scheme-modal.php** - Modal UI
   - Responsive modal with example section
   - Dynamic table structure (thead changes based on mode)
   - Add/Remove row buttons
   - Save/Cancel buttons

3. **scheme-save.php** - API endpoint
   - Accepts multiple schemes with unit_id
   - Deletes old schemes for affected units
   - Inserts new schemes with tenant isolation

### Modified Files:
1. **product-add.js**
   - Added `handleUomGroupChange()` call to `handleUomGroupChangeWithScheme()`
   - Wrapped `handleDefaultUnitChange()` to call `handleDefaultUnitChangeWithScheme()`
   - Added scheme modal event handlers

2. **product-add.php**
   - Include scheme-modal.php
   - Include scheme-functions.js

## How It Works

### Default Unit Mode Flow:
1. User selects UOM Type = "Unit"
2. User selects a unit from "Default Unit" dropdown
3. "Manage Schemes" button appears below dropdown
4. Click button → Modal opens with simple table (no Unit column)
5. Add schemes for that unit only
6. Save → Schemes saved for product + unit combination

### UOM Group Mode Flow:
1. User selects UOM Type = "Group"
2. User selects a UOM Group (e.g., Standard with Pcs, Ctn, Box)
3. "Manage Schemes" button appears below dropdown
4. Click button → Modal opens with Unit column in table
5. Each row has Unit dropdown to select which unit the scheme applies to
6. Can add multiple schemes for different units
7. Save → Schemes saved for each unit separately

## Scheme Columns Explained

| Column | Description | Example |
|--------|-------------|---------|
| **Unit** | (Group mode only) Which unit this scheme applies to | Pcs, Ctn, Box |
| **Promo Qty (FOC)** | Free items given when customer buys this quantity | Buy 10 → Get 2 free |
| **Bonus Qty** | Additional bonus items (optional) | 2 |
| **TO Qty** | Trade Offer - Minimum quantity condition | Buy 5 units |
| **TO Rs** | Trade Offer - Discount amount in rupees | ₹50 discount |

## API Endpoints

### POST `/server/api/inventory/products/scheme-save.php`
Saves schemes for a product and its units.

**Request:**
```
POST /scheme-save.php
Content-Type: multipart/form-data

product_id: 5
schemes[0][unit_id]: 9
schemes[0][promo_qty]: 10
schemes[0][bonus_qty]: 2
schemes[0][to_qty]: 0
schemes[0][to_rs]: 0
schemes[1][unit_id]: 16
schemes[1][promo_qty]: 0
schemes[1][bonus_qty]: 0
schemes[1][to_qty]: 5
schemes[1][to_rs]: 50
```

**Response:**
```json
{
  "success": true,
  "message": "Schemes saved successfully (2 scheme(s))",
  "count": 2
}
```

## Important Notes

1. **Tenant Isolation:** All queries include `tenant_id` filtering
2. **Unique Constraint:** Prevents duplicate schemes for same product+unit+promo_qty+to_qty
3. **Cascade Delete:** Deleting a product or unit automatically removes related schemes
4. **No Pre-save:** Schemes are NOT saved before product save (unlike stock entries)
5. **Modal Resets:** Each time modal opens, it resets to empty state
6. **Unit Selection:** In group mode, user must select a unit for each scheme row

## Testing Checklist

- [ ] Default Unit mode: Button shows/hides correctly
- [ ] Default Unit mode: Can add schemes for single unit
- [ ] Default Unit mode: Schemes save correctly
- [ ] UOM Group mode: Button shows/hides correctly
- [ ] UOM Group mode: Modal shows Unit column
- [ ] UOM Group mode: Can add schemes for multiple units
- [ ] UOM Group mode: Each unit can have different schemes
- [ ] UOM Group mode: Schemes save correctly
- [ ] Switching modes: Button visibility updates
- [ ] Switching units: Button visibility updates
- [ ] Modal close: Clears all data
- [ ] Tenant isolation: Only tenant's schemes visible

## Future Enhancements

1. Load existing schemes when editing product
2. Edit/Delete individual schemes from modal
3. Scheme templates for quick setup
4. Bulk scheme import/export
5. Scheme effectiveness reporting
