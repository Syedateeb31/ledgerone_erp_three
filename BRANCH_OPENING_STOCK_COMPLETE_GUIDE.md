# Branch-wise Opening Stock - Complete System Guide

## System Overview
The Branch-wise Opening Stock feature allows users to enter opening inventory quantities and prices for products across different branches during product creation/editing.

---

## 1. DATABASE TABLES & STRUCTURE

### Primary Tables Involved:

#### **Table: `stock_opening`**
```sql
CREATE TABLE `stock_opening` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `opening_qty` decimal(15,3) DEFAULT 0.000,
  `opening_price` decimal(15,4) DEFAULT 0.0000,
  `unit_id` int(11) DEFAULT NULL,              -- Added for unit tracking
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Purpose:** Stores opening stock quantities for each product-branch combination
- `product_id` - Links to products table
- `branch_id` - Links to branches table
- `tenant_id` - Multi-tenant isolation
- `opening_qty` - Original quantity in the specified unit
- `opening_price` - Unit cost
- `unit_id` - Unit of measurement used

**Indexes:**
- `fk_stock_opening_product` (product_id)
- `fk_stock_opening_branch` (branch_id)
- `fk_stock_opening_tenant` (tenant_id)
- `idx_stock_opening_product_branch` (product_id, branch_id)
- `idx_stock_opening_tenant_branch` (tenant_id, branch_id)
- `idx_stock_opening_created_at` (created_at)
- `idx_stock_opening_tenant_product_date` (tenant_id, product_id, created_at)

#### **Table: `stock_ledger`**
```sql
CREATE TABLE `stock_ledger` (
  `id` int(11) NOT NULL,
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Purpose:** Maintains a ledger entry for each opening stock transaction
- Cross-references `stock_opening` table via `reference_table` = 'stock_opening' and `reference_id`
- Records the `qty_in` (opening quantity) and `unit_cost`
- Sets `transaction_type` = 'Opening Stock'

#### **Related Tables:**
- `products` - Product information
- `branches` - Branch/Location information
- `products` → has fields: `default_unit_id`, `uom_type` (unit/group), `uom_group_id`

---

## 2. FRONTEND FLOW - JavaScript Functions

### **File:** `client/assets/js/inventory/products/product-add.js`

#### **Function: `addStockEntry()`** (Line 750)
**Purpose:** Creates a new stock entry row in the UI

**Logic:**
```javascript
1. Get UOM Type: unit or group
2. If UOM Type is 'group':
   - Create columns for EACH unit in the group
   - Input names: openingQty[unit_id][] (array of arrays)
3. If UOM Type is 'unit' (default):
   - Single opening qty column
   - Input names: openingQty[] (simple array)
4. Always add:
   - Branch dropdown with custom search
   - Opening Price input
   - Remove button
5. Initialize branch dropdown with data
```

**Generated HTML Structure for UOM Group:**
```html
<div class="stock-entry">
  <div class="form-row">
    <div class="form-group">
      <label>Branch</label>
      <input type="hidden" name="branch[]">  <!-- Stores branch ID -->
      <input class="branch-search" placeholder="Search branches...">
      <div class="dropdown-list"></div>
    </div>
    <!-- For each unit in group -->
    <div class="form-group">
      <label>Unit Name</label>
      <input type="number" name="openingQty[unit_id][]" step="0.01" min="0">
    </div>
    <div class="form-group">
      <label>Opening Price / Unit</label>
      <input type="number" name="openingPrice[]" step="0.01" min="0">
    </div>
    <button class="btn btn-danger remove-stock-entry">Remove</button>
  </div>
</div>
```

**Generated HTML Structure for Single Unit:**
```html
<div class="stock-entry">
  <div class="form-row">
    <div class="form-group">
      <label>Branch</label>
      <input type="hidden" name="branch[]">
      <input class="branch-search" placeholder="Search branches...">
    </div>
    <div class="form-group">
      <label>Opening Qty</label>
      <input type="number" name="openingQty[]" step="0.01" min="0">
    </div>
    <div class="form-group">
      <label>Opening Price / Unit</label>
      <input type="number" name="openingPrice[]" step="0.01" min="0">
    </div>
    <button class="btn btn-danger remove-stock-entry">Remove</button>
  </div>
</div>
```

#### **Function: `removeStockEntry(btn)`** (Line 825+)
**Purpose:** Removes a stock entry from the DOM and recalculates totals

#### **Function: `validateForm()`** (Line 632)
**Purpose:** Validates all form fields including stock entries

**Stock Entry Validation Logic:**
```javascript
FOR EACH .stock-entry element:
  1. Get branch ID from hidden input (branch[])
  2. Check if ANY quantity field has value > 0
  3. Check if Opening Price has value
  
  IF quantity OR price is provided:
    ✓ Branch MUST be selected (branch_id != empty)
    ✗ If branch not selected:
      - Add CSS class 'error' to branch search input
      - Display error: "Branch selection is required"
      - Set isValid = false (prevents form submission)
    ✓ If branch selected:
      - Clear error styling
      - Continue validation
```

**Validation Coverage:**
- Required fields (product name, etc.)
- Numeric field ranges (min/max)
- **Branch-wise stock entries validation** (NEW)

#### **Function: `handleFormSubmit(e)`** (Line 528)
**Purpose:** Handles form submission to backend

**Execution Flow:**
```javascript
1. Prevent default form submission
2. Call validateForm()
   - IF validation fails → STOP, show errors
3. Disable submit button (show "Saving...")
4. Create FormData object from form
5. Collect all schemes from modal
6. DEBUG: Log stock entry data to console:
   - Stock entries count
   - For each entry: branch, qty, price
7. POST to:
   - New product: /server/api/inventory/products/product-add.php
   - Edit product: /server/api/inventory/products/product-edit.php
8. Handle response (success/error)
```

**Console Logging Output:**
```
=== FORM DATA DEBUG ===
Edit ID: [id or empty]
Stock entries count: 2
Stock Entry 0: {
  branch: "5",
  qty: ["100"],
  price: "25.50"
}
Stock Entry 1: {
  branch: "3",
  qty: ["75"],
  price: "24.00"
}
```

#### **Function: `initBranchDropdown(dropdownContainer)`**
**Purpose:** Sets up branch search and selection dropdown

**Features:**
- Fetches branches list on first input
- Filters by search term (name/type)
- Stores selected branch ID in hidden input
- Displays branch as "Name (Type)"

---

## 3. BACKEND FLOW - PHP Functions

### **File:** `server/api/inventory/products/product-add.php`

#### **Step 1: Product Creation** (Line ~90)
```php
INSERT INTO products (
  tenant_id, company_id, code, name, product_type, 
  uom_type, default_unit_id, uom_group_id, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ...);

$product_id = $pdo->lastInsertId();
```

#### **Step 2: DEBUG LOGGING** (Line 119-129)
```php
error_log('=== STOCK OPENING DEBUG ===');
error_log('Branch isset: ' . (isset($_POST['branch']) ? 'YES' : 'NO'));
error_log('Branch is array: ' . (is_array($_POST['branch'] ?? null) ? 'YES' : 'NO'));
error_log('Branch count: ' . count($_POST['branch'] ?? []));
error_log('OpeningQty isset: ' . (isset($_POST['openingQty']) ? 'YES' : 'NO'));
error_log('OpeningQty count: ' . count($_POST['openingQty'] ?? []));
error_log('OpeningPrice isset: ' . (isset($_POST['openingPrice']) ? 'YES' : 'NO'));
error_log('Branch data: ' . json_encode($_POST['branch'] ?? []));
error_log('OpeningQty data: ' . json_encode($_POST['openingQty'] ?? []));
error_log('OpeningPrice data: ' . json_encode($_POST['openingPrice'] ?? []));
error_log('========================');
```

#### **Step 3: Prepare Statements** (Line 149-157)
```php
$stockOpeningStmt = $pdo->prepare("
    INSERT INTO stock_opening (product_id, tenant_id, branch_id, opening_qty, opening_price, unit_id)
    VALUES (?, ?, ?, ?, ?, ?)
");

$stockLedgerStmt = $pdo->prepare("
    INSERT INTO stock_ledger (tenant_id, account_id, branch_id, product_id, reference_table, reference_id, 
                              qty_in, unit_cost, unit_id, transaction_type, transaction_date)
    VALUES (?, ?, ?, ?, 'stock_opening', ?, ?, ?, ?, 'Opening Stock', CURDATE())
");
```

#### **Step 4: Data Insertion Loop** (Line 158+)

**For UOM Type = 'group':**
```php
FOR EACH openingQty array key (unit_id):
  FOR EACH quantity value at index i:
    IF quantity > 0:
      1. Get branch_id from $_POST['branch'][$i]
      2. Get opening_price from $_POST['openingPrice'][$i]
      
      3. INSERT INTO stock_opening:
         - product_id = $product_id
         - tenant_id = $tenant_id
         - branch_id = $branchId
         - opening_qty = (original quantity for this unit)
         - opening_price = $openingPrice
         - unit_id = (the specific unit from key)
      
      4. Increment $stockOpeningCount
      5. Get inserted stock_opening ID: $stockOpeningId = $pdo->lastInsertId()
      
      6. INSERT INTO stock_ledger (links to stock_opening):
         - tenant_id = $tenant_id
         - account_id = $inventory_account
         - branch_id = $branchId
         - product_id = $product_id
         - reference_table = 'stock_opening'
         - reference_id = $stockOpeningId
         - qty_in = (original quantity)
         - unit_cost = $openingPrice
         - unit_id = (the specific unit)
         - transaction_type = 'Opening Stock'
         - transaction_date = CURDATE()
```

**For UOM Type = 'unit' (single unit):**
```php
FOR i = 0 TO count($_POST['branch']):
  IF $_POST['branch'][$i] is not empty:
    1. Get branch_id, opening_qty, opening_price
    
    2. Calculate quantity in base units (if conversion exists):
       totalQtyInBaseUnits = convertSingleUnitToBaseUnits(
         originalQty, defaultUnit, productConversionFactor
       )
    
    3. Log debug info:
       Entry $i: Branch={$branchId}, OriginalQty={$originalQty}, 
                 TotalInBaseUnits={$totalQtyInBaseUnits}, 
                 UnitId={$unitIdForStock}
    
    4. IF totalQtyInBaseUnits > 0:
       
       a) INSERT INTO stock_opening:
          - Stores ORIGINAL quantity (not converted)
          - unit_id = default_unit_id
       
       b) Get inserted ID: $stockOpeningId = $pdo->lastInsertId()
       
       c) INSERT INTO stock_ledger:
          - Links to stock_opening via reference_id
          - qty_in = original quantity
          - unit_id = default_unit_id
```

**Error Handling:**
```php
TRY {
    $stockOpeningStmt->execute([...]);
    $stockOpeningCount++;
    error_log("Stock opening saved successfully for branch {$branchId}");
} CATCH (Exception $e) {
    error_log("Error saving stock opening: " . $e->getMessage());
}

// Log final summary
error_log('Stock opening entries saved: ' . $stockOpeningCount);
```

#### **Error Conditions:**
```
Condition               Error Message (in logs)
---                    ---
Missing branch data    "No branch stock data found in POST"
Zero entries saved     "Stock opening entries saved: 0"
Database error         "Error saving stock opening: [error message]"
```

---

#### **Function: `convertSingleUnitToBaseUnits()`**
**Purpose:** Converts quantity from one unit to base unit using conversion factor
- Located at top of file (helper function)
- Used only for single unit mode
- Calculation: originalQty × productConversionFactor

---

### **File:** `server/api/inventory/products/product-edit.php`

#### **Stock Opening Update Logic** (Line 145+)
**Different from product-add.php:**

```php
1. Check if stock data is provided in POST
2. IF branch array is present AND count > 0:
   
   a. DELETE existing stock:
      DELETE FROM stock_opening 
      WHERE product_id = ? AND tenant_id = ?
      
      DELETE FROM stock_ledger 
      WHERE product_id = ? AND tenant_id = ? 
        AND transaction_type = 'Opening Stock'
   
   b. INSERT new stock (same logic as product-add.php):
      - Loop through branches
      - Handle group mode vs single unit mode
      - Insert into stock_opening
      - Insert into stock_ledger
      - Log all operations
```

**Key Difference:** Edit replaces ALL opening stock entries, not updates individual ones

---

### **File:** `server/api/inventory/products/stock-opening-get.php`

#### **Purpose:** Retrieve opening stock entries for a product

**Query:**
```php
SELECT so.*, b.branch_name, b.branch_type,
       CONCAT(b.branch_name, ' (', b.branch_type, ')') as branch_display
FROM stock_opening so
LEFT JOIN branches b ON so.branch_id = b.id
WHERE so.product_id = ? AND so.tenant_id = ?
ORDER BY b.branch_name
```

**Returns:**
```json
{
  "success": true,
  "stock_entries": [
    {
      "id": 1,
      "product_id": 100,
      "tenant_id": 1,
      "branch_id": 5,
      "opening_qty": "150",
      "opening_price": "25.50",
      "unit_id": 12,
      "branch_name": "Karachi",
      "branch_type": "Main",
      "branch_display": "Karachi (Main)"
    }
  ]
}
```

---

## 4. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: Product Add Form (product-add.html)                  │
│ ├─ Product Name, UOM Type, Default Unit, etc.                 │
│ └─ Stock Entries Section                                       │
│    ├─ Add Stock Entry Button (addStockEntry())                │
│    └─ FOR EACH Stock Entry:                                   │
│       ├─ Branch Dropdown (initBranchDropdown())               │
│       ├─ Opening Qty Input(s)                                 │
│       │  ├─ UOM Group: Multiple inputs [unit_id][]           │
│       │  └─ Single Unit: Single input []                      │
│       └─ Opening Price Input                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                   handleFormSubmit(e)
                              ↓
                      validateForm()
                              ↓
         ┌──────────────────────────────────────┐
         │ VALIDATION CHECKS:                   │
         │ 1. Required fields present           │
         │ 2. Numeric fields in valid range     │
         │ 3. IF qty or price provided:        │
         │    → Branch MUST be selected        │
         └──────────────────────────────────────┘
                              ↓
         ┌──────────────── PASS ────────────────┐
         │                                       │
      FormData Collection                   FAIL
         │                                       │
      Log to console                       Show errors
         │                                  to user
         │
      POST to Backend ────────────────────────────────────────────┐
         │                                                          │
         ↓                                                          │
┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND: product-add.php or product-edit.php                         │
│                                                                       │
│ 1. INSERT INTO products ──→ Get product_id                          │
│                                                                       │
│ 2. DEBUG LOGGING                                                     │
│    Log: Branch count, OpeningQty count, OpeningPrice count          │
│                                                                       │
│ 3. PREPARE STATEMENTS                                                │
│    - stockOpeningStmt (INSERT INTO stock_opening)                   │
│    - stockLedgerStmt (INSERT INTO stock_ledger)                     │
│                                                                       │
│ 4. DATA INSERTION LOOP                                               │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ IF UOM Type = 'group':                                      │ │
│    │   FOR each unit_id in openingQty:                          │ │
│    │     FOR each quantity at index i:                          │ │
│    │       IF quantity > 0:                                     │ │
│    │         a) Get branchId = $_POST['branch'][$i]            │ │
│    │         b) INSERT stock_opening (product, tenant,          │ │
│    │             branch, qty, price, unit)                     │ │
│    │         c) Get stock_opening_id                           │ │
│    │         d) INSERT stock_ledger (references stock_opening) │ │
│    │         e) Increment counter                              │ │
│    │                                                             │ │
│    │ ELSE (UOM Type = 'unit'):                                  │ │
│    │   FOR i = 0 to count(branch):                             │ │
│    │     IF branch[$i] not empty:                              │ │
│    │       a) Get branchId, openingQty[$i], openingPrice[$i]  │ │
│    │       b) Convert to base units (if applicable)            │ │
│    │       c) IF converted_qty > 0:                            │ │
│    │          - INSERT stock_opening                           │ │
│    │          - Get stock_opening_id                           │ │
│    │          - INSERT stock_ledger                            │ │
│    │       d) Increment counter                                │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ 5. ERROR HANDLING (TRY-CATCH)                                        │
│    - Log success: "Stock opening saved successfully for branch X"    │
│    - Log error: "Error saving stock opening: [message]"              │
│                                                                       │
│ 6. USER FEEDBACK                                                     │
│    Return JSON:                                                      │
│    {                                                                 │
│      "success": true/false,                                          │
│      "message": "Product saved successfully",                        │
│      "product_id": 100                                               │
│    }                                                                 │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
                 ┌────────────────────────┐
                 │ DATABASE UPDATE        │
                 ├────────────────────────┤
                 │ products               │
                 │  ├─ id: 100            │
                 │  └─ other fields...    │
                 │                        │
                 │ stock_opening          │
                 │  ├─ product_id: 100    │
                 │  ├─ branch_id: 5       │
                 │  ├─ opening_qty: 150   │
                 │  ├─ opening_price: 25  │
                 │  └─ unit_id: 12        │
                 │                        │
                 │ stock_ledger           │
                 │  ├─ product_id: 100    │
                 │  ├─ branch_id: 5       │
                 │  ├─ reference_id: 1    │ (stock_opening.id)
                 │  ├─ qty_in: 150        │
                 │  └─ transaction_type   │
                 │     = 'Opening Stock'  │
                 └────────────────────────┘
                              ↓
                    FRONT END: Display
                    success message
