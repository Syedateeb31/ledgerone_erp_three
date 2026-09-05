// Debug script - Check missing elements
console.log('=== SODA BOOK DEBUG LOG ===');

const requiredElements = [
    'itemsTable', 'addRowBtn', 'saveBtn', 'resetBtn', 'invoiceForm',
    'purchaseDate', 'company', 'currency', 'branch', 'supplierCode',
    'addSupplierBtn', 'addProductBtn', 'paymentTerm', 'addPaymentTermBtn',
    'totalDiscountPercent', 'totalDiscountAmount', 'shippingFees',
    'printLaterBtn', 'printInvoiceBtn', 'successModal',
    'invoiceSettingsBtn', 'settingsModal'
];

const missing = [];
const found = [];

requiredElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        found.push(id);
    } else {
        missing.push(id);
    }
});

console.log('Found elements:', found.length);
console.log('Missing elements:', missing.length);
if (missing.length > 0) {
    console.warn('Missing IDs:', missing);
}

console.log('=== PAGE LOAD COMPLETE ===');
