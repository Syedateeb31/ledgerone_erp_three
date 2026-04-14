# Bulk Branch-wise Opening Stock - Implementation Guide

## Overview
The **Bulk Branch-wise Opening Stock** page allows users to add opening stock for multiple products across multiple branches in a single grid interface. Unlike the product-add.php which adds opening stock during product creation, this dedicated page is for bulk management of existing products.

---

## Features

### 1. Product Selection
- **Search-based dropdown:** Users type product name, code, or barcode
- **One product at a time:** Prevents duplicate product additions
- **Auto-completion:** Shows matching products from the database
- **Disabled duplicates:** Already selected products appear disabled in dropdown

### 2. Data Entry Grid
- **Table format:** Branches as rows, selected products as columns
- **Multi-product display:** Multiple products shown side-by-side
- **Two-column layout:** Qty and Price columns for each product
- **Easy removal:** Products can be removed from the grid

### 3. Existing Stock Handling
- **Read-only display:** Shows existing opening stock in gray, read-only locked
- **Distinguishable:** Easy to identify what's new vs. existing
- **Prevents accidental changes:** Cannot edit pre-existing stock from this page

### 4. Validation & Save
- **Input validation:** Ensures qty and price are numeric and positive
- **Bulk save:** Save all products' opening stock in one operation
- **Error reporting:** Shows which entries failed during save
- **Success feedback:** Displays total entries saved

---

## File Structure

### Frontend Files

#### 1. **client/pages/inventory/products/bulk-opening-stock.php**
- Main page that displays the bulk opening stock interface
- Loads branches for the current company/tenant
- Passes branch data to JavaScript via body data attributes
- Includes modular components: form, table, buttons

**Key Components:**
```php
// Session validation
// Get branches list
// Pass to JavaScript via data attribute
```

#### 2. **client/assets/js/inventory/products/bulk-opening-stock.js**
- Main JavaScript controller for the page
- Handles:
  - Product search and selection
  - Table generation and updates
  - Data collection and validation
  - API communication

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `loadBranches()` | Decode and load branches from body data attribute |
| `initProductSearch()` | Set up search input with dropdown |
| `displayProductDropdown(products, dropdown)` | Show matching products |
| `addProductToTable(product)` | Add selected product to grid |
| `removeProduct(productId)` | Remove product from grid |
| `loadExistingOpeningStock(productId)` | Fetch existing stock entries |
| `updateTable()` | Regenerate table with current selection |
| `saveOpeningStock()` | Validate and submit data |
| `resetForm()` | Clear all selections |

#### 3. **client/assets/css/inventory/products/bulk-opening-stock.css**
- Complete styling for the bulk opening stock page
- Responsive design for desktop/tablet/mobile
- Dropdown, table, form, and button styles
- Toast notifications and loading spinner

---

### Backend API Files

