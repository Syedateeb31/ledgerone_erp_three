# Bulk Opening Stock - Complete System Guide

## System Overview
The Bulk Opening Stock feature allows users to enter opening inventory quantities and prices for multiple products across different branches in a single consolidated table view. This is different from the branch-wise stock entry during individual product creation—instead, this feature provides a dedicated interface for batch uploading opening stock data across the entire product catalog.

---

## 1. DATABASE TABLES & STRUCTURE

### Primary Tables Involved:

#### **Table: `stock_opening`**
```sql
CREATE TABLE `stock_opening` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `opening_qty` decimal(15,3) DEFAULT 0.000,
  `opening_price` decimal(15,4) DEFAULT 0.0000,
  `unit_id` int(11) DEFAULT NULL,              -- Unit of measurement used
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_tenant_branch_unit` (`product_id`, `tenant_id`, `branch_id`, `unit_id`),
  KEY `fk_stock_opening_product` (`product_id`),
  KEY `fk_stock_opening_branch` (`branch_id`),
  KEY `fk_stock_opening_tenant` (`tenant_id`),
  KEY `idx_stock_opening_product_branch` (`product_id`, `branch_id`),
  KEY `idx_stock_opening_tenant_branch` (`tenant_id`, `branch_id`),
  KEY `idx_stock_opening_created_at` (`created_at`),
  KEY `idx_stock_opening_tenant_product_date` (`tenant_id`, `product_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Purpose:** Stores opening stock quantities for each product-branch combination
- `product_id` - Links to products table
- `branch_id` - Links to branches table
- `tenant_id` - Multi-tenant isolation
- `opening_qty` - Original quantity in the specified unit
- `opening_price` - Unit cost (price per unit)
- `unit_id` - Unit of measurement used for the quantity
- **UNIQUE Constraint:** Prevents duplicate entries for same product-tenant-branch-unit combination
- **ON DUPLICATE KEY UPDATE:** Allows updating existing entries (see backend implementation)

#### **Table: `stock_ledger`**
```sql
CREATE TABLE `stock_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL DEFAULT 33,
  `branch_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `reference_table` varchar(100) DEFAULT NULL,     -- 'stock_opening'
  `reference_id` int(11) DEFAULT NULL,             -- references stock_opening.id
  `stock_status` enum('sellable','damaged') NOT NULL DEFAULT 'sellable',
  `qty_in` decimal(15,3) DEFAULT 0.000,
  `qty_out` decimal(15,3) DEFAULT 0.000,
  `unit_cost` decimal(15,4) DEFAULT 0.0000,
  `unit_id` int(11) NOT NULL,
  `transaction_type` varchar(50) NOT NULL,        -- 'Opening Stock'
  `transaction_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_stock_ledger_reference` (`reference_table`, `reference_id`),
  KEY `idx_stock_ledger_product` (`product_id`),
  KEY `idx_stock_ledger_branch` (`branch_id`),
  KEY `idx_stock_ledger_transaction` (`transaction_type`, `transaction_date`),
  KEY `idx_stock_ledger_tenant_product` (`tenant_id`, `product_id`),
  KEY `idx_stock_ledger_tenant_branch_date` (`tenant_id`, `branch_id`, `transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Purpose:** Maintains a ledger entry for each opening stock transaction
- Cross-references `stock_opening` table via `reference_table` = 'stock_opening' and `reference_id`
- Records the `qty_in` (opening quantity) and `unit_cost` for costing/valuation
- Sets `transaction_type` = 'Opening Stock' to differentiate from regular transactions
- Used for stock ledger reports and audit trails

#### **Related Tables:**
- `products` - Product information (code, name, uom_type, uom_group_id, default_unit_id)
- `branches` - Branch/Location information (branch_name, branch_type, parent_branch_id)
- `uom_group` - Unit of Measurement groups (for multi-unit products)
- `uom_details` - Individual units within a UOM group (conversion factors, base unit flags)

---

## 2. FRONTEND FLOW - JavaScript Functions

### **File:** `client/assets/js/inventory/products/bulk-opening-stock.js`

#### **Global State Management** (Top of file)

```javascript
let selectedProducts = {};      // { product_id: { id, code, name, default_unit_id, unit_name, uom_type, ... } }
let allBranches = [];           // Array of all branch objects
let existingOpeningStock = {};  // { product_id: { branch_id: { qty, price, unit_id } } }
```

**Purpose:** Maintains client-side state for:
- Products selected by user
- All available branches
- Existing stock entries loaded from database

#### **Function: `initProductSearch()`** (Page Load)
**Purpose:** Initialize the product search dropdown

**Logic:**
```javascript
1. Get product search input element (#productSearch)
2. Get dropdown container element (#productDropdown)
3. Setup input event listener:
   - Trigger on user typing >= 2 characters
   - Call searchProducts() with input value
   - Hide dropdown if < 2 characters
4. Setup click outside listener:
   - Close dropdown when clicking elsewhere on page
5. Setup focus listener (optional):
   - Show dropdown if input already has >= 2 characters
```

**Features:**
- Debounce not implemented (could be added for optimization)
- Shows products matching search query
- Disables already-selected products in dropdown
- Prevents duplicate product selection

#### **Function: `loadBranches()`** (Page Load)
**Purpose:** Load all branches from session data

**Logic:**
```javascript
1. Get main-content div element
2. Read JSON from data-branches attribute:
   - Data passed from PHP via <?php echo htmlspecialchars(json_encode($branches), ENT_QUOTES, 'UTF-8'); ?>
3. Parse JSON into allBranches array
4. Handle errors if parsing fails
5. Global allBranches is now available for:
   - Building table rows
   - Input name generation
6. Log for debugging
```

**Data Source:** PHP renders branches data as:
```html
<div class="main-content" data-branches='[{"id": 5, "branch_name": "Karachi", "branch_type": "Main"}, ...]'>
```

#### **Function: `displayProductDropdown(products, dropdown)`**
**Purpose:** Render search results in dropdown

**Logic:**
```javascript
1. Clear dropdown HTML
2. For each product in results:
   a) Create div element with class 'dropdown-item'
   b) If product already selected:
      - Add 'disabled' class
      - Set innerHTML with product info
      - Don't add click handler
   c) If product not selected:
      - Add click handler
      - Call addProductToTable(product) on click
      - Clear search input
      - Close dropdown
3. Render: Code - Name (Unit Name)
```

**HTML Structure:**
```html
<div class="dropdown-item [disabled]">
  <strong>PROD-001</strong> - Product Name
  <small>Piece</small>
</div>
```

#### **Function: `addProductToTable(product)`**
**Purpose:** Add selected product to the table display

**Logic:**
```javascript
1. Store product in selectedProducts[product.id]:
   - id, code, name
   - default_unit_id, unit_name
   - product_type, uom_type, uom_group_id
2. Call loadExistingOpeningStock(product.id):
   - Fetch existing stock entries from database
   - Populate existingOpeningStock[product_id][branch_id]
3. Update table:
   - Call updateTable() to rebuild
4. Show/hide UI elements:
   - Show selected products info
   - Show save button
   - Hide empty state message
```

#### **Function: `loadExistingOpeningStock(productId)`**
**Purpose:** Fetch existing opening stock entries from database

**API Call:**
```
GET /server/api/inventory/products/stock-opening-get.php?product_id=100
```

**Response Handling:**
```javascript
1. Parse JSON response
2. If success && stock_entries exists:
   a) Create nested object: existingOpeningStock[productId] = {}
   b) For each stock entry:
      - existingOpeningStock[productId][entry.branch_id] = {
          qty: entry.opening_qty,
          price: entry.opening_price,
          unit_id: entry.unit_id
        }
