# Scheme Management - Quick Reference Card

## 🎯 What Was Built?

A promotional scheme management system for products that supports:
- **Default Unit Mode:** Single unit per product
- **UOM Group Mode:** Multiple units per product (Pcs, Ctn, Box, etc.)

---

## 📁 File Locations

```
NEW FILES:
├── client/pages/inventory/products/scheme-modal.php
├── client/assets/js/inventory/products/scheme-functions.js
├── server/api/inventory/products/scheme-save.php
└── server/migrations/create_product_schemes_table.sql

MODIFIED FILES:
├── client/pages/inventory/products/product-add.php
└── client/assets/js/inventory/products/product-add.js

DOCUMENTATION:
├── SCHEME_IMPLEMENTATION.md
├── SCHEME_SETUP.md
├── SCHEME_ARCHITECTURE.md
├── SCHEME_SUMMARY.md
└── IMPLEMENTATION_CHECKLIST.md
```

---

## 🚀 Quick Start

### 1. Create Database Table
```sql
-- Run: server/migrations/create_product_schemes_table.sql
CREATE TABLE `product_schemes` (...)
```

### 2. Verify Includes in product-add.php
```php
<?php include 'scheme-modal.php'; ?>
<script src="../../assets/js/inventory/products/scheme-functions.js"></script>
```

### 3. Test
- Default Unit mode: Select unit → Click "Manage Schemes"
- UOM Group mode: Select group → Click "Manage Schemes"

---

## 🎮 How to Use

### Default Unit Mode
```
1. Create product
2. Select UOM Type = "Unit"
3. Select a unit (e.g., Pcs)
4. Click "Manage Schemes" button
5. Add schemes (Buy 10 get 2 free)
6. Click "Save Schemes"
```

### UOM Group Mode
```
1. Create product
2. Select UOM Type = "Group"
3. Select a group (e.g., Standard)
4. Click "Manage Schemes" button
5. Add schemes for each unit:
   - Pcs: Buy 10 get 2 free
   - Ctn: Buy 5 get ₹50 discount
6. Click "Save Schemes"
```

---

## 📊 Scheme Columns

| Column | Meaning | Example |
|--------|---------|---------|
| **Promo Qty** | Free items when buying this qty | Buy 10 → Get 2 free |
| **Bonus Qty** | Additional bonus items | 2 |
| **TO Qty** | Trade Offer quantity condition | Buy 5 units |
| **TO Rs** | Trade Offer discount in rupees | ₹50 |

---

## 🔑 Key Functions

```javascript
// Initialize buttons (called on page load)
initSchemeButton()

// Show button for Default Unit
handleDefaultUnitChangeWithScheme()

// Show button for UOM Group
handleUomGroupChangeWithScheme()

// Open modal with correct table
openSchemeModal()

// Save schemes to database
saveSchemes()

// Close modal
closeSchemeModal()
```

---

## 🗄️ Database Query Examples

### Get all schemes for a product
```sql
SELECT ps.*, u.uom_name 
FROM product_schemes ps
JOIN uom u ON ps.unit_id = u.id
WHERE ps.product_id = 5 AND ps.tenant_id = 1;
```

### Get schemes for specific unit
```sql
SELECT * FROM product_schemes 
WHERE product_id = 5 AND unit_id = 9 AND tenant_id = 1;
```

### Delete all schemes for a product
```sql
DELETE FROM product_schemes 
WHERE product_id = 5 AND tenant_id = 1;
```

---

## ⚠️ Important Notes

1. **Schemes save AFTER product is saved** (not before)
2. **Each unit can have different schemes** (in group mode)
3. **Tenant isolation is enforced** (multi-tenancy safe)
4. **Modal resets on close** (no data persistence)
5. **Unique constraint prevents duplicates** (same scheme twice)

---

## 🧪 Quick Test

### Test Default Unit:
```
1. Go to Add Product
2. Select Unit type
3. Select Pcs unit
4. Click "Manage Schemes"
5. Add: Promo=10, Bonus=2
6. Save
7. Check DB: SELECT * FROM product_schemes WHERE product_id=X
```

### Test UOM Group:
```
1. Go to Add Product
2. Select Group type
3. Select Standard group
4. Click "Manage Schemes"
5. Add Row 1: Unit=Pcs, Promo=10, Bonus=2
6. Add Row 2: Unit=Ctn, TO Qty=5, TO Rs=50
7. Save
8. Check DB: SELECT * FROM product_schemes WHERE product_id=X
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Button not showing | Select unit/group first |
| Modal not opening | Check console for errors |
| Schemes not saving | Save product first |
| Wrong table | Check mode (Unit vs Group) |
| Database error | Run migration |

---

## 📚 Documentation

- **SCHEME_IMPLEMENTATION.md** - Full feature docs
- **SCHEME_SETUP.md** - Setup guide
- **SCHEME_ARCHITECTURE.md** - Technical details
- **SCHEME_SUMMARY.md** - Implementation summary
- **IMPLEMENTATION_CHECKLIST.md** - Complete checklist

---

## 🔒 Security

✅ Tenant isolation
✅ Session validation
✅ Product ownership check
✅ SQL injection prevention
✅ Cascade delete
✅ Unique constraints

---

## 📈 Performance

✅ Indexed queries
✅ Batch inserts
✅ Cascade delete
✅ Tenant filtering
✅ Unique constraints

---

## 🎯 What's Included

✅ 4 new files (modal, JS, API, migration)
✅ 2 modified files (product-add.php, product-add.js)
✅ 5 documentation files
✅ Complete error handling
✅ Full tenant isolation
✅ Responsive UI
✅ Both modes supported

---

## ✨ Status

**Implementation:** ✅ COMPLETE
**Testing:** Ready for QA
**Documentation:** ✅ COMPLETE
**Deployment:** Ready for Production

---

## 📞 Need Help?

1. Check SCHEME_SETUP.md for troubleshooting
2. Check SCHEME_ARCHITECTURE.md for technical details
3. Check IMPLEMENTATION_CHECKLIST.md for verification
4. Check browser console for JavaScript errors
5. Check server logs for PHP errors

---

**Quick Reference Card v1.0**
**Last Updated: 2024**
