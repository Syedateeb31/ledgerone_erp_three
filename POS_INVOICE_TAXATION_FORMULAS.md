# POS Invoice Taxation Formulas - Complete Documentation

## Overview
The POS Invoice system in LedgerOne ERP uses a sophisticated multi-layered taxation system with support for:
- **Standard GST Calculation** (percentage-based)
- **Third Schedule Formula-based Calculation** (MRP-based)
- **Trade Offers (T.O Amount)**
- **Free of Cost (FOC) Quantities**
- **Withholding/Advance Income Tax (AIT)**
- **Multiple Discount Types** (Item-level, Invoice-level)

---

## 1. BASIC ROW CALCULATION FORMULAS

### Formula: Gross Amount
```
Gross Amount = Total Qty × Sale Price
```
Where:
- **Total Qty** = Sum of all unit quantities × conversion factors
- **Sale Price** = Trade Price (TP) or Maximum Retail Price (MRP)

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L243)

---

### Formula: Discount Amount (Item-level)
```
Discount Amount = Gross Amount × (Discount % / 100)
```
Where:
- **Gross Amount** = Total Qty × Sale Price
- **Discount %** = Discount percentage entered per item

**After Discount:**
```
After Discount = Gross Amount - Discount Amount
```

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L253)

---

### Formula: Trade Offer (T.O) Amount
The Trade Offer Amount depends on the **Scheme Type** selected:

#### A. Sale On TP Scheme (Default)
```
T.O Amount = 0 (Read-only, non-functional)
After T.O = After Discount - 0
```

#### B. Less Scheme (Original)
```
T.O Amount = floor(Qty / to_qty) × to_rs
```
Where:
- **to_qty** = Scheme quantity threshold
- **to_rs** = Amount given per scheme unit
- **Qty** = Total quantity of items

**Formula:** `Math.floor(qty / scheme.to_qty) * scheme.to_rs`

**After T.O:**
```
After T.O = After Discount - T.O Amount
```

#### C. Less Special Scheme
```
T.O Amount = (Total Qty × Sale Price) / (promo_qty + bonus_qty)
```
Where:
- **Total Qty** = Sum of all unit quantities
- **Sale Price** = Price per unit
- **promo_qty** = Promotional quantity
- **bonus_qty** = Bonus quantity

**Example:**
```
T.O Amount = (12 × 200) / (12 + 1) = 2400 / 13 = 184.61
After T.O = After Discount - T.O Amount
```

**File Location:** [pos-add-scheme.js](client/assets/js/sale/pos_invoice/pos-add-scheme.js#L142-L165)

---

### Formula: Tax Amount

#### Standard GST Calculation (Percentage-based)
```
Tax Amount = After T.O × (Tax % / 100)
```
Where:
- **After T.O** = Amount after discount and trade offer
- **Tax %** = GST rate from tax regime

**APPLICATION LEVEL FILTER:**
Tax at item level is only applied if `tax_regimes.application_level = 'item'`
- If `application_level = 'invoice'` → Tax is NOT applied at item level (applied at invoice level instead)
- If `application_level = 'item'` → Tax IS applied at item level

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L265-L295)

#### Formula-based Tax Calculation (Third Schedule)
```
For MRP-based formulas:
Tax Amount = (MRP - Formula Result) × Total Qty

Where:
Formula Result = evaluateFormula(formulaTemplate, basePrice, taxRate)
Tax Amount = (basePrice × totalQty) - (evaluateFormula(...) × totalQty)
```

**Example Formula Template:** `{trade_price} * {rate} / 100`

**Supported Formula Tokens:**
- `{trade_price}` - Trade price value
- `{mrp}` - Maximum Retail Price
- `{rate}` - Tax rate percentage

**Evaluation Process:**
1. Replace tokens with actual values
2. Remove whitespace
3. Validate expression (only numbers, operators allowed)
4. Evaluate using Function constructor