3. Used in updateTable() to:
   - Shows existing values in readonly inputs
   - Prevents editing existing entries
   - Applies grayed-out styling
```

#### **Function: `updateTable()`**
**Purpose:** Dynamically rebuild the table with product columns

**Logic:**
```javascript
1. Get table header and body elements
2. Remove existing product columns
3. For each selected product:
   a) Create <th> element with product info (Code, Unit Name)
   b) Set colSpan="2" (for Qty and Price)
   c) Append to header
4. Add sub-headers (Qty | Price) for each product
5. Build table rows:
   FOR each branch in allBranches:
   a) Create <tr> element (class='data-row')
   b) Add cells:
      - Branch Name (<td class='branch-name'>)
      - Branch Type (<td class='branch-type'>)
   c) FOR each product in selectedProducts:
      1) Get existing stock (if any) from existingOpeningStock
      2) Create Qty input:
         - name="qty_{product_id}_{branch_id}"
         - class="form-control qty-input"
         - data-product-id="{product_id}"
         - data-branch-id="{branch_id}"
         - readonly IF existing stock present
         - style grayed-out if readonly
      3) Create Price input:
         - name="price_{product_id}_{branch_id}"
         - Same readonly/readonly logic as Qty
      4) Append Qty and Price cells to row
   d) Append row to tbody
```

**Result Table Structure:**
```
┌──────────┬───────┬──────────────────┬──────────────────┐
│ Branch   │ Type  │ PROD-001 (Piece) │ PROD-002 (Kg)    │
├──────────┼───────┼──────┬───────────┼──────┬───────────┤
│          │       │ Qty  │ Price     │ Qty  │ Price     │
├──────────┼───────┼──────┼───────────┼──────┼───────────┤
│ Karachi  │ Main  │[   ] │[        ] │[   ] │[        ] │
│ Lahore   │ Branch│[100] │[  25.50]  │[   ] │[        ] │ (readonly)
│ Islamabad│ Branch│[   ] │[        ] │[   ] │[        ] │
└──────────┴───────┴──────┴───────────┴──────┴───────────┘
```

#### **Function: `removeProduct(productId)`**
**Purpose:** Remove product from selection

**Logic:**
```javascript
1. Delete from selectedProducts[productId]
2. Delete from existingOpeningStock[productId]
3. If no products remain:
   - Hide selected products info
   - Show empty state message
   - Hide save button
4. Else:
   - Update selected products list
   - Update table
```

#### **Function: `updateSelectedProductsList()`**
**Purpose:** Display selected products as removable tags

**Logic:**
```javascript
1. Get selected products list container
2. Clear existing tags
3. For each product in selectedProducts:
   a) Create span element (class='product-tag')
   b) Render: "CODE - NAME" with remove button (×)
   c) Wire up removeProduct() onclick handler
