# Tax Rates Module - Setup & Implementation Guide

## Overview
Complete CRUD system for managing tax rates with system-level (non-editable) and custom (editable) records.

## Directory Structure Created

```
server/api/inventory/tax-rates/
├── tax-rates-list.php      (GET - Retrieve all tax rates with filters)
├── tax-rates-get.php       (GET - Retrieve single tax rate)
├── tax-rates-add.php       (POST - Add new custom tax rate)
├── tax-rates-edit.php      (POST - Update custom tax rate)
├── tax-rates-delete.php    (POST - Delete custom tax rate)
└── tax-rates-options.php   (GET - Dropdown options/enums)

client/pages/inventory/tax-rates/
└── tax-rates-list.php      (Main page with list and modal)

client/assets/js/inventory/tax-rates/
└── tax-rates-list.js       (Frontend logic & CRUD operations)

client/assets/css/inventory/tax-rates/
└── tax-rates.css           (Styling for tax rates module)

database/migrations/
└── add_tenant_id_to_tax_rates.sql (Database migration script)
```

## Database Setup

### Step 1: Run Migration
Execute the migration script to add tenant_id column:
```bash
mysql -u root -p ledgerone_erp < add_tenant_id_to_tax_rates.sql
```

Or run the SQL queries directly:
```sql
ALTER TABLE tax_rates ADD COLUMN tenant_id BIGINT UNSIGNED DEFAULT 0 AFTER id;
ALTER TABLE tax_rates ADD INDEX idx_tenant_tax_rates (tenant_id);
UPDATE tax_rates SET tenant_id = 0 WHERE tenant_id IS NULL;
```

### Step 2: Verify Migration
```sql
SELECT COUNT(*) as total_records, COUNT(DISTINCT tenant_id) as distinct_tenants FROM tax_rates;
```

## Key Features

### 1. **Multi-Tenant Support**
- `tenant_id = 0`: System records (read-only, cannot be edited/deleted)
- `tenant_id > 0`: Custom records by tenant (fully editable)

### 2. **CRUD Operations**

#### List Tax Rates
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-list.php`
- **Method**: GET
- **Parameters**: 
  - `page` - Page number (default: 1)
  - `search` - Search by tax_name or tax_authority
  - `tax_type` - Filter by tax type
  - `transaction_type` - Filter by transaction type
  - `status` - Filter by is_active (active/inactive)
- **Returns**: Paginated list with metadata

#### Get Single Tax Rate
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-get.php`
- **Method**: GET
- **Parameters**: `id` - Tax rate ID
- **Returns**: Full tax rate data with editability flags

#### Add Tax Rate
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-add.php`
- **Method**: POST
- **Required Fields**:
  - `tax_name` - Name of the tax
  - `tax_type` - Type (sales_tax, further_tax, wht, etc.)
  - `transaction_type` - Type (sale, purchase, import, export, payment)
  - `rate_percentage` - Tax rate percentage
- **Auto-Fields**: 
  - `tenant_id` - Set to current user's tenant_id
  - `created_by` - Set to current user_id
  - `created_at` - Current timestamp

#### Edit Tax Rate
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-edit.php`
- **Method**: POST
- **Fields**: Same as Add
- **Restrictions**: Only custom records (tenant_id != 0)
- **Auto-Fields**: 
  - `updated_by` - Current user_id
  - `updated_at` - Current timestamp