#### 1. **server/api/inventory/products/search-products.php**
**Method:** GET  
**Parameters:**
- `q` (string) - Search query

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 100,
      "code": "PROD-000100",
      "name": "Product A",
      "default_unit_id": 12,
      "unit_name": "Piece",
      "product_type": "physical",
      "uom_type": "unit",
      "uom_group_id": null
    }
  ]
}
```

**Logic:**
- Searches products by name, code, barcode
- Filters by active products only
- Returns max 20 results
- Includes unit information

#### 2. **server/api/inventory/products/stock-opening-get.php** (EXISTING)
**Method:** GET  
**Parameters:**
- `product_id` (int) - Product ID

**Purpose:** Retrieve existing opening stock entries for a product

#### 3. **server/api/inventory/products/bulk-opening-stock-save.php**
**Method:** POST  
**Request Body (JSON):**
```json
{
  "stock_data": [
    {
      "product_id": 100,
      "branch_id": 5,
      "opening_qty": 150,
      "opening_price": 25.50,
      "unit_id": 12
    },
    {
      "product_id": 101,
      "branch_id": 5,
      "opening_qty": 200,
      "opening_price": 30.00,
      "unit_id": 13
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully saved 10 opening stock entries",
  "count": 10,
  "errors": []
}
```

**Logic:**
- Validates each entry
- Skips entries with 0 qty and 0 price
- Uses INSERT ON DUPLICATE KEY UPDATE (merge behavior)
- Deletes old stock_ledger entries for same product-branch
- Creates new stock_ledger entries
- Returns detailed success/error report

---

## Database Operations

### Tables Involved

#### 1. **stock_opening** (Insert/Update)
```sql
INSERT INTO stock_opening (product_id, tenant_id, branch_id, opening_qty, opening_price, unit_id, created_at)
VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
  opening_qty = VALUES(opening_qty),
  opening_price = VALUES(opening_price),
  created_at = CURRENT_TIMESTAMP
```

**Purpose:** Stores opening stock quantities and prices for product-branch combinations

#### 2. **stock_ledger** (Delete + Insert)
```sql
-- Delete old entries
DELETE FROM stock_ledger 
WHERE tenant_id = ? AND product_id = ? AND branch_id = ? 
  AND reference_table = 'stock_opening' 
  AND transaction_type = 'Opening Stock'

-- Insert new entry
INSERT INTO stock_ledger (tenant_id, account_id, branch_id, product_id, reference_table, 
                         reference_id, qty_in, unit_cost, unit_id, transaction_type, 
                         transaction_date, created_at)
VALUES (?, ?, ?, ?, 'stock_opening', ?, ?, ?, ?, 'Opening Stock', CURDATE(), CURRENT_TIMESTAMP)
```

**Purpose:** Maintains accounting ledger for opening stock transactions

### Flow Diagram

```
User selects Product A
         ↓
API: search-products.php returns product details
         ↓
API: stock-opening-get.php returns existing stock
         ↓
JavaScript displays table with branches as rows
Product A columns show: Qty (empty), Price (empty)
         ↓
User fills in Qty and Price for branches
         ↓
User selects Product B (similar process)
         ↓
Table now shows: Branch | Product A Qty | Price | Product B Qty | Price
         ↓
User fills in data and clicks Save
         ↓
API: bulk-opening-stock-save.php receives JSON array
         ↓
For each entry:
  1. INSERT/UPDATE stock_opening
  2. Get stock_opening.id
  3. DELETE old stock_ledger entries
  4. INSERT new stock_ledger entry
         ↓
Return: {success: true, count: XX}
         ↓
Show success toast + reset form
```

---

## User Workflow

### Step 1: Navigate to Page
Visit: `/client/pages/inventory/products/bulk-opening-stock.php`

Or add menu item:
```html
<a href="./bulk-opening-stock.php" class="menu-item">
  <i class="icon-boxes"></i>
  Bulk Opening Stock
</a>
```

### Step 2: Select Product
1. Type product name/code in search box
2. Click on matching product to select
3. Product appears in "Selected Products" list

### Step 3: Add More Products (Optional)
1. Search and select another product
2. It gets added as a new column in the table
3. Can add multiple products simultaneously

### Step 4: Enter Opening Stock Data
1. Table displays branches in rows
2. Each product has Qty and Price columns
3. Fill in opening quantities and prices
4. Red fields indicate existing stock (read-only)
5. New entries show in white/editable

### Step 5: Save
1. Click "Save Opening Stock" button
2. System validates all data
3. Shows loading spinner during processing
4. On success: Shows "Successfully saved X entries"
5. Form resets automatically

### Step 6: Reset (Optional)
- Click "Reset" to clear all selections and start fresh

---

## Data Flow Details

### Frontend to Backend

**1. Product Search**
```javascript
// User types in search input
fetch(`search-products.php?q=${encodeURIComponent(query)}`)
  → Returns matching products
```

**2. Load Existing Stock**
```javascript
// When product selected
fetch(`stock-opening-get.php?product_id=${productId}`)
  → Returns existing entries
  → Displayed as read-only in table
```

**3. Save Bulk Data**
```javascript
// Collect all unsaved entries
const stockData = [
  { product_id, branch_id, opening_qty, opening_price, unit_id },
  ...
];

fetch(`bulk-opening-stock-save.php`, {
  method: 'POST',
  body: JSON.stringify({ stock_data: stockData })
})
  → Server processes bulk insert
  → Returns success/failure report
```

---

## Validation Rules

### Frontend Validation (JavaScript)
| Rule | Action |
|------|--------|
| At least one entry with data | Prevent save if no data |
| Quantity >= 0 | Add error class to input |
| Price >= 0 | Add error class to input |
| Only valid numbers | Browser native (type=number) |

### Backend Validation (PHP)
| Rule | Action |
|------|--------|
| product_id present | Skip entry, log error |
| branch_id present | Skip entry, log error |
| qty=0 AND price=0 | Skip entry (valid, just no data) |
| qty value stored | Must be numeric |
| price value stored | Must be numeric |

---

## Error Handling

### Error Messages

**Frontend:**
- "Please enter at least one opening stock value" - No data to save
- "Please correct errors in the form" - Validation failed
- "No data to save" - Selected but empty entries
- "Error saving opening stock: [message]" - Network/server error

**Backend (Log File):**
```
=== BULK OPENING STOCK DEBUG ===
Total entries to process: 10
Entry 0: Processing product_id=100, branch_id=5, qty=150, price=25.50, unit_id=12
Entry 0: Saved successfully (stock_opening_id=1542)
Entry 1: Processing product_id=101, branch_id=5, qty=200, price=30.00, unit_id=13
...
Total entries saved: 10
============================
```

---

## Important Notes

### 1. Unit Handling
- Each product must have a `default_unit_id`
- Opening stock stored in that unit
- UOM Groups not directly supported (uses default unit)

### 2. Duplicate Prevention
- Same product-branch combination: Values are **updated** (not duplicated)
- Uses MySQL INSERT ON DUPLICATE KEY UPDATE

### 3. Stock Ledger Synchronization
- Old `stock_ledger` entries are deleted when product-branch updated
- New entries are created to maintain audit trail
- Transaction date always set to CURDATE()

### 4. Multi-tenancy
- Every query includes `tenant_id` filter
- Prevents data leakage between tenants
- Company filtering optional (if multi-company support needed)

### 5. Read-Only Existing Stock
- Existing entries retrieved from `stock_opening` table
- Displayed as disabled (readonly + gray background)
- User cannot accidentally overwrite
- Must be updated from this same page (replaces old data)

---

## Testing Checklist

- [ ] Search finds products by name
- [ ] Search finds products by code
- [ ] Search finds products by barcode
- [ ] Duplicate products disabled in dropdown
- [ ] Product addition shows in selected list
- [ ] Table generates with correct branches
- [ ] Existing stock shows as read-only
- [ ] New entries editable
- [ ] Qty validation (no negatives)
- [ ] Price validation (no negatives)
- [ ] At least one entry required before save
- [ ] Save creates stock_opening entries
- [ ] Save creates stock_ledger entries
- [ ] Save success message shows
- [ ] Form resets after successful save
- [ ] Error messages display on failure
- [ ] Product removal updates table correctly
- [ ] Reset button clears all data

---

## Integration with Menu

To add to the navigation menu, update the sidebar template:

```php
<!-- In templates/sidebar.php -->
<li>
    <a href="<?php echo BASE_URL; ?>client/pages/inventory/products/bulk-opening-stock.php">
        <i class="icon-boxes"></i>
        <span>Bulk Opening Stock</span>
    </a>
</li>
```

Or in the product module submenu:

```html
<ul class="submenu">
    <li><a href="product-list.php">Products List</a></li>
    <li><a href="product-add.php">Add Product</a></li>
    <li><a href="bulk-opening-stock.php">Bulk Opening Stock</a></li>
</ul>
```

---

## Performance Considerations

- **Search limit:** Max 20 products returned per search
- **Table size:** Efficient with up to 10-15 products simultaneously
- **Branches:** No limit, all branches loaded at once
- **Debouncing:** Search waits for user to stop typing (recommend 300ms debounce if needed)

---

## Security

- **Session validation:** Requires logged-in user
- **Tenant isolation:** All queries filtered by tenant_id
- **Input validation:** All data validated server-side
- **SQL injection prevention:** Prepared statements used throughout
- **CSRF protection:** Recommend adding token validation (in production)

---

**Last Updated:** April 14, 2026  
**Version:** Bulk Opening Stock v1.0