```

**HTML Result:**
```html
<span class="product-tag">
  PROD-001 - Product Name
  <button type="button" class="remove-btn" onclick="removeProduct(100)">×</button>
</span>
```

#### **Function: `saveOpeningStock()`**
**Purpose:** Validate and save all stock entries to backend

**Logic:**
```javascript
1. VALIDATION:
   a) Get all qty inputs (not readonly)
   b) FOR each input:
      - Check if qty > 0 OR price > 0
      - Check if qty < 0 (negative validation)
      - Mark errors if negative values
   c) If no data entered: Show warning and return
   d) If validation errors: Show error and return

2. DATA COLLECTION:
   a) Initialize empty stockData array
   b) FOR each selected product:
      FOR each branch:
      - Get qty input: qty_{product_id}_{branch_id} (skip if readonly)
      - Get price input: price_{product_id}_{branch_id} (skip if readonly)
      - IF qty > 0 OR price > 0:
         Push to stockData: {
           product_id: product.id,
           branch_id: branch.id,
           opening_qty: qty,
           opening_price: price,
           unit_id: product.default_unit_id
         }
   c) If stockData is empty: Show warning and return

3. SUBMISSION:
   a) Show loading spinner
   b) POST to /server/api/inventory/products/bulk-opening-stock-save.php
   c) Headers: Content-Type: application/json
   d) Body: { stock_data: stockData }

4. RESPONSE HANDLING:
   a) Hide loading spinner
   b) If success:
      - Show success toast: "Successfully saved X entries"
      - Call resetForm()
   c) If error:
      - Show error toast with message

5. ERROR HANDLING:
   a) Catch network errors
   b) Show error message to user
```

**Console Debug Output:**
```javascript
// Example calculation:
const stockData = [
  {
    product_id: 100,
    branch_id: 5,
    opening_qty: 150,
    opening_price: 25.50,
    unit_id: 12
  },
  {
    product_id: 100,
    branch_id: 3,
    opening_qty: 0,
    opening_price: 0,
    unit_id: 12
    // Skipped because qty and price are 0
  },
  {
    product_id: 101,
    branch_id: 5,
    opening_qty: 50,
    opening_price: 100.00,
    unit_id: 13
  }
];
```

#### **Function: `resetForm()`**
**Purpose:** Clear form and return to initial state

**Logic:**
```javascript
1. Clear selectedProducts = {}
2. Clear existingOpeningStock = {}
3. Clear search input
4. Hide selected products info section
5. Show empty state message
6. Hide save button
7. Clear table body
8. Remove product columns from header
```

---

## 3. BACKEND FLOW - PHP Functions

### **File:** `server/api/inventory/products/bulk-opening-stock-save.php`

#### **Step 1: Request Validation** (Lines 1-30)
```php
// Check HTTP method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    return error "Method not allowed"
}

// Check session/authorization
if (!isset($_SESSION['user_id']) || !isset($_SESSION['tenant_id'])) {
    http_response_code(401);
    return error "Unauthorized"
}
```

#### **Step 2: Data Parsing** (Lines 31-45)
```php
1. Read JSON from request body: $json = file_get_contents('php://input')
2. Decode JSON: $data = json_decode($json, true)
3. Validate format:
   - Check isset($data['stock_data'])
   - Check is_array($data['stock_data'])
   - Check not empty
4. If invalid: Return error JSON
```

**Expected JSON Structure:**
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
      "branch_id": 3,
      "opening_qty": 75,
      "opening_price": 24.00,
      "unit_id": 13
    }
  ]
}
```

#### **Step 3: Database Account Lookup** (Lines 46-51)
```php
1. Query chart_of_accounts for 'Stock' account:
   SELECT id FROM chart_of_accounts 
   WHERE account_name = 'Stock' AND tenant_id = ?
2. If found: Use account id
3. If not found: Default to account_id = 33
4. Used in stock_ledger INSERT
```

#### **Step 4: Prepare Statements** (Lines 52-80)

**Statement 1: Stock Opening Insert/Update**
```php
$stockOpeningStmt = $pdo->prepare("
    INSERT INTO stock_opening 
    (product_id, tenant_id, branch_id, opening_qty, opening_price, unit_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE 
        opening_qty = VALUES(opening_qty),
        opening_price = VALUES(opening_price),
        created_at = CURRENT_TIMESTAMP
");
```

**Purpose:** 
- Inserts new stock opening entry
- If entry exists (unique constraint violation): Updates existing entry
- Allows batch re-processing of same data

**Statement 2: Stock Ledger Delete**
```php
$stockLedgerDeleteStmt = $pdo->prepare("
    DELETE FROM stock_ledger 
    WHERE tenant_id = ? AND product_id = ? AND branch_id = ? 
        AND reference_table = 'stock_opening' 
        AND transaction_type = 'Opening Stock'
");
```

**Purpose:**
- Deletes old ledger entries for same product-branch-tenant combination
- Ensures ledger stays in sync when re-processing opening stock

