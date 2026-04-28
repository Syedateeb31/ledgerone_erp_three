## Company List - Edit Modal Country Dropdown Integration

### Changes Made

#### 1. Frontend Updates

**File: `/client/pages/system_setup/company-profile/company-list.php`**
- Added country dropdown field with ID `edit_country_id` in Edit Modal
- Kept existing country text input field (not removed)
- Both fields are now available in the edit form

**File: `/client/assets/js/system_setup/company-profile/company-list.js`**
- Added `loadCountries()` function to fetch and populate country dropdown
- Countries are loaded from API on page load
- Updated `editCompany()` function to populate country_id from database
- Added `country_id` to form submission data in edit form
- Maintains existing country text field functionality

#### 2. Backend Updates

**File: `/server/api/system_setup/company-profile/company-edit.php`**
- Updated UPDATE SQL to include `country_id` column
- Handles country_id in both logo and non-logo update scenarios
- Converts country_id to integer if provided

#### 3. Database Migration

**File: `/database/migrations/2024_add_country_id_to_companies.sql`**
- Adds `country_id` column to companies table
- Creates foreign key constraint to countries table
- Creates 2 performance indexes

### Edit Modal Form Fields

The edit modal now has:
- **Country (Dropdown)** - `edit_country_id` - Stores country ID from countries table
- **Country (Text)** - `edit_country` - Stores country name as text (existing field)

Both fields work independently and can be used together.

### How It Works

1. **Page Load:**
   - `loadCountries()` is called
   - Fetches all countries from API
   - Populates the country dropdown

2. **Edit Company:**
   - Click Edit button on any company
   - Modal opens with all company data
   - `country_id` is populated from database
   - `country` text field is populated from database

3. **Update Company:**
   - User can change country dropdown selection
   - User can change country text field
   - Both values are sent to backend
   - Backend saves both `country_id` and `country`

### Files Modified

1. `/client/pages/system_setup/company-profile/company-list.php`
2. `/client/assets/js/system_setup/company-profile/company-list.js`
3. `/server/api/system_setup/company-profile/company-edit.php`

### Database Changes

- Added `country_id` column to companies table
- Added foreign key constraint
- Created 2 performance indexes

### Testing Checklist

- [ ] Run migration to add country_id column
- [ ] Open company list page
- [ ] Click Edit on any company
- [ ] Verify country dropdown is populated with all countries
- [ ] Verify country_id is pre-selected if company has one
- [ ] Verify country text field is pre-filled
- [ ] Change country dropdown selection
- [ ] Update company
- [ ] Verify country_id is saved in database
- [ ] Verify country text field still works
- [ ] Check that both fields can be used together

### Notes

- Country dropdown is optional (can be left empty)
- Country text field is optional (can be left empty)
- Both fields work independently
- No existing data is affected
- Backward compatible with existing companies
- Edit modal properly loads and saves country_id

### API Endpoints Used

- GET: `/server/api/inventory/countries/countries-list.php` - Fetch all countries
- GET: `/server/api/system_setup/company-profile/company-edit.php?id={id}` - Get company data
- POST: `/server/api/system_setup/company-profile/company-edit.php` - Update company with country_id
