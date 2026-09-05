# Booking Invoice Type - Deployment Checklist

## Pre-Deployment Verification

### Files Created
- [ ] `server/api/sale/pos_invoice/stock-management.php` exists
- [ ] `database/migrations/2026_add_booking_invoice_type.sql` exists
- [ ] `BOOKING_INVOICE_IMPLEMENTATION.md` exists
- [ ] `BOOKING_INVOICE_SUMMARY.md` exists
- [ ] `BOOKING_INVOICE_QUICK_REFERENCE.md` exists
- [ ] `BOOKING_INVOICE_COMPLETE_GUIDE.md` exists
- [ ] `BOOKING_INVOICE_FINAL_SUMMARY.md` exists

### Files Modified
- [x] `client/pages/sale/pos_invoice/pos-add.php` has Booking option
- [x] `server/api/sale/pos_invoice/pos-add.php` uses stock-management.php
- [x] `server/api/sale/pos_invoice/pos-edit.php` uses stock-management.php and supports invoice_type updates

### Code Quality
- [ ] No syntax errors in stock-management.php
- [ ] No syntax errors in pos-add.php
- [ ] No syntax errors in pos-edit.php
- [ ] All functions properly documented
- [ ] All error handling in place

## Deployment Steps

### Step 1: Backup
- [ ] Backup database
- [ ] Backup current pos-add.php
- [ ] Backup current pos-edit.php
- [ ] Backup current pos-add.php (frontend)

### Step 2: Copy Files
- [ ] Copy stock-management.php to server/api/sale/pos_invoice/
- [ ] Verify file permissions (644 or 755)
- [ ] Verify file is readable by web server

### Step 3: Update APIs
- [ ] Replace pos-add.php with updated version
- [ ] Replace pos-edit.php with updated version
- [ ] Verify file permissions
- [ ] Verify files are readable

### Step 4: Update Frontend
- [ ] Replace pos-add.php (frontend) with updated version
- [ ] Verify Booking option appears in dropdown
- [ ] Verify no JavaScript errors

### Step 5: Verify Database
- [ ] Check sale_invoice table has invoice_type column
- [ ] Verify invoice_type enum includes 'Booking'
- [ ] Check stock_ledger table structure
- [ ] Verify accounting_ledger table structure

## Testing Checklist

### Test 1: Create Booking Invoice
- [ ] Open POS invoice form
- [ ] Select "Booking" from Invoice Type dropdown
- [ ] Add 1 product (note current stock)
- [ ] Save invoice
- [ ] Verify stock hasn't changed
- [ ] Check stock_ledger table (should be empty)
- [ ] Check accounting_ledger table (should have entries)

### Test 2: Convert Booking to Cash
- [ ] Edit the Booking invoice from Test 1
- [ ] Change Invoice Type to "Cash"
- [ ] Save invoice
- [ ] Verify stock has been deducted
- [ ] Check stock_ledger table (should have 1 entry)
- [ ] Verify qty_out matches quantity sold

### Test 3: Convert Cash to Booking
- [ ] Edit the Cash invoice from Test 2
- [ ] Change Invoice Type to "Booking"
- [ ] Save invoice
- [ ] Verify stock has been added back
- [ ] Check stock_ledger table (entry should be deleted)

### Test 4: Create Cash Invoice
- [ ] Create new invoice
- [ ] Select "Cash" from Invoice Type dropdown
- [ ] Add 1 product (note current stock)
- [ ] Save invoice
- [ ] Verify stock has been deducted immediately
- [ ] Check stock_ledger table (should have 1 entry)

### Test 5: Create Credit Invoice
- [ ] Create new invoice
- [ ] Select "Credit" from Invoice Type dropdown
- [ ] Add 1 product (note current stock)
- [ ] Save invoice
- [ ] Verify stock has been deducted immediately
- [ ] Check stock_ledger table (should have 1 entry)