**Statement 3: Stock Ledger Insert**
```php
$stockLedgerStmt = $pdo->prepare("
    INSERT INTO stock_ledger 
    (tenant_id, account_id, branch_id, product_id, reference_table, reference_id, 
     qty_in, unit_cost, unit_id, transaction_type, transaction_date, created_at)
    VALUES (?, ?, ?, ?, 'stock_opening', ?, ?, ?, ?, 'Opening Stock', CURDATE(), CURRENT_TIMESTAMP)
");
```

**Purpose:**
- Creates ledger entry linking to stock_opening entry
- Records qty_in and unit_cost for valuation
- `reference_id` parameter = stock_opening.id

#### **Step 5: Data Insertion Loop** (Lines 81-140)

**Main Processing Loop:**
```php
FOR EACH entry in stock_data:
    TRY {
        1. Extract values:
           - product_id
           - branch_id
           - opening_qty (convert to float)
           - opening_price (convert to float)
           - unit_id
        
        2. Validate required fields:
           IF !product_id OR !branch_id:
               Add to errors array, continue to next entry
        
        3. Skip if no qty and no price:
           IF opening_qty == 0 AND opening_price == 0:
               Log "Skipped (no qty/price)", continue
        
        4. Log entry start:
           error_log("Entry $index: Processing ...")
        
        5. INSERT INTO stock_opening:
           $stockOpeningStmt->execute([
               $product_id,
               $tenant_id,
               $branch_id,
               $opening_qty,
               $opening_price,
               $unit_id
           ])
        
        6. Get inserted/updated stock_opening ID:
           Query: SELECT id FROM stock_opening 
                  WHERE product_id = ? AND tenant_id = ? AND branch_id = ?
                  ORDER BY created_at DESC LIMIT 1
           Store in $stock_opening_id
        
        7. DELETE old stock ledger entries:
           $stockLedgerDeleteStmt->execute([
               $tenant_id,
               $product_id,
               $branch_id
           ])
        
        8. INSERT INTO stock_ledger:
           $stockLedgerStmt->execute([
               $tenant_id,
               $inventory_account,
               $branch_id,
               $product_id,
               $stock_opening_id,        -- Links to stock_opening.id
               $opening_qty,
               $opening_price,
               $unit_id
           ])
        
        9. Increment $saveCount
        
        10. Log success:
            error_log("Entry $index: Saved successfully (stock_opening_id=$stock_opening_id)")
    
    } CATCH (Exception $e) {
        Log error: error_log("Entry $index: Error - " . $e->getMessage())
        Add to errors: $errors[] = "Entry $index: " . $e->getMessage()
    }
```

#### **Step 6: Response Generation** (Lines 141-165)

**Success Response (saveCount > 0):**
```json
{
  "success": true,
  "message": "Successfully saved 3 opening stock entries",
  "count": 3,
  "errors": []
}
```

**Partial Success Response (some entries saved, some failed):**
```json
{
  "success": true,
  "message": "Successfully saved 2 opening stock entries",
  "count": 2,
  "errors": [
    "Entry 1: product_id is required"
  ]
}
```

**Failure Response (no entries saved):**
```json
{
  "success": false,
  "message": "No entries were saved. Entry 0: Invalid branch_id",
  "count": 0,
  "errors": ["Entry 0: Invalid branch_id"]
}
```

#### **Error Handling** (Lines 166-185)

**Database Error (PDOException):**
```php
CATCH (PDOException $e) {
    http_response_code(500)
    error_log('BULK OPENING STOCK DB ERROR: ' . $e->getMessage())
    RETURN: {
        success: false,
        message: "Database error: " + error message,
        count: 0
    }
}
```

**General Exception:**
```php
CATCH (Exception $e) {
    http_response_code(500)
    error_log('BULK OPENING STOCK ERROR: ' . $e->getMessage())
    RETURN: {
        success: false,
        message: "Error: " + error message,
        count: 0
    }
}
```

---

### **File:** `server/api/inventory/products/stock-opening-get.php`

#### **Purpose:** Retrieve existing opening stock entries for a product

**Query:**
```php
SELECT so.*, 
       b.branch_name, 
       b.branch_type,
       CONCAT(b.branch_name, ' (', b.branch_type, ')') as branch_display
FROM stock_opening so
LEFT JOIN branches b ON so.branch_id = b.id
WHERE so.product_id = ? AND so.tenant_id = ?
ORDER BY b.branch_name
```

**Parameters:**
- `product_id` from query string
- `tenant_id` from session

**Response Format:**
```json
{
  "success": true,
  "stock_entries": [
    {
      "id": 1,
      "product_id": 100,
      "tenant_id": 1,
      "branch_id": 5,
      "opening_qty": "150.000",
      "opening_price": "25.5000",
      "unit_id": 12,
      "branch_name": "Karachi",
      "branch_type": "Main",
      "branch_display": "Karachi (Main)"
    },
    {
      "id": 2,
      "product_id": 100,
      "tenant_id": 1,
      "branch_id": 3,
      "opening_qty": "75.000",
      "opening_price": "24.0000",
      "unit_id": 12,
      "branch_name": "Lahore",
      "branch_type": "Branch",
      "branch_display": "Lahore (Branch)"
    }
  ]
}
```

