# Scheme Management - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Product Add Form                          │
│  (product-add.php + product-add.js)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐      ┌──────▼──────────┐
        │  Default Unit  │      │   UOM Group     │
        │    Mode        │      │    Mode         │
        └────────┬────────┘      └────────┬────────┘
                 │                        │
        ┌────────▼────────┐      ┌────────▼────────┐
        │ Manage Schemes  │      │ Manage Schemes  │
        │ Button (Unit)   │      │ Button (Group)  │
        └────────┬────────┘      └────────┬────────┘
                 │                        │
                 └────────────┬───────────┘
                              │
                    ┌─────────▼──────────┐
                    │  scheme-modal.php  │
                    │  (Modal UI)        │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │ scheme-functions.js        │
                    │ - openSchemeModal()        │
                    │ - addSchemeRow()           │
                    │ - saveSchemes()            │
                    │ - closeSchemeModal()       │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │ scheme-save.php (API)      │
                    │ - Validate product/unit    │
                    │ - Delete old schemes       │
                    │ - Insert new schemes       │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │ product_schemes table      │
                    │ (Database)                 │
                    └────────────────────────────┘
```

## Data Flow - Default Unit Mode

```
User selects Unit (e.g., Pcs)
        │
        ▼
handleDefaultUnitChangeWithScheme()
        │
        ├─ Set currentSchemeMode = 'unit'
        ├─ Set currentSchemeUnits = [{id: 9, name: 'Pcs', uom_name: 'Pcs'}]
        └─ Show unitSchemeButtonContainer
        │
        ▼
User clicks "Manage Schemes"
        │
        ▼
openSchemeModal()
        │
        ├─ displayUnitSchemeTable() [No Unit column]
        ├─ addSchemeRow() [Simple inputs: Promo, Bonus, TO Qty, TO Rs]
        └─ Show modal
        │
        ▼
User adds schemes and clicks "Save Schemes"
        │
        ▼
saveSchemes()
        │
        ├─ Collect all rows
        ├─ For each row: {unit_id: 9, promo_qty: 10, bonus_qty: 2, ...}
        └─ POST to scheme-save.php
        │
        ▼
scheme-save.php
        │
        ├─ Verify product exists
        ├─ DELETE FROM product_schemes WHERE product_id=5 AND unit_id=9
        ├─ INSERT INTO product_schemes (tenant_id, product_id, unit_id, ...)
        └─ Return success
        │
        ▼
Database: product_schemes
        │
        └─ Row: {id: 1, tenant_id: 1, product_id: 5, unit_id: 9, promo_qty: 10, ...}
```

## Data Flow - UOM Group Mode

```
User selects UOM Group (e.g., Standard with Pcs, Ctn, Box)
        │
        ▼
handleUomGroupChange()
        │
        ├─ Fetch units for group
        ├─ Set window.currentGroupUnits = [{id: 9, uom_name: 'Pcs'}, {id: 16, uom_name: 'Ctn'}, ...]
        └─ Call handleUomGroupChangeWithScheme()
        │
        ▼
handleUomGroupChangeWithScheme()
        │
        ├─ Set currentSchemeMode = 'group'
        ├─ Set currentSchemeUnits = window.currentGroupUnits
        └─ Show groupSchemeButtonContainer
        │
        ▼
User clicks "Manage Schemes"
        │
        ▼
openSchemeModal()
        │
        ├─ displayGroupSchemeTable() [WITH Unit column]
        ├─ addSchemeRow() [Unit dropdown + Promo, Bonus, TO Qty, TO Rs]
        └─ Show modal
        │
        ▼
User adds multiple schemes:
        │
        ├─ Row 1: Unit=Pcs, Promo=10, Bonus=2
        ├─ Row 2: Unit=Ctn, TO Qty=5, TO Rs=50
        └─ Row 3: Unit=Box, Promo=2, Bonus=0
        │
        ▼
User clicks "Save Schemes"
        │
        ▼
saveSchemes()
        │
        ├─ Collect all rows with unit_id
        ├─ For each row: {unit_id: 9, promo_qty: 10, ...}, {unit_id: 16, to_qty: 5, ...}, ...
        └─ POST to scheme-save.php
        │
        ▼