### Test 6: FOC Items
- [ ] Create Booking invoice with FOC items
- [ ] Verify no stock_ledger entries
- [ ] Edit to Cash
- [ ] Verify stock_ledger entries created for both regular and FOC
- [ ] Verify FOC entry has unit_cost = 0

### Test 7: Multiple Items
- [ ] Create Booking invoice with 5 different items
- [ ] Verify no stock_ledger entries
- [ ] Edit to Cash
- [ ] Verify 5 stock_ledger entries created
- [ ] Verify each entry has correct qty_out

### Test 8: Accounting Entries
- [ ] Create Booking invoice
- [ ] Check accounting_ledger table
- [ ] Verify debit entries (Trade Debtors)
- [ ] Verify credit entries (Sales Revenue)
- [ ] Verify entries are independent of stock deduction

### Test 9: Edit Multiple Times
- [ ] Create Booking invoice
- [ ] Edit to Cash (verify stock deducted)
- [ ] Edit to Credit (verify stock still deducted)
- [ ] Edit to Booking (verify stock added back)
- [ ] Verify stock_ledger is clean

### Test 10: Existing Invoices
- [ ] Verify existing Cash invoices still work
- [ ] Verify existing Credit invoices still work
- [ ] Verify stock calculations are correct
- [ ] Verify no data corruption

## Database Verification

### Stock Ledger Verification
```sql
-- Check for Booking invoices (should have no entries)
SELECT COUNT(*) FROM stock_ledger 
WHERE reference_table = 'sale_invoice' 
AND reference_id IN (
    SELECT id FROM sale_invoice WHERE invoice_type = 'Booking'
);
-- Expected: 0

-- Check for Cash invoices (should have entries)
SELECT COUNT(*) FROM stock_ledger 
WHERE reference_table = 'sale_invoice' 
AND reference_id IN (
    SELECT id FROM sale_invoice WHERE invoice_type = 'Cash'
);
-- Expected: > 0
```

### Accounting Ledger Verification
```sql
-- Check accounting entries for all invoice types
SELECT si.invoice_type, COUNT(al.id) as entry_count
FROM sale_invoice si
LEFT JOIN accounting_ledger al ON si.id = al.reference_id 
  AND al.reference_table = 'sale_invoice'
GROUP BY si.invoice_type;
-- Expected: All types should have entries
```

### Stock Position Verification
```sql
-- Check stock balance
SELECT product_id, 
       SUM(qty_in) - SUM(qty_out) as balance
FROM stock_ledger
GROUP BY product_id
ORDER BY product_id;
-- Verify balances are correct
```

## Performance Testing

- [ ] Create 100 Booking invoices (should be fast)
- [ ] Create 100 Cash invoices (should be fast)
- [ ] Edit 50 invoices from Booking to Cash (should be fast)
- [ ] Check database query performance
- [ ] Monitor server resources

## Security Testing

- [ ] Verify user permissions are respected
- [ ] Verify SQL injection prevention
- [ ] Verify XSS prevention
- [ ] Verify CSRF protection
- [ ] Verify data validation

## Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile browsers

## Rollback Plan

If issues occur:
1. [ ] Restore backup of pos-add.php
2. [ ] Restore backup of pos-edit.php
3. [ ] Restore backup of pos-add.php (frontend)
4. [ ] Delete stock-management.php
5. [ ] Verify system works
6. [ ] Investigate issue
7. [ ] Redeploy with fix

## Post-Deployment

- [ ] Monitor error logs
- [ ] Monitor database performance
- [ ] Gather user feedback
- [ ] Check stock reports accuracy
- [ ] Verify accounting entries
- [ ] Document any issues
- [ ] Create support documentation

## Sign-Off

- [ ] Development Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Project Manager: _________________ Date: _______

## Notes

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

## Contact Information

For issues or questions:
- Technical Support: [contact info]
- Database Admin: [contact info]
- System Admin: [contact info]

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________
**Status:** ☐ Pending ☐ In Progress ☐ Complete ☐ Rolled Back
