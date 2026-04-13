# Sale Return Scheme Implementation Guide

## Overview
This document describes the scheme implementation for Sale Return in LedgerOne ERP. The system supports four different trade offer (scheme) types with automatic calculations for Trade Offer Amount (T.O Amt) and Free on Cost (FOC) Qty.

## Scheme Types

### 1. SALE_ON_TP (Default)
**Status:** Standard Sale on Trade Price

**Behavior:**
- T.O Amount: Fixed 0 (Read-Only)
- FOC Qty: Fixed 0 (Read-Only)
- Calculation: Uses only percentage-based discount

**UI State:**
- T.O Amount field: Gray, read-only, value "0.00"
- FOC Qty field: Gray, read-only, value "0"
- Trade Offer % field: Gray, read-only (if not enabled in settings)

**Use Case:** Standard sales without any promotional schemes

**Formula:**
```
Gross Amount = Total Qty × Sale Price
Discount Amount = Gross × (Discount% / 100)
After Discount = Gross - Discount Amount
Net Amount = After Discount + GST
```

---

### 2. LESS (Original - Quantity Based)
**Status:** Trade offer based on quantity bought

**Behavior:**
- T.O Amount: Auto-calculated from `to_qty` and `to_rs` in product's scheme
- FOC Qty: Fixed 0 (Read-Only) - NOT used in this scheme
- Calculation: T.O Amt = floor(qty / to_qty) × to_rs

**UI State:**
- T.O Amount field: White, editable (auto-populated), can be overridden
- FOC Qty field: Gray, read-only, value "0"
- Trade Offer % field: Gray, read-only (scheme T.O used instead)

**Use Case:** "Buy 12 get ₹50 off" type schemes
- Example: Buy 12 units → Get ₹50 off
- Buy 24 units → Get ₹100 off (2 × ₹50)

**Schema in database (product_schemes):**
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| to_qty | INT | 12 | Trigger quantity |
| to_rs | DECIMAL | 50.00 | Trade offer amount per qty slab |
| unit_id | INT | 1 | Unit this scheme applies to |

**Formula:**
```
T.O Amt = floor(Qty / to_qty) × to_rs
Net After T.O = Gross - Discount - T.O Amt
```

