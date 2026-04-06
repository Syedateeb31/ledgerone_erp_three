# Supplier Man Dropdown Implementation

## Summary
Successfully implemented Supplier Man dropdown in POS Invoice system that:
- Fetches employees from the `employees` table
- Auto-populates when customer is selected (from `customers.supplier_man_id`)
- Saves to database in `sale_invoice.supplier_man_id`
- Works properly in view/edit mode with auto-population and editability

## Changes Made

### 1. Frontend (pos-add.php)
✅ Already had the Supplier Man dropdown in HTML:
```html
<div class="form-group" id="supplierManGroup">
    <label for="supplierMan">Supplier Man</label>
    <select id="supplierMan" tabindex="-1">
        <option value="">Select Supplier Man</option>
        <!-- Options will be populated by JS -->
    </select>
</div>
```

### 2. JavaScript (pos-add.js)
✅ **Modified `loadEmployees()` function** to populate both Sales Officer and Supplier Man dropdowns:
```javascript
const supplierManSelect = document.getElementById('supplierMan');
supplierManSelect.innerHTML = '<option value="">Select Supplier Man</option>';

data.employees.forEach(employee => {
    const option2 = document.createElement('option');
    option2.value = employee.id;
    option2.textContent = `${employee.employee_id} - ${employee.full_name}`;
    supplierManSelect.appendChild(option2);
});
```

✅ **Auto-populate on customer selection** - Added supplier man auto-population:
```javascript
// Auto-populate supplier man if associated
const supplierManId = e.target.getAttribute('data-supplier-man');
if (supplierManId) {
    document.getElementById('supplierMan').value = supplierManId;
}
```

✅ **Load in edit mode** - Added supplier man loading:
```javascript
const supplierManEl = document.getElementById('supplierMan');
if (supplierManEl) supplierManEl.value = invoice.supplier_man_id || '';
```

✅ **Save to database** - Added to form data:
```javascript
supplierManId: document.getElementById('supplierMan')?.value || null,
```

✅ **Load customers with supplier_man_id** - Added data attribute:
```javascript
codeOption.setAttribute('data-supplier-man', customer.supplier_man_id || '');
```

### 3. Backend API (pos-add.php)
✅ **Modified INSERT query** to include `supplier_man_id`:
```php
INSERT INTO sale_invoice (
    tenant_id, currency_id, bill_no, sale_date, customer_id, sub_account_id, company_id, branch_id,
    previous_balance, sale_officer_id, supplier_man_id, sale_order_id, bilty_no, transport_name, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...)
```

✅ **Added parameter** to execute:
```php
$input['supplierManId'] ?? null,
```

### 4. Backend API (pos-edit.php)
✅ **Modified UPDATE query** to include `supplier_man_id`:
```php
UPDATE sale_invoice SET
    currency_id = ?, sale_date = ?, customer_id = ?, sub_account_id = ?, company_id = ?, branch_id = ?,
    previous_balance = ?, sale_officer_id = ?, supplier_man_id = ?, sale_order_id = ?, bilty_no = ?, ...
WHERE id = ? AND tenant_id = ?
```

✅ **Added parameter** to execute:
```php
$input['supplierManId'] ?? null,
```

✅ **Modified SELECT query** to fetch supplier man details:
```sql
LEFT JOIN employees sm ON c.supplier_man_id = sm.id
```

### 5. Database Structure
The implementation uses existing database structure:
- **employees table**: Source of supplier man data (id, employee_id, full_name)
- **customers table**: Has `supplier_man_id` field (foreign key to employees.id)
- **sale_invoice table**: Has `supplier_man_id` field (foreign key to employees.id)

## How It Works

### 1. On Page Load
- Fetches all active employees from database
- Populates both Sales Officer and Supplier Man dropdowns

### 2. When Customer is Selected
- Reads `supplier_man_id` from customer record
- Auto-populates Supplier Man dropdown with customer's associated supplier man
- User can change it if needed

### 3. When Saving Invoice
- Saves selected `supplier_man_id` to `sale_invoice` table
- Works for both new invoices and edits

### 4. When Editing Invoice
- Loads existing `supplier_man_id` from invoice
- Populates dropdown with saved value
- User can edit and save changes

## Testing Checklist
✅ Supplier Man dropdown loads with employees
✅ Auto-populates when customer is selected
✅ Saves to database on invoice creation
✅ Loads correctly in edit mode
✅ Can be edited and updated
✅ Works with customer's supplier_man_id field
✅ Properly joins employees table in queries

## Files Modified
1. `client/assets/js/sale/pos_invoice/pos-add.js`
2. `server/api/sale/pos_invoice/pos-add.php`
3. `server/api/sale/pos_invoice/pos-edit.php`

## Notes
- The dropdown uses the same employee list as Sales Officer
- Both fields are optional (can be null)
- The implementation follows the same pattern as Sales Officer field
- No database schema changes were needed (fields already existed)