```

---

## 5. DATA STRUCTURE - What Gets Sent to Backend

### **Form Name → POST Variable Mapping:**

#### **Single Unit Products:**
```php
$_POST['name']              // product name
$_POST['productType']       // 'physical', 'service'
$_POST['uomType']          // 'unit' for single unit
$_POST['defaultUnit']      // unit_id (e.g., 5 for Piece)

// Stock entries (arrays, one per entry)
$_POST['branch'][]         // [5, 3, 7]  - branch IDs
$_POST['openingQty'][]     // [100, 75, 50] - quantities
$_POST['openingPrice'][]   // [25.50, 24.00, 26.00] - unit costs
```

**Array Alignment:**
```
Index:  0     1     2
branch: [5,   3,    7]
qty:    [100, 75,   50]
price:  [25,  24,   26]

Result in Database:
- Branch 5: qty=100, price=25
- Branch 3: qty=75, price=24
- Branch 7: qty=50, price=26
```

#### **UOM Group Products:**
```php
$_POST['name']             // product name
$_POST['productType']      // 'physical'
$_POST['uomType']         // 'group'
$_POST['uomGroup']        // uom_group_id (e.g., 2)

// Stock entries - NESTED ARRAYS
$_POST['branch'][]                      // [5, 3]
$_POST['openingQty'][unit_id][]        // [12: [100, 200], 13: [50, 150]]
$_POST['openingQty'][12][]              // [100, 200]  for unit 12 (Kg)
$_POST['openingQty'][13][]              // [50, 150]   for unit 13 (Gram)
$_POST['openingPrice'][]                // [25, 24]
```

**Array Structure for Group:**
```
Branch indices:  0    1
$_POST['branch'] [5,   3]