**Usage in JS:**
- Data populates existingOpeningStock nested object
- Makes matched inputs readonly in updateTable()
- Shows existing values for reference

---

### **File:** `server/api/inventory/products/search-products.php`

#### **Purpose:** Search products by name/code

**Query Parameter:**
- `q` = search query (min 2 characters)

**Query Logic:**
```php
SELECT id, code, name, product_type, 
       default_unit_id, uom_type, uom_group_id, unit_name
FROM products
WHERE (code LIKE CONCAT('%', ?, '%') 
       OR name LIKE CONCAT('%', ?, '%'))
  AND tenant_id = ?
LIMIT 10
```

**Response Format:**
```json
{
  "success": true,
  "products": [
    {
      "id": 100,
      "code": "PROD-001",
      "name": "Product Name",
      "product_type": "physical",
      "default_unit_id": 12,
      "uom_type": "unit",
      "uom_group_id": null,
      "unit_name": "Piece"
    }
  ]
}
```

---

## 4. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: Bulk Opening Stock Page                              │
│ (bulk-opening-stock.php)                                        │
│                                                                  │
│ ├─ Product Search Input                                         │
│ │  └─ #productSearch (triggers search on >= 2 chars)          │
│ │                                                               │
│ ├─ Product Dropdown (search results)                            │
│ │  └─ #productDropdown (shows 10 matching products)           │
│ │     └─ Click product → addProductToTable()                  │
│ │                                                               │
│ ├─ Selected Products Section                                    │
│ │  └─ Product tags with remove buttons                         │
│ │     └─ Click × → removeProduct()                            │
│ │                                                               │
│ └─ Opening Stock Table                                          │
│    ├─ Header: Branch names | Product columns (Qty | Price)    │
│    └─ Rows: One per branch                                     │
│       ├─ Branch Name | Branch Type                             │
│       ├─ For each product:                                     │
│       │  ├─ Qty input (qty_{product_id}_{branch_id})         │
│       │  └─ Price input (price_{product_id}_{branch_id})     │
│       │     └─ Readonly if existing stock                     │
│       └─ Save Button (bottom)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                   Page Load: DOMContentLoaded
                              ↓
              ┌──────────────────────────┐
              │ loadBranches()           │
              │ initProductSearch()      │
              └──────────────────────────┘
                    ↓                ↓
            Load from       Setup product
            data-branches   search input/
            attribute       dropdown
                              ↓
                    User types in search
                              ↓
                   fetch search-products.php
                              ↓
              displayProductDropdown(results)
                              ↓
                   User clicks product
                              ↓
              addProductToTable(product)
                    ↓                    ↓
        Store in          fetch stock-opening-get.php
        selectedProducts         for existing stock
           ↓                           ↓
        updateTable()    Load into existingOpeningStock
           ↓
    Rebuild table with:
    - New product column
    - Inputs for all branches
    - Readonly existing values
           ↓
    User enters quantities/prices
           ↓
    Click Save button
           ↓
     saveOpeningStock()
           ↓
        VALIDATE:
        - Check for data
        - Check for errors
        - Collect non-readonly inputs
           ↓
        ┌─────────────────────┐
        │ IF validation fails:│
        │ Show error/warning  │
        │ RETURN              │
        └─────────────────────┘
        ┌─────────────────────┐
        │ IF validation passes│
        │ Collect data        │
        └─────────────────────┘
                ↓
    POST to backend
    /server/api/inventory/products/bulk-opening-stock-save.php
    Headers: Content-Type: application/json
    Body: { stock_data: [...] }
                ↓
    ┌──────────────────────────────────────────────────────────┐
    │ BACKEND: bulk-opening-stock-save.php                     │
    │                                                           │
    │ 1. Validate request (POST, auth)                        │
    │ 2. Parse JSON data                                       │
    │ 3. Get inventory account                                 │
    │ 4. Prepare SQL statements (insert, delete, get)         │
    │ 5. FOR each stock entry:                                │
    │    a) Insert/update into stock_opening                  │
    │    b) Get inserted stock_opening_id                     │
    │    c) Delete old stock_ledger entries                   │
    │    d) Insert new stock_ledger entry                     │
    │    e) Increment counter, log success                    │
    │ 6. Return JSON response                                 │
    └──────────────────────────────────────────────────────────┘
                ↓
    ┌──────────────────────┐
    │ DATABASE UPDATE      │
    ├──────────────────────┤
    │ stock_opening        │
    │  ├─ product_id: 100  │
    │  ├─ branch_id: 5     │
    │  ├─ opening_qty: 150 │
    │  ├─ opening_price: 25│
    │  ├─ unit_id: 12      │
    │  └─ created_at: NOW()│
    │                      │
    │ stock_ledger         │
    │  ├─ product_id: 100  │
    │  ├─ branch_id: 5     │
    │  ├─ reference_id: 1  │ (stock_opening.id)
    │  ├─ qty_in: 150      │
    │  ├─ unit_id: 12      │
    │  ├─ transaction_type:│
    │  │  'Opening Stock'  │
    │  └─ created_at: NOW()│
    └──────────────────────┘
                ↓
    FRONTEND: Handle response
                ↓
        ┌──────────────┐
        │ If success:  │
        │ Show message │
        │ resetForm()  │
        └──────────────┘
        ┌──────────────┐
        │ If error:    │
        │ Show error   │
        │ message      │
        └──────────────┘
