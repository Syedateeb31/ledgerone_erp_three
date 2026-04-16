# Bank Logo Upload Fix - Documentation

## Issues Found & Fixed

### Issue 1: **Incorrect File Path Resolution**
**Problem:** The upload directory used a relative path `../../../../client/assets/uploads/bank_logo/` which could fail or resolve to incorrect location depending on execution context.

**Solution:** Changed to use absolute path based on `$_SERVER['DOCUMENT_ROOT']` for reliable file uploads:
```php
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/client/assets/uploads/bank_logo/';
```

### Issue 2: **Insufficient Directory Permission Handling**
**Problem:** Directory creation had permission set to `0755` (read-only for web server) and didn't verify writability.

**Solution:** Implemented comprehensive checks:
- Set permission to `0777` (full write access) when creating directory
- Added directory existence check and creation with error handling
- Added explicit writability verification before upload

```php
if (!mkdir($uploadDir, 0777, true)) {
    throw new Exception('Failed to create upload directory. Check server permissions.');
}

if (!is_writable($uploadDir)) {
    throw new Exception('Upload directory is not writable. Check folder permissions.');
}
```

### Issue 3: **Incorrect Path Storage in Database**
**Problem:** Only the filename was stored (`bank_logo_abc123def.jpg`), making it difficult to construct proper URLs.

**Solution:** Store the complete relative path that can be used directly in the frontend:
```php
// Old: $bankLogoPath = $uniqueFilename;
// New:
$bankLogoPath = 'client/assets/uploads/bank_logo/' . $uniqueFilename;
```

### Issue 4: **Missing Descriptive Error Messages**
**Problem:** Generic error messages didn't help diagnose upload failures.

**Solution:** Added detailed error messages:
```php
throw new Exception('Failed to upload file. Temp file: ' . $_FILES['bankLogo']['tmp_name'] . ', Target: ' . $uploadPath);
```

## File Changes

### Modified Files:
1. **server/api/banking/bank/bank-add.php**
   - Lines 37-73: Complete rewrite of file upload handling

### Created Directories:
1. **client/assets/uploads/bank_logo/** - Upload destination for bank logos

## Testing Checklist

- [ ] Create a new bank account without a logo (should work fine)
- [ ] Upload a valid logo (JPG, PNG, GIF)
- [ ] Verify logo file appears in `client/assets/uploads/bank_logo/`
- [ ] Verify database stores the correct path: `client/assets/uploads/bank_logo/bank_logo_xyz.jpg`
- [ ] Try uploading an invalid file type (should show error)
- [ ] Try uploading a file > 2MB (should show error)

## Frontend Integration (if needed)

When displaying the bank logo in bank-list or edit pages, use the stored path:
```php
if ($bankLogo = $bank['bank_logo_path']) {
    echo '<img src="' . htmlspecialchars($bankLogo) . '" alt="Bank Logo">';
}
```

## Notes

- Upload directory requires web server write permissions (755 minimum, 777 recommended)
- For production, consider adding MIME type validation for enhanced security
- Consider implementing image resizing to limit storage usage
- Test on your specific server configuration to ensure permissions are correct