Unit 12 (Kg):
  openingQty[12][0] = 100  → Branch 5, Unit 12, Qty 100
  openingQty[12][1] = 200  → Branch 3, Unit 12, Qty 200

Unit 13 (Gram):
  openingQty[13][0] = 50   → Branch 5, Unit 13, Qty 50
  openingQty[13][1] = 150  → Branch 3, Unit 13, Qty 150

Result in Database (Separate entries):
- (Product, Branch 5, Unit 12): qty=100
- (Product, Branch 3, Unit 12): qty=200
- (Product, Branch 5, Unit 13): qty=50
- (Product, Branch 3, Unit 13): qty=150
```

---

## 6. VALIDATION CHECKS & ERROR HANDLING

### **Frontend Validation (validateForm function):**

| Check | Condition | Error Message | Action |
|-------|-----------|---------------|--------|
| Branch Required | qty OR price provided, but branch empty | "Branch selection is required" | Highlight input, prevent submit |
| Must Have Branch | If any stock data exists | branchId ≠ null | Form cannot submit |
| Numeric Range | price < 0 or qty < 0 | "Value must be at least 0" | Highlight field |
| Required Fields | Product name empty | "This field is required" | Highlight field |

### **Backend Validation (PHP):**

| Check | Location | Action |
|-------|----------|--------|
| Session Check | Top of product-add.php | If no user_id/tenant_id → 401 Unauthorized |
| DataType Check | Line 147 | `isset($_POST['branch'])` AND `is_array()` |
| Empty Array | Line 148 | Log "No branch stock data found in POST" |
| Branch exists | Loop condition | `if (!empty($_POST['branch'][$i]))` |
| Qty > 0 | UOM Group condition | `if (!empty($quantities[$i]))` |
| DB Error | Try-catch block | Log specific error, continue processing |

### **Database Constraints:**

```sql
-- Foreign Keys
ALTER TABLE stock_opening
  ADD CONSTRAINT fk_stock_opening_branch 
  FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
  
  ADD CONSTRAINT fk_stock_opening_product 
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  
  ADD CONSTRAINT fk_stock_opening_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