```

---

## 5. DATA STRUCTURE - What Gets Sent to Backend

### **Frontend → Backend (JSON)**

#### **Request Structure:**
```json
{
  "stock_data": [
    {
      "product_id": 100,
      "branch_id": 5,
      "opening_qty": 150.00,
      "opening_price": 25.50,
      "unit_id": 12
    },
    {
      "product_id": 100,
      "branch_id": 3,
      "opening_qty": 75.00,
      "opening_price": 24.00,
      "unit_id": 12
    },
    {
      "product_id": 101,
      "branch_id": 5,
      "opening_qty": 50.00,
      "opening_price": 100.00,
      "unit_id": 13
    }
  ]
}
```

### **Data Points Explanation:**

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `product_id` | int | selectedProducts[product].id | Which product |
| `branch_id` | int | allBranches[index].id | Which branch |
| `opening_qty` | float | Input value qty_{product_id}_{branch_id} | Starting inventory |
| `opening_price` | float | Input value price_{product_id}_{branch_id} | Unit cost |
| `unit_id` | int | product.default_unit_id | Unit of measurement |

### **Table-Level Data Flow:**

```
HTML Form Inputs:
┌─────────────────────────────────────┐
│ <input name="qty_100_5" value="150">│
│ <input name="price_100_5" value="25.50">
│ <input name="qty_100_3" value="75">
│ <input name="price_100_3" value="24">
│ <input name="qty_101_5" value="50">
│ <input name="price_101_5" value="100">
└─────────────────────────────────────┘
                ↓
        JavaScript Collection
                ↓
┌─────────────────────────────────────┐
│ FOR each selectedProduct:            │
│   FOR each allBranch:                │
│     Get qty and price inputs         │
│     IF qty > 0 OR price > 0:         │
│       Add to stockData array         │
└─────────────────────────────────────┘
                ↓
        JSON Bodies (sent to backend)
                ↓
┌─────────────────────────────────────┐
│ [                                   │
│   {product_id, branch_id, qty, ...} │
│   {product_id, branch_id, qty, ...} │
│   ...                               │
│ ]                                   │
└─────────────────────────────────────┘
                ↓
        PHP Processing
                ↓
        INSERT/UPDATE stock_opening
        INSERT stock_ledger
```

---

## 6. VALIDATION CHECKS & ERROR HANDLING

### **Frontend Validation (saveOpeningStock function):**

| Check | Condition | Error Action | Prevention |
|-------|-----------|--------------|-----------|
| Data Exists | At least 1 qty OR price entered | Show warning toast | Form doesn't submit |
| Negative Values | qty < 0 OR price < 0 | Highlight input, show error | Form doesn't submit |
| No Entries to Save | All inputs are 0 or empty | Show warning | Form doesn't submit |

**Validation Code:**
```javascript
// Get non-readonly inputs
const qtyInputs = document.querySelectorAll('.qty-input:not([readonly])');

// Check each input
qtyInputs.forEach(input => {
    const qty = parseFloat(input.value) || 0;
    const price = parseFloat(input.nextElementSibling.value) || 0;
    
    // Check for data
    if (qty > 0 || price > 0) hasData = true;
    
    // Check for negative (INVALID)
    if ((qty > 0 || price > 0) && qty < 0) {
        input.classList.add('error');
        isValid = false;
    }
});

