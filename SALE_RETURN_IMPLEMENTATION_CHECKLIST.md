# Sale Return Scheme Implementation Checklist

## Phase 1: Core Files ✅ COMPLETED

### JavaScript Files
- [x] `return-add-scheme.js` - Created (412 lines)
  - [x] SCHEME_TYPES constants defined
  - [x] applyDefaultScheme() implemented
  - [x] applyLessScheme() implemented
  - [x] applyLessSpecialScheme() implemented
  - [x] applyGivenScheme() implemented
  - [x] calculateLessSchemeAmounts() implemented
  - [x] calculateLessSpecialSchemeAmounts() implemented
  - [x] calculateGivenSchemeAmounts() implemented
  - [x] calculateRowAmountsWithScheme() implemented
  - [x] fetchProductSchemes() implemented

- [x] `return-add-uom.js` - Created (297 lines)
  - [x] createUomCell() implemented
  - [x] onUomChange() implemented
  - [x] createUnitQuantityInput() implemented
  - [x] getAllRowQuantities() implemented
  - [x] getConversionFactor() implemented
  - [x] convertQuantity() implemented
  - [x] validateUom() implemented

- [x] `return-add-uom-dynamic.js` - Created (373 lines)
  - [x] setupMultipleUomInputs() implemented
  - [x] createMultiUomInput() implemented
  - [x] debounceCalculateRowAmounts() implemented
  - [x] calculateRowAmounts() implemented
  - [x] onUnitQuantityChange() implemented
  - [x] exportRowQuantities() implemented

- [x] `return-add-handlers.js` - Created (452 lines)
  - [x] createNewRow() implemented
  - [x] Row cell creation functions implemented
  - [x] setupRowEventListeners() implemented
  - [x] initializeRowForProduct() implemented
  - [x] updateInvoiceSummaryDynamic() implemented
  - [x] loadProductsData() implemented
  - [x] Settings initialization implemented

### CSS Files
- [x] `return-add-scheme-uom.css` - Created (323 lines)
  - [x] Scheme dropdown styling
  - [x] UOM input styling
  - [x] Multi-unit container styling
  - [x] Table cell styling
  - [x] Button styling
  - [x] Dark theme support
  - [x] Responsive media queries

### HTML Updates
- [x] `return-add.php` - Modified
  - [x] Script links added in correct order
  - [x] CSS link added
  - [x] Load order verified

---

## Phase 2: Documentation ✅ COMPLETED

- [x] `SALE_RETURN_SCHEME_GUIDE.md` - Created
  - [x] Scheme types documented
  - [x] Behavior documented
  - [x] UI states documented
  - [x] Formulas documented
  - [x] Data flow documented
  - [x] API integration documented
  - [x] Functions documented

- [x] `SALE_RETURN_QUICK_REFERENCE.md` - Created
  - [x] Quick setup guide
  - [x] Formula quick reference
  - [x] Common tasks listed
  - [x] Debugging tips included
  - [x] Code examples provided

- [x] `SALE_RETURN_IMPLEMENTATION_CHECKLIST.md` - This file

---

## Phase 3: Testing - TO BE COMPLETED

### Unit Tests

#### Scheme Functions
- [ ] Test SALE_ON_TP scheme application
  - [ ] T.O Amount field is readonly
  - [ ] FOC Qty field is readonly
  - [ ] Values are "0" or "0.00"
  
- [ ] Test LESS scheme calculation
  - [ ] T.O Amount = floor(qty / to_qty) × to_rs
  - [ ] Multiple quantity levels work correctly
  - [ ] FOC Qty remains 0
  
- [ ] Test LESS_SPECIAL scheme calculation
  - [ ] Formula: (qty × price) / (promo_qty + bonus_qty)
  - [ ] Results are accurate
  - [ ] FOC Qty remains 0
  
- [ ] Test GIVEN scheme calculation
  - [ ] FOC Qty = floor(qty / promo_qty) × bonus_qty
  - [ ] Multiple quantity levels work
  - [ ] T.O Amount remains 0

#### UOM Functions
- [ ] Test single-unit products
  - [ ] Quantity input appears
  - [ ] Conversion factor applied
  - [ ] Calculations correct
  