scheme-save.php
        │
        ├─ Verify product exists
        ├─ Collect all unit_ids: [9, 16, 10]
        ├─ DELETE FROM product_schemes WHERE product_id=5 AND unit_id IN (9, 16, 10)
        ├─ INSERT INTO product_schemes (tenant_id, product_id, unit_id=9, ...)
        ├─ INSERT INTO product_schemes (tenant_id, product_id, unit_id=16, ...)
        ├─ INSERT INTO product_schemes (tenant_id, product_id, unit_id=10, ...)
        └─ Return success
        │
        ▼
Database: product_schemes
        │
        ├─ Row 1: {id: 1, tenant_id: 1, product_id: 5, unit_id: 9, promo_qty: 10, ...}
        ├─ Row 2: {id: 2, tenant_id: 1, product_id: 5, unit_id: 16, to_qty: 5, to_rs: 50, ...}
        └─ Row 3: {id: 3, tenant_id: 1, product_id: 5, unit_id: 10, promo_qty: 2, ...}
```

## State Management

### Global Variables (scheme-functions.js):
```javascript
let currentSchemeUnits = [];      // Array of unit objects
let currentSchemeProductId = null; // Current product ID
let schemeRows = [];              // Array of row indices
let currentSchemeMode = null;     // 'unit' or 'group'
```

### Window Variables (product-add.js):
```javascript
window.currentGroupUnits = [];    // Units in selected UOM Group
window.unitsData = [];            // All available units
window.uomGroupsData = [];        // All UOM groups
window.branchesData = [];         // All branches
```

## Modal Structure

### Default Unit Mode Table:
```
┌─────────────────────────────────────────────────────────────┐
│ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │ Action            │
├─────────────────────────────────────────────────────────────┤
│ [input]   │ [input]   │ [input]│[input]│ [Remove]          │
│ [input]   │ [input]   │ [input]│[input]│ [Remove]          │
└─────────────────────────────────────────────────────────────┘
```

### UOM Group Mode Table:
```
┌──────────────────────────────────────────────────────────────┐
│ Unit      │ Promo Qty │ Bonus Qty │ TO Qty │ TO Rs │ Action │
├──────────────────────────────────────────────────────────────┤
│ [dropdown]│ [input]   │ [input]   │ [input]│[input]│[Remove]│
│ [dropdown]│ [input]   │ [input]   │ [input]│[input]│[Remove]│
└──────────────────────────────────────────────────────────────┘
```

## Key Decision Points

### 1. When to Show Scheme Button?
- **Default Unit Mode:** After user selects a unit from "Default Unit" dropdown
- **UOM Group Mode:** After user selects a group from "UOM Group" dropdown

### 2. What Table Structure?
- **Default Unit Mode:** No Unit column (only one unit)
- **UOM Group Mode:** Unit column with dropdown (multiple units)

### 3. How to Save?
- **Default Unit Mode:** One scheme per row, unit_id from currentSchemeUnits[0]
- **UOM Group Mode:** One scheme per row, unit_id from row's unit dropdown

### 4. Tenant Isolation?
- All queries filter by tenant_id
- Prevents cross-tenant data leakage
- Enforced at API level

## Error Handling

### Frontend (scheme-functions.js):
```javascript
if (!currentSchemeUnits || currentSchemeUnits.length === 0) {
    alert('Please select a unit first');
    return;
}

if (productId === 'new') {
    alert('Please save the product first before adding schemes');
    return;
}

if (schemes.length === 0) {
    alert('Please add at least one scheme');
    return;
}
```

### Backend (scheme-save.php):
```php
if (!$user_id || !$tenant_id) {
    // Unauthorized
}

if (empty($product_id) || empty($schemes)) {
    // Missing required fields
}

// Verify product belongs to tenant
$stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND tenant_id = ?");
if (!$stmt->fetch()) {
    // Product not found or doesn't belong to tenant
}
```

## Performance Considerations

1. **Unique Constraint:** Prevents duplicate schemes
2. **Indexes:** On (product_id, unit_id) for fast lookups
3. **Cascade Delete:** Automatic cleanup when product/unit deleted
4. **Batch Insert:** All schemes inserted in single transaction
5. **Tenant Filtering:** Reduces query scope

## Security Measures

1. **Tenant Isolation:** All queries include tenant_id
2. **Session Validation:** Checks user_id and tenant_id
3. **Product Verification:** Confirms product belongs to tenant
4. **SQL Injection Prevention:** Uses prepared statements
5. **CSRF Protection:** Standard form submission