// If any validation failed
if (!hasData || !isValid) return;
```

### **Backend Validation (PHP):**

| Check | Location | Action on Failure |
|-------|----------|-------------------|
| HTTP Method | Line 5 | Return 405 Method Not Allowed |
| Authorization | Line 20 | Return 401 Unauthorized |
| JSON Format | Line 35 | Return 400 Invalid data format |
| Array Format | Line 38 | Return 400 Invalid data format |
| Not Empty | Line 41 | Return 400 No data to save |
| Required Fields | Line 89 | Skip entry, add to errors array |
| DB Errors | TRY-CATCH | Log and re-throw, return 500 |

### **Data Consistency Checks:**

**ON DUPLICATE KEY UPDATE:**
- Unique constraint on (product_id, tenant_id, branch_id, unit_id)
- If entry exists: Updates qty and price instead of failing
- Ensures idempotency (safe to retry)

**Ledger Association:**
- stock_ledger.reference_table = 'stock_opening'
- stock_ledger.reference_id = stock_opening.id
- Links ledger entries to their source opening stock record

---

## 7. KEY FUNCTIONS REFERENCE

### **Frontend Functions:**

| Function | Purpose | Input | Output | File |
|----------|---------|-------|--------|------|
| `loadBranches()` | Load branches from session | None | Populates allBranches[] | Line 29 |
| `initProductSearch()` | Setup product search UI | None | Sets up event listeners | Line 37 |
| `displayProductDropdown(products, dropdown)` | Render search results | Array of products, DOM element | Updates dropdown HTML | Line 63 |
| `addProductToTable(product)` | Add product to table | Product object | Updates UI, loads stock | Line 91 |
| `loadExistingOpeningStock(productId)` | Fetch existing stock | Product ID | Populates existingOpeningStock | Line 120 |
| `updateSelectedProductsList()` | Show selected products | None | Updates UI tags | Line 133 |
| `removeProduct(productId)` | Remove product | Product ID | Updates UI, state | Line 153 |
| `updateTable()` | Rebuild table | None | Generates HTML table | Line 168 |
| `saveOpeningStock()` | Validate & save | None | POST to backend | Line 234 |
| `resetForm()` | Clear all state | None | Clears UI and state | Line 316 |
| `showToast(message, type)` | Show notification | Message, type | Display toast | Line 332 |

### **Backend Functions/Endpoints:**

| Endpoint | Method | Purpose | Parameters | Returns |
|----------|--------|---------|------------|---------|
| `bulk-opening-stock-save.php` | POST | Save bulk stock | JSON: stock_data array | JSON: success, count, errors |
| `stock-opening-get.php` | GET | Get existing stock | product_id, tenant_id (session) | JSON: stock_entries array |
| `search-products.php` | GET | Search products | q=search_string | JSON: products array |

---

## 8. DEBUGGING & TROUBLESHOOTING

### **Server Error Log Location:**
```
Windows: C:\xampp\php\logs\php_error_log
Search for: "BULK OPENING STOCK" markers
```

### **Sample Log Output (Success):**
```
=== BULK OPENING STOCK DEBUG ===
Total entries to process: 2
Data: [{"product_id":100,"branch_id":5,"opening_qty":150,...}]
Entry 0: Processing product_id=100, branch_id=5, qty=150, price=25.50, unit_id=12
Entry 0: Saved successfully (stock_opening_id=1)
Entry 1: Processing product_id=101, branch_id=3, qty=75, price=24.00, unit_id=12
Entry 1: Saved successfully (stock_opening_id=2)
Total entries saved: 2
============================
```

### **Sample Log Output (Validation Error):**
```
=== BULK OPENING STOCK DEBUG ===
Total entries to process: 1
Data: [{"product_id":null,"branch_id":5}]
Entry 0: Missing product_id or branch_id
Total entries saved: 0
============================
```

### **Browser Console (F12 → Console):**
```javascript
// Log from initProductSearch
Branches loaded: [
  {id: 5, branch_name: "Karachi", branch_type: "Main"},
  {id: 3, branch_name: "Lahore", branch_type: "Branch"}
]

// Log from addProductToTable
Error loading existing stock: SyntaxError: ...
// OR
Entry saved successfully, existingOpeningStock populated

// Watch variables
console.log(selectedProducts);      // Current selected products
console.log(allBranches);           // All available branches
console.log(existingOpeningStock);  // Loaded existing entries
```

### **Common Issues & Solutions:**

| Issue | Cause | Solution |
|-------|-------|----------|
| No branches showing | data-branches missing from PHP | Verify PHP passes branches in data attribute |
| Search not working | Invalid API response format | Check search-products.php returns correct JSON |
| Existing stock fields readonly | Actually loaded from DB | Intended behavior - shows historical values |
| Save fails silently | JS error in saveOpeningStock() | Check F12 console for JavaScript errors |
| Database error 500 | Invalid SQL or connection | Check error log for PDOException message |
| Stock not saved | Qty and price both 0 | Update inputs with > 0 values |

---

## 9. INSERTION SEQUENCE SUMMARY

### **Complete Workflow:**

```
STEP 1: PAGE LOAD
├─ loadBranches() - Load from data attribute
└─ initProductSearch() - Setup input event

STEP 2: USER SEARCH (Repeat for each product)
├─ User types >= 2 characters
├─ fetch search-products.php
├─ displayProductDropdown() shows results
└─ User clicks product

STEP 3: SELECT PRODUCT
├─ addProductToTable(product):
│  ├─ Store in selectedProducts
│  ├─ loadExistingOpeningStock()  [AJAX]
│  ├─ updateTable()
│  └─ Show save button
└─ Table rebuilt with new product column

STEP 4: ENTER DATA (USER ACTION)
├─ For each product-branch cell:
│  ├─ Enter quantity (or leave blank)
│  └─ Enter price (or leave blank)
└─ Can repeat steps 2-4 for more products

STEP 5: SAVE (CLICK SAVE BUTTON)
├─ saveOpeningStock() called
├─ VALIDATION BLOCK:
│  ├─ Check for data
│  ├─ Check for negative values
│  └─ Return if errors
├─ COLLECTION BLOCK:
│  ├─ FOR each product-branch:
│  │  ├─ Get qty and price
│  │  ├─ IF qty > 0 OR price > 0:
│  │  │  └─ Add to stockData
│  │  └─ (Skip readonly/empty cells)
│  └─ Check if stockData not empty
├─ SUBMISSION BLOCK:
│  ├─ POST to bulk-opening-stock-save.php
│  ├─ Headers: application/json
│  └─ Wait for response
└─ RESPONSE HANDLING:
   ├─ IF success: Show toast, resetForm()
   └─ IF error: Show error toast