- [ ] Test multi-unit products
  - [ ] Multiple unit inputs available
  - [ ] Quantities aggregate correctly
  - [ ] Conversion factors applied per unit
  
- [ ] Test quantity conversion
  - [ ] convertQuantity() works correctly
  - [ ] getConversionFactor() returns correct factor
  - [ ] Base unit calculations accurate

#### Amount Calculations
- [ ] Gross amount = Qty × Price
- [ ] Discount amount = Gross × (Discount% / 100)
- [ ] T.O amount calculated per scheme
- [ ] After T.O = Gross - Discount - T.O
- [ ] GST amount = After T.O × (GST% / 100)
- [ ] Net amount = After T.O + GST

### Integration Tests

#### Row Creation
- [ ] New row created with all cells
- [ ] Row ID assigned correctly
- [ ] Event listeners attached
- [ ] Initial state correct

#### Product Selection
- [ ] Search filters correctly
- [ ] Dropdown shows matching products
- [ ] Selection populates row data
- [ ] UOM initializes for product
- [ ] Default scheme applied

#### Scheme Application
- [ ] Scheme dropdown shows all types
- [ ] Selecting scheme updates UI correctly
- [ ] T.O Amount field changes state per scheme
- [ ] FOC Qty field changes state per scheme
- [ ] Amounts recalculate on scheme change

#### Multi-Unit Input
- [ ] Add button appears for multi-unit products
- [ ] Can add multiple units
- [ ] Remove button works
- [ ] Quantities aggregate correctly
- [ ] Calculations use aggregated total

#### Settings
- [ ] Trade Offer % field toggles on/off
- [ ] Trade Offer Amount field readable/writable
- [ ] Settings persist in localStorage
- [ ] Existing rows update when settings change

#### Summary Updates
- [ ] Summary totals update on every change
- [ ] Total quantities correct
- [ ] Total amounts correct
- [ ] FOC totals correct

### API Integration Tests

#### Products Loading
- [ ] API endpoint responds
- [ ] Products load correctly
- [ ] Product data structure correct
- [ ] Units array populated
- [ ] Comparison factors present

#### Schemes Loading
- [ ] API endpoint responds with product_id
- [ ] Schemes load correctly
- [ ] Scheme fields present (to_qty, to_rs, etc.)
- [ ] Multiple schemes per product work
- [ ] Error handling when no schemes

### UI/UX Tests

#### Visual States
- [ ] Readonly fields appear disabled (gray)
- [ ] Editable fields appear active (white)
- [ ] Required fields marked
- [ ] Error messages clear
- [ ] Focus indicators visible

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Labels associated with inputs
- [ ] Error messages associated with fields
- [ ] Dark mode readable

#### Responsiveness
- [ ] Works on desktop (1920x1080)
- [ ] Works on tablet (768x1024)
- [ ] Works on mobile (375x667)
- [ ] Table scrolls on small screens
- [ ] Touch inputs work correctly

### Performance Tests

#### Load Time
- [ ] Products load < 500ms
- [ ] Schemes load < 300ms
- [ ] Row creation < 100ms
- [ ] Calculations < 100ms

#### Memory
- [ ] No memory leaks with row creation/deletion
- [ ] Cache doesn't grow unbounded
- [ ] Event listeners properly cleaned up

#### User Input
- [ ] Quantity input debounces correctly
- [ ] Multiple rapid changes handled
- [ ] No lag during calculation

### Data Validation

#### Quantity Validation
- [ ] Negative quantities rejected
- [ ] Non-numeric values rejected
- [ ] Decimal places limited to 2
- [ ] Zero quantity allowed but not required

#### Price Validation
- [ ] Negative prices rejected
- [ ] Non-numeric values rejected
- [ ] Decimal places limited to 2
- [ ] prices match product data

#### Percentage Validation
- [ ] Discount % 0-100
- [ ] Trade Offer % 0-100
- [ ] GST % 0-100+
- [ ] Non-numeric rejected

### Error Scenarios

#### Missing Data
- [ ] Product not found handling
- [ ] Schemes not available handling
- [ ] Missing units handling
- [ ] API downtime handling

#### Edge Cases
- [ ] Very large quantities (999999)
- [ ] Very small quantities (0.01)
- [ ] Very large prices (999999.99)
- [ ] Very small prices (0.01)