**Implementation Location:** [return-add-scheme.js](return-add-scheme.js#applyLessScheme)

---

### 3. LESS_SPECIAL (Formula Based)
**Status:** Complex promotional scheme

**Behavior:**
- T.O Amount: Auto-calculated using formula
- FOC Qty: Fixed 0 (Read-Only) - NOT used in this scheme
- Formula: T.O Amt = (Total Qty × Sale Price) / (promo_qty + bonus_qty)

**UI State:**
- T.O Amount field: White, editable (auto-populated), can be overridden
- FOC Qty field: Gray, read-only, value "0"

**Use Case:** "Buy 12 get 1 free worth this price" schemes
- Where the free item value is calculated across the batch

**Schema in database (product_schemes):**
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| promo_qty | INT | 12 | Promotional quantity (paid quantity) |
| bonus_qty | INT | 1 | Bonus items given free |

**Example Calculation:**
```
Purchased: 12 units @ ₹200/unit
Gross = 12 × 200 = ₹2,400
T.O Amt = 2,400 / (12 + 1) = 2,400 / 13 = ₹184.61
Net = 2,400 - 184.61 = ₹2,215.39
```

**Interpretation:**
- Customer gets value of ~₹184.61 as free product (equivalent of 1 unit at distributed cost)
- This is sophisticated because the value is distributed, not just 1 complete unit

**Implementation Location:** [return-add-scheme.js](return-add-scheme.js#applyLessSpecialScheme)

---

### 4. GIVEN (Free Gift Based)
**Status:** Simple free gift scheme

**Behavior:**
- T.O Amount: Fixed 0 (Read-Only) - NOT used in this scheme
- FOC Qty: Auto-calculated from product's scheme
- Calculation: FOC Qty = floor(qty / promo_qty) × bonus_qty

**UI State:**
- T.O Amount field: Gray, read-only, value "0.00"
- FOC Qty field: White, editable (auto-populated), can be overridden
- Trade Offer % field: Gray, read-only (FOC scheme used instead)

**Use Case:** "Buy 12 get 1 free" type schemes
- Example: Buy 12 units → Get 1 FREE piece
- Buy 24 units → Get 2 FREE pieces

**Schema in database (product_schemes):**
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| promo_qty | INT | 12 | Trigger quantity for bonus |
| bonus_qty | INT | 1 | Number of free units given |

**Formula:**
```
FOC Qty = floor(Total Qty / promo_qty) × bonus_qty
Net = Gross - Discount (T.O is 0)
```

**Implementation Location:** [return-add-scheme.js](return-add-scheme.js#applyGivenScheme)

---

## Data Flow

### 1. Product Selection
```
User selects product
→ Load product from productsData
→ Initialize row for product
→ Load product's schemes from API
→ Set default scheme to SALE_ON_TP
```

### 2. Scheme Change
```
User changes scheme dropdown
→ onSchemeChange() called
→ Clear previous scheme state
→ Apply new scheme logic
→ Fetch schemes from API if needed
→ Calculate amounts automatically
→ Update row display
→ Recalculate invoice summary
```

### 3. Quantity Entry
```
User enters quantity in unit input
→ debounceCalculateRowAmounts() called (after 300ms debounce)
→ Aggregate quantities from all units
→ Get scheme calculations (T.O Amt or FOC Qty)
→ Calculate row amounts with scheme
→ Update summary totals
```

---

## API Integration

### Fetch Product Schemes
**Endpoint:** `/server/api/sale/pos_invoice/get-product-schemes.php`
**Method:** GET
**Parameters:**
- `product_id` - ID of the product

**Response:**
```json
{
  "success": true,
  "schemes": [
    {
      "id": 1,
      "product_id": 10,
      "unit_id": 1,
      "scheme_type": "less",
      "to_qty": 12,
      "to_rs": 50.00,
      "promo_qty": null,
      "bonus_qty": null
    },
    {
      "id": 2,
      "product_id": 10,
      "unit_id": 1,
      "scheme_type": "given",
      "to_qty": null,
      "to_rs": null,
      "promo_qty": 12,
      "bonus_qty": 1
    }
  ]
}
```

---

## Key Functions

### Scheme Management ([return-add-scheme.js](return-add-scheme.js))

| Function | Purpose |
|----------|---------|
| createSchemeCell() | Create scheme dropdown in table |
| onSchemeChange() | Handle scheme selection change |
| applyDefaultScheme() | Apply SALE_ON_TP scheme |
| applyLessScheme() | Apply LESS scheme (qty-based) |
| applyLessSpecialScheme() | Apply LESS_SPECIAL (formula-based) |
| applyGivenScheme() | Apply GIVEN scheme (FOC-based) |
| calculateLessSchemeAmounts() | Calculate T.O for LESS scheme |
| calculateLessSpecialSchemeAmounts() | Calculate T.O for LESS_SPECIAL |
| calculateGivenSchemeAmounts() | Calculate FOC for GIVEN scheme |
| calculateRowAmountsWithScheme() | Calculate with scheme T.O |
| fetchProductSchemes() | Fetch schemes from API |

### UOM Management ([return-add-uom.js](return-add-uom.js))

| Function | Purpose |
|----------|---------|
| createUomCell() | Create UOM dropdown |
| onUomChange() | Handle UOM change |
| createUnitQuantityInput() | Create quantity input for unit |
| getAllRowQuantities() | Get total across all units |
| convertQuantity() | Convert between units |
| validateUom() | Validate unit for product |

### Dynamic Calculations ([return-add-uom-dynamic.js](return-add-uom-dynamic.js))

| Function | Purpose |
|----------|---------|
| setupMultipleUomInputs() | Setup multi-unit input |
| calculateRowAmounts() | Main calculation function |
| debounceCalculateRowAmounts() | Debounced calculation |
| exportRowQuantities() | Format for API submission |

### Integration ([return-add-handlers.js](return-add-handlers.js))

| Function | Purpose |
|----------|---------|
| createNewRow() | Create new table row |
| initializeRowForProduct() | Setup product for row |
| setupRowEventListeners() | Setup event handlers |
| updateInvoiceSummaryDynamic() | Update totals |
| loadProductsData() | Load products from API |

---

## Calculation Flow

### Standard Calculation (SALE_ON_TP)
```
STEP 1: Calculate Gross Amount
├─ Get total quantity (aggregated from all units with conversion factors)
├─ Multiply by sale price
└─ Result: Gross Amount

STEP 2: Calculate Discount Amount
├─ Gross × (Discount% / 100)
└─ Result: Discount Amount

STEP 3: After Discount
├─ Gross - Discount Amount
└─ Used for next calculations

STEP 4: Calculate GST
├─ After Discount × (GST% / 100)
└─ Result: GST Amount

STEP 5: Net Amount
├─ After Discount + GST Amount
└─ Final invoice amount
```

### Scheme-Based Calculation (LESS, LESS_SPECIAL, GIVEN)
```
STEP 1-3: Same as above (Gross, Discount, After Discount)

STEP 4: Get Scheme T.O Amount or FOC Qty
├─ LESS: T.O Amt = floor(qty / to_qty) × to_rs
├─ LESS_SPECIAL: T.O Amt = (Qty × Price) / (promo_qty + bonus_qty)
└─ GIVEN: FOC Qty = floor(qty / promo_qty) × bonus_qty

STEP 5: After Trade Offer
├─ After Discount - T.O Amount
├─ (T.O Amount is 0 for GIVEN scheme)
└─ Used for GST calculation

STEP 6: Calculate GST
├─ After T.O × (GST% / 100)
└─ Result: GST Amount

STEP 7: Net Amount
├─ After T.O + GST Amount
└─ Final invoice amount
```

---

## Settings & Configuration

### Trade Offer Settings
Located in modal: `#invoiceSettingsModal`

| Setting | Effect |
|---------|--------|
| enableTradeOfferDiscount | Shows Trade Offer % field (editable) |
| enableTradeOfferAmount | Allows manual T.O Amount override |

**Persistence:** Settings saved in `localStorage`

### Default Scheme
- Default scheme is SALE_ON_TP
- Saved in localStorage as `defaultScheme`
- User can change default via UI

---

## Multi-Unit Support

### Quantity Aggregation
Products can have multiple units (e.g., kg, box, piece):
```
Box = 12 Pieces = 1 Carton
```

**Conversion Factor:**
- Each unit has a `conversion_factor`
- All quantities converted to base unit for calculations
- Example: 1 Box = 12 Pieces
  - Box conversion_factor = 12
  - Piece conversion_factor = 1

**Calculation:**
```
Total Qty = (Box Qty × 12) + (Piece Qty × 1)

Example:
  User enters: 2 Boxes + 6 Pieces
  Total = (2 × 12) + 6 = 30 Pieces
  Gross = 30 × Price
```

**Scheme Calculation:**
- If scheme applies to Piece unit: Scheme calculated on 30 pieces
- If scheme applies to Box unit: Scheme calculated on 2 boxes
- Each unit can have its own scheme

---

## Error Handling

### Missing Data
- Product not found → Log warning, disable field
- Schemes not loaded → Fetch from API, retry calculation
- Invalid quantity → Treated as 0

### Validation
- Only positive quantities allowed
- Price must be numeric
- Quantity inputs normalized to 2 decimal places

---

## Browser Compatibility
- Modern browsers with ES6 support
- Tested on Firefox, Chrome, Edge
- Local storage required for settings persistence

---

## Performance Considerations

### Debouncing
- Quantity input changes debounced 300ms
- Prevents excessive recalculations during rapid input

### Caching
- Product data cached in `productsData` array
- Schemes cached in `rowSchemeData` Map
- Reduces API calls

### Table Updates
- Only modified cells updated
- Summary calculated once after all changes
- CSS transitions smooth visual updates

---

## Testing Checklist

- [ ] SALE_ON_TP: Verify T.O Amt and FOC Qty are read-only with value 0
- [ ] LESS: Verify T.O Amt calculated correctly with floor function
- [ ] LESS_SPECIAL: Verify formula: (Qty × Price) / (promo_qty + bonus_qty)
- [ ] GIVEN: Verify FOC Qty calculated: floor(Qty / promo_qty) × bonus_qty
- [ ] Multi-unit: Verify quantities aggregated correctly
- [ ] Settings: Verify Trade Offer fields enable/disable correctly
- [ ] Summary: Verify totals update on every change
- [ ] API: Verify schemes fetch from correct endpoint
- [ ] Dark theme: Verify UI readable in dark mode
- [ ] Print: Verify scheme info displays in print templates

---

## Future Enhancements

1. **Batch Schemes:** Apply same scheme to multiple rows at once
2. **Scheme Preview:** Show calculated amounts before selecting scheme
3. **Scheme History:** Log scheme changes for audit trail
4. **Custom Schemes:** Allow creating one-off schemes for special orders
5. **Scheme Expiry:** Support time-limited schemes
6. **Multi-Level Schemes:** Tiered discounts (buy 12-99 vs buy 100+)

---

## File Structure
```
client/assets/
├── js/sale/sale_return/
│   ├── return-add.js                    (Main form logic)
│   ├── return-add-scheme.js             (Scheme implementation)
│   ├── return-add-uom.js                (UOM functions)
│   ├── return-add-uom-dynamic.js        (Dynamic calculations)
│   └── return-add-handlers.js           (Integration & handlers)
└── css/sale/sale_return/
    ├── return-add.css                   (Main form styles)
    └── return-add-scheme-uom.css        (Scheme & UOM styles)

client/pages/sale/sale_return/
└── return-add.php                       (HTML form with script links)
```

---

**Last Updated:** December 2024
**Version:** 1.0
**Author:** Development Team
**Status:** Production Ready
