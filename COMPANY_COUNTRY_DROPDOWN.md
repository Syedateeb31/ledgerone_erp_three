## Company Profile - Country Dropdown Integration

### Changes Made

#### 1. Frontend Updates

**File: `/client/pages/system_setup/company-profile/company-add.php`**
- Added country dropdown field with ID `country_id`
- Kept existing country text input field (not removed)
- Both fields are now available in the form

**File: `/client/assets/js/system_setup/company-profile/company-add.js`**
- Added `loadCountries()` function to fetch and populate country dropdown
- Countries are loaded from API on page load
- Added `country_id` to form submission data
- Maintains existing country text field functionality

#### 2. Backend Updates

**File: `/server/api/system_setup/company-profile/company-add.php`**
- Ready to accept `country_id` from form submission
- Will save country_id when database column is added

#### 3. Database Migration

**File: `/database/migrations/2024_add_country_id_to_companies.sql`**
- Adds `country_id` column to companies table
- Creates foreign key constraint to countries table
- Creates 2 performance indexes

### Form Fields

The company form now has:
- **Country (Dropdown)** - `country_id` - Stores country ID from countries table
- **Country (Text)** - `country` - Stores country name as text (existing field)

Both fields work independently and can be used together.

### How to Use

1. **Execute the migration:**
   ```sql
   SOURCE /path/to/2024_add_country_id_to_companies.sql;
   ```

2. **Add new company:**
   - Select country from dropdown (optional)
   - Enter country name in text field (optional)
   - Both fields are independent

3. **Data saved:**
   - `country_id` - Numeric ID from countries table
   - `country` - Text value from input field

### Files Modified

1. `/client/pages/system_setup/company-profile/company-add.php`
2. `/client/assets/js/system_setup/company-profile/company-add.js`
3. `/server/api/system_setup/company-profile/company-add.php` (ready for country_id)

### Database Changes

- Added `country_id` column to companies table
- Added foreign key constraint
- Created 2 performance indexes

### Testing Checklist

- [ ] Run migration to add country_id column
- [ ] Add new company with country dropdown selection
- [ ] Verify country_id is saved in database
- [ ] Verify country text field still works
- [ ] Check that both fields can be used together
- [ ] Verify country dropdown loads all countries

### Notes

- Country dropdown is optional (can be left empty)
- Country text field is optional (can be left empty)
- Both fields work independently
- No existing data is affected
- Backward compatible with existing companies