---

## Phase 4: Browser Compatibility - TO BE COMPLETED

- [ ] Chrome (latest)
  - [ ] All features work
  - [ ] No console errors
  - [ ] Performance acceptable
  
- [ ] Firefox (latest)
  - [ ] All features work
  - [ ] No console errors
  - [ ] Performance acceptable
  
- [ ] Safari (latest)
  - [ ] All features work
  - [ ] No console errors
  - [ ] Performance acceptable
  
- [ ] Edge (latest)
  - [ ] All features work
  - [ ] No console errors
  - [ ] Performance acceptable
  
- [ ] Mobile Chrome
  - [ ] Touch input works
  - [ ] UI responsive
  - [ ] No console errors
  
- [ ] Mobile Safari
  - [ ] Touch input works
  - [ ] UI responsive
  - [ ] No console errors

---

## Phase 5: Integration with Existing System - TO BE COMPLETED

### Form Integration
- [ ] Return form loads without errors
- [ ] All existing functionality preserved
- [ ] New scheme controls integrated
- [ ] Settings modal works
- [ ] Print functionality works with new scheme

### Backend Integration
- [ ] Scheme data saved to database
- [ ] Scheme data retrieved correctly
- [ ] Scheme calculations server-validated
- [ ] FOC data included in reports
- [ ] T.O Amount in invoices correct

### Print Integration
- [ ] Scheme type displays on print
- [ ] T.O Amount displays correctly
- [ ] FOC Qty displays correctly
- [ ] Formulas not visible (only results)
- [ ] Both thermal and full formats work

### Report Integration
- [ ] Scheme data in sale return reports
- [ ] FOC Qty in stock reports
- [ ] T.O Amount in financial reports
- [ ] Scheme statistics available

---

## Phase 6: User Training - TO BE COMPLETED

### Documentation
- [ ] Training guide created
- [ ] Screenshot walkthroughs created
- [ ] FAQ created
- [ ] Troubleshooting guide created

### Training
- [ ] Team training conducted
- [ ] Users can select scheme
- [ ] Users understand T.O calculations
- [ ] Users understand FOC Qty
- [ ] Users can configure settings

---

## Phase 7: Deployment - TO BE COMPLETED

### Staging
- [ ] Code deployed to staging
- [ ] All tests pass in staging
- [ ] Performance acceptable in staging
- [ ] No errors in staging logs

### Production
- [ ] Code reviewed and approved
- [ ] Backup created
- [ ] Code deployed to production
- [ ] Monitoring enabled
- [ ] Team notified
- [ ] Users trained

### Post-Deployment
- [ ] Monitor for errors (first 24 hours)
- [ ] Performance metrics collected
- [ ] User feedback gathered
- [ ] Any issues documented
- [ ] Hotfixes prepared if needed

---

## Sign-Off

### Development Team
- [ ] All code complete
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Signed off by: _________________ Date: _______

### QA Team
- [ ] All tests passing
- [ ] No critical issues
- [ ] Documentation reviewed
- [ ] Signed off by: _________________ Date: _______

### Product Manager
- [ ] Requirements met
- [ ] User experience acceptable
- [ ] Performance acceptable
- [ ] Signed off by: _________________ Date: _______

---

## Known Issues & Limitations

### Current Limitations
- [ ] Only supports up to 4 units per product
- [ ] Scheme API calls may take 300-500ms
- [ ] localStorage not available in private browsing
- [ ] Decimal precision limited to 2 places

### Future Improvements
- [ ] Support unlimited units per product
- [ ] Cache schemes in browser cache
- [ ] Support for private browsing mode
- [ ] Configurable decimal precision
- [ ] Batch scheme application

---

## Notes & Comments

```
Add implementation notes, issues encountered, and resolutions here.

Example:
- Issue: FOC calculation incorrect for multi-unit products
  Resolution: Verify conversion factors are loaded before calculation
  
- Issue: Scheme dropdown not updating on product change
  Resolution: Clear rowSchemeData cache on product selection
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2024 | Initial implementation | Dev Team |
|     |          | - Core scheme logic added | |
|     |          | - UOM multi-unit support | |
|     |          | - Dynamic calculations | |
|     |          | - Full documentation | |

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Owner:** Development Team
**Status:** In Progress