STEP 6: BACKEND PROCESSING
├─ Validate request (auth, format)
├─ Parse JSON
├─ Get inventory account
├─ FOR EACH entry in stock_data:
│  ├─ Validate (product_id, branch_id)
│  ├─ INSERT stock_opening OR UPDATE if exists
│  ├─ Get inserted ID
│  ├─ DELETE old stock_ledger entries
│  ├─ INSERT new stock_ledger entry
│  ├─ Increment counter
│  └─ Log result
└─ Return JSON response

STEP 7: RESULT
├─ Success: "Successfully saved 3 entries"
├─ Partial: "Successfully saved 2 entries (1 error)"
└─ Failure: "No entries saved (reasons...)"
```

---

## 10. IMPORTANT NOTES

### **Unit Handling:**
- Each product has a **default_unit_id** (primary unit)
- All opening stock entries use the product's default unit
- No multi-unit support in bulk upload (unlike product-add bulk entry)
- Unit information stored in stock_opening.unit_id for reference

### **Price Handling:**
- `opening_price` = Unit cost (cost per unit)
- Used in stock_ledger as `unit_cost` for valuation
- Applied consistently across all branches for same product
- Can be different per branch if needed (entered separately)

### **Readonly Existing Values:**
- When existing stock is loaded for product-branch combo:
  - Inputs become readonly (prevents accidental changes)
  - Background color grayed out (visual indicator)
  - Title attribute shows "Read-only: existing stock"
- To modify existing stock: Need to use product edit feature or delete/re-create

### **Multi-tenancy:**
- Tenant isolation at:
  - Session level (checked on load)
  - Data filtering level (WHERE tenant_id = ?)
  - Ledger queries (filtered by tenant_id)
- Prevents cross-tenant data access

### **Idempotency:**
- ON DUPLICATE KEY UPDATE ensures safe re-submission:
  - Same data submitted twice = Second submission updates instead of fails
  - Useful for network retry scenarios
  - No duplicate entries created

### **Cascading Deletes:**
```sql
-- Foreign keys in stock_opening table
FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE

-- Means:
- Delete branch → Auto-delete its stock_opening entries
- Delete product → Auto-delete its stock_opening entries
- Delete tenant → Auto-delete all its stock_opening entries
```

### **Stock Ledger Integration:**
- Opening stock creates "Opening Stock" transactions in ledger
- Differentiated from purchases/sales by transaction_type
- Allows reporting on opening vs. operational stock
- Linked via reference_table + reference_id (not FK)

---

## 11. TABLE RELATIONSHIPS

```
┌──────────────┐
│   products   │
├──────────────┤
│  id (PK)     │
│  code        │
│  name        │
│  unit_id ───────────┐
│  uom_type            │
│  uom_group_id        │
└──────────────┘      │
       │              │
       │ 1:N          │
       │              │
┌──────────────┐      │
│ branches     │      │
├──────────────┤      │
│  id (PK)     │      │
│  name        │      │
│  type        │      │
└──────────────┘      │
       │              │
       │ 1:N          │
       │              │
┌──────────────────┐  │
│ stock_opening    │  │
├──────────────────┤  │
│  id (PK)         │  │
│  product_id (FK) ├──┘
│  branch_id (FK) ─┘
│  opening_qty     │
│  opening_price   │
│  unit_id         │
│  tenant_id       │
└──────┬───────────┘
       │ 1:N
       │
┌──────────────────┐
│ stock_ledger     │
├──────────────────┤
│  id (PK)         │
│  product_id (FK) │
│  branch_id (FK)  │
│  reference_table │
│  reference_id ───┼──→ stock_opening.id
│  qty_in          │    (NO FK CONSTRAINT)
│  unit_cost       │
│  transaction_type│
└──────────────────┘

Key: 
- Solid lines = Foreign Key relationship
- Dashed line = Reference via reference_id
- 1:N = One-to-Many relationship
```

---

## 12. FILE STRUCTURE

```
client/
├─ pages/inventory/products/
│  └─ bulk-opening-stock.php          [Main page]
├─ assets/
│  ├─ js/inventory/products/
│  │  └─ bulk-opening-stock.js        [Main JS logic]
│  └─ css/inventory/products/
│     └─ bulk-opening-stock.css       [Styling]

server/
├─ api/inventory/products/
│  ├─ bulk-opening-stock-save.php     [Save endpoint]
│  ├─ stock-opening-get.php           [Fetch existing]
│  └─ search-products.php             [Product search]
```

---

## 13. QUICK CHECKLIST - SYSTEM REQUIREMENTS

- [ ] Database tables exist (stock_opening, stock_ledger with proper constraints)
- [ ] PHP session active and contains user_id, tenant_id
- [ ] API endpoints are accessible and return JSON
- [ ] Product search API returns products with unit info
- [ ] Branch data passed from PHP to JS via data attribute
- [ ] CSS file loaded for styling (readonly, error, input-cell classes)
- [ ] JavaScript file loaded and DOMContentLoaded fires
- [ ] Browser supports ES6 (fetch API, arrow functions, const/let)
- [ ] PDO connection in includes/connection.php
- [ ] Icons/assets for product tags and buttons

---

**Last Updated:** April 14, 2026  
**System Version:** Bulk Opening Stock v1.0  
**Status:** Production Ready