**Code:**
```javascript
function evaluateFormula(formula, basePrice, rate) {
    let expr = formula;
    expr = expr.replace(/{trade_price}/g, basePrice);
    expr = expr.replace(/{mrp}/g, basePrice);
    expr = expr.replace(/{rate}/g, rate);
    expr = expr.replace(/\s/g, '');
    
    if (!/^[0-9+\-*\/().]+$/.test(expr)) return 0;
    
    try {
        return Function('"use strict"; return (' + expr + ')')();
    } catch (e) {
        console.error('Formula evaluation error:', e);
        return 0;
    }
}
```

**File Location:** [pos-tax-calculation.js](client/assets/js/sale/pos_invoice/pos-tax-calculation.js#L46-L66)

---

### Formula: Net Amount (Per Item)
```
Net Amount = After T.O + Tax Amount
```
Or:
```
Net Amount = Gross Amount - Discount Amount - T.O Amount + Tax Amount
```

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L296)

---

## 2A. APPLICATION LEVEL FILTER FOR TAXATION

The `application_level` field in `tax_regimes` table controls WHERE the tax is applied:

### Value: `item`
Tax is applied **at each item level** during invoice entry.
```
Example: 
Item 1: Qty 5, Price 200, Tax 17% → Tax Amt = 170
Item 2: Qty 3, Price 300, Tax 17% → Tax Amt = 153
Total Tax = 170 + 153 = 323
```

### Value: `invoice`
Tax is **NOT applied at item level**. Tax % shown is for reference only.
```
Example:
Item 1: Qty 5, Price 200 → Tax Amt = 0 (skipped)
Item 2: Qty 3, Price 300 → Tax Amt = 0 (skipped)
Total Tax = 0 at item level (applies at invoice summary level instead)
```

### Implementation Details
1. **Backend API** stores `application_level` from tax_regimes table
2. **JavaScript** stores it in: `row.dataset.applicationLevel`
3. **Calculation Function** checks application_level before computing tax
4. If `application_level !== 'item'` → Tax amount = 0 for that item

### Code Check Location
[pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L265-L280)
```javascript
// Check application level - only apply tax at item level if application_level is 'item'
const applicationLevel = row.dataset.applicationLevel || 'item';
let taxAmt = 0;

if (applicationLevel === 'item') {
    // Calculate tax...
}
// If application_level is 'invoice', tax is NOT applied here
```

---

## 2B. FREE OF COST (FOC) HANDLING

### FOC Qty Behavior by Scheme
- **Sale On TP:** FOC Qty = 0 (Read-only)
- **Less Scheme:** FOC Qty = 0 (Read-only, not applicable)
- **Less Special Scheme:** FOC Qty = 0 (Read-only, not applicable)
- **Given Scheme:** FOC Qty = Editable (qty-based)

**Note:** FOC items don't contribute to tax calculations in any scheme.

**File Location:** [pos-add-scheme.js](client/assets/js/sale/pos_invoice/pos-add-scheme.js#L100-L165)

---

## 3. INVOICE-LEVEL CALCULATIONS

### Formula: Total Bill (Net Items Total)
```
Total Bill = Sum of all Net Amounts from items
```

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L315-L355)

---

### Formula: Invoice-level Discount
```
Invoice Discount Amount = Total Bill × (Invoice Discount % / 100)
After Discount = Total Bill - Invoice Discount Amount
```
Where:
- **Total Bill** = Net amount of all items
- **Invoice Discount %** = Discount percentage applied to entire invoice

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L345-L346)

---

### Formula: Net Amount (Invoice-level)
```
Net Amount = (Total Bill - Invoice Discount Amount) + Shipping Fees
```
Where:
- **Shipping Fees** = Optional additional charges

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L348)

---

### Formula: Withholding Tax / Advance Income Tax (AIT)
```
Withholding Tax Amount = Net Amount × (Withholding Tax % / 100)
```
Where:
- **Net Amount** = Invoice-level net amount (after discount + shipping)
- **Withholding Tax %** = Percentage from customer's tax regime

**Customer Tax Status:**
- **is_filer** = 0 → Non-filer (higher AIT rate applies)
- **is_filer** = 1 → Filer (normal AIT rate)
- **advance_income_tax_percentage** = AIT rate from customer record

**File Location:** [withholding-tax.js](client/assets/js/sale/pos_invoice/withholding-tax.js#L7-9)

---

### Formula: Net Receivable
```
Net Receivable = Net Amount - Withholding Tax Amount
```

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L359)

