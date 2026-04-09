# Scheme Management - Quick Setup Guide

## Step 1: Create Database Table

Run this SQL in your database:

```sql
CREATE TABLE IF NOT EXISTS `product_schemes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `promo_qty` int(11) NOT NULL DEFAULT 0,
  `bonus_qty` int(11) NOT NULL DEFAULT 0,
  `to_qty` int(11) NOT NULL DEFAULT 0,
  `to_rs` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_scheme` (`tenant_id`, `product_id`, `unit_id`, `promo_qty`, `to_qty`),
  KEY `idx_product_unit` (`product_id`, `unit_id`),
  KEY `idx_tenant` (`tenant_id`),
  CONSTRAINT `fk_product_schemes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_schemes_unit` FOREIGN KEY (`unit_id`) REFERENCES `uom` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_schemes_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Step 2: Verify Files Are In Place

Check these files exist:

✓ `client/pages/inventory/products/scheme-modal.php`
✓ `client/assets/js/inventory/products/scheme-functions.js`
✓ `server/api/inventory/products/scheme-save.php`
✓ `server/migrations/create_product_schemes_table.sql`

## Step 3: Verify product-add.php Includes

In `client/pages/inventory/products/product-add.php`, verify these lines exist:

```php
<!-- Include scheme modal -->
<?php include 'scheme-modal.php'; ?>

<!-- At the end, before closing body -->
<script src="../../assets/js/inventory/products/scheme-functions.js"></script>
```

## Step 4: Test the Implementation

### Test Default Unit Mode:
1. Go to Add Product page
2. Select UOM Type = "Unit"
3. Select a unit from "Default Unit" dropdown
4. Verify "Manage Schemes" button appears
5. Click button → Modal should open with simple table (no Unit column)
6. Add a scheme: Promo Qty=10, Bonus=2
7. Click "Save Schemes"
8. Verify success message

### Test UOM Group Mode:
1. Go to Add Product page
2. Select UOM Type = "Group"
3. Select a UOM Group (e.g., Standard)
4. Verify "Manage Schemes" button appears
5. Click button → Modal should open with Unit column
6. Add first scheme: Unit=Pcs, Promo Qty=10, Bonus=2
7. Add second scheme: Unit=Ctn, TO Qty=5, TO Rs=50
8. Click "Save Schemes"
9. Verify success message

## Step 5: Verify Database

After saving schemes, check database:

```sql
SELECT * FROM product_schemes WHERE product_id = 5;
```

Should show schemes for each unit.

## Troubleshooting

### Button not showing:
- Check if unit/group is selected
- Check browser console for JavaScript errors
- Verify scheme-functions.js is loaded

### Modal not opening:
- Check if scheme-modal.php is included in product-add.php
- Check browser console for errors
- Verify modal element IDs match

### Schemes not saving:
- Check if product is saved first (can't save schemes for new product)
- Check server logs for API errors
- Verify tenant_id is set in session

### Table structure wrong:
- For Default Unit: Should NOT have Unit column
- For UOM Group: Should have Unit column with dropdown
- Check `displayUnitSchemeTable()` vs `displayGroupSchemeTable()` calls

## File Locations Reference

```
ledgerone_erp/
├── client/
│   ├── pages/inventory/products/
│   │   ├── product-add.php (MODIFIED)
│   │   └── scheme-modal.php (NEW)
│   └── assets/js/inventory/products/
│       ├── product-add.js (MODIFIED)
│       └── scheme-functions.js (NEW)
└── server/
    ├── api/inventory/products/
    │   └── scheme-save.php (NEW)
    └── migrations/
        └── create_product_schemes_table.sql (NEW)
```

## Key Functions

### In scheme-functions.js:

```javascript
// Initialize buttons (called on page load)
initSchemeButton()

// Handle Default Unit selection
handleDefaultUnitChangeWithScheme()

// Handle UOM Group selection
handleUomGroupChangeWithScheme()

// Open modal with appropriate table
openSchemeModal()

// Save schemes to database
saveSchemes()

// Close modal
closeSchemeModal()
```

## Database Query Examples

### Get all schemes for a product:
```sql
SELECT ps.*, u.uom_name 
FROM product_schemes ps
JOIN uom u ON ps.unit_id = u.id
WHERE ps.product_id = 5 AND ps.tenant_id = 1
ORDER BY u.uom_name;
```

### Get schemes for specific unit:
```sql
SELECT * FROM product_schemes 
WHERE product_id = 5 AND unit_id = 9 AND tenant_id = 1;
```

### Delete all schemes for a product:
```sql
DELETE FROM product_schemes 
WHERE product_id = 5 AND tenant_id = 1;
```

## Support

For issues or questions, refer to:
- `SCHEME_IMPLEMENTATION.md` - Detailed documentation
- `scheme-functions.js` - Function comments
- `scheme-save.php` - API logic
