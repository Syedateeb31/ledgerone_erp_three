# Bank Logo Edit Auto-Population Fix - Complete Guide

## Problem
When editing a bank account, the bank logo preview was not auto-populating with the existing logo image.

## Root Causes & Solutions

### Issue 1: Incorrect Image Path Construction
**Problem:** The JavaScript was using a relative path that might not resolve correctly:
```javascript
editLogoPreviewImg.src = `../../../assets/uploads/bank_logo/${account.bank_logo_path}`;
```

**Solution:** Changed to absolute path from application root:
```javascript
editLogoPreviewImg.src = `/client/assets/uploads/bank_logo/${account.bank_logo_path}`;
```

### Issue 2: Unreliable File Upload Paths in bank-edit.php
**Problem:** The file upload directory used a relative path `../../../../client/assets/uploads/bank_logo/` which could fail.

**Solution:** Updated to use `$_SERVER['DOCUMENT_ROOT']` for absolute path construction and added:
- Directory creation with proper permissions (0777)
- Writability verification before upload
- Enhanced error messages for debugging
- Proper cleanup of old logo when updating

### Issue 3: Inconsistent Path Storage in bank-add.php
**Problem:** Changed implementation was storing full path instead of just filename.

**Solution:** Consistent storage of just the filename:
```php
$bankLogoPath = $uniqueFilename;  // e.g., "bank_logo_abc123def.jpg"
```

## Files Modified

1. **client/assets/js/banking/bank/bank-list.js** (Line 379)
   - Updated image path to absolute URL from application root
   - Better reliability across different browser contexts

2. **server/api/banking/bank/bank-add.php** (Line 68)
   - Ensured consistent filename-only storage
   - Improved error handling and permissions

3. **server/api/banking/bank/bank-edit.php** (Lines 52-92)
   - Applied same improvements as bank-add.php
   - Absolute path construction using `$_SERVER['DOCUMENT_ROOT']`
   - Added writability verification
   - Enhanced error messages

## Path Flow Diagram

```
Database Storage:
  bank_logo_path = "bank_logo_12345abc.jpg"

Frontend Display (JavaScript):
  editLogoPreviewImg.src = "/client/assets/uploads/bank_logo/bank_logo_12345abc.jpg"

File System Location:
  /xampp/htdocs/ledgerone_erp/client/assets/uploads/bank_logo/bank_logo_12345abc.jpg

HTTP Access:
  http://localhost/client/assets/uploads/bank_logo/bank_logo_12345abc.jpg
```

## Testing Checklist

✓ **Create New Bank Account**
  - [ ] Upload a logo during creation
  - [ ] Verify file appears in client/assets/uploads/bank_logo/
  - [ ] Verify database stores only filename

✓ **Edit Existing Account**
  - [ ] Open edit modal for bank with existing logo
  - [ ] Logo preview should auto-populate (NEW FIX)
  - [ ] Image should load and display properly
  - [ ] Upload new logo should replace old one
  - [ ] Old logo file should be deleted from filesystem

✓ **Error Cases**
  - [ ] Upload invalid file type → Error message shown
  - [ ] Upload file > 2MB → Error message shown
  - [ ] Server permissions issue → Descriptive error message

## Browser Compatibility

The absolute path approach (`/client/assets/...`) is compatible with:
- All modern browsers
- Works with document.location changes
- Independent of relative path depth

## Advanced: Using Relative Paths from Client Root

If you need to use relative paths in the future, consider using:
```javascript
// Get the client root path dynamically
const clientRoot = window.location.pathname.split('/client/')[0] + '/client/';
editLogoPreviewImg.src = clientRoot + `assets/uploads/bank_logo/${account.bank_logo_path}`;
```

## Performance Notes

- Logo files are stored in web-accessible directory
- Client-side image caching works as expected
- No performance impact from absolute paths
- Old logos are properly cleaned up during edits

## Security Considerations

- File type validation (JPG, PNG, GIF only)
- File size limit (2MB max)
- Consider adding MIME type validation for production
- Upload directory is web-accessible (intended for images)
- Consider adding image content validation using getimagesize()