---

### Formula: Remaining Balance
```
Remaining Balance = Net Receivable - Amount Paid
```
Where:
- **Net Receivable** = Amount due after all deductions
- **Amount Paid** = Payment received from customer

**File Location:** [pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js#L363)

---

## 4. COMPLETE CALCULATION FLOW EXAMPLE

### Scenario: Single Item Invoice
**Input:**
- Product: Rice 10kg
- Quantity: 5 bags
- Sale Price: 200 per bag
- Discount %: 10%
- Scheme: Sale On TP
- Tax Rate: 17%
- Shipping: 50
- Invoice Discount %: 5%
- Withholding Tax %: 2%

**Calculation Steps:**

1. **Gross Amount**
   ```
   Gross = 5 × 200 = 1000
   ```

2. **Discount Amount (Item-level)**
   ```
   Discount = 1000 × (10/100) = 100
   After Discount = 1000 - 100 = 900
   ```

3. **Trade Offer Amount**
   ```
   T.O = 0 (Sale On TP scheme)
   After T.O = 900 - 0 = 900
   ```

4. **Tax Amount**
   ```
   Tax = 900 × (17/100) = 153
   ```

5. **Net Amount (Item)**
   ```
   Net (Item) = 900 + 153 = 1053
   ```

6. **Total Bill**
   ```
   Total Bill = 1053 (single item)
   ```

7. **Invoice Discount**
   ```
   Invoice Discount = 1053 × (5/100) = 52.65
   After Discount = 1053 - 52.65 = 1000.35
   ```

8. **Net Amount (Invoice)**
   ```
   Net Amount = 1000.35 + 50 = 1050.35
   ```

9. **Withholding Tax**
   ```
   AIT = 1050.35 × (2/100) = 21.01
   ```

10. **Net Receivable**
    ```
    Net Receivable = 1050.35 - 21.01 = 1029.34
    ```

11. **Remaining Balance (If Amount Paid = 1000)**
    ```
    Remaining = 1029.34 - 1000 = 29.34
    ```

---

## 5. TAX LOADING & CALCULATION WORKFLOW

### Tax Calculation Process

1. **Customer Selection**
   - Fetch customer's tax regime
   - Set withholding tax % from customer record
   - Call `loadTaxRatesForCustomer(customerId)`

2. **Product Selection**
   - Call `calculateProductTax(customerId, productId, salePriceSetting)`
   - Returns:
     - `tax_rate` - Tax percentage
     - `formula_template` - Formula for calculation (if applicable)
     - `tax_base` - 'trade_price' or 'mrp'
     - `base_price` - Price used for formula evaluation
     - `success` - Whether calculation was successful

3. **Apply Tax to Row**
   - Set tax % in row
   - Store formula data in `row.dataset`
   - Trigger row recalculation

**File Location:** [pos-tax-calculation.js](client/assets/js/sale/pos_invoice/pos-tax-calculation.js#L7-40)

---

## 6. DATABASE INTEGRATION

### Tax Calculation API
**Endpoint:** `server/api/sale/pos_invoice/calculate-tax.php`

**Parameters:**
- `customer_id` - Customer ID
- `product_id` - Product ID
- `sale_price_setting` - 'trade_price' or 'mrp'

**Response:**
```json
{
    "success": true,
    "tax_rate": 17,
    "tax_amount": 153,
    "formula_template": "{trade_price} * {rate} / 100",
    "tax_base": "trade_price",
    "base_price": 200,
    "mismatch": false,
    "message": "Tax calculated successfully"
}
```

**File Location:** [calculate-tax.php](server/api/sale/pos_invoice/calculate-tax.php)

---

## 7. KEY FEATURES

### Feature Toggles (Invoice Settings)
- **Enable Tax % and Tax Amt** - Show tax columns in table
- **Enable FOC Quantity** - Enable FOC functionality
- **Enable Inline Trade Offer Amount** - Enable T.O Amt column
- **Enable Cash Discount %** - Item-level discount percentage
- **Enable Shipping Fees** - Add shipping charges
- **Enable Invoice-wise Cash Discount** - Invoice-level discount

**File Location:** [pos-add.php](client/pages/sale/pos_invoice/pos-add.php#L410-L435)

---

## 8. SUPPORTED FORMULAS (Third Schedule - MRP Based)

### Example Formulas from Tax Regimes
```
Formula 1: {trade_price} * {rate} / 100
Formula 2: ({trade_price} * 100) / (100 - {rate})
Formula 3: {mrp} - ({mrp} / (1 + {rate} / 100))
```

### Formula Evaluation Rules
- Only mathematical operators allowed: `+`, `-`, `*`, `/`, `(`, `)`
- Numbers and parentheses required for complex expressions
- Invalid characters or syntax returns 0
- Empty formulas return 0

---

## 9. SUMMARY OF ALL CALCULATIONS

| Calculation | Formula | File Location |
|-------------|---------|-----------------|
| Gross Amount | Qty × Price | pos-add-uom.js |
| Item Discount | Gross × (Disc%/100) | pos-add-uom.js |
| After Discount | Gross - Discount | pos-add-uom.js |
| T.O Amount (Less) | floor(Qty/to_qty) × to_rs | pos-add-scheme.js |
| T.O Amount (Less Special) | (Qty × Price)/(promo+bonus) | pos-add-scheme.js |
| Tax Amount | After T.O × (Tax%/100) | pos-add-uom.js |
| Net Amount (Item) | After T.O + Tax | pos-add-uom.js |
| Total Bill | Sum of Net Amounts | pos-add-uom.js |
| Invoice Discount | Total Bill × (Disc%/100) | pos-add-uom.js |
| Net Amount (Invoice) | (Total Bill - Disc) + Shipping | pos-add-uom.js |
| AIT Amount | Net Amount × (AIT%/100) | withholding-tax.js |
| Net Receivable | Net Amount - AIT | pos-add-uom.js |
| Remaining Balance | Net Receivable - Paid | pos-add-uom.js |

---

## 10. JAVASCRIPT FILES INVOLVED

1. **[pos-add-uom.js](client/assets/js/sale/pos_invoice/pos-add-uom.js)** - Core calculation engine (calculateRowAmounts function)
2. **[pos-add-scheme.js](client/assets/js/sale/pos_invoice/pos-add-scheme.js)** - Scheme-based calculations (Less, Less Special, Given)
3. **[pos-tax-calculation.js](client/assets/js/sale/pos_invoice/pos-tax-calculation.js)** - Tax loading and formula evaluation
4. **[withholding-tax.js](client/assets/js/sale/pos_invoice/withholding-tax.js)** - AIT calculations
5. **[tax-integration.js](client/assets/js/sale/pos_invoice/tax-integration.js)** - Tax integration with product selection
6. **[pos-add.js](client/assets/js/sale/pos_invoice/pos-add.js)** - Main form handling and event listeners

---

## 11. NOTES & IMPORTANT CONSIDERATIONS

✅ **Tax is recalculated automatically when:**
- Customer is changed
- Product is selected/changed
- Quantity is updated
- Scheme is changed

✅ **Withholding Tax:**
- Applied to final net amount
- Based on customer's tax registration status
- Non-filers have higher AIT rates

✅ **FOC Quantities:**
- Do NOT affect item net amount
- Used only for reporting/tracking
- Behavior differs by scheme type

✅ **Trade Offer:**
- Reduces taxable base (affects tax calculation)
- Qty-based in "Less" scheme
- Formula-based in "Less Special" scheme

✅ **Formula Evaluation:**
- Safe evaluation using Function constructor
- Whitelist of allowed characters
- Returns 0 on any error

---

## 12. RELATED FILES

- **Backend API:** [server/api/sale/pos_invoice/calculate-tax.php](server/api/sale/pos_invoice/calculate-tax.php)
- **Product Schemes API:** [server/api/sale/pos_invoice/get-product-schemes.php](server/api/sale/pos_invoice/get-product-schemes.php)
- **HTML Form:** [client/pages/sale/pos_invoice/pos-add.php](client/pages/sale/pos_invoice/pos-add.php)

---

*Last Updated: April 2026*
*System: LedgerOne ERP - POS Invoice Module*