```

---

## 7. KEY FUNCTIONS REFERENCE

### **Frontend Functions:**
| Function | Purpose | Returns | File |
|----------|---------|---------|------|
| `addStockEntry()` | Creates new stock entry row | void | product-add.js:750 |
| `removeStockEntry(btn)` | Deletes stock entry row | void | product-add.js:825 |
| `validateForm()` | Validates all form data including branch | boolean | product-add.js:632 |
| `handleFormSubmit(e)` | Submits form to backend | void | product-add.js:528 |
| `initBranchDropdown(container)` | Sets up branch search | void | product-add.js |
| `handleFormSubmit()` | Logs debug data (console.log) | void | product-add.js:572 |

### **Backend Functions:**
| Function/Query | Purpose | Parameters | File |
|---|---|---|---|
| INSERT INTO stock_opening | Stores opening qty | product_id, tenant_id, branch_id, qty, price, unit_id | product-add.php:151 |
| INSERT INTO stock_ledger | Links to stock transaction | tenant_id, account_id, branch_id, reference_id, qty_in | product-add.php:155 |
| SELECT stock_opening | Retrieves opening entries | product_id, tenant_id | stock-opening-get.php |
| DELETE stock_opening | Removes old entries (edit) | product_id, tenant_id | product-edit.php:177 |

---

## 8. DEBUGGING & TROUBLESHOOTING

### **Check Error Log:**
```
Location: C:\xampp\php\logs\php_error_log
Search for: "=== STOCK OPENING DEBUG ===" markers
```

### **Sample Log Output (Success):**
```
=== STOCK OPENING DEBUG ===
Branch isset: YES
Branch is array: YES
Branch count: 2
OpeningQty isset: YES
OpeningQty count: 2
OpeningPrice isset: YES
Branch data: ["5","3"]
OpeningQty data: ["100","75"]
OpeningPrice data: ["25.50","24.00"]
========================
Processing 2 stock opening entries
Entry 0: Branch=5, OriginalQty=100, TotalInBaseUnits=100, UnitId=12
Stock opening saved successfully for branch 5
Stock ledger entry created for branch 5
Entry 1: Branch=3, OriginalQty=75, TotalInBaseUnits=75, UnitId=12
Stock opening saved successfully for branch 3
Stock opening entries saved: 2
```

### **Sample Log Output (Issue):**
```
Branch isset: YES
Branch is array: NO
Branch count: 0
=== ERROR: Branch is not an array ===
```

### **Browser Console (F12 → Console):**
```javascript
// Stock entries count
// Stock Entry 0: {branch: "5", qty: ["100"], price: "25.50"}
// Stock Entry 1: {branch: "3", qty: ["75"], price: "24.00"}
```

---

## 9. INSERTION SEQUENCE SUMMARY

### **Step-by-Step Process:**

**Product Add Flow:**
```
1. User fills product form + stock entries
2. Click "Save" button
3. validateForm() runs
   ├─ Check product name required
   ├─ Check stock entries have branch if qty/price provided
   └─ Return true/false
