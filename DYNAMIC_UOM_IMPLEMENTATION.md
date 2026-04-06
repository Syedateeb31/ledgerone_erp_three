# Dynamic UOM System for Purchase Orders - Implementation Summary

## Overview
Implemented a dynamic UOM (Unit of Measure) system that automatically adjusts table columns based on product UOM configuration (single unit or UOM groups).

## Key Features

### 1. Dynamic Column Generation
- Table columns are generated dynamically based on the maximum number of units across all products in the order
- If Product A has 2 units (Pcs, Doz) and Product B has 3 units (Kg, Gram, Ton), the table will show 3 unit columns
- Products with fewer units show readonly "-" placeholders in extra columns

### 2. UOM Type Support
- **Single Unit (default_unit_id)**: Products with one unit show one column
- **UOM Group (uom_group_id)**: Products with multiple units show multiple columns

### 3. Conversion Factor Handling
- **Universal Units**: Uses `conversion_factor` from `uom` table
- **Per-Product Units**: Uses `product_conversion_factor` from `products` table
- **Base Units**: Conversion factor = 1
- Total quantity calculated as: `sum(unit_qty * conversion_factor)`

### 4. Database Structure

#### Products Table
- `uom_type`: ENUM('unit', 'group') - Determines if product uses single unit or group
- `default_unit_id`: INT - For single unit products
- `uom_group_id`: INT - For UOM group products
- `product_conversion_factor`: DECIMAL - Per-product conversion factor

#### UOM Table
- `unit_scope`: ENUM('universal', 'per_product') - Determines conversion source
- `is_base_unit`: TINYINT - Base unit flag
- `conversion_factor`: DECIMAL - Universal conversion factor

#### UOM Groups Tables
- `uom_groups`: Group metadata (id, tenant_id, group_name)
- `uom_group_units`: Many-to-many mapping (uom_group_id, uom_id)

#### Purchase Order Items Table
- Multiple entries per product (one per unit)
- Each entry stores: product_id, uom_id, quantity
- Amounts (price, discounts, GST) stored once per product

### 5. Calculation Flow

```
1. User enters quantities in unit columns (e.g., Pcs: 10, Doz: 2)
2. System calculates total quantity:
   - Pcs: 10 * 1 (base unit) = 10
   - Doz: 2 * 12 (conversion) = 24
   - Total: 34 units
3. Calculate amounts:
   - Gross = Total Qty * Price
   - Discount = Gross * Disc%
   - After Discount = Gross - Discount
   - Trade Offer = After Discount * TO%
   - After TO = After Discount - TO Amount
   - GST = After TO * GST%
   - Net = After TO + GST
```

### 6. Save Structure

```json
{
  "items": [
    {
      "productId": 123,
      "unitEntries": [
        {"uomId": 1, "quantity": 10},
        {"uomId": 2, "quantity": 2}
      ],
      "purchasePrice": 100,
      "grossAmount": 3400,
      "discountPercent": 10,
      "discountAmount": 340,
      "tradeOfferPercent": 5,
      "tradeOfferAmount": 153,
      "gstPercent": 18,
      "gstAmount": 523.26,
      "focQty": 0,
      "netAmount": 3630.26
    }
  ]
}
```

### 7. Files Modified

#### Backend
- `get-products.php`: Added UOM type, group units, conversion factors
- `order-add.php`: Updated to handle multiple unit entries per product
- `order-edit.php`: Updated for new structure

#### Frontend
- `order-add.php`: Removed fixed Unit/Qty/Pcs/Ctn/Dz columns, added dynamic header placeholder
- `order-add-uom.js`: New file with dynamic UOM logic
- `order-add.js`: Updated to use dynamic row creation
- `order-add.css`: Added styles for unit cells

### 8. Key Functions

#### JavaScript
- `getProductUOMDetails(product)`: Extracts UOM configuration from product
- `getUnitConversionFactor(unit, product)`: Gets conversion factor based on scope
- `updateTableHeaders()`: Generates dynamic column headers
- `updateFooterTotals()`: Calculates totals for each unit column
- `recalculateMaxColumns()`: Determines max columns needed
- `updateRowUnitCells(row)`: Adds/updates unit input cells for a row
- `calculateTotalQuantity(row)`: Calculates total from unit inputs
- `calculateRowAmounts(row, qty, price)`: Calculates all amounts
- `addRowDynamic()`: Creates new row with dynamic structure

### 9. Example Scenarios

#### Scenario 1: Single Unit Product
- Product: "Rice Bag"
- UOM Type: unit
- Default Unit: Kg
- Table shows: 1 column (Kg)

#### Scenario 2: UOM Group Product
- Product: "Soft Drink"
- UOM Type: group
- UOM Group: "Standard" (Pcs, Doz)
- Table shows: 2 columns (Pcs, Doz)

#### Scenario 3: Mixed Products
- Row 1: Rice (1 unit - Kg)
- Row 2: Soft Drink (2 units - Pcs, Doz)
- Row 3: Fabric (3 units - Meter, Yard, Feet)
- Table shows: 3 columns
- Rice row: Kg input, 2 readonly placeholders
- Soft Drink row: Pcs input, Doz input, 1 readonly placeholder
- Fabric row: All 3 inputs active

### 10. Conversion Examples

#### Universal Unit (Dozen)
- `unit_scope`: universal
- `is_base_unit`: 0
- `conversion_factor`: 12
- Calculation: 2 Doz * 12 = 24 Pcs

#### Per-Product Unit (Carton)
- `unit_scope`: per_product
- `is_base_unit`: 0
- Product A `product_conversion_factor`: 24
- Product B `product_conversion_factor`: 36
- Calculation A: 1 Ctn * 24 = 24 Pcs
- Calculation B: 1 Ctn * 36 = 36 Pcs

## Benefits
1. **Flexibility**: Supports any number of units per product
2. **Consistency**: Automatic column alignment across all rows
3. **Accuracy**: Proper conversion factor handling
4. **User-Friendly**: Clear unit labels, readonly placeholders for missing units
5. **Scalability**: Works with any UOM configuration

## Testing Checklist
- [ ] Single unit product entry
- [ ] UOM group product entry
- [ ] Mixed products with different unit counts
- [ ] Universal unit conversions
- [ ] Per-product unit conversions
- [ ] Base unit handling
- [ ] Total quantity calculations
- [ ] Amount calculations (discounts, GST)
- [ ] Save functionality
- [ ] Edit mode loading
- [ ] Footer totals
- [ ] Dynamic column addition/removal