#### Delete Tax Rate
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-delete.php`
- **Method**: POST
- **Parameters**: `id` - Tax rate ID
- **Restrictions**: Only custom records (tenant_id != 0)

### 3. **Dropdown/Enum Options**
- **Endpoint**: `/server/api/inventory/tax-rates/tax-rates-options.php`
- **Method**: GET
- **Returns**:
  - `tax_types` - Array of available tax types
  - `transaction_types` - Array of transaction types
  - `applicable_to` - Array of entities it applies to
  - `party_types` - Array of party types
  - `deducted_by` - Who deducts the tax
  - `tax_authorities` - Tax authorities (FBR, SBP, CUSTOMS, etc.)

## Frontend Usage

### Access Tax Rates Module
Navigate to: `/client/pages/inventory/tax-rates/tax-rates-list.php`

### Available Actions

#### View & Search
- Paginated list of all tax rates (both system & custom)
- Real-time search by tax name or authority
- Filter by tax type, transaction type, or status

#### Add New Tax Rate
1. Click "Add Tax Rate" button
2. Fill in required fields (marked with *)
3. Optionally add optional fields
4. Click "Save"

#### Edit Custom Tax Rate
1. Click "Edit" button next to a custom tax rate
2. Modify any fields except for system records
3. Click "Save"

#### Delete Custom Tax Rate
1. Click "Delete" button next to a custom tax rate
2. Confirm deletion
3. System records will show disabled delete button

## Tax Rate Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tax_authority | String | No | FBR, SBP, CUSTOMS, OTHER |
| tax_type | String | Yes | sales_tax, further_tax, wht, etc. |
| transaction_type | String | Yes | sale, purchase, import, export, payment |
| legal_section | String | No | e.g., "Sec 3(1)" |
| finance_act_year | Integer | No | Year of finance act (default: current year) |
| tax_name | String | Yes | User-friendly name |
| applicable_to | String | No | Default: "all" |
| party_type | String | No | Type of party |
| is_filer | Boolean | No | Whether applies to filer/non-filer |
| rate_percentage | Decimal | Yes | Tax rate (e.g., 18.00) |
| threshold_min | Decimal | No | Minimum threshold amount |
| threshold_max | Decimal | No | Maximum threshold amount |
| tax_regime_id | Integer | No | Link to tax regime |
| is_adjustable | Boolean | No | Can be adjusted (default: true) |
| is_refundable | Boolean | No | Can be refunded (default: true) |
| is_final_tax | Boolean | No | Final tax flag (default: false) |
| deducted_by | String | No | seller, buyer, customs (default: seller) |
| description | String | No | Additional details |
| is_active | Boolean | No | Active status (default: true) |
| effective_from | Date | No | Start date |
| effective_to | Date | No | End date (optional) |
| currency | String | No | Default: PKR |

## API Response Examples

### Successful List Response
```json
{
  "success": true,
  "tax_rates": [
    {
      "id": 1,
      "tax_name": "GST — Sale to Registered Buyer",
      "tax_type": "sales_tax",
      "transaction_type": "sale",
      "rate_percentage": "18.0000",
      "tax_authority": "FBR",
      "is_active": 1,
      "effective_from": "2024-07-01",
      "record_type": "System"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_records": 25,
    "per_page": 20
  }
}
```

### Successful Add Response
```json
{
  "success": true,
  "message": "Tax rate added successfully",
  "tax_rate_id": 101
}
```

### Error Response
```json
{
  "success": false,
  "message": "Cannot edit system tax rates"
}
```

## Security Features

1. **Tenant Isolation**
   - Only current tenant's custom records are editable
   - System records (tenant_id=0) are read-only for all tenants

2. **Authentication**
   - All endpoints require valid session (user_id, tenant_id)
   - Unauthorized access returns 401 error

3. **Authorization**
   - System records cannot be edited/deleted
   - Users can only modify their own tenant's records
   - Unauthorized access returns 403 error

4. **Data Validation**
   - Required fields are validated
   - Numeric fields are type-cast
   - Date formats are validated

## Maintenance Notes

### Adding More Tax Types
Update in `tax-rates-options.php`:
```php
'tax_types' => ['sales_tax', 'further_tax', 'wht', 'new_type'],
```

### Customizing Fields
To add new fields to tax rates:
1. Add column to `tax_rates` table
2. Update API endpoints (add.php, edit.php, get.php)
3. Update frontend form in `tax-rates-list.php`
4. Update CSS if needed for new field styling

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Column not found | Run migration script first |
| Cannot edit system records | Attempt to edit record with tenant_id=0 |
| Unauthorized error | Check session is active |
| 404 Not Found | Verify file paths and endpoints |
| Page not loading | Check JavaScript console for errors |

## Future Enhancements

- [ ] Bulk import/export of tax rates
- [ ] Tax rate versioning/history
- [ ] Rate calculation engine integration
- [ ] Audit log for rate changes
- [ ] Tax compliance reporting
- [ ] Integration with invoice system