4. If validation passes:
   ├─ Create FormData from form
   ├─ POST to product-add.php
   ├─ Backend:
   │  ├─ INSERT INTO products
   │  ├─ Get new product_id
   │  ├─ FOR each stock entry:
   │  │  ├─ INSERT INTO stock_opening
   │  │  ├─ Get stock_opening_id
   │  │  └─ INSERT INTO stock_ledger (references stock_opening_id)
   │  └─ Return success JSON
   └─ Frontend shows success message
5. If validation fails:
   ├─ Show error messages to user
   └─ Prevent form submission
```

**Product Edit Flow:**
```
1. User edits product + modifies stock entries
2. Click "Update" button
3. validateForm() runs (same as add)
4. If validation passes:
   ├─ POST to product-edit.php with product ID
   ├─ Backend:
   │  ├─ UPDATE products table
   │  ├─ DELETE FROM stock_opening WHERE product_id
   │  ├─ DELETE FROM stock_ledger WHERE product_id AND Opening Stock
   │  ├─ FOR each new stock entry:
   │  │  ├─ INSERT INTO stock_opening (same as add)
   │  │  ├─ Get stock_opening_id
   │  │  └─ INSERT INTO stock_ledger
   │  └─ Return success JSON
   └─ Frontend shows success message
```

---

## 10. IMPORTANT NOTES

### **Unit Handling:**
- **Single Unit Mode:** Opening qty stored as-is, then converted if needed for ledger
- **Group Mode:** Each unit gets separate stock_opening + stock_ledger entries
- **stock_opening.unit_id:** MUST store the actual unit used for the quantity

### **Price Handling:**
- `opening_price` = Unit cost (price per unit)
- Applied same to all units in group mode
- Stored in both stock_opening and stock_ledger

### **Transaction Type:**
- Always set to 'Opening Stock' in stock_ledger
- Different from regular purchases/sales
- Allows filtering opening adjustments

### **Multi-tenancy:**
- Every insert includes tenant_id
- Queries always filter by tenant_id
- Ensures data isolation between tenants

### **Cascading Deletes:**
- Branch deletion → auto-delete stock_opening entries (ON DELETE CASCADE)
- Product deletion → auto-delete stock_opening entries
- Prevents orphaned records

---

## 11. TABLE RELATIONSHIPS

```
products (1) ────┐
                 │
                 (N) stock_opening
                 │
                 └──→ branches
                 
stock_opening (1) ────────┐
                          │
                          (N) stock_ledger
                          │ (via reference_id)
                          
Reference Flow:
stock_ledger.reference_table = 'stock_opening'
stock_ledger.reference_id = stock_opening.id
```

---

**Last Updated:** April 14, 2026  
**System Version:** Branch-wise Opening Stock v1.0