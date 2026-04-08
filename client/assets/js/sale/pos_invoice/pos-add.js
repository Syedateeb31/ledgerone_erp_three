// Global variables for products and UOM data
let uomData = [];
let branchesData = [];
let companiesData = [];
let employeesData = [];
let currenciesData = [];
let bankAccountsData = [];
let saleOrdersData = [];
let customersData = [];
let productsData = [];

// Cache for quick lookups
const dataCache = {
    products: new Map(),
    customers: new Map(),
    branches: new Map()
};

// Default shortcuts
const defaultShortcuts = {
    addRow: 'F2',
    save: 'F9',
    draft: 'F8',
    reset: 'F5',
    customer: 'F3',
    product: 'F4',
    viewDrafts: 'F6',
    closeModal: 'Escape',
    deleteRow: 'Delete',
    moveForward: 'ArrowRight',
    moveBackward: 'ArrowLeft',
    addCustomer: 'Ctrl+N',
    salesReturn: 'F7',
    nextField: 'Tab',
    prevField: 'Shift+Tab'
};

let shortcuts = { ...defaultShortcuts };

document.addEventListener('DOMContentLoaded', function () {
    // Check permissions
    fetch('../../../../server/api/auth/check-permission.php?category=Sale&form_name=POS Invoice')
        .then(response => {
            if (response.status === 403) {
                window.location.href = '../../../../../errors/403.php';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            if (data.success) {
                // Check if user has at least Add or Edit permission
                if (!data.permissions.includes('Add') && !data.permissions.includes('Edit')) {
                    window.location.href = '../../../../../errors/403.php';
                    return;
                }
                initializePage(data.permissions);
            }
        });
});

function initializePage(permissions) {
    // Load shortcuts
    loadShortcuts();

    // Clear variant selections on page load
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('variants_')) {
            localStorage.removeItem(key);
        }
    });

    // Load invoice settings on page load
    loadInvoiceSettings();
    
    // Toggle settings buttons
    const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
    const settingsButtons = document.getElementById('settingsButtons');
    if (toggleSettingsBtn && settingsButtons) {
        const savedState = localStorage.getItem('showSettingsButtons') === 'true';
        toggleSettingsBtn.checked = false;
        settingsButtons.style.display = 'none';
        
        toggleSettingsBtn.addEventListener('change', function() {
            settingsButtons.style.display = this.checked ? 'flex' : 'none';
            localStorage.setItem('showSettingsButtons', this.checked);
        });
    }

    // Invoice Settings button
    const invoiceSettingsBtn = document.getElementById('invoiceSettingsBtn');
    if (invoiceSettingsBtn) {
        invoiceSettingsBtn.addEventListener('click', function () {
            loadInvoiceSettings();
            document.getElementById('invoiceSettingsModal').style.display = 'flex';
        });
    }

    // Close Invoice Settings
    const closeInvoiceSettingsBtn = document.getElementById('closeInvoiceSettingsBtn');
    if (closeInvoiceSettingsBtn) {
        closeInvoiceSettingsBtn.addEventListener('click', function () {
            document.getElementById('invoiceSettingsModal').style.display = 'none';
        });
    }

    // Save Invoice Settings
    const saveInvoiceSettingsBtn = document.getElementById('saveInvoiceSettingsBtn');
    if (saveInvoiceSettingsBtn) {
        saveInvoiceSettingsBtn.addEventListener('click', function () {
            saveInvoiceSettings();
            document.getElementById('invoiceSettingsModal').style.display = 'none';
            applyInvoiceSettings();
        });
    }

    // Close modal on outside click
    const invoiceSettingsModal = document.getElementById('invoiceSettingsModal');
    if (invoiceSettingsModal) {
        invoiceSettingsModal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }

    // Print Settings button
    const printSettingsBtn = document.getElementById('printSettingsBtn');
    if (printSettingsBtn) {
        printSettingsBtn.addEventListener('click', function () {
            const savedPref = localStorage.getItem('pos_print_preference');
            const enableCheckbox = document.getElementById('enableRememberPrint');
            const prefSection = document.getElementById('printPreferenceSection');
            const prefSelect = document.getElementById('printPreference');

            if (savedPref) {
                enableCheckbox.checked = true;
                prefSection.style.display = 'block';
                prefSelect.value = savedPref;
            } else {
                enableCheckbox.checked = false;
                prefSection.style.display = 'none';
            }

            const totalsLayout = localStorage.getItem('totalsLayout') || 'vertical';
            document.querySelector(`input[name="totalsLayout"][value="${totalsLayout}"]`).checked = true;

            document.getElementById('labelTotalBill').value = localStorage.getItem('labelTotalBill') || 'Total Bill';
            document.getElementById('labelDiscountAmount').value = localStorage.getItem('labelDiscountAmount') || 'Discount Amount';
            document.getElementById('labelShippingFees').value = localStorage.getItem('labelShippingFees') || 'Shipping Fees';
            document.getElementById('labelNetAmount').value = localStorage.getItem('labelNetAmount') || 'Net Amount';
            document.getElementById('labelAmountPaid').value = localStorage.getItem('labelAmountPaid') || 'Amount Paid';
            document.getElementById('labelPaymentMethod').value = localStorage.getItem('labelPaymentMethod') || 'Payment Method';
            document.getElementById('labelRemainingBalance').value = localStorage.getItem('labelRemainingBalance') || 'Remaining Balance';

            document.getElementById('hidePrintCustomerPhone').checked = localStorage.getItem('hidePrintCustomerPhone') === 'true';
            document.getElementById('hidePrintCustomerEmail').checked = localStorage.getItem('hidePrintCustomerEmail') === 'true';
            document.getElementById('hidePrintCustomerAddress').checked = localStorage.getItem('hidePrintCustomerAddress') === 'true';
            document.getElementById('hidePrintPreviousBalance').checked = localStorage.getItem('hidePrintPreviousBalance') === 'true';
            document.getElementById('hidePrintBranch').checked = localStorage.getItem('hidePrintBranch') === 'true';
            document.getElementById('hidePrintCurrency').checked = localStorage.getItem('hidePrintCurrency') === 'true';
            document.getElementById('hidePrintSalesOfficer').checked = localStorage.getItem('hidePrintSalesOfficer') === 'true';
            document.getElementById('hidePrintBiltyNo').checked = localStorage.getItem('hidePrintBiltyNo') === 'true';
            document.getElementById('hidePrintTransport').checked = localStorage.getItem('hidePrintTransport') === 'true';
            document.getElementById('hidePrintRemarks').checked = localStorage.getItem('hidePrintRemarks') === 'true';
            document.getElementById('hidePrintTotalBill').checked = localStorage.getItem('hidePrintTotalBill') === 'true';
            document.getElementById('hidePrintNetAmount').checked = localStorage.getItem('hidePrintNetAmount') === 'true';
            document.getElementById('hidePrintPaymentMethod').checked = localStorage.getItem('hidePrintPaymentMethod') === 'true';
            document.getElementById('hidePrintAmountPaid').checked = localStorage.getItem('hidePrintAmountPaid') === 'true';
            document.getElementById('hidePrintRemainingBalance').checked = localStorage.getItem('hidePrintRemainingBalance') === 'true';
            document.getElementById('hidePrintAmountInWords').checked = localStorage.getItem('hidePrintAmountInWords') === 'true';
            document.getElementById('hidePrintSignatures').checked = localStorage.getItem('hidePrintSignatures') === 'true';
            document.getElementById('hidePrintGeneratedBy').checked = localStorage.getItem('hidePrintGeneratedBy') === 'true';
            document.getElementById('hidePrintGeneratedOn').checked = localStorage.getItem('hidePrintGeneratedOn') === 'true';

            const childMode = localStorage.getItem('childDisplayMode') || 'separate';
            if (childMode === 'inline') {
                document.getElementById('childDisplayInline').checked = true;
            } else {
                document.getElementById('childDisplaySeparate').checked = true;
            }

            document.getElementById('printSettingsModal').style.display = 'flex';
            document.getElementById('childDisplayModal').style.display = 'flex';
        });
    }

    // Close Print Settings
    const closePrintSettingsBtn = document.getElementById('closePrintSettingsBtn');
    if (closePrintSettingsBtn) {
        closePrintSettingsBtn.addEventListener('click', function () {
            document.getElementById('printSettingsModal').style.display = 'none';
            document.getElementById('childDisplayModal').style.display = 'none';
        });
    }

    // Save Print Settings
    const savePrintSettingsBtn = document.getElementById('savePrintSettingsBtn');
    if (savePrintSettingsBtn) {
        savePrintSettingsBtn.addEventListener('click', function () {
            const enableCheckbox = document.getElementById('enableRememberPrint');
            const prefSelect = document.getElementById('printPreference');
            const totalsLayout = document.querySelector('input[name="totalsLayout"]:checked').value;

            if (enableCheckbox.checked) {
                localStorage.setItem('pos_print_preference', prefSelect.value);
                alert('Print settings saved successfully!');
            } else {
                localStorage.removeItem('pos_print_preference');
                alert('Remember print choice disabled!');
            }

            localStorage.setItem('totalsLayout', totalsLayout);

            localStorage.setItem('labelTotalBill', document.getElementById('labelTotalBill').value || 'Total Bill');
            localStorage.setItem('labelDiscountAmount', document.getElementById('labelDiscountAmount').value || 'Discount Amount');
            localStorage.setItem('labelShippingFees', document.getElementById('labelShippingFees').value || 'Shipping Fees');
            localStorage.setItem('labelNetAmount', document.getElementById('labelNetAmount').value || 'Net Amount');
            localStorage.setItem('labelAmountPaid', document.getElementById('labelAmountPaid').value || 'Amount Paid');
            localStorage.setItem('labelPaymentMethod', document.getElementById('labelPaymentMethod').value || 'Payment Method');
            localStorage.setItem('labelRemainingBalance', document.getElementById('labelRemainingBalance').value || 'Remaining Balance');

            localStorage.setItem('hidePrintCustomerPhone', document.getElementById('hidePrintCustomerPhone').checked);
            localStorage.setItem('hidePrintCustomerEmail', document.getElementById('hidePrintCustomerEmail').checked);
            localStorage.setItem('hidePrintCustomerAddress', document.getElementById('hidePrintCustomerAddress').checked);
            localStorage.setItem('hidePrintPreviousBalance', document.getElementById('hidePrintPreviousBalance').checked);
            localStorage.setItem('hidePrintBranch', document.getElementById('hidePrintBranch').checked);
            localStorage.setItem('hidePrintCurrency', document.getElementById('hidePrintCurrency').checked);
            localStorage.setItem('hidePrintSalesOfficer', document.getElementById('hidePrintSalesOfficer').checked);
            localStorage.setItem('hidePrintBiltyNo', document.getElementById('hidePrintBiltyNo').checked);
            localStorage.setItem('hidePrintTransport', document.getElementById('hidePrintTransport').checked);
            localStorage.setItem('hidePrintRemarks', document.getElementById('hidePrintRemarks').checked);
            localStorage.setItem('hidePrintTotalBill', document.getElementById('hidePrintTotalBill').checked);
            localStorage.setItem('hidePrintNetAmount', document.getElementById('hidePrintNetAmount').checked);
            localStorage.setItem('hidePrintPaymentMethod', document.getElementById('hidePrintPaymentMethod').checked);
            localStorage.setItem('hidePrintAmountPaid', document.getElementById('hidePrintAmountPaid').checked);
            localStorage.setItem('hidePrintRemainingBalance', document.getElementById('hidePrintRemainingBalance').checked);
            localStorage.setItem('hidePrintAmountInWords', document.getElementById('hidePrintAmountInWords').checked);
            localStorage.setItem('hidePrintSignatures', document.getElementById('hidePrintSignatures').checked);
            localStorage.setItem('hidePrintGeneratedBy', document.getElementById('hidePrintGeneratedBy').checked);
            localStorage.setItem('hidePrintGeneratedOn', document.getElementById('hidePrintGeneratedOn').checked);

            document.getElementById('printSettingsModal').style.display = 'none';
        });
    }

    // Close modal on outside click
    const printSettingsModal = document.getElementById('printSettingsModal');
    if (printSettingsModal) {
        printSettingsModal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.getElementById('childDisplayModal').style.display = 'none';
            }
        });
    }

    // Field Settings
    const fieldSettingsBtn = document.getElementById('fieldSettingsBtn');
    if (fieldSettingsBtn) {
        fieldSettingsBtn.addEventListener('click', function () {
            if (typeof loadFieldSettings === 'function') loadFieldSettings();
            document.getElementById('fieldSettingsModal').style.display = 'flex';
        });
    }

    // Close Field Settings
    const closeFieldSettingsBtn = document.getElementById('closeFieldSettingsBtn');
    if (closeFieldSettingsBtn) {
        closeFieldSettingsBtn.addEventListener('click', function () {
            document.getElementById('fieldSettingsModal').style.display = 'none';
        });
    }

    // Save Field Settings
    const saveFieldSettingsBtn = document.getElementById('saveFieldSettingsBtn');
    if (saveFieldSettingsBtn) {
        saveFieldSettingsBtn.addEventListener('click', function () {
            if (typeof saveFieldSettings === 'function') saveFieldSettings();
            document.getElementById('fieldSettingsModal').style.display = 'none';
            if (typeof applyFieldVisibility === 'function') applyFieldVisibility();
        });
    }

    // Close modal on outside click
    const fieldSettingsModal = document.getElementById('fieldSettingsModal');
    if (fieldSettingsModal) {
        fieldSettingsModal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;

    // Check if in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isEditMode = editId !== null;

    // Items table functionality
    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    const addRowBtn = document.getElementById('addRowBtn');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const form = document.getElementById('invoiceForm');

    // Load all data, then initialize dropdowns and add first row
    Promise.all([loadCustomersLocal(), loadCompanies(), loadBranches(), loadProductsLocal(), loadUOM(), loadUOMGroupUnits(), loadCurrencies(), loadBankAccounts(), loadEmployees(), loadSaleOrders()]).then(() => {
        initSearchableDropdown('customerCodeSearch', 'customerCodeOptions', 'customerCode');
        initSearchableDropdown('companySearch', 'companyOptions', 'company');
        initSearchableDropdown('branchSearch', 'branchOptions', 'branch');
        initSearchableDropdown('saleOrderSearch', 'saleOrderOptions', 'saleOrder');

        // Apply invoice settings
        applyInvoiceSettings();

        if (isEditMode) {
            loadInvoiceData(editId);
        } else {
            // Add first row after data is loaded
            addRowDynamic();
        }
    });

    // Add row button event - use dynamic row creation
    addRowBtn.addEventListener('click', addRowDynamic);

    // Reset button event
    resetBtn.addEventListener('click', resetForm);

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!permissions.includes('Add') && !isEditMode) {
            alert('You do not have permission to add invoices.');
            return;
        }
        if (!permissions.includes('Edit') && isEditMode) {
            alert('You do not have permission to edit invoices.');
            return;
        }
        if (validateFormLocal()) {
            hideBalanceNotification();
            saveInvoice('Posted');
        }
    });

    // Save as Draft button event
    const saveDraftBtnElement = document.getElementById('saveDraftBtn');
    if (saveDraftBtnElement) {
        saveDraftBtnElement.addEventListener('click', function () {
            if (!permissions.includes('Add') && !isEditMode) {
                alert('You do not have permission to add invoices.');
                return;
            }
            if (!permissions.includes('Edit') && isEditMode) {
                alert('You do not have permission to edit invoices.');
                return;
            }
            hideBalanceNotification();
            saveInvoice('Draft');
        });
    }

    // Sales Return button event
    const salesReturnBtn = document.getElementById('salesReturnBtn');
    if (salesReturnBtn) {
        salesReturnBtn.addEventListener('click', function () {
            openOverlay('../sale_return/return-add.php');
        });
    }

    // Tab navigation from Save Invoice button to Customer Code
    saveBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('customerCodeSearch').focus();
        }
    });

    // Shortcut Settings Modal
    const shortcutSettingsBtn = document.getElementById('shortcutSettingsBtn');
    if (shortcutSettingsBtn) {
        shortcutSettingsBtn.addEventListener('click', function () {
            loadShortcutInputs();
            const modal = document.getElementById('shortcutSettingsModal');
            if (modal) modal.style.display = 'flex';
        });
    }

    const closeShortcutSettingsBtn = document.getElementById('closeShortcutSettingsBtn');
    if (closeShortcutSettingsBtn) {
        closeShortcutSettingsBtn.addEventListener('click', function () {
            const modal = document.getElementById('shortcutSettingsModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const saveShortcutSettingsBtn = document.getElementById('saveShortcutSettingsBtn');
    if (saveShortcutSettingsBtn) {
        saveShortcutSettingsBtn.addEventListener('click', saveShortcutSettings);
    }
    
    const resetShortcutsBtn = document.getElementById('resetShortcutsBtn');
    if (resetShortcutsBtn) {
        resetShortcutsBtn.addEventListener('click', resetShortcuts);
    }

    // Shortcut input listeners
    ['shortcutAddRow', 'shortcutSave', 'shortcutDraft', 'shortcutReset', 'shortcutCustomer', 'shortcutProduct', 'shortcutViewDrafts', 'shortcutCloseModal', 'shortcutDeleteRow', 'shortcutMoveForward', 'shortcutMoveBackward', 'shortcutAddCustomer', 'shortcutSalesReturn', 'shortcutNextField', 'shortcutPrevField'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('keydown', function (e) {
            e.preventDefault();
            let key = e.key;

            // Handle special keys - preserve original case for special characters
            if (key === ' ') key = 'Space';
            else if (key.length === 1 && !e.ctrlKey && !e.altKey) {
                // Keep special characters as-is, uppercase letters only
                if (key.match(/[a-z]/i)) {
                    key = key.toUpperCase();
                }
            } else if (key.length > 1) {
                // Keep special keys as-is (ArrowRight, Delete, etc.)
            }

            // Build combo
            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey && key.length > 1) parts.push('Shift');

            // Skip if only modifier key pressed
            if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
                parts.push(key);
            }

            if (parts.length > 0) {
                this.value = parts.join('+');
            }
        });
    });

    // Global shortcut listener
    document.addEventListener('keydown', function (e) {
        // Don't trigger shortcuts if shortcut settings modal is open
        if (document.getElementById('shortcutSettingsModal').style.display === 'flex') {
            return;
        }

        let key = e.key;
        // Preserve original case for special characters, uppercase only letters
        if (key.length === 1 && key.match(/[a-z]/i)) {
            key = key.toUpperCase();
        }

        let combo = '';
        if (e.ctrlKey) combo += 'Ctrl+';
        if (e.altKey) combo += 'Alt+';
        if (e.shiftKey && key.length > 1) combo += 'Shift+';
        combo += key;

        // Check if this combo matches any shortcut
        const isShortcut = Object.values(shortcuts).includes(combo);

        // Don't trigger shortcuts if user is typing in an input field (except for configured shortcuts)
        const activeElement = document.activeElement;
        if (!isShortcut && activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
            return;
        }

        if (combo === shortcuts.addRow) {
            e.preventDefault();
            addRowDynamic();
        } else if (combo === shortcuts.save) {
            e.preventDefault();
            if (validateForm()) saveInvoice('Posted');
        } else if (combo === shortcuts.draft) {
            e.preventDefault();
            saveInvoice('Draft');
        } else if (combo === shortcuts.reset) {
            e.preventDefault();
            resetForm();
        } else if (combo === shortcuts.customer) {
            e.preventDefault();
            document.getElementById('customerCodeSearch').focus();
        } else if (combo === shortcuts.product) {
            e.preventDefault();
            const firstRow = itemsTable.rows[0];
            if (firstRow) firstRow.cells[1].querySelector('.search-input').focus();
        } else if (combo === shortcuts.viewDrafts) {
            e.preventDefault();
            const viewDraftsBtn = document.getElementById('viewDraftsBtn');
            if (viewDraftsBtn) viewDraftsBtn.click();
        } else if (combo === shortcuts.closeModal) {
            e.preventDefault();
            const modals = ['draftsModal', 'overlayModal', 'invoiceSettingsModal', 'printSettingsModal', 'fieldSettingsModal', 'shortcutSettingsModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    if (modalId === 'overlayModal') closeOverlay();
                }
            });
        } else if (combo === shortcuts.deleteRow) {
            e.preventDefault();
            const activeElement = document.activeElement;
            const activeRow = activeElement.closest('tr');
            if (activeRow && activeRow.parentElement.tagName === 'TBODY') {
                const deleteBtn = activeRow.querySelector('.btn-danger');
                if (deleteBtn) deleteBtn.click();
            }
        } else if (combo === shortcuts.moveForward) {
            e.preventDefault();
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.classList.contains('table-input') || activeElement.classList.contains('search-input'))) {
                const row = activeElement.closest('tr');
                if (row && row.nextElementSibling) {
                    const cellIndex = activeElement.closest('td').cellIndex;
                    const nextInput = row.nextElementSibling.cells[cellIndex]?.querySelector('input, select');
                    if (nextInput) nextInput.focus();
                }
            }
        } else if (combo === shortcuts.moveBackward) {
            e.preventDefault();
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.classList.contains('table-input') || activeElement.classList.contains('search-input'))) {
                const row = activeElement.closest('tr');
                if (row && row.previousElementSibling) {
                    const cellIndex = activeElement.closest('td').cellIndex;
                    const prevInput = row.previousElementSibling.cells[cellIndex]?.querySelector('input, select');
                    if (prevInput) {
                        prevInput.focus();
                        if (prevInput.select) prevInput.select();
                    }
                }
            }
        } else if (combo === shortcuts.addCustomer) {
            e.preventDefault();
            openOverlay('../../customer_supplier/customers/customer-add.php');
        } else if (combo === shortcuts.salesReturn) {
            e.preventDefault();
            document.getElementById('salesReturnBtn').click();
        } else if (combo === shortcuts.nextField) {
            e.preventDefault();
            const focusableElements = Array.from(document.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"]), ' +
                'select:not([disabled]):not([tabindex="-1"]), ' +
                'textarea:not([disabled]):not([readonly]):not([tabindex="-1"]), ' +
                'button:not([disabled]):not([tabindex="-1"]), ' +
                'a[href]:not([tabindex="-1"]), ' +
                '[tabindex]:not([tabindex="-1"]):not([disabled])'
            )).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            });
            const currentIndex = focusableElements.indexOf(document.activeElement);
            if (currentIndex === -1) {
                if (focusableElements.length > 0) focusableElements[0].focus();
            } else if (currentIndex < focusableElements.length - 1) {
                const nextElement = focusableElements[currentIndex + 1];
                const currentRow = document.activeElement.closest('tr');
                const isNetAmountCell = currentRow && currentRow.parentElement.tagName === 'TBODY' &&
                    document.activeElement === currentRow.cells[16]?.querySelector('input');
                if (isNetAmountCell) {
                    if (currentRow.nextElementSibling) {
                        const firstInput = currentRow.nextElementSibling.cells[1]?.querySelector('.search-input');
                        if (firstInput) firstInput.focus();
                    } else {
                        addRowDynamic();
                        setTimeout(() => {
                            const newRow = currentRow.nextElementSibling;
                            if (newRow) {
                                const firstInput = newRow.cells[1]?.querySelector('.search-input');
                                if (firstInput) firstInput.focus();
                            }
                        }, 50);
                    }
                } else {
                    nextElement.focus();
                    if (nextElement.select && (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA')) {
                        setTimeout(() => nextElement.select(), 0);
                    }
                }
            } else {
                focusableElements[0].focus();
                if (focusableElements[0].select && (focusableElements[0].tagName === 'INPUT' || focusableElements[0].tagName === 'TEXTAREA')) {
                    setTimeout(() => focusableElements[0].select(), 0);
                }
            }
        } else if (combo === shortcuts.prevField) {
            e.preventDefault();
            const focusableElements = Array.from(document.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"]), ' +
                'select:not([disabled]):not([tabindex="-1"]), ' +
                'textarea:not([disabled]):not([readonly]):not([tabindex="-1"]), ' +
                'button:not([disabled]):not([tabindex="-1"]), ' +
                'a[href]:not([tabindex="-1"]), ' +
                '[tabindex]:not([tabindex="-1"]):not([disabled])'
            )).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            });
            const currentIndex = focusableElements.indexOf(document.activeElement);
            if (currentIndex === -1) {
                if (focusableElements.length > 0) focusableElements[focusableElements.length - 1].focus();
            } else if (currentIndex > 0) {
                const prevElement = focusableElements[currentIndex - 1];
                prevElement.focus();
                if (prevElement.select && (prevElement.tagName === 'INPUT' || prevElement.tagName === 'TEXTAREA')) {
                    setTimeout(() => prevElement.select(), 0);
                }
            } else {
                const lastElement = focusableElements[focusableElements.length - 1];
                lastElement.focus();
                if (lastElement.select && (lastElement.tagName === 'INPUT' || lastElement.tagName === 'TEXTAREA')) {
                    setTimeout(() => lastElement.select(), 0);
                }
            }
        }
    });

    function loadShortcuts() {
        const saved = localStorage.getItem('pos_shortcuts');
        if (saved) {
            shortcuts = JSON.parse(saved);
        }
    }

    function loadShortcutInputs() {
        const fields = {
            shortcutAddRow: shortcuts.addRow,
            shortcutSave: shortcuts.save,
            shortcutDraft: shortcuts.draft,
            shortcutReset: shortcuts.reset,
            shortcutCustomer: shortcuts.customer,
            shortcutProduct: shortcuts.product,
            shortcutViewDrafts: shortcuts.viewDrafts,
            shortcutCloseModal: shortcuts.closeModal,
            shortcutDeleteRow: shortcuts.deleteRow,
            shortcutMoveForward: shortcuts.moveForward,
            shortcutMoveBackward: shortcuts.moveBackward,
            shortcutAddCustomer: shortcuts.addCustomer,
            shortcutSalesReturn: shortcuts.salesReturn,
            shortcutNextField: shortcuts.nextField,
            shortcutPrevField: shortcuts.prevField
        };
        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = fields[id];
        });
    }

    function saveShortcutSettings() {
        const fields = ['shortcutAddRow', 'shortcutSave', 'shortcutDraft', 'shortcutReset', 'shortcutCustomer', 'shortcutProduct', 'shortcutViewDrafts', 'shortcutCloseModal', 'shortcutDeleteRow', 'shortcutMoveForward', 'shortcutMoveBackward', 'shortcutAddCustomer', 'shortcutSalesReturn', 'shortcutNextField', 'shortcutPrevField'];
        const keys = ['addRow', 'save', 'draft', 'reset', 'customer', 'product', 'viewDrafts', 'closeModal', 'deleteRow', 'moveForward', 'moveBackward', 'addCustomer', 'salesReturn', 'nextField', 'prevField'];
        
        fields.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) shortcuts[keys[i]] = el.value || defaultShortcuts[keys[i]];
        });
        
        localStorage.setItem('pos_shortcuts', JSON.stringify(shortcuts));
        const modal = document.getElementById('shortcutSettingsModal');
        if (modal) modal.style.display = 'none';
        alert('Shortcut settings saved successfully!');
    }

    function resetShortcuts() {
        shortcuts = { ...defaultShortcuts };
        loadShortcutInputs();
    }

    function showBalanceNotification(balance) {
        hideBalanceNotification();
        const notification = document.createElement('div');
        notification.id = 'balanceNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: white;
            color: var(--heading);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 600;
            border-left: 4px solid var(--primary);
            animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = `<strong>Previous Balance:</strong> ${balance}`;
        
        if (!document.querySelector('style[data-balance-animation]')) {
            const style = document.createElement('style');
            style.setAttribute('data-balance-animation', 'true');
            style.textContent = '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
    }

    function hideBalanceNotification() {
        const notification = document.getElementById('balanceNotification');
        if (notification) notification.remove();
    }

    // Load customers from API
    async function loadCustomersLocal() {
        await loadCustomers();
    }

    // Load branches from API
    async function loadBranches() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-branches.php');
            const data = await response.json();

            if (data.success) {
                branchesData = data.branches;
                const branchOptions = document.getElementById('branchOptions');
                branchOptions.innerHTML = '';

                const fragment = document.createDocumentFragment();
                data.branches.forEach(branch => {
                    dataCache.branches.set(branch.id, branch);

                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', branch.id);
                    const branchText = branch.parent_branch_name
                        ? `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type}) - Parent: ${branch.parent_branch_name}`
                        : `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`;
                    option.textContent = branchText;
                    fragment.appendChild(option);
                });
                branchOptions.appendChild(fragment);

                // Set last selected branch
                const lastBranchId = localStorage.getItem('lastSelectedBranch');
                if (lastBranchId) {
                    const lastBranch = dataCache.branches.get(parseInt(lastBranchId));
                    if (lastBranch) {
                        document.getElementById('branchSearch').value = `${lastBranch.branch_code} - ${lastBranch.branch_name} (${lastBranch.branch_type})`;
                        document.getElementById('branch').value = lastBranchId;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    // Load companies from API
    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-companies.php');
            const data = await response.json();

            if (data.success) {
                companiesData = data.companies;
                const companyOptions = document.getElementById('companyOptions');
                if (!companyOptions) {
                    console.error('Company options container not found');
                    return;
                }
                companyOptions.innerHTML = '';

                const fragment = document.createDocumentFragment();
                data.companies.forEach(company => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', company.id);
                    option.textContent = company.company_name;
                    fragment.appendChild(option);
                });
                companyOptions.appendChild(fragment);

                // Auto-select if only one company
                if (data.companies.length === 1) {
                    const company = data.companies[0];
                    document.getElementById('companySearch').value = company.company_name;
                    document.getElementById('company').value = company.id;
                }
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    // Load products from API
    async function loadProductsLocal() {
        await loadProducts();
    }

    // Load UOM from API
    async function loadUOM() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-uom.php');
            const data = await response.json();

            if (data.success) {
                uomData = data.uoms;
            }
        } catch (error) {
            console.error('Error loading UOM:', error);
        }
    }

    // Load bank accounts from API
    async function loadBankAccounts() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-bank-accounts.php');
            const data = await response.json();

            if (data.success) {
                const bankAccountSelect = document.getElementById('bankAccount');
                bankAccountSelect.innerHTML = '<option value="">Select Bank Account</option>';

                data.accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.account_title} - ${account.account_number}`;
                    bankAccountSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading bank accounts:', error);
        }
    }

    // Load employees from API
    async function loadEmployees() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-employees.php');
            const data = await response.json();

            if (data.success) {
                const salesOfficerSelect = document.getElementById('salesOfficer');
                salesOfficerSelect.innerHTML = '<option value="">Select Sales Officer</option>';

                const supplierManSelect = document.getElementById('supplierMan');
                supplierManSelect.innerHTML = '<option value="">Select Supplier Man</option>';

                data.employees.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee.id;
                    option.textContent = `${employee.employee_id} - ${employee.full_name}`;
                    salesOfficerSelect.appendChild(option);

                    const option2 = document.createElement('option');
                    option2.value = employee.id;
                    option2.textContent = `${employee.employee_id} - ${employee.full_name}`;
                    supplierManSelect.appendChild(option2);
                });

                // Set last selected sales officer
                const lastSalesOfficer = localStorage.getItem('lastSelectedSalesOfficer');
                if (lastSalesOfficer) {
                    salesOfficerSelect.value = lastSalesOfficer;
                }
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    // Load sale orders from API
    async function loadSaleOrders() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-sale-orders.php');
            const data = await response.json();

            if (data.success) {
                saleOrdersData = data.orders;
                const saleOrderOptions = document.getElementById('saleOrderOptions');
                saleOrderOptions.innerHTML = '';

                const fragment = document.createDocumentFragment();
                data.orders.forEach(order => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', order.id);
                    option.textContent = order.bill_no;
                    fragment.appendChild(option);
                });
                saleOrderOptions.appendChild(fragment);
            }
        } catch (error) {
            console.error('Error loading sale orders:', error);
        }
    }

    // Load sub accounts for selected customer
    async function loadSubAccounts(customerId) {
        try {
            const response = await fetch(`../../../../server/api/sale/pos_invoice/get-sub-accounts.php?customer_id=${customerId}`);
            const data = await response.json();

            if (data.success) {
                const subAccountSelect = document.getElementById('subAccount');
                subAccountSelect.innerHTML = '<option value="">Select Sub Account</option>';

                data.sub_accounts.forEach(subAccount => {
                    const option = document.createElement('option');
                    option.value = subAccount.id;
                    option.textContent = subAccount.sub_account_name;
                    subAccountSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading sub accounts:', error);
        }
    }

    // Fetch customer balance from ledger
    async function fetchCustomerBalance(customerId) {
        try {
            const response = await fetch(`../../../../server/api/financial_reports/customer_ledger/customer-ledger.php?customer_id=${customerId}&type=summary`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                const balance = parseFloat(data.data[0].closing_balance || 0);
                const balanceText = balance >= 0
                    ? `Dr ${balance.toFixed(2)}`
                    : `Cr ${Math.abs(balance).toFixed(2)}`;
                showBalanceNotification(balanceText);
            }
        } catch (error) {
            console.error('Error fetching customer balance:', error);
        }
    }

    // Add event listener to customer dropdown to fetch balance
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('dropdown-option') && e.target.closest('#customerCodeOptions')) {
            const customerId = e.target.getAttribute('data-value');
            if (customerId) {
                fetchCustomerBalance(customerId);
                loadSubAccounts(customerId);
            }
        }
    });

    // Load currencies from API
    async function loadCurrencies() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-currencies.php');
            const data = await response.json();

            if (data.success) {
                const currencySelect = document.getElementById('currency');
                currencySelect.innerHTML = '<option value="">Select Currency</option>';

                data.currencies.forEach(currency => {
                    const option = document.createElement('option');
                    option.value = currency.currency_id;
                    option.textContent = `${currency.code} - ${currency.name} (${currency.symbol})`;
                    option.setAttribute('data-symbol', currency.symbol);
                    option.setAttribute('data-code', currency.code);

                    // Select base currency by default
                    if (currency.is_base_currency == 1) {
                        option.selected = true;
                    }

                    currencySelect.appendChild(option);
                });

                // Update currency symbols on initial load
                updateCurrencySymbols();
            }
        } catch (error) {
            console.error('Error loading currencies:', error);
        }
    }

    // Update currency symbols in labels and values
    function updateCurrencySymbols() {
        const currencySelect = document.getElementById('currency');
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        const symbol = selectedOption ? selectedOption.getAttribute('data-symbol') : '';

        if (symbol) {
            // Update table headers
            document.getElementById('salePriceLabel').textContent = `Sale Price (${symbol})`;
            document.getElementById('grossAmountLabel').textContent = `Gross Amount (${symbol})`;
            document.getElementById('discountAmountLabel').textContent = `Discount Amount (${symbol})`;
            document.getElementById('netAmountLabel').textContent = `Net Amount (${symbol})`;

            // Update summary labels
            document.getElementById('totalBillLabel').textContent = `Total Bill (${symbol})`;
            document.getElementById('totalDiscountAmountLabel').textContent = `Discount Amount (${symbol})`;
            document.getElementById('netAmountSummaryLabel').textContent = `Net Amount (${symbol})`;
            document.getElementById('amountPaidLabel').textContent = `Amount Paid (${symbol})`;
            document.getElementById('remainingBalanceLabel').textContent = `Remaining Balance (${symbol})`;
        }
    }

    // Add currency change event listener
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', updateCurrencySymbols);
    }

    // Load invoice data for editing
    async function loadInvoiceData(invoiceId) {
        try {
            const response = await fetch(`../../../../server/api/sale/pos_invoice/pos-edit.php?id=${invoiceId}`);
            const data = await response.json();

            if (data.success) {
                const invoice = data.invoice;

                // Populate form fields
                document.getElementById('saleDate').value = invoice.sale_date;
                document.getElementById('customerCodeSearch').value = invoice.customer_name;
                document.getElementById('customerCode').value = invoice.customer_id;
                document.getElementById('branchSearch').value = invoice.branch_name;
                document.getElementById('branch').value = invoice.branch_id;
                document.getElementById('currency').value = invoice.currency_id;
                const prevBalanceEl = document.getElementById('previousBalance');
                if (prevBalanceEl) prevBalanceEl.value = invoice.previous_balance;
                const remarksEl = document.getElementById('remarks');
                if (remarksEl) remarksEl.value = invoice.remarks || '';
                const salesOfficerEl = document.getElementById('salesOfficer');
                if (salesOfficerEl) salesOfficerEl.value = invoice.sales_officer_id || '';
                const supplierManEl = document.getElementById('supplierMan');
                if (supplierManEl) supplierManEl.value = invoice.supplier_man_id || '';
                const biltyNoEl = document.getElementById('biltyNo');
                if (biltyNoEl) biltyNoEl.value = invoice.bilty_no || '';
                const transportNameEl = document.getElementById('transportName');
                if (transportNameEl) transportNameEl.value = invoice.transport_name || '';

                // Load sub accounts and set value
                if (invoice.customer_id) {
                    await loadSubAccounts(invoice.customer_id);
                    if (invoice.sub_account_id) {
                        const subAccountEl = document.getElementById('subAccount');
                        if (subAccountEl) subAccountEl.value = invoice.sub_account_id;
                    }
                }

                // Set company
                if (invoice.company_id) {
                    const company = companiesData.find(c => c.id == invoice.company_id);
                    if (company) {
                        document.getElementById('companySearch').value = company.company_name;
                        document.getElementById('company').value = invoice.company_id;
                    }
                }



                // Update currency symbols
                updateCurrencySymbols();

                // Load invoice items - separate parents and children
                const parentItems = data.items.filter(item => !item.parent_row_id);
                const childItems = data.items.filter(item => item.parent_row_id);
                const itemIdToRowMap = {};

                // Load invoice items with dynamic UOM - group by product
                const itemsByProduct = {};
                data.items.forEach(item => {
                    if (!item.parent_row_id) {
                        const key = item.product_id;
                        if (!itemsByProduct[key]) {
                            itemsByProduct[key] = {
                                baseItem: item,
                                units: []
                            };
                        }
                        itemsByProduct[key].units.push({
                            uom_id: item.uom_id,
                            quantity: item.quantity
                        });
                    }
                });

                // Create one row per product with all units
                for (const productGroup of Object.values(itemsByProduct)) {
                    const item = productGroup.baseItem;
                    await addRowDynamic();
                    const lastRow = itemsTable.rows[itemsTable.rows.length - 1];

                    lastRow.cells[1].querySelector('.search-input').value = item.product_name;
                    lastRow.cells[1].querySelector('.item-code').value = item.product_id;
                    
                    const product = dataCache.products.get(parseInt(item.product_id));
                    if (product) {
                        const uomDetails = await getProductUOMDetails(product);
                        lastRow.dataset.productUomData = JSON.stringify(uomDetails);
                        lastRow.dataset.productId = item.product_id;
                        lastRow.dataset.stockAffects = item.stock_affects || 1;
                        lastRow.dataset.invoiceAffects = item.invoice_affects || 1;
                        recalculateMaxColumns();
                        
                        // Set quantities for each unit
                        productGroup.units.forEach(unit => {
                            const unitInput = lastRow.querySelector(`.unit-input[data-unit-id="${unit.uom_id}"]`);
                            if (unitInput) unitInput.value = unit.quantity;
                        });
                    }
                    
                    const priceInput = lastRow.querySelector('.price-cell input');
                    if (priceInput) priceInput.value = item.sale_price;
                    const grossInput = lastRow.querySelector('.gross-cell input');
                    if (grossInput) grossInput.value = item.gross_amount;
                    const discPercentInput = lastRow.querySelector('.disc-percent-cell input');
                    if (discPercentInput) discPercentInput.value = item.discount_percent;
                    const discAmountInput = lastRow.querySelector('.disc-amount-cell input');
                    if (discAmountInput) discAmountInput.value = item.discount_amount;
                    const toPercentInput = lastRow.querySelector('.to-percent-cell input');
                    if (toPercentInput) toPercentInput.value = item.trade_offer_percent || 0;
                    const toAmountInput = lastRow.querySelector('.to-amount-cell input');
                    if (toAmountInput) toAmountInput.value = item.trade_offer_amount || 0;
                    const gstPercentInput = lastRow.querySelector('.gst-percent-cell input');
                    if (gstPercentInput) gstPercentInput.value = item.gst_percent || 0;
                    const gstAmountInput = lastRow.querySelector('.gst-amount-cell input');
                    if (gstAmountInput) gstAmountInput.value = item.gst_amount || 0;
                    const focInput = lastRow.querySelector('.foc-cell input');
                    if (focInput) focInput.value = item.foc_quantity || 0;
                    const netInput = lastRow.querySelector('.net-cell input');
                    if (netInput) netInput.value = item.net_amount;
                }

                // Load child items
                childItems.forEach(child => {
                    const parentRow = itemIdToRowMap[child.parent_row_id];
                    if (!parentRow) return;

                    const parentRowIndex = parentRow.rowIndex - 1;

                    // Find correct insert position after parent and its existing children
                    let insertIndex = parentRowIndex + 1;
                    while (insertIndex < itemsTable.rows.length &&
                        itemsTable.rows[insertIndex].classList.contains('child-row') &&
                        itemsTable.rows[insertIndex].dataset.parentRowIndex == parentRowIndex) {
                        insertIndex++;
                    }

                    // Store child data in parent row's dataset
                    if (!parentRow.dataset.childProducts) {
                        parentRow.dataset.childProducts = JSON.stringify([]);
                    }
                    const childProducts = JSON.parse(parentRow.dataset.childProducts);
                    childProducts.push({
                        product_id: child.product_id,
                        product_name: child.product_name,
                        uom_id: child.uom_id,
                        quantity: child.quantity,
                        stock_affects: child.stock_affects || 0,
                        invoice_affects: child.invoice_affects || 0
                    });
                    parentRow.dataset.childProducts = JSON.stringify(childProducts);
                    updateParentQtyFromChildren(parentRow);
                });

                // Update summary
                document.getElementById('totalDiscountPercent').value = invoice.total_discount_percent;
                document.getElementById('totalDiscountAmount').value = invoice.total_discount_amount;
                document.getElementById('paymentMethod').value = invoice.payment_method || '';

                // Show bank account if payment method is bank_transfer
                if (invoice.payment_method === 'bank_transfer') {
                    document.getElementById('bankAccountContainer').style.display = 'flex';
                    document.getElementById('bankAccount').value = invoice.bank_account_id || '';
                }

                document.getElementById('amountPaid').value = invoice.amount_paid || 0;

                // Set amount paid auto fill radio button
                const autoFillValue = invoice.amount_paid_auto_fill || 'yes';
                const radioButton = document.querySelector(`input[name="autoFillAmountPaid"][value="${autoFillValue}"]`);
                if (radioButton) radioButton.checked = true;
                
                // Trigger calculations for all rows
                const rows = itemsTable.rows;
                for (let i = 0; i < rows.length; i++) {
                    const qtyInput = rows[i].cells[3]?.querySelector('input');
                    if (qtyInput) qtyInput.dispatchEvent(new Event('input'));
                }
                
                updateInvoiceSummary();

                // Update page title
                const pageTitleEl = document.querySelector('.page-title');
                if (pageTitleEl) pageTitleEl.textContent = `Edit Sale Invoice - ${invoice.bill_no}`;

            } else {
                alert('Error loading invoice: ' + data.message);
                window.location.href = 'pos-add.php';
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
            alert('Error loading invoice data: ' + error.message);
            window.location.href = 'pos-add.php';
        }
    }

    // Load sale order data and populate form
    async function loadSaleOrderData(orderId) {
        try {
            const response = await fetch(`../../../../server/api/sale/pos_invoice/get-sale-order-details.php?id=${orderId}`);
            const data = await response.json();

            if (data.success) {
                const order = data.order;

                // Populate invoice details
                document.getElementById('saleDate').value = order.sale_date;
                document.getElementById('customerCodeSearch').value = `${order.customer_code} - ${order.customer_name}`;
                document.getElementById('customerCode').value = order.customer_id;
                document.getElementById('branchSearch').value = branchesData.find(b => b.id == order.branch_id)?.branch_name || '';
                document.getElementById('branch').value = order.branch_id;
                document.getElementById('currency').value = order.currency_id;
                const prevBalanceEl = document.getElementById('previousBalance');
                if (prevBalanceEl) prevBalanceEl.value = `${order.current_balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(order.current_balance).toFixed(2)}`;
                const salesOfficerEl = document.getElementById('salesOfficer');
                if (salesOfficerEl) salesOfficerEl.value = order.sale_officer_id || '';
                const supplierManEl = document.getElementById('supplierMan');
                if (supplierManEl) supplierManEl.value = order.supplier_man_id || '';
                const biltyNoEl = document.getElementById('biltyNo');
                if (biltyNoEl) biltyNoEl.value = order.bilty_no || '';
                const transportNameEl = document.getElementById('transportName');
                if (transportNameEl) transportNameEl.value = order.transport_name || '';
                const remarksEl = document.getElementById('remarks');
                if (remarksEl) remarksEl.value = order.remarks || '';

                // Auto-populate company if exists
                if (order.company_id) {
                    const company = companiesData.find(c => c.id == order.company_id);
                    if (company) {
                        document.getElementById('companySearch').value = company.company_name;
                        document.getElementById('company').value = order.company_id;
                    }
                }



                // Update currency symbols
                updateCurrencySymbols();

                // Clear existing items
                const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
                while (itemsTable.rows.length > 0) {
                    itemsTable.deleteRow(0);
                }

                // Separate parents and children
                const parentItems = data.items.filter(item => !item.parent_row_id);
                const childItems = data.items.filter(item => item.parent_row_id);
                const itemIdToRowMap = {};

                // Populate parent items
                parentItems.forEach(item => {
                    addRowDynamic();
                    const lastRow = itemsTable.rows[itemsTable.rows.length - 1];
                    itemIdToRowMap[item.id] = lastRow;

                    lastRow.cells[1].querySelector('.search-input').value = item.product_name;
                    lastRow.cells[1].querySelector('.item-code').value = item.product_id;
                    lastRow.cells[2].querySelector('select').value = item.uom_id;
                    lastRow.cells[3].querySelector('input').value = item.quantity;
                    lastRow.cells[7].querySelector('input').value = item.sale_price;
                    lastRow.cells[8].querySelector('input').value = item.gross_amount;
                    lastRow.cells[9].querySelector('input').value = item.discount_percent || 0;
                    lastRow.cells[10].querySelector('input').value = item.discount_amount || 0;
                    lastRow.cells[11].querySelector('input').value = item.trade_offer_percent || 0;
                    lastRow.cells[12].querySelector('input').value = item.trade_offer_amount || 0;
                    lastRow.cells[13].querySelector('input').value = item.gst_percent || 0;
                    lastRow.cells[14].querySelector('input').value = item.gst_amount || 0;
                    lastRow.cells[15].querySelector('input').value = item.foc_quantity || 0;
                    lastRow.cells[16].querySelector('input').value = item.net_amount;
                    lastRow.dataset.stockAffects = item.stock_affects || 1;
                    lastRow.dataset.invoiceAffects = item.invoice_affects || 1;
                    lastRow.dataset.productId = item.product_id;

                    // Show variants button if has children
                    checkAndShowVariantsButton(lastRow, item.product_id);
                });

                // Store child items in parent dataset
                childItems.forEach(child => {
                    const parentRow = itemIdToRowMap[child.parent_row_id];
                    if (!parentRow) return;

                    if (!parentRow.dataset.childProducts) {
                        parentRow.dataset.childProducts = JSON.stringify([]);
                    }
                    const childProducts = JSON.parse(parentRow.dataset.childProducts);
                    childProducts.push({
                        product_id: child.product_id,
                        product_name: child.product_name,
                        uom_id: child.uom_id,
                        quantity: child.quantity,
                        stock_affects: child.stock_affects || 0,
                        invoice_affects: child.invoice_affects || 0
                    });
                    parentRow.dataset.childProducts = JSON.stringify(childProducts);
                });

                // Populate summary
                document.getElementById('totalDiscountPercent').value = order.total_discount_percent || 0;
                document.getElementById('totalDiscountAmount').value = order.total_discount_amount || 0;

                updateInvoiceSummary();
            } else {
                alert('Error loading sale order: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading sale order:', error);
            alert('Error loading sale order data: ' + error.message);
        }
    }

    // Initialize searchable dropdown
    function initSearchableDropdown(searchInputId, optionsContainerId, hiddenInputId) {
        const searchInput = document.getElementById(searchInputId);
        const optionsContainer = document.getElementById(optionsContainerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        let selectedIndex = -1;

        // Show options when clicking on search input
        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();
            optionsContainer.style.display = 'block';
            filterOptions();
        });

        // Show options when input receives focus (tab navigation)
        searchInput.addEventListener('focus', function (e) {
            optionsContainer.style.display = 'block';
            filterOptions();
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function (e) {
            const visibleOptions = Array.from(optionsContainer.getElementsByClassName('dropdown-option'))
                .filter(option => option.style.display !== 'none');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, visibleOptions.length - 1);
                updateSelection(visibleOptions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(visibleOptions);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && visibleOptions[selectedIndex]) {
                    visibleOptions[selectedIndex].click();
                } else if (visibleOptions.length > 0) {
                    visibleOptions[0].click();
                }
            }
        });

        function updateSelection(visibleOptions) {
            visibleOptions.forEach((option, index) => {
                option.style.backgroundColor = index === selectedIndex ? '#1a6cdc' : ''; option.style.color = index === selectedIndex ? 'white' : '';
            });
        }

        // Filter options based on search input
        searchInput.addEventListener('input', function () {
            selectedIndex = -1;
            filterOptions();
        });

        // Select option
        optionsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const displayText = e.target.textContent;

                // Set the search input to display the selected option
                searchInput.value = displayText;
                hiddenInput.value = value;

                // Update related fields for customer selection
                if (hiddenInputId === 'customerCode') {
                    const balance = parseFloat(e.target.getAttribute('data-balance'));
                    showBalanceNotification(`${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toFixed(2)}`);

                    // Update customer address
                    const address = e.target.getAttribute('data-address');
                    const customerAddressEl = document.getElementById('customerAddress');
                    if (customerAddressEl) customerAddressEl.textContent = address || 'No address available';

                    // Load sub accounts for selected customer
                    loadSubAccounts(value);

                    // Auto-populate sales officer if associated
                    const salesOfficerId = e.target.getAttribute('data-sales-officer');
                    if (salesOfficerId) {
                        document.getElementById('salesOfficer').value = salesOfficerId;
                    }

                    // Auto-populate supplier man if associated
                    const supplierManId = e.target.getAttribute('data-supplier-man');
                    if (supplierManId && supplierManId !== '' && supplierManId !== 'null' && supplierManId !== 'undefined') {
                        const supplierManSelect = document.getElementById('supplierMan');
                        supplierManSelect.value = supplierManId;
                    }

                    // Auto-populate withholding tax
                    const withholdingTax = parseFloat(e.target.getAttribute('data-withholding-tax')) || 0;
                    const withholdingTaxInput = document.getElementById('withholdingTaxPercent');
                    if (withholdingTaxInput) {
                        withholdingTaxInput.value = withholdingTax.toFixed(2);
                    }

                    // Auto-populate invoice-wise discount from customer
                    const discount = parseFloat(e.target.getAttribute('data-discount')) || 0;
                    if (discount > 0) {
                        document.getElementById('totalDiscountPercent').value = discount;
                    }

                    // Auto-populate discount if enabled
                    const enableInvoiceDiscount = localStorage.getItem('enableInvoiceCashDiscountPercent') === 'true';
                    if (enableInvoiceDiscount) {
                        const discount = parseFloat(e.target.getAttribute('data-discount')) || 0;
                        document.getElementById('totalDiscountPercent').value = discount;
                        updateInvoiceSummary();
                    }

                    // Store credit limit
                    const creditLimit = parseFloat(e.target.getAttribute('data-credit-limit')) || 0;
                    hiddenInput.setAttribute('data-credit-limit', creditLimit);

                    // Load price history for all rows
                    loadPriceHistoryForAllRows();
                }

                // Save branch selection
                if (hiddenInputId === 'branch') {
                    localStorage.setItem('lastSelectedBranch', value);
                }

                // Load sale order data
                if (hiddenInputId === 'saleOrder') {
                    loadSaleOrderData(value);
                }

                // Save company selection
                if (hiddenInputId === 'company') {
                    localStorage.setItem('lastSelectedCompany', value);
                }

                // Hide options
                optionsContainer.style.display = 'none';

                // Remove error state if any
                hiddenInput.classList.remove('error');
                document.getElementById(hiddenInputId + 'Error').style.display = 'none';
            }
        });

        // Hide options when clicking outside
        document.addEventListener('click', function () {
            optionsContainer.style.display = 'none';
        });

        // Filter options function
        function filterOptions() {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const text = option.textContent.toLowerCase();

                if (text.includes(searchTerm)) {
                    option.style.display = 'block';
                    option.style.backgroundColor = '';
                } else {
                    option.style.display = 'none';
                }
            }
        }
    }

    // Add a new row to the items table
    function addRow() {
        const rowCount = itemsTable.rows.length;
        const row = itemsTable.insertRow();

        // Serial number
        const cell0 = row.insertCell(0);
        cell0.textContent = rowCount + 1;

        // Code (searchable dropdown)
        const cell1 = row.insertCell(1);
        const codeContainer = document.createElement('div');
        codeContainer.className = 'searchable-dropdown';
        const codeOptionsHtml = productsData.map(product => {
            const codes = [];
            if (product.qr_code) codes.push(product.qr_code);
            if (product.barcode) codes.push(product.barcode);
            const codeDisplay = codes.length > 0 ? ` (${codes.join(' - ')})` : '';
            const photoHtml = product.photo ? `<img src="../../../assets/uploads/products/${product.photo}" alt="${product.name}" style="width: 30px; height: 30px; object-fit: cover; margin-right: 8px; border-radius: 4px;">` : '';
            return `<div class="dropdown-option" data-value="${product.id}" data-mrp="${product.mrp}" data-tp="${product.trade_price}" data-unit="${product.default_unit_id}" style="display: flex; align-items: center;">${photoHtml}${product.code} - ${product.name}${codeDisplay}</div>`;
        }).join('');
        codeContainer.innerHTML = `
            <input type="text" class="search-input table-input" placeholder="Search product...">
            <input type="hidden" class="item-code" required>
        `;

        // Create dropdown options and append to body
        const dropdownOptions = document.createElement('div');
        dropdownOptions.className = 'dropdown-options';
        dropdownOptions.innerHTML = codeOptionsHtml;
        dropdownOptions.style.position = 'absolute';
        dropdownOptions.style.display = 'none';
        dropdownOptions.style.zIndex = '9999';
        document.body.appendChild(dropdownOptions);

        // Store reference to dropdown
        codeContainer.querySelector('.search-input').dropdownOptions = dropdownOptions;
        cell1.appendChild(codeContainer);
        initTableDropdown(codeContainer);

        // Unit (dropdown)
        const cell2 = row.insertCell(2);
        const unitSelect = document.createElement('select');
        unitSelect.className = 'table-input';
        const uomOptionsHtml = uomData.map(uom =>
            `<option value="${uom.id}">${uom.uom_name}</option>`
        ).join('');
        unitSelect.innerHTML = `<option value="">Select Unit</option>${uomOptionsHtml}`;
        unitSelect.required = true;
        unitSelect.tabIndex = -1;

        // Add UOM change event for price conversion
        unitSelect.addEventListener('change', function () {
            handleUOMChange(row, this);
        });

        cell2.appendChild(unitSelect);

        // Qty (input)
        const cell3 = row.insertCell(3);
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'table-input';
        qtyInput.min = '0';
        qtyInput.step = '0.01';
        qtyInput.required = true;
        qtyInput.value = '0';
        qtyInput.addEventListener('input', function () {
            const enableFOC = localStorage.getItem('enableFOC') === 'true';
            if (enableFOC && row.dataset.rateListQty && row.dataset.rateListFoc) {
                const qty = parseFloat(this.value) || 0;
                const rateQty = parseFloat(row.dataset.rateListQty);
                const rateFoc = parseFloat(row.dataset.rateListFoc);
                if (rateQty > 0) {
                    const focQty = Math.floor(qty / rateQty) * rateFoc;
                    row.cells[15].querySelector('input').value = focQty;
                }
            }
            validateParentQty(row);
        });
        cell3.appendChild(qtyInput);

        // Pcs (input)
        const cell4 = row.insertCell(4);
        const pcsInput = document.createElement('input');
        pcsInput.type = 'number';
        pcsInput.className = 'table-input';
        pcsInput.min = '0';
        pcsInput.step = '0.01';
        pcsInput.value = '0';
        pcsInput.addEventListener('input', function () {
            const cartonConv = parseInt(row.dataset.cartonConversion) || 0;
            const pcs = parseFloat(this.value) || 0;
            const ctn = parseFloat(row.cells[5].querySelector('input').value) || 0;
            const dz = parseFloat(row.cells[6].querySelector('input').value) || 0;
            const totalQty = pcs + (ctn * cartonConv) + (dz * 12);
            qtyInput.value = totalQty.toFixed(2);
            qtyInput.dispatchEvent(new Event('input'));
        });
        cell4.appendChild(pcsInput);

        // Carton (input)
        const cell5 = row.insertCell(5);
        const ctnInput = document.createElement('input');
        ctnInput.type = 'number';
        ctnInput.className = 'table-input';
        ctnInput.min = '0';
        ctnInput.step = '1';
        ctnInput.value = '0';
        ctnInput.addEventListener('input', function () {
            const cartonConv = parseInt(row.dataset.cartonConversion) || 0;
            const pcs = parseFloat(row.cells[4].querySelector('input').value) || 0;
            const ctn = parseFloat(this.value) || 0;
            const dz = parseFloat(row.cells[6].querySelector('input').value) || 0;
            const totalQty = pcs + (ctn * cartonConv) + (dz * 12);
            qtyInput.value = totalQty.toFixed(2);
            qtyInput.dispatchEvent(new Event('input'));
        });
        cell5.appendChild(ctnInput);

        // Dozen (input)
        const cell6 = row.insertCell(6);
        const dzInput = document.createElement('input');
        dzInput.type = 'number';
        dzInput.className = 'table-input';
        dzInput.min = '0';
        dzInput.step = '1';
        dzInput.value = '0';
        dzInput.addEventListener('input', function () {
            const cartonConv = parseInt(row.dataset.cartonConversion) || 0;
            const pcs = parseFloat(row.cells[4].querySelector('input').value) || 0;
            const ctn = parseFloat(row.cells[5].querySelector('input').value) || 0;
            const dz = parseFloat(this.value) || 0;
            const totalQty = pcs + (ctn * cartonConv) + (dz * 12);
            qtyInput.value = totalQty.toFixed(2);
            qtyInput.dispatchEvent(new Event('input'));
        });
        cell6.appendChild(dzInput);

        // Sale Price (input)
        const cell7 = row.insertCell(7);
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'table-input';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.required = true;
        cell7.appendChild(priceInput);

        // Gross Amount (readonly)
        const cell8 = row.insertCell(8);
        const grossAmount = document.createElement('input');
        grossAmount.type = 'text';
        grossAmount.className = 'table-input';
        grossAmount.readOnly = true;
        grossAmount.value = '0.00';
        grossAmount.tabIndex = -1;
        cell8.appendChild(grossAmount);

        // Discount % (input)
        const cell9 = row.insertCell(9);
        const discountPercent = document.createElement('input');
        discountPercent.type = 'number';
        discountPercent.className = 'table-input';
        discountPercent.min = '0';
        discountPercent.max = '100';
        discountPercent.step = '0.01';
        discountPercent.value = '0';
        cell9.appendChild(discountPercent);

        // Discount Amount (input)
        const cell10 = row.insertCell(10);
        const discountAmount = document.createElement('input');
        discountAmount.type = 'number';
        discountAmount.className = 'table-input';
        discountAmount.min = '0';
        discountAmount.step = '0.01';
        discountAmount.value = '0.00';
        cell10.appendChild(discountAmount);

        // Trade Offer Discount % (input)
        const cell11 = row.insertCell(11);
        const tradeOfferDiscount = document.createElement('input');
        tradeOfferDiscount.type = 'number';
        tradeOfferDiscount.className = 'table-input';
        tradeOfferDiscount.min = '0';
        tradeOfferDiscount.max = '100';
        tradeOfferDiscount.step = '0.01';
        tradeOfferDiscount.value = '0';
        tradeOfferDiscount.addEventListener('input', function() {
            if (!this.value || this.value == '0') {
                tradeOfferAmount.value = '0.00';
            }
        });
        cell11.appendChild(tradeOfferDiscount);

        // Trade Offer Amount (input)
        const cell12 = row.insertCell(12);
        const tradeOfferAmount = document.createElement('input');
        tradeOfferAmount.type = 'number';
        tradeOfferAmount.className = 'table-input';
        tradeOfferAmount.min = '0';
        tradeOfferAmount.step = '0.01';
        tradeOfferAmount.value = '0.00';
        cell12.appendChild(tradeOfferAmount);

        // GST % (input)
        const cell13 = row.insertCell(13);
        const gstPercent = document.createElement('input');
        gstPercent.type = 'number';
        gstPercent.className = 'table-input';
        gstPercent.min = '0';
        gstPercent.max = '100';
        gstPercent.step = '0.01';
        gstPercent.value = '0';
        cell13.appendChild(gstPercent);

        // GST Amount (input)
        const cell14 = row.insertCell(14);
        const gstAmount = document.createElement('input');
        gstAmount.type = 'number';
        gstAmount.className = 'table-input';
        gstAmount.min = '0';
        gstAmount.step = '0.01';
        gstAmount.value = '0.00';
        cell14.appendChild(gstAmount);

        // FOC Qty (input)
        const cell15 = row.insertCell(15);
        const focQty = document.createElement('input');
        focQty.type = 'number';
        focQty.className = 'table-input';
        focQty.min = '0';
        focQty.step = '0.01';
        focQty.value = '0';
        cell15.appendChild(focQty);

        // Apply settings to new row
        const enableCarton = localStorage.getItem('enableCarton') === 'true';
        const enableDozen = localStorage.getItem('enableDozen') === 'true';
        const enableCashDiscountPercent = localStorage.getItem('enableCashDiscountPercent') === 'true';
        const enableCashDiscountAmount = localStorage.getItem('enableCashDiscountAmount') === 'true';
        const enableTradeOfferDiscount = localStorage.getItem('enableTradeOfferDiscount') === 'true';
        const enableTradeOfferAmount = localStorage.getItem('enableTradeOfferAmount') === 'true';
        const enableFOC = localStorage.getItem('enableFOC') === 'true';
        const enableTaxation = localStorage.getItem('enableTaxation') === 'true';

        cell5.style.display = enableCarton ? '' : 'none';
        cell6.style.display = enableDozen ? '' : 'none';
        cell9.style.display = enableCashDiscountPercent ? '' : 'none';
        cell10.style.display = enableCashDiscountAmount ? '' : 'none';
        cell11.style.display = enableTradeOfferDiscount ? '' : 'none';
        cell12.style.display = enableTradeOfferAmount ? '' : 'none';
        cell13.style.display = enableTaxation ? '' : 'none';
        cell14.style.display = enableTaxation ? '' : 'none';
        cell15.style.display = enableFOC ? '' : 'none';

        // Net Amount (readonly)
        const cell16 = row.insertCell(16);
        const netAmount = document.createElement('input');
        netAmount.type = 'text';
        netAmount.className = 'table-input';
        netAmount.readOnly = true;
        netAmount.value = '0.00';
        netAmount.tabIndex = 0;

        // Add tab navigation logic for Net Amount
        netAmount.addEventListener('keydown', function (e) {
            if (e.key === 'Tab' && !e.shiftKey) {
                const codeInput = row.cells[1].querySelector('.item-code');
                if (codeInput.value) {
                    e.preventDefault();
                    const currentRowIndex = row.rowIndex - 1;
                    const nextRowIndex = currentRowIndex + 1;

                    if (nextRowIndex < itemsTable.rows.length) {
                        const nextRow = itemsTable.rows[nextRowIndex];
                        nextRow.cells[1].querySelector('.search-input').focus();
                    } else {
                        addRowDynamic();
                        setTimeout(() => {
                            const newRow = itemsTable.rows[itemsTable.rows.length - 1];
                            newRow.cells[1].querySelector('.search-input').focus();
                        }, 10);
                    }
                } else {
                    e.preventDefault();
                    if (itemsTable.rows.length > 1) {
                        const searchInput = row.cells[1].querySelector('.search-input');
                        if (searchInput.dropdownOptions) {
                            searchInput.dropdownOptions.remove();
                        }
                        row.remove();
                        updateSerialNumbers();
                        updateInvoiceSummary();
                    }
                    document.getElementById('totalDiscountPercent').focus();
                }
            }
        });

        cell16.appendChild(netAmount);

        // Actions (delete button)
        const cell17 = row.insertCell(17);
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '4px';

        const addVariantsBtn = document.createElement('button');
        addVariantsBtn.type = 'button';
        addVariantsBtn.className = 'btn btn-secondary btn-sm';
        addVariantsBtn.innerHTML = '<i class="fas fa-boxes"></i>';
        addVariantsBtn.title = 'Add Variants';
        addVariantsBtn.tabIndex = -1;
        addVariantsBtn.style.display = 'none';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete row';
        deleteBtn.tabIndex = -1;

        actionsDiv.appendChild(addVariantsBtn);
        actionsDiv.appendChild(deleteBtn);
        cell17.appendChild(actionsDiv);

        // Add event listeners for calculations
        qtyInput.addEventListener('input', calculateRow);
        priceInput.addEventListener('input', calculateRow);
        discountPercent.addEventListener('input', calculateRow);
        discountAmount.addEventListener('input', calculateRowFromAmount);
        tradeOfferDiscount.addEventListener('input', calculateRow);
        tradeOfferAmount.addEventListener('input', calculateRowFromTradeOfferAmount);
        gstPercent.addEventListener('input', calculateRow);
        gstAmount.addEventListener('input', calculateRowFromGstAmount);

        // Enter key navigation for faster workflow
        qtyInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                priceInput.focus();
            }
        });

        priceInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Skip to discount if enabled, otherwise go to next row
                const enableCashDiscountPercent = localStorage.getItem('enableCashDiscountPercent') === 'true';
                if (enableCashDiscountPercent) {
                    discountPercent.focus();
                } else {
                    netAmount.focus();
                }
            }
        });

        discountPercent.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                netAmount.focus();
            }
        });

        // Add event listener for delete button
        deleteBtn.addEventListener('click', function () {
            if (itemsTable.rows.length > 1) {
                // Check if this is a parent row with children
                const rowIndex = row.rowIndex - 1;
                const childRows = [];
                for (let i = rowIndex + 1; i < itemsTable.rows.length; i++) {
                    if (itemsTable.rows[i].dataset.parentRowIndex == rowIndex) {
                        childRows.push(itemsTable.rows[i]);
                    } else {
                        break;
                    }
                }

                // Delete child rows first
                childRows.forEach(childRow => childRow.remove());

                // Delete parent row
                row.remove();
                updateSerialNumbers();
                updateInvoiceSummary();
            } else {
                alert('Cannot delete the only row. Add another row first.');
            }
        });

        // Add event listener for variants button
        addVariantsBtn.addEventListener('click', function () {
            openVariantsModal(row);
        });

        function calculateRow() {
            // Delegate to global calculateRowAmounts from pos-add-uom.js
            if (typeof calculateRowAmounts === 'function') {
                // Calculate total quantity from dynamic unit inputs
                const unitInputs = row.querySelectorAll('.unit-input');
                let totalQty = 0;
                unitInputs.forEach(input => {
                    const qty = parseFloat(input.value) || 0;
                    const cf = parseFloat(input.dataset.conversionFactor) || 1;
                    totalQty += qty * cf;
                });
                const price = parseFloat(priceInput.value) || 0;
                calculateRowAmounts(row, totalQty, price);
                return;
            }
            
            // Fallback: old static calculation (should not be used with dynamic UOM)
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountPct = parseFloat(discountPercent.value) || 0;
            const tradeOfferPct = parseFloat(tradeOfferDiscount.value) || 0;
            const gstPct = parseFloat(gstPercent.value) || 0;

            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount amount
            const discountAmt = gross * (discountPct / 100);
            discountAmount.value = discountAmt.toFixed(2);

            // Calculate trade offer amount from percentage + per unit amount * qty
            const afterDiscount = gross - discountAmt;
            const tradeOfferPerUnit = parseFloat(tradeOfferAmount.value) || 0;
            const tradeOfferAmt = (afterDiscount * (tradeOfferPct / 100)) + (tradeOfferPerUnit * qty);
            tradeOfferAmount.value = tradeOfferAmt.toFixed(2);

            // Calculate GST amount based on sales_tax_type and customer tax registration
            const afterTradeOffer = afterDiscount - tradeOfferAmt;
            let gstAmt = 0;

            const customerId = document.getElementById('customerCode').value;
            const customer = customersData.find(c => c.id == customerId);
            const isTaxRegistered = customer && customer.is_sales_tax_registered == 1;

            if (isTaxRegistered) {
                const salesTaxType = row.dataset.salesTaxType || 'TP';

                if (salesTaxType === 'MRP') {
                    // MRP Tax (Tax Inclusive): MRP   (Tax% / (100 + Tax%))   Qty
                    const mrp = parseFloat(row.dataset.productMrp) || 0;
                    if (mrp > 0 && gstPct > 0) {
                        gstAmt = mrp * (gstPct / (100 + gstPct)) * qty;
                    }
                } else if (salesTaxType === 'EXP') {
                    // No tax
                    gstAmt = 0;
                } else {
                    // Trade Price (TP) or default: standard calculation
                    gstAmt = afterTradeOffer * (gstPct / 100);
                }
            }

            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }

        function calculateRowFromAmount() {
            // Delegate to global calculateRowAmounts from pos-add-uom.js
            if (typeof calculateRowAmounts === 'function') {
                // Calculate total quantity from dynamic unit inputs
                const unitInputs = row.querySelectorAll('.unit-input');
                let totalQty = 0;
                unitInputs.forEach(input => {
                    const qty = parseFloat(input.value) || 0;
                    const cf = parseFloat(input.dataset.conversionFactor) || 1;
                    totalQty += qty * cf;
                });
                const price = parseFloat(priceInput.value) || 0;
                calculateRowAmounts(row, totalQty, price);
                return;
            }
            
            // Fallback
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountAmt = parseFloat(discountAmount.value) || 0;

            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount percentage from amount
            const discountPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
            discountPercent.value = discountPct.toFixed(2);

            // Calculate trade offer from percentage
            const tradeOfferPct = parseFloat(tradeOfferDiscount.value) || 0;
            const afterDiscount = gross - discountAmt;
            const tradeOfferAmt = afterDiscount * (tradeOfferPct / 100);
            tradeOfferAmount.value = tradeOfferAmt.toFixed(2);

            // Calculate GST based on sales_tax_type and customer tax registration
            const gstPct = parseFloat(gstPercent.value) || 0;
            const afterTradeOffer = afterDiscount - tradeOfferAmt;
            let gstAmt = 0;

            const customerId = document.getElementById('customerCode').value;
            const customer = customersData.find(c => c.id == customerId);
            const isTaxRegistered = customer && customer.is_sales_tax_registered == 1;

            if (isTaxRegistered) {
                const salesTaxType = row.dataset.salesTaxType || 'TP';

                if (salesTaxType === 'MRP') {
                    const mrp = parseFloat(row.dataset.productMrp) || 0;
                    if (mrp > 0 && gstPct > 0) {
                        gstAmt = mrp * (gstPct / (100 + gstPct)) * qty;
                    }
                } else if (salesTaxType === 'EXP') {
                    gstAmt = 0;
                } else {
                    gstAmt = afterTradeOffer * (gstPct / 100);
                }
            }

            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }

        function calculateRowFromTradeOfferAmount() {
            // Delegate to global calculateRowAmounts from pos-add-uom.js
            if (typeof calculateRowAmounts === 'function') {
                // Calculate total quantity from dynamic unit inputs
                const unitInputs = row.querySelectorAll('.unit-input');
                let totalQty = 0;
                unitInputs.forEach(input => {
                    const qty = parseFloat(input.value) || 0;
                    const cf = parseFloat(input.dataset.conversionFactor) || 1;
                    totalQty += qty * cf;
                });
                const price = parseFloat(priceInput.value) || 0;
                calculateRowAmounts(row, totalQty, price);
                return;
            }
            
            // Fallback
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountPct = parseFloat(discountPercent.value) || 0;
            const tradeOfferAmt = parseFloat(tradeOfferAmount.value) || 0;

            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount amount
            const discountAmt = gross * (discountPct / 100);
            discountAmount.value = discountAmt.toFixed(2);

            // Calculate trade offer percentage from amount
            const afterDiscount = gross - discountAmt;
            const tradeOfferPct = afterDiscount > 0 ? (tradeOfferAmt / afterDiscount) * 100 : 0;
            tradeOfferDiscount.value = tradeOfferPct.toFixed(2);

            // Calculate GST based on sales_tax_type and customer tax registration
            const gstPct = parseFloat(gstPercent.value) || 0;
            const afterTradeOffer = afterDiscount - tradeOfferAmt;
            let gstAmt = 0;

            const customerId = document.getElementById('customerCode').value;
            const customer = customersData.find(c => c.id == customerId);
            const isTaxRegistered = customer && customer.is_sales_tax_registered == 1;

            if (isTaxRegistered) {
                const salesTaxType = row.dataset.salesTaxType || 'TP';

                if (salesTaxType === 'MRP') {
                    const mrp = parseFloat(row.dataset.productMrp) || 0;
                    if (mrp > 0 && gstPct > 0) {
                        gstAmt = mrp * (gstPct / (100 + gstPct)) * qty;
                    }
                } else if (salesTaxType === 'EXP') {
                    gstAmt = 0;
                } else {
                    gstAmt = afterTradeOffer * (gstPct / 100);
                }
            }

            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }

        function calculateRowFromGstAmount() {
            // Delegate to global calculateRowAmounts from pos-add-uom.js
            if (typeof calculateRowAmounts === 'function') {
                // Calculate total quantity from dynamic unit inputs
                const unitInputs = row.querySelectorAll('.unit-input');
                let totalQty = 0;
                unitInputs.forEach(input => {
                    const qty = parseFloat(input.value) || 0;
                    const cf = parseFloat(input.dataset.conversionFactor) || 1;
                    totalQty += qty * cf;
                });
                const price = parseFloat(priceInput.value) || 0;
                calculateRowAmounts(row, totalQty, price);
                return;
            }
            
            // Fallback
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountPct = parseFloat(discountPercent.value) || 0;
            const tradeOfferPct = parseFloat(tradeOfferDiscount.value) || 0;
            const gstAmt = parseFloat(gstAmount.value) || 0;

            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount amount
            const discountAmt = gross * (discountPct / 100);
            discountAmount.value = discountAmt.toFixed(2);

            // Calculate trade offer amount
            const afterDiscount = gross - discountAmt;
            const tradeOfferAmt = afterDiscount * (tradeOfferPct / 100);
            tradeOfferAmount.value = tradeOfferAmt.toFixed(2);

            // Calculate GST percentage from amount
            const afterTradeOffer = afterDiscount - tradeOfferAmt;
            const gstPct = afterTradeOffer > 0 ? (gstAmt / afterTradeOffer) * 100 : 0;
            gstPercent.value = gstPct.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }
    }

    // Initialize dropdown for table rows
    function initTableDropdown(container) {
        const searchInput = container.querySelector('.search-input');
        const optionsContainer = searchInput.dropdownOptions;
        const hiddenInput = container.querySelector('input[type="hidden"]');
        const row = container.closest('tr');
        let selectedIndex = -1;

        // Show options when clicking on search input
        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();

            // Position dropdown relative to input
            const rect = searchInput.getBoundingClientRect();
            optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
            optionsContainer.style.left = rect.left + 'px';
            optionsContainer.style.width = rect.width + 'px';
            optionsContainer.style.display = 'block';

            filterOptions();
        });

        // Show options when input receives focus (tab navigation)
        searchInput.addEventListener('focus', function (e) {
            // Position dropdown relative to input
            const rect = searchInput.getBoundingClientRect();
            optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
            optionsContainer.style.left = rect.left + 'px';
            optionsContainer.style.width = rect.width + 'px';
            optionsContainer.style.display = 'block';

            filterOptions();
        });

        // Auto-search on typing for speed
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterOptions();
                // Auto-select first match if only one result
                const visibleOptions = Array.from(optionsContainer.getElementsByClassName('dropdown-option'))
                    .filter(option => option.style.display !== 'none');
                if (visibleOptions.length === 1) {
                    selectedIndex = 0;
                    updateSelection(visibleOptions);
                }
            }, 100);
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function (e) {
            const visibleOptions = Array.from(optionsContainer.getElementsByClassName('dropdown-option'))
                .filter(option => option.style.display !== 'none');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, visibleOptions.length - 1);
                updateSelection(visibleOptions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(visibleOptions);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && visibleOptions[selectedIndex]) {
                    visibleOptions[selectedIndex].click();
                } else if (visibleOptions.length > 0) {
                    visibleOptions[0].click();
                }
            }
        });

        function updateSelection(visibleOptions) {
            visibleOptions.forEach((option, index) => {
                option.style.backgroundColor = index === selectedIndex ? '#1a6cdc' : ''; option.style.color = index === selectedIndex ? 'white' : '';
            });
        }

        // Filter options based on search input
        searchInput.addEventListener('input', function () {
            selectedIndex = -1;
            filterOptions();
        });

        // Select option
        optionsContainer.addEventListener('click', async function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const displayText = e.target.textContent;
                const mrp = e.target.getAttribute('data-mrp');
                const tp = e.target.getAttribute('data-tp');
                const unitId = e.target.getAttribute('data-unit');

                searchInput.value = displayText;
                hiddenInput.value = value;

                const product = dataCache.products.get(parseInt(value));
                if (product) {
                    row.dataset.cartonConversion = product.carton_conversion || 0;
                    row.dataset.stockAffects = product.stock_affects || 0;
                    row.dataset.invoiceAffects = product.invoice_affects || 1;
                    row.dataset.productId = value;
                    row.dataset.productMrp = product.mrp || 0;
                    row.dataset.salesTaxType = product.sales_tax_type || 'TP';

                    // Show Add Variants button if product has children
                    checkAndShowVariantsButton(row, value);
                }

                // Fetch price from rate_list_items or fallback to product
                const customerId = document.getElementById('customerCode').value;
                const priceType = document.querySelector('input[name="priceType"]:checked')?.value || 'tp';
                let price = priceType === 'mrp' ? (parseFloat(mrp) || 0) : (parseFloat(tp) || 0);
                let rateListQty = 0;
                let focQty = 0;
                let tradeOffer = 0;

                if (customerId) {
                    try {
                        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-price.php?customer_id=${customerId}&product_id=${value}`);
                        const data = await response.json();
                        if (data.success) {
                            // Only use rate list price if in TP mode
                            if (priceType === 'tp') {
                                price = data.price;
                            }
                            rateListQty = data.quantity;
                            focQty = data.foc_quantity;
                            tradeOffer = data.trade_offer;
                        }
                    } catch (error) {
                        console.error('Error fetching price:', error);
                    }
                }

                row.cells[7].querySelector('input').value = price;
                if (unitId) {
                    row.cells[2].querySelector('select').value = unitId;
                    row.cells[2].querySelector('select').dataset.previousValue = unitId;
                }

                setTimeout(() => {
                    row.cells[4].querySelector('input').select();
                }, 10);

                const enableCashDiscountPercent = localStorage.getItem('enableCashDiscountPercent') === 'true';
                const enableTradeOfferDiscount = localStorage.getItem('enableTradeOfferDiscount') === 'true';
                const enableFOC = localStorage.getItem('enableFOC') === 'true';
                const enableTaxation = localStorage.getItem('enableTaxation') === 'true';

                if (product) {
                    if (enableCashDiscountPercent && product.default_discount) {
                        row.cells[9].querySelector('input').value = product.default_discount;
                    }
                    if (enableTradeOfferDiscount && product.trade_offer_discount) {
                        row.cells[11].querySelector('input').value = product.trade_offer_discount;
                    }
                    if (enableTaxation && product.sales_tax) {
                        row.cells[13].querySelector('input').value = product.sales_tax;
                    }
                }

                // Set trade offer amount from rate list
                const enableTradeOfferAmount = localStorage.getItem('enableTradeOfferAmount') === 'true';
                if (enableTradeOfferAmount && tradeOffer > 0) {
                    row.cells[12].querySelector('input').value = tradeOffer;
                }

                // Store rate list data for FOC calculation
                if (enableFOC) {
                    row.dataset.rateListQty = rateListQty;
                    row.dataset.rateListFoc = focQty;
                }

                optionsContainer.style.display = 'none';
                
                // Load price history and stock
                if (customerId) {
                    loadPriceHistory(value);
                }
                loadProductStock(value);
            }
        });

        // Hide options when clicking outside
        document.addEventListener('click', function () {
            optionsContainer.style.display = 'none';
        });

        // Filter options function
        function filterOptions() {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const text = option.textContent.toLowerCase();

                if (text.includes(searchTerm)) {
                    option.style.display = 'block';
                    option.style.backgroundColor = '';
                } else {
                    option.style.display = 'none';
                }
            }
        }
    }

    // Update serial numbers after row deletion
    function updateSerialNumbersLocal() {
        updateSerialNumbers();
    }

    // Update invoice summary
    function updateInvoiceSummary() {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            let totalBill = 0;
            let totalQty = 0;
            let totalPcs = 0;
            let totalCtn = 0;
            let totalDz = 0;
            let totalSalePrice = 0;
            let totalGrossAmount = 0;
            let totalDiscountAmountItems = 0;
            let totalTradeOfferAmount = 0;
            let totalGstAmount = 0;
            let totalFocQty = 0;
            let totalNetAmountItems = 0;
            const rows = itemsTable.rows;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                // Skip child rows if invoice_affects = 0
                if (row.classList.contains('child-row') && row.dataset.invoiceAffects == 0) {
                    continue;
                }

                // Skip parent rows if invoice_affects = 0
                if (!row.classList.contains('child-row') && row.dataset.invoiceAffects == 0) {
                    continue;
                }

                const qtyInput = rows[i].cells[3].querySelector('input');
                const pcsInput = rows[i].cells[4]?.querySelector('input');
                const ctnInput = rows[i].cells[5]?.querySelector('input');
                const dzInput = rows[i].cells[6]?.querySelector('input');
                const salePriceInput = rows[i].cells[7]?.querySelector('input');
                const grossAmountInput = rows[i].cells[8]?.querySelector('input');
                const discountAmountInput = rows[i].cells[10]?.querySelector('input');
                const tradeOfferAmountInput = rows[i].cells[12]?.querySelector('input');
                const gstAmountInput = rows[i].cells[14]?.querySelector('input');
                const focQtyInput = rows[i].cells[15]?.querySelector('input');
                const netAmountInput = rows[i].cells[16]?.querySelector('input');

                if (netAmountInput && !row.classList.contains('child-row')) {
                    totalQty += parseFloat(qtyInput?.value) || 0;
                    totalPcs += parseFloat(pcsInput?.value) || 0;
                    totalCtn += parseFloat(ctnInput?.value) || 0;
                    totalDz += parseFloat(dzInput?.value) || 0;
                    totalSalePrice += parseFloat(salePriceInput?.value) || 0;
                    totalGrossAmount += parseFloat(grossAmountInput?.value) || 0;
                    totalDiscountAmountItems += parseFloat(discountAmountInput?.value) || 0;
                    totalTradeOfferAmount += parseFloat(tradeOfferAmountInput?.value) || 0;
                    totalGstAmount += parseFloat(gstAmountInput?.value) || 0;
                    totalFocQty += parseFloat(focQtyInput?.value) || 0;
                    totalNetAmountItems += parseFloat(netAmountInput?.value) || 0;
                    totalBill += parseFloat(netAmountInput?.value) || 0;
                }
            }

            // Batch DOM updates
            document.getElementById('totalQty').textContent = totalQty.toFixed(2);
            document.getElementById('totalPcs').textContent = totalPcs.toFixed(2);
            document.getElementById('totalCtn').textContent = totalCtn.toFixed(2);
            document.getElementById('totalDz').textContent = totalDz.toFixed(2);
            document.getElementById('totalSalePrice').textContent = totalSalePrice.toFixed(2);
            document.getElementById('totalGrossAmount').textContent = totalGrossAmount.toFixed(2);
            document.getElementById('totalDiscountAmountItems').textContent = totalDiscountAmountItems.toFixed(2);
            document.getElementById('totalTradeOfferAmount').textContent = totalTradeOfferAmount.toFixed(2);
            document.getElementById('totalGstAmount').textContent = totalGstAmount.toFixed(2);
            document.getElementById('totalFocQty').textContent = totalFocQty.toFixed(2);
            document.getElementById('totalNetAmountItems').textContent = totalNetAmountItems.toFixed(2);
            document.getElementById('totalBill').textContent = totalNetAmountItems.toFixed(2);

            let invoiceDiscountAmount = parseFloat(document.getElementById('totalDiscountAmount').value) || 0;
            const invoiceDiscountPercent = parseFloat(document.getElementById('totalDiscountPercent').value) || 0;

            if (invoiceDiscountPercent > 0) {
                invoiceDiscountAmount = totalNetAmountItems * (invoiceDiscountPercent / 100);
                document.getElementById('totalDiscountAmount').value = invoiceDiscountAmount.toFixed(2);
            }

            const afterDiscount = totalNetAmountItems - invoiceDiscountAmount;

            // GST calculation - skip if elements don't exist
            const shippingFeesEl = document.getElementById('shippingFees');
            const shippingFees = shippingFeesEl ? parseFloat(shippingFeesEl.value) || 0 : 0;
            const netAmount = afterDiscount + shippingFees;

            const netAmountEl = document.getElementById('netAmount');
            if (netAmountEl) netAmountEl.textContent = netAmount.toFixed(2);

            // Calculate withholding tax
            const withholdingTaxPercent = parseFloat(document.getElementById('withholdingTaxPercent')?.value) || 0;
            const withholdingTaxAmount = netAmount * (withholdingTaxPercent / 100);
            const withholdingTaxAmountEl = document.getElementById('withholdingTaxAmount');
            const withholdingTaxPercentItem = document.getElementById('withholdingTaxPercent')?.closest('.summary-item');
            const withholdingTaxAmountItem = withholdingTaxAmountEl?.closest('.summary-item');
            const netReceivableEl = document.getElementById('netReceivable');
            const netReceivableItem = netReceivableEl?.closest('.summary-item');

            if (withholdingTaxPercent > 0) {
                // Show WHT fields
                if (withholdingTaxPercentItem) withholdingTaxPercentItem.style.display = '';
                if (withholdingTaxAmountItem) withholdingTaxAmountItem.style.display = '';
                if (netReceivableItem) netReceivableItem.style.display = '';

                if (withholdingTaxAmountEl) {
                    withholdingTaxAmountEl.textContent = withholdingTaxAmount.toFixed(2);
                }

                const netReceivable = netAmount - withholdingTaxAmount;
                if (netReceivableEl) {
                    netReceivableEl.textContent = netReceivable.toFixed(2);
                }
            } else {
                // Hide WHT fields when 0
                if (withholdingTaxPercentItem) withholdingTaxPercentItem.style.display = 'none';
                if (withholdingTaxAmountItem) withholdingTaxAmountItem.style.display = 'none';
                if (netReceivableItem) netReceivableItem.style.display = 'none';
            }

            // Auto-populate Amount Paid if auto mode is selected
            const autoFillYes = document.querySelector('input[name="autoFillAmountPaid"][value="yes"]');
            const amountPaidInput = document.getElementById('amountPaid');
            if (amountPaidInput && autoFillYes && autoFillYes.checked) {
                amountPaidInput.value = netAmount.toFixed(2);
            }

            updateRemainingBalance();
            checkCreditLimit();
        });
    }

    function checkCreditLimit() {
        const customerCode = document.getElementById('customerCode');
        const creditLimit = parseFloat(customerCode.getAttribute('data-credit-limit')) || 0;
        if (creditLimit === 0) return;

        const previousBalance = parseFloat(document.getElementById('previousBalance').value.replace(/[^0-9.-]/g, '')) || 0;
        const netAmount = parseFloat(document.getElementById('netAmount').textContent) || 0;
        const total = previousBalance + netAmount;

        if (total >= creditLimit) {
            alert(`Warning: Total amount (${total.toFixed(2)}) exceeds or equals customer credit limit (${creditLimit.toFixed(2)})`);
        }
    }

    // Update remaining balance
    function updateRemainingBalance() {
        const netAmount = parseFloat(document.getElementById('netAmount').textContent) || 0;
        const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
        const remainingBalance = netAmount - amountPaid;
        document.getElementById('remainingBalance').value = remainingBalance.toFixed(2);
    }

    // Add event listener for total discount percent
    const totalDiscountPercent = document.getElementById('totalDiscountPercent');
    if (totalDiscountPercent) {
        totalDiscountPercent.addEventListener('input', function() {
            if (!this.value || this.value == '0') {
                totalDiscountAmount.value = '0.00';
            }
            updateInvoiceSummary();
        });
    }

    // Add event listener for total discount amount
    const totalDiscountAmount = document.getElementById('totalDiscountAmount');
    if (totalDiscountAmount) {
        totalDiscountAmount.addEventListener('input', updateInvoiceSummaryFromAmount);
    }

    // Add event listener for total GST percent
    const totalGstPercent = document.getElementById('totalGstPercent');
    if (totalGstPercent) {
        totalGstPercent.addEventListener('input', updateInvoiceSummary);
    }

    // Add event listener for total GST amount
    const totalGstAmountSummary = document.getElementById('totalGstAmountSummary');
    if (totalGstAmountSummary) {
        totalGstAmountSummary.addEventListener('input', updateInvoiceSummaryFromGstAmount);
    }

    // Add event listener for shipping fees
    const shippingFees = document.getElementById('shippingFees');
    if (shippingFees) {
        shippingFees.addEventListener('input', updateInvoiceSummary);
    }

    // Add event listener for withholding tax percent
    const withholdingTaxPercentEl = document.getElementById('withholdingTaxPercent');
    if (withholdingTaxPercentEl) {
        withholdingTaxPercentEl.addEventListener('input', updateInvoiceSummary);
    }

    // Add event listener for amount paid
    const amountPaid = document.getElementById('amountPaid');
    if (amountPaid) {
        amountPaid.addEventListener('input', updateRemainingBalance);
    }

    // Copy Net Amount to Amount Paid button
    const copyNetAmountBtn = document.getElementById('copyNetAmountBtn');
    if (copyNetAmountBtn) {
        copyNetAmountBtn.addEventListener('click', function() {
            const netAmount = parseFloat(document.getElementById('netAmount').textContent) || 0;
            document.getElementById('amountPaid').value = netAmount.toFixed(2);
            updateRemainingBalance();
        });
    }

    // Auto-fill Amount Paid radio buttons
    const autoFillRadios = document.querySelectorAll('input[name="autoFillAmountPaid"]');
    autoFillRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                const netAmount = parseFloat(document.getElementById('netAmount').textContent) || 0;
                document.getElementById('amountPaid').value = netAmount.toFixed(2);
                updateRemainingBalance();
            }
        });
    });

    // Add event listener for payment method to show/hide bank account
    const paymentMethod = document.getElementById('paymentMethod');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function () {
            const bankAccountContainer = document.getElementById('bankAccountContainer');
            if (bankAccountContainer) {
                if (this.value === 'bank_transfer') {
                    bankAccountContainer.style.display = 'flex';
                } else {
                    bankAccountContainer.style.display = 'none';
                    const bankAccount = document.getElementById('bankAccount');
                    if (bankAccount) bankAccount.value = '';
                }
            }
        });
    }

    // Update invoice summary from discount amount
    function updateInvoiceSummaryFromAmount() {
        let totalBill = 0;
        const rows = itemsTable.rows;

        for (let i = 0; i < rows.length; i++) {
            const netAmountInput = rows[i].cells[8].querySelector('input');
            if (netAmountInput) {
                totalBill += parseFloat(netAmountInput.value) || 0;
            }
        }

        document.getElementById('totalBill').textContent = totalBill.toFixed(2);

        const discountAmount = parseFloat(document.getElementById('totalDiscountAmount').value) || 0;
        const discountPercent = totalBill > 0 ? (discountAmount / totalBill) * 100 : 0;
        const netAmount = totalBill - discountAmount;

        document.getElementById('totalDiscountPercent').value = discountPercent.toFixed(2);
        document.getElementById('netAmount').textContent = netAmount.toFixed(2);

        updateRemainingBalance();
    }

    // Validate form before submission
    function validateFormLocal() {
        return validateForm();
    }



    // Reset form with confirmation
    function resetForm() {
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            performReset();
        }
    }

    // Silent reset without confirmation
    function performReset() {
        form.reset();

        // Clear variant selections
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('variants_')) {
                localStorage.removeItem(key);
            }
        });

        // Clear items table
        while (itemsTable.rows.length > 0) {
            itemsTable.deleteRow(0);
        }

        // Add one empty row
        addRowDynamic();

        // Reset summary
        const totalBill = document.getElementById('totalBill');
        const totalDiscountAmount = document.getElementById('totalDiscountAmount');
        const netAmount = document.getElementById('netAmount');
        
        if (totalBill) totalBill.textContent = '0.00';
        if (totalDiscountAmount) totalDiscountAmount.value = '0.00';
        if (netAmount) netAmount.textContent = '0.00';

        // Set default date to today
        const saleDate = document.getElementById('saleDate');
        if (saleDate) saleDate.value = today;

        // Reset searchable dropdowns
        const customerCodeSearch = document.getElementById('customerCodeSearch');
        const customerCode = document.getElementById('customerCode');
        const branchSearch = document.getElementById('branchSearch');
        const branch = document.getElementById('branch');
        const fuelingStationSearch = document.getElementById('fuelingStationSearch');
        const fuelingStation = document.getElementById('fuelingStation');
        
        if (customerCodeSearch) customerCodeSearch.value = '';
        if (customerCode) customerCode.value = '';
        if (branchSearch) branchSearch.value = '';
        if (branch) branch.value = '';
        if (fuelingStationSearch) fuelingStationSearch.value = '';
        if (fuelingStation) fuelingStation.value = '';

        // Reset currency to base currency
        loadCurrencies();

        // Reset currency symbols
        setTimeout(updateCurrencySymbols, 100);
    }

    // Modal button events
    const printLaterBtn = document.getElementById('printLaterBtn');
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    
    if (printLaterBtn) {
        printLaterBtn.addEventListener('click', function () {
            const modal = document.getElementById('successModal');
            if (modal) modal.style.display = 'none';
            performReset();
        });
    }

    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', function () {
            const modal = document.getElementById('successModal');
            if (modal) modal.style.display = 'none';
            const invoiceId = isEditMode ? editId : window.lastInvoiceId;
            showPrintOptions(invoiceId);
        });
    }

    // Print options modal
    function showPrintOptions(invoiceId) {
        const savedChoice = localStorage.getItem('pos_print_preference');
        if (savedChoice) {
            printInvoice(invoiceId, savedChoice);
            performReset();
            return;
        }

        document.getElementById('printOptionsModal').style.display = 'flex';

        document.getElementById('printFullBtn').onclick = function () {
            if (document.getElementById('rememberPrintChoice').checked) {
                localStorage.setItem('pos_print_preference', 'full');
            }
            document.getElementById('printOptionsModal').style.display = 'none';
            printInvoice(invoiceId, 'full');
            performReset();
        };

        document.getElementById('printThermalBtn').onclick = function () {
            if (document.getElementById('rememberPrintChoice').checked) {
                localStorage.setItem('pos_print_preference', 'thermal');
            }
            document.getElementById('printOptionsModal').style.display = 'none';
            printInvoice(invoiceId, 'thermal');
            performReset();
        };
    }

    function printInvoice(invoiceId, type) {
        if (invoiceId) {
            const url = type === 'full' ? `invoice-print.php?id=${invoiceId}` : `thermal-print.php?id=${invoiceId}`;
            window.open(url, '_blank');
        }
    }

    // Hide modals when clicking outside
    document.getElementById('draftsModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });

    // Delete draft function
    window.deleteDraft = async function (draftId) {
        if (!confirm('Are you sure you want to delete this draft invoice?')) {
            return;
        }

        try {
            const response = await fetch(`../../../../server/api/sale/pos_invoice/pos-delete.php?id=${draftId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                alert('Draft invoice deleted successfully!');
                loadDraftInvoices();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Error deleting draft: ' + error.message);
        }
    };

    // Enable/disable preference section
    const enableRememberPrint = document.getElementById('enableRememberPrint');
    if (enableRememberPrint) {
        enableRememberPrint.addEventListener('change', function () {
            const prefSection = document.getElementById('printPreferenceSection');
            prefSection.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Close print settings
    document.getElementById('closePrintSettingsBtn').addEventListener('click', function () {
        document.getElementById('printSettingsModal').style.display = 'none';
    });

    // Save print settings
    document.getElementById('savePrintSettingsBtn').addEventListener('click', function () {
        const enableCheckbox = document.getElementById('enableRememberPrint');
        const prefSelect = document.getElementById('printPreference');
        const totalsLayout = document.querySelector('input[name="totalsLayout"]:checked').value;

        if (enableCheckbox.checked) {
            localStorage.setItem('pos_print_preference', prefSelect.value);
            alert('Print settings saved successfully!');
        } else {
            localStorage.removeItem('pos_print_preference');
            alert('Remember print choice disabled!');
        }

        localStorage.setItem('totalsLayout', totalsLayout);

        // Save custom labels
        localStorage.setItem('labelTotalBill', document.getElementById('labelTotalBill').value || 'Total Bill');
        localStorage.setItem('labelDiscountAmount', document.getElementById('labelDiscountAmount').value || 'Discount Amount');
        localStorage.setItem('labelShippingFees', document.getElementById('labelShippingFees').value || 'Shipping Fees');
        localStorage.setItem('labelNetAmount', document.getElementById('labelNetAmount').value || 'Net Amount');
        localStorage.setItem('labelAmountPaid', document.getElementById('labelAmountPaid').value || 'Amount Paid');
        localStorage.setItem('labelPaymentMethod', document.getElementById('labelPaymentMethod').value || 'Payment Method');
        localStorage.setItem('labelRemainingBalance', document.getElementById('labelRemainingBalance').value || 'Remaining Balance');

        // Save print field visibility
        localStorage.setItem('hidePrintCustomerPhone', document.getElementById('hidePrintCustomerPhone').checked);
        localStorage.setItem('hidePrintCustomerEmail', document.getElementById('hidePrintCustomerEmail').checked);
        localStorage.setItem('hidePrintCustomerAddress', document.getElementById('hidePrintCustomerAddress').checked);
        localStorage.setItem('hidePrintPreviousBalance', document.getElementById('hidePrintPreviousBalance').checked);
        localStorage.setItem('hidePrintBranch', document.getElementById('hidePrintBranch').checked);
        localStorage.setItem('hidePrintCurrency', document.getElementById('hidePrintCurrency').checked);
        localStorage.setItem('hidePrintSalesOfficer', document.getElementById('hidePrintSalesOfficer').checked);
        localStorage.setItem('hidePrintBiltyNo', document.getElementById('hidePrintBiltyNo').checked);
        localStorage.setItem('hidePrintTransport', document.getElementById('hidePrintTransport').checked);
        localStorage.setItem('hidePrintRemarks', document.getElementById('hidePrintRemarks').checked);
        localStorage.setItem('hidePrintTotalBill', document.getElementById('hidePrintTotalBill').checked);
        localStorage.setItem('hidePrintNetAmount', document.getElementById('hidePrintNetAmount').checked);
        localStorage.setItem('hidePrintPaymentMethod', document.getElementById('hidePrintPaymentMethod').checked);
        localStorage.setItem('hidePrintAmountPaid', document.getElementById('hidePrintAmountPaid').checked);
        localStorage.setItem('hidePrintRemainingBalance', document.getElementById('hidePrintRemainingBalance').checked);
        localStorage.setItem('hidePrintAmountInWords', document.getElementById('hidePrintAmountInWords').checked);
        localStorage.setItem('hidePrintSignatures', document.getElementById('hidePrintSignatures').checked);
        localStorage.setItem('hidePrintGeneratedBy', document.getElementById('hidePrintGeneratedBy').checked);
        localStorage.setItem('hidePrintGeneratedOn', document.getElementById('hidePrintGeneratedOn').checked);

        document.getElementById('printSettingsModal').style.display = 'none';
    });

    // Hide print settings modal when clicking outside
    document.getElementById('printSettingsModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
            document.getElementById('childDisplayModal').style.display = 'none';
        }
    });

    // Child display modal handlers
    document.getElementById('closeChildDisplayBtn').addEventListener('click', function () {
        document.getElementById('childDisplayModal').style.display = 'none';
    });

    document.getElementById('saveChildDisplayBtn').addEventListener('click', function () {
        const mode = document.querySelector('input[name="childDisplay"]:checked').value;
        localStorage.setItem('childDisplayMode', mode);
        alert('Child display mode saved!');
        document.getElementById('childDisplayModal').style.display = 'none';
    });

    document.getElementById('childDisplayModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}

// Print Customization
const defaultColumns = [
    { id: 'serial', label: '#', fixed: false },
    { id: 'product', label: 'Product', fixed: false },
    { id: 'unit', label: 'Unit', fixed: false },
    { id: 'pcs', label: 'Pcs', fixed: false },
    { id: 'ctn', label: 'Ctn', fixed: false },
    { id: 'dz', label: 'Dz', fixed: false },
    { id: 'qty', label: 'Qty', fixed: false },
    { id: 'price', label: 'Unit Price', fixed: false },
    { id: 'gross', label: 'Gross Amt', fixed: false },
    { id: 'disc_pct', label: 'Disc %', fixed: false },
    { id: 'disc_amt', label: 'Disc Amt', fixed: false },
    { id: 'to_pct', label: 'T.O %', fixed: false },
    { id: 'to_amt', label: 'T.O Amt', fixed: false },
    { id: 'gst_pct', label: 'GST %', fixed: false },
    { id: 'gst_amt', label: 'GST Amt', fixed: false },
    { id: 'foc', label: 'FOC Qty', fixed: false },
    { id: 'net', label: 'Net Amt', fixed: false }
];

function initPrintCustomization() {
    document.getElementById('printCustomizationBtn').addEventListener('click', function () {
        loadPrintCustomization();
        document.getElementById('printCustomizationModal').style.display = 'flex';
    });

    document.getElementById('closePrintCustomizationBtn').addEventListener('click', function () {
        document.getElementById('printCustomizationModal').style.display = 'none';
    });

    document.getElementById('savePrintCustomizationBtn').addEventListener('click', savePrintCustomization);
    document.getElementById('resetPrintCustomizationBtn').addEventListener('click', resetPrintCustomization);

    document.getElementById('printCustomizationModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}

function loadPrintCustomization() {
    const saved = localStorage.getItem('printColumnCustomization');
    let columns = saved ? JSON.parse(saved) : [...defaultColumns];

    // Merge with defaults to add any new columns
    const columnIds = columns.map(c => c.id);
    defaultColumns.forEach(defCol => {
        if (!columnIds.includes(defCol.id)) {
            // Insert new column at appropriate position
            const defIndex = defaultColumns.findIndex(c => c.id === defCol.id);
            columns.splice(defIndex, 0, { ...defCol });
        }
    });

    const container = document.getElementById('columnsList');
    container.innerHTML = '';

    columns.forEach((col, index) => {
        const item = document.createElement('div');
        item.className = 'column-item';
        item.draggable = true;
        item.dataset.index = index;
        item.dataset.id = col.id;
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 16px;
            margin-bottom: 10px;
            background: var(--surface-0);
            border: 2px solid var(--border-default);
            border-radius: var(--radius);
            cursor: grab;
            transition: all 0.2s;
        `;

        item.innerHTML = `
            <i class="fas fa-grip-vertical" style="color: var(--subtext); font-size: 16px;"></i>
            <input type="checkbox" ${col.visible !== false ? 'checked' : ''} 
                   style="width: auto; cursor: pointer;" 
                   data-col-id="${col.id}" class="col-visibility-toggle">
            <input type="text" value="${col.label}" 
                   style="flex: 1; padding: 10px 14px; border: 1.5px solid var(--border-default); border-radius: 6px; background: var(--surface-0); font-size: 14px; font-weight: 500;"
                   data-col-id="${col.id}" placeholder="Column Label" class="col-label-input">
        `;

        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        const labelInput = item.querySelector('.col-label-input');
        labelInput.addEventListener('input', updatePreview);

        const visibilityToggle = item.querySelector('.col-visibility-toggle');
        visibilityToggle.addEventListener('change', updatePreview);

        container.appendChild(item);
    });

    updatePreview();
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.4';
    this.style.cursor = 'grabbing';
    this.style.transform = 'scale(1.02)';
}

function handleDragOver(e) {
    e.preventDefault();
    if (this !== draggedElement) {
        this.style.borderColor = 'var(--primary)';
        this.style.borderWidth = '2px';
    }
    return false;
}

function handleDrop(e) {
    e.stopPropagation();

    // Reset border
    this.style.borderColor = 'var(--border-default)';
    this.style.borderWidth = '2px';

    if (draggedElement !== this) {
        const container = document.getElementById('columnsList');
        const allItems = [...container.children];
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(this);

        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedElement, this);
        }

        updatePreview();
    }

    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.style.cursor = 'grab';
    this.style.transform = 'scale(1)';

    // Reset all borders
    document.querySelectorAll('.column-item').forEach(item => {
        item.style.borderColor = 'var(--border-default)';
        item.style.borderWidth = '2px';
    });
}

function updatePreview() {
    const container = document.getElementById('columnsList');
    const items = container.querySelectorAll('.column-item');
    const previewHeader = document.getElementById('previewHeader');

    previewHeader.innerHTML = '';
    items.forEach(item => {
        const labelInput = item.querySelector('.col-label-input');
        const visibilityToggle = item.querySelector('.col-visibility-toggle');

        if (visibilityToggle.checked) {
            const th = document.createElement('th');
            th.textContent = labelInput.value;
            th.style.cssText = 'padding: 12px; border: 1px solid var(--border-default); font-size: 13px; font-weight: 600; white-space: nowrap;';
            previewHeader.appendChild(th);
        }
    });
}

function savePrintCustomization() {
    const container = document.getElementById('columnsList');
    const items = container.querySelectorAll('.column-item');
    const columns = [];

    items.forEach(item => {
        const labelInput = item.querySelector('.col-label-input');
        const visibilityToggle = item.querySelector('.col-visibility-toggle');
        const colId = labelInput.dataset.colId;
        const col = defaultColumns.find(c => c.id === colId);
        columns.push({
            id: colId,
            label: labelInput.value,
            fixed: col.fixed,
            visible: visibilityToggle.checked,
            width: col.width
        });
    });

    localStorage.setItem('printColumnCustomization', JSON.stringify(columns));
    alert('Print customization saved successfully!');
    document.getElementById('printCustomizationModal').style.display = 'none';
}

function resetPrintCustomization() {
    if (confirm('Reset to default column order and labels?')) {
        localStorage.removeItem('printColumnCustomization');
        loadPrintCustomization();
        alert('Reset to default successfully!');
    }
}

initPrintCustomization();;


// Save as Draft button event
const saveDraftBtnElement = document.getElementById('saveDraftBtn');
if (saveDraftBtnElement) {
    saveDraftBtnElement.addEventListener('click', function () {
        if (validateForm()) {
            saveInvoice('Draft');
        }
    });
}

// Modified saveInvoice to accept status parameter
function saveInvoice(status = 'Posted') {
    const saveBtn = document.getElementById('saveBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');

    if (saveBtn) saveBtn.disabled = true;
    if (saveDraftBtn) saveDraftBtn.disabled = true;

    if (status === 'Draft' && saveDraftBtn) {
        saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    } else if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    // Clear variant selections on save
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('variants_')) {
            localStorage.removeItem(key);
        }
    });

    const formData = {
        saleDate: document.getElementById('saleDate').value,
        customerId: document.getElementById('customerCode').value,
        subAccountId: document.getElementById('subAccount').value || null,
        companyId: document.getElementById('company').value || null,
        branchId: document.getElementById('branch').value,
        currencyId: document.getElementById('currency').value,
        saleOrderId: document.getElementById('saleOrder').value || null,
        previousBalance: document.getElementById('previousBalance')?.value || '0.00',
        salesOfficerId: document.getElementById('salesOfficer')?.value || null,
        supplierManId: document.getElementById('supplierMan')?.value || null,
        biltyNo: document.getElementById('biltyNo')?.value || null,
        transportName: document.getElementById('transportName')?.value || null,
        totalBill: parseFloat(document.getElementById('totalBill').textContent),
        totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent')?.value) || 0,
        totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount')?.value),
        netAmount: parseFloat(document.getElementById('netAmount').textContent),
        paymentMethod: document.getElementById('paymentMethod')?.value,
        bankAccountId: document.getElementById('bankAccount')?.value || null,
        amountPaid: parseFloat(document.getElementById('amountPaid')?.value) || 0,
        amountPaidAutoFill: document.querySelector('input[name="autoFillAmountPaid"]:checked')?.value || 'yes',
        remainingBalance: parseFloat(document.getElementById('remainingBalance')?.value) || 0,
        remarks: document.getElementById('remarks')?.value,
        status: status,
        items: []
    };

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isEditMode = editId !== null;

    if (isEditMode) {
        formData.invoice_id = editId;
    }

    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip child rows - they don't have full item data
        if (row.classList.contains('child-row')) {
            const item = {
                productId: row.dataset.productId,
                uomId: row.cells[2].querySelector('select').value,
                quantity: parseFloat(row.cells[3].querySelector('input').value),
                salePrice: 0,
                grossAmount: 0,
                discountPercent: 0,
                discountAmount: 0,
                tradeOfferPercent: 0,
                tradeOfferAmount: 0,
                gstPercent: 0,
                gstAmount: 0,
                focQty: 0,
                netAmount: 0,
                parentRowId: row.dataset.parentRowIndex !== undefined ? parseInt(row.dataset.parentRowIndex) + 1 : null,
                stockAffects: parseInt(row.dataset.stockAffects) || 0,
                invoiceAffects: parseInt(row.dataset.invoiceAffects) || 0
            };
            formData.items.push(item);
            continue;
        }

        // Get product ID
        const productId = row.cells[1].querySelector('.item-code').value;
        
        // Get all unit inputs with quantities
        const unitInputs = row.querySelectorAll('.unit-input');
        const unitsWithQty = [];
        unitInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty > 0) {
                unitsWithQty.push({
                    uom_id: input.dataset.unitId,
                    quantity: qty
                });
            }
        });
        
        // Get common values
        const priceInput = row.querySelector('.price-cell input');
        const grossInput = row.querySelector('.gross-cell input');
        const discPercentInput = row.querySelector('.disc-percent-cell input');
        const discAmountInput = row.querySelector('.disc-amount-cell input');
        const toPercentInput = row.querySelector('.to-percent-cell input');
        const toAmountInput = row.querySelector('.to-amount-cell input');
        const gstPercentInput = row.querySelector('.gst-percent-cell input');
        const gstAmountInput = row.querySelector('.gst-amount-cell input');
        const focInput = row.querySelector('.foc-cell input');
        const netInput = row.querySelector('.net-cell input');
        
        const salePrice = parseFloat(priceInput.value);
        const grossAmount = parseFloat(grossInput.value);
        const discountPercent = parseFloat(discPercentInput.value) || 0;
        const discountAmount = parseFloat(discAmountInput.value);
        const tradeOfferPercent = parseFloat(toPercentInput.value) || 0;
        const tradeOfferAmount = parseFloat(toAmountInput.value) || 0;
        const gstPercent = parseFloat(gstPercentInput.value) || 0;
        const gstAmount = parseFloat(gstAmountInput.value) || 0;
        const focQty = parseFloat(focInput.value) || 0;
        const netAmount = parseFloat(netInput.value);
        
        // Create separate item for each unit with quantity
        unitsWithQty.forEach((unit, index) => {
            const isFirstUnit = index === 0;
            const item = {
                productId: productId,
                uomId: unit.uom_id,
                quantity: unit.quantity,
                piece: 0,
                carton: 0,
                dozen: 0,
                salePrice: salePrice,
                grossAmount: isFirstUnit ? grossAmount : 0,
                discountPercent: discountPercent,
                discountAmount: isFirstUnit ? discountAmount : 0,
                tradeOfferPercent: tradeOfferPercent,
                tradeOfferAmount: isFirstUnit ? tradeOfferAmount : 0,
                gstPercent: gstPercent,
                gstAmount: isFirstUnit ? gstAmount : 0,
                focQty: isFirstUnit ? focQty : 0,
                netAmount: isFirstUnit ? netAmount : 0,
                parentRowId: null,
                stockAffects: parseInt(row.dataset.stockAffects) || 1,
                invoiceAffects: parseInt(row.dataset.invoiceAffects) || 1
            };
            formData.items.push(item);
        });

        // Add child products from dataset
        if (row.dataset.childProducts) {
            const children = JSON.parse(row.dataset.childProducts);
            children.forEach(child => {
                formData.items.push({
                    productId: child.product_id,
                    uomId: child.uom_id,
                    quantity: parseFloat(child.quantity),
                    piece: 0,
                    carton: 0,
                    dozen: 0,
                    salePrice: 0,
                    grossAmount: 0,
                    discountPercent: 0,
                    discountAmount: 0,
                    tradeOfferPercent: 0,
                    tradeOfferAmount: 0,
                    gstPercent: 0,
                    gstAmount: 0,
                    focQty: 0,
                    netAmount: 0,
                    parentRowId: formData.items.length,
                    stockAffects: parseInt(child.stock_affects) || 0,
                    invoiceAffects: parseInt(child.invoice_affects) || 0
                });
            });
        }
    }

    const apiUrl = isEditMode ?
        '../../../../server/api/sale/pos_invoice/pos-edit.php' :
        '../../../../server/api/sale/pos_invoice/pos-add.php';
    const method = isEditMode ? 'PUT' : 'POST';

    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (status === 'Draft') {
                    alert('Invoice saved as draft successfully!');
                    window.location.href = 'pos-add.php';
                } else {
                    window.lastInvoiceId = data.invoice_id;
                    document.getElementById('successModal').style.display = 'flex';
                }
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error saving invoice: ' + error.message);
        })
        .finally(() => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
            }
            if (saveDraftBtn) {
                saveDraftBtn.disabled = false;
                saveDraftBtn.innerHTML = '<i class="fas fa-file"></i> Save as Draft';
            }
        });
}





// Load invoice settings from localStorage
function loadInvoiceSettings() {
    document.getElementById('enableCarton').checked = localStorage.getItem('enableCarton') === 'true';
    document.getElementById('enableDozen').checked = localStorage.getItem('enableDozen') === 'true';
    document.getElementById('enableTradeOfferDiscount').checked = localStorage.getItem('enableTradeOfferDiscount') === 'true';
    document.getElementById('enableTradeOfferAmount').checked = localStorage.getItem('enableTradeOfferAmount') === 'true';
    document.getElementById('enableFOC').checked = localStorage.getItem('enableFOC') === 'true';
    document.getElementById('enableTaxation').checked = localStorage.getItem('enableTaxation') === 'true';
    document.getElementById('enableCashDiscountPercent').checked = localStorage.getItem('enableCashDiscountPercent') === 'true';
    document.getElementById('enableCashDiscountAmount').checked = localStorage.getItem('enableCashDiscountAmount') === 'true';
    document.getElementById('enableInvoiceCashDiscountPercent').checked = localStorage.getItem('enableInvoiceCashDiscountPercent') === 'true';
    document.getElementById('enableInvoiceCashDiscountAmount').checked = localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
    document.getElementById('enableShippingFees').checked = localStorage.getItem('enableShippingFees') === 'true';
    document.getElementById('enablePrintQRCode').checked = localStorage.getItem('enablePrintQRCode') === 'true';
    document.getElementById('enableAmountPaidPaymentMethod').checked = localStorage.getItem('enableAmountPaidPaymentMethod') === 'true';
}

// Save invoice settings to localStorage
function saveInvoiceSettings() {
    localStorage.setItem('enableCarton', document.getElementById('enableCarton').checked);
    localStorage.setItem('enableDozen', document.getElementById('enableDozen').checked);
    localStorage.setItem('enableTradeOfferDiscount', document.getElementById('enableTradeOfferDiscount').checked);
    localStorage.setItem('enableTradeOfferAmount', document.getElementById('enableTradeOfferAmount').checked);
    localStorage.setItem('enableFOC', document.getElementById('enableFOC').checked);
    localStorage.setItem('enableTaxation', document.getElementById('enableTaxation').checked);
    localStorage.setItem('enableCashDiscountPercent', document.getElementById('enableCashDiscountPercent').checked);
    localStorage.setItem('enableCashDiscountAmount', document.getElementById('enableCashDiscountAmount').checked);
    localStorage.setItem('enableInvoiceCashDiscountPercent', document.getElementById('enableInvoiceCashDiscountPercent').checked);
    localStorage.setItem('enableInvoiceCashDiscountAmount', document.getElementById('enableInvoiceCashDiscountAmount').checked);
    localStorage.setItem('enableShippingFees', document.getElementById('enableShippingFees').checked);
    localStorage.setItem('enablePrintQRCode', document.getElementById('enablePrintQRCode').checked);
    localStorage.setItem('enableAmountPaidPaymentMethod', document.getElementById('enableAmountPaidPaymentMethod').checked);
    alert('Invoice settings saved successfully!');
}

// Apply invoice settings to show/hide columns
function applyInvoiceSettings() {
    const enableCarton = localStorage.getItem('enableCarton') === 'true';
    const enableDozen = localStorage.getItem('enableDozen') === 'true';
    const enableCashDiscountPercent = localStorage.getItem('enableCashDiscountPercent') === 'true';
    const enableCashDiscountAmount = localStorage.getItem('enableCashDiscountAmount') === 'true';
    const enableTradeOfferDiscount = localStorage.getItem('enableTradeOfferDiscount') === 'true';
    const enableTradeOfferAmount = localStorage.getItem('enableTradeOfferAmount') === 'true';
    const enableFOC = localStorage.getItem('enableFOC') === 'true';
    const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
    const enableInvoiceCashDiscountPercent = localStorage.getItem('enableInvoiceCashDiscountPercent') === 'true';
    const enableInvoiceCashDiscountAmount = localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
    const enableShippingFees = localStorage.getItem('enableShippingFees') === 'true';

    // Get table
    const table = document.getElementById('itemsTable');
    const headerRow = table.querySelector('thead tr');
    const footerRow = table.querySelector('tfoot tr');

    // Column indices (0-based)
    const PCS_COL = 4;
    const CTN_COL = 5;
    const DZ_COL = 6;
    const DISC_PERCENT_COL = 9;
    const DISC_AMOUNT_COL = 10;
    const TO_PERCENT_COL = 11;
    const TO_AMOUNT_COL = 12;
    const GST_PERCENT_COL = 13;
    const GST_AMOUNT_COL = 14;
    const FOC_COL = 15;

    // Hide/show header columns (only if using old static structure)
    if (headerRow && headerRow.cells.length > FOC_COL) {
        if (headerRow.cells[CTN_COL]) headerRow.cells[CTN_COL].style.display = enableCarton ? '' : 'none';
        if (headerRow.cells[DZ_COL]) headerRow.cells[DZ_COL].style.display = enableDozen ? '' : 'none';
        if (headerRow.cells[DISC_PERCENT_COL]) headerRow.cells[DISC_PERCENT_COL].style.display = enableCashDiscountPercent ? '' : 'none';
        if (headerRow.cells[DISC_AMOUNT_COL]) headerRow.cells[DISC_AMOUNT_COL].style.display = enableCashDiscountAmount ? '' : 'none';
        if (headerRow.cells[TO_PERCENT_COL]) headerRow.cells[TO_PERCENT_COL].style.display = enableTradeOfferDiscount ? '' : 'none';
        if (headerRow.cells[TO_AMOUNT_COL]) headerRow.cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
        if (headerRow.cells[GST_PERCENT_COL]) headerRow.cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
        if (headerRow.cells[GST_AMOUNT_COL]) headerRow.cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
        if (headerRow.cells[FOC_COL]) headerRow.cells[FOC_COL].style.display = enableFOC ? '' : 'none';
    }

    // Hide/show footer columns (only if using old static structure)
    if (footerRow && footerRow.cells.length > FOC_COL) {
        if (footerRow.cells[CTN_COL]) footerRow.cells[CTN_COL].style.display = enableCarton ? '' : 'none';
        if (footerRow.cells[DZ_COL]) footerRow.cells[DZ_COL].style.display = enableDozen ? '' : 'none';
        if (footerRow.cells[DISC_PERCENT_COL]) footerRow.cells[DISC_PERCENT_COL].style.display = enableCashDiscountPercent ? '' : 'none';
        if (footerRow.cells[DISC_AMOUNT_COL]) footerRow.cells[DISC_AMOUNT_COL].style.display = enableCashDiscountAmount ? '' : 'none';
        if (footerRow.cells[TO_PERCENT_COL]) footerRow.cells[TO_PERCENT_COL].style.display = enableTradeOfferDiscount ? '' : 'none';
        if (footerRow.cells[TO_AMOUNT_COL]) footerRow.cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
        if (footerRow.cells[GST_PERCENT_COL]) footerRow.cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
        if (footerRow.cells[GST_AMOUNT_COL]) footerRow.cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
        if (footerRow.cells[FOC_COL]) footerRow.cells[FOC_COL].style.display = enableFOC ? '' : 'none';
    }

    // Hide/show body columns for existing rows (only if using old static structure)
    const itemsTable = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    if (itemsTable && itemsTable.rows.length > 0) {
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            // Only apply if cells exist (old structure)
            if (rows[i].cells.length > FOC_COL) {
                if (rows[i].cells[CTN_COL]) rows[i].cells[CTN_COL].style.display = enableCarton ? '' : 'none';
                if (rows[i].cells[DZ_COL]) rows[i].cells[DZ_COL].style.display = enableDozen ? '' : 'none';
                if (rows[i].cells[DISC_PERCENT_COL]) rows[i].cells[DISC_PERCENT_COL].style.display = enableCashDiscountPercent ? '' : 'none';
                if (rows[i].cells[DISC_AMOUNT_COL]) rows[i].cells[DISC_AMOUNT_COL].style.display = enableCashDiscountAmount ? '' : 'none';
                if (rows[i].cells[TO_PERCENT_COL]) rows[i].cells[TO_PERCENT_COL].style.display = enableTradeOfferDiscount ? '' : 'none';
                if (rows[i].cells[TO_AMOUNT_COL]) rows[i].cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
                if (rows[i].cells[GST_PERCENT_COL]) rows[i].cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
                if (rows[i].cells[GST_AMOUNT_COL]) rows[i].cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
                if (rows[i].cells[FOC_COL]) rows[i].cells[FOC_COL].style.display = enableFOC ? '' : 'none';
            }
        }
    }

    // Hide/show invoice summary fields
    const totalDiscountPercentItem = document.getElementById('totalDiscountPercent')?.closest('.summary-item');
    const totalDiscountAmountItem = document.getElementById('totalDiscountAmount')?.closest('.summary-item');
    const totalGstPercentItem = document.getElementById('totalGstPercent')?.closest('.summary-item');
    const totalGstAmountItem = document.getElementById('totalGstAmountSummary')?.closest('.summary-item');
    const shippingFeesItem = document.getElementById('shippingFees')?.closest('.summary-item');
    const enableAmountPaidPaymentMethod = localStorage.getItem('enableAmountPaidPaymentMethod') === 'true';
    const paymentMethodItem = document.getElementById('paymentMethod')?.closest('.summary-item');
    const bankAccountItem = document.getElementById('bankAccountContainer');
    const amountPaidItem = document.getElementById('amountPaid')?.closest('.summary-item');
    const remainingBalanceItem = document.getElementById('remainingBalance')?.closest('.summary-item');

    if (totalDiscountPercentItem) totalDiscountPercentItem.style.display = enableInvoiceCashDiscountPercent ? '' : 'none';
    if (totalDiscountAmountItem) totalDiscountAmountItem.style.display = enableInvoiceCashDiscountAmount ? '' : 'none';
    if (totalGstPercentItem) totalGstPercentItem.style.display = enableTaxation ? '' : 'none';
    if (totalGstAmountItem) totalGstAmountItem.style.display = enableTaxation ? '' : 'none';
    if (shippingFeesItem) shippingFeesItem.style.display = enableShippingFees ? '' : 'none';
    if (paymentMethodItem) paymentMethodItem.style.display = enableAmountPaidPaymentMethod ? '' : 'none';
    if (bankAccountItem && !enableAmountPaidPaymentMethod) bankAccountItem.style.display = 'none';
    if (amountPaidItem) amountPaidItem.style.display = enableAmountPaidPaymentMethod ? '' : 'none';
    if (remainingBalanceItem) remainingBalanceItem.style.display = enableAmountPaidPaymentMethod ? '' : 'none';
}

function applyColumnVisibility(settings) {
    document.getElementById('tradeOfferDiscountHeader').style.display = settings.enableTradeOfferDiscount ? '' : 'none';
    document.getElementById('focQtyHeader').style.display = settings.enableFOC ? '' : 'none';
    document.getElementById('totalTradeOfferDiscount').style.display = settings.enableTradeOfferDiscount ? '' : 'none';
    document.getElementById('totalFocQty').style.display = settings.enableFOC ? '' : 'none';

    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].cells[8]) rows[i].cells[8].style.display = settings.enableTradeOfferDiscount ? '' : 'none';
        if (rows[i].cells[9]) rows[i].cells[9].style.display = settings.enableFOC ? '' : 'none';
    }
}

function updateInvoiceSummaryFromGstAmount() {
    let totalBill = 0;
    const rows = itemsTable.rows;

    for (let i = 0; i < rows.length; i++) {
        const netAmountInput = rows[i].cells[13].querySelector('input');
        if (netAmountInput) {
            totalBill += parseFloat(netAmountInput.value) || 0;
        }
    }

    document.getElementById('totalBill').textContent = totalBill.toFixed(2);

    const discountAmount = parseFloat(document.getElementById('totalDiscountAmount').value) || 0;
    const afterDiscount = totalBill - discountAmount;
    const gstAmount = parseFloat(document.getElementById('totalGstAmountSummary').value) || 0;
    const gstPercent = afterDiscount > 0 ? (gstAmount / afterDiscount) * 100 : 0;
    const shippingFees = parseFloat(document.getElementById('shippingFees').value) || 0;
    const netAmount = afterDiscount + gstAmount + shippingFees;

    document.getElementById('totalGstPercent').value = gstPercent.toFixed(2);
    document.getElementById('netAmount').textContent = netAmount.toFixed(2);
    document.getElementById('amountPaid').value = netAmount.toFixed(2);

    updateRemainingBalance();
}

// Handle UOM change for price conversion
function handleUOMChange(row, unitSelect) {
    const oldUnitId = unitSelect.dataset.previousValue || unitSelect.value;
    const newUnitId = unitSelect.value;

    // Store current value for next change
    unitSelect.dataset.previousValue = newUnitId;

    // Only convert if both units are set and different
    if (!oldUnitId || !newUnitId || oldUnitId === newUnitId) return;

    const priceInput = row.cells[6].querySelector('input');
    const currentPrice = parseFloat(priceInput.value) || 0;

    if (currentPrice === 0) return;

    // Get conversion factors
    const oldConversion = getConversionFactor(oldUnitId, row);
    const newConversion = getConversionFactor(newUnitId, row);

    if (oldConversion && newConversion) {
        // Convert price: new_price = old_price * (old_conversion / new_conversion)
        const newPrice = currentPrice * (oldConversion / newConversion);
        priceInput.value = newPrice.toFixed(4);

        // Recalculate row
        priceInput.dispatchEvent(new Event('input'));
    }
}

// Get conversion factor for UOM
function getConversionFactor(unitId, row) {
    const id = parseInt(unitId);

    // Piece (id: 9) - base unit
    if (id === 9) return 1;

    // Dozen (id: 10) - 12 pieces
    if (id === 10) return 12;

    // Carton (id: 16) - get from product's carton_conversion
    if (id === 16) {
        const cartonConversion = parseInt(row.dataset.cartonConversion) || 0;
        return cartonConversion > 0 ? cartonConversion : null;
    }

    // Other units - no conversion
    return null;
}


// Overlay functions
function openOverlay(url) {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    iframe.src = url;
    modal.style.display = 'flex';
}

function closeOverlay() {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    modal.style.display = 'none';
    iframe.src = '';

    // Reload data after closing overlay
    loadCustomers();
    loadProducts();
}

// Listen for messages from iframe
window.addEventListener('message', function (event) {
    if (event.data === 'closeOverlay') {
        closeOverlay();
    }
});

// Load price history for all rows
function loadPriceHistoryForAllRows() {
    const itemsTable = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    if (!itemsTable) return;

    const rows = itemsTable.rows;
    for (let i = 0; i < rows.length; i++) {
        const codeInput = rows[i].cells[1]?.querySelector('.item-code');
        if (codeInput && codeInput.value) {
            loadPriceHistory(codeInput.value);
            break;
        }
    }
}

// Load price history
async function loadPriceHistory(productId) {
    const customerId = document.getElementById('customerCode').value;
    if (!customerId || !productId) {
        document.getElementById('priceHistoryContainer').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-price-history.php?customer_id=${customerId}&product_id=${productId}`);
        const data = await response.json();

        if (data.success && data.history && data.history.length > 0) {
            const content = data.history.map((item, index) => {
                const date = new Date(item.sale_date).toLocaleDateString();
                return `<div>${index + 1}. ${date} - ${item.currency_symbol}${parseFloat(item.sale_price).toFixed(2)} (Qty: ${item.quantity})</div>`;
            }).join('');

            document.getElementById('priceHistoryContent').innerHTML = content;
            document.getElementById('priceHistoryContainer').style.display = 'block';
        } else {
            document.getElementById('priceHistoryContainer').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading price history:', error);
        document.getElementById('priceHistoryContainer').style.display = 'none';
    }
}

// Load product stock
async function loadProductStock(productId) {
    const branchId = document.getElementById('branch').value;
    if (!productId) {
        document.getElementById('stockContainer').style.display = 'none';
        return;
    }

    try {
        const url = branchId
            ? `../../../../server/api/sale/pos_invoice/get-product-stock.php?product_id=${productId}&branch_id=${branchId}`
            : `../../../../server/api/sale/pos_invoice/get-product-stock.php?product_id=${productId}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            const stock = parseFloat(data.stock);
            const stockColor = stock > 0 ? 'var(--success)' : 'var(--error)';
            document.getElementById('stockContent').innerHTML = `<div style="color: ${stockColor}; font-weight: 600;">${stock.toFixed(2)} units</div>`;
            document.getElementById('stockContainer').style.display = 'block';
        } else {
            document.getElementById('stockContainer').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading stock:', error);
        document.getElementById('stockContainer').style.display = 'none';
    }
}


// Save sales officer selection
document.getElementById('salesOfficer').addEventListener('change', function () {
    if (this.value) {
        localStorage.setItem('lastSelectedSalesOfficer', this.value);
    }
});




document.getElementById('closeFieldSettingsBtn').addEventListener('click', function () {
    document.getElementById('fieldSettingsModal').style.display = 'none';
});

document.getElementById('saveFieldSettingsBtn').addEventListener('click', function () {
    saveFieldSettings();
    document.getElementById('fieldSettingsModal').style.display = 'none';
    applyFieldVisibility();
});

document.getElementById('fieldSettingsModal').addEventListener('click', function (e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});

function loadFieldSettings() {
    const fields = ['hideBillNoStandard', 'hideSaleDateStandard', 'hidePreviousBalanceStandard', 'hideSubAccountStandard', 'hideCustomerAddressStandard', 'hideSaleOrderStandard', 'hideBranchStandard', 'hideCurrencyStandard', 'hideSalesOfficerStandard', 'hideBiltyNoStandard', 'hideTransportNameStandard', 'hideRemarksStandard'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = localStorage.getItem(id) === 'true';
    });
}

function saveFieldSettings() {
    const fields = [
        'hideBillNoStandard', 'hideBillNoPos', 'hideSaleDateStandard', 'hideSaleDatePos',
        'hidePreviousBalanceStandard', 'hidePreviousBalancePos', 'hideSubAccountStandard', 'hideSubAccountPos',
        'hideCustomerAddressStandard', 'hideCustomerAddressPos', 'hideSaleOrderStandard', 'hideSaleOrderPos',
        'hideBranchStandard', 'hideBranchPos', 'hideCurrencyStandard', 'hideCurrencyPos',
        'hideSalesOfficerStandard', 'hideSalesOfficerPos', 'hideBiltyNoStandard', 'hideBiltyNoPos',
        'hideTransportNameStandard', 'hideTransportNamePos', 'hideRemarksStandard', 'hideRemarksPos'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem(id, el.checked);
    });
    
    alert('Field settings saved successfully!');
}

function applyFieldVisibility() {
    const modeRadio = document.querySelector('input[name="invoiceMode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'standard';
    const suffix = mode === 'standard' ? 'Standard' : 'Pos';

    const fieldGroups = [
        'billNoGroup', 'saleDateGroup', 'previousBalanceGroup', 'subAccountGroup',
        'customerAddressGroup', 'saleOrderGroup', 'branchGroup', 'currencyGroup',
        'salesOfficerGroup', 'biltyNoGroup', 'transportNameGroup', 'remarksGroup'
    ];

    fieldGroups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) {
            const hideKey = groupId.replace('Group', '') + suffix;
            const hideKey2 = hideKey.charAt(0).toLowerCase() + hideKey.slice(1);
            const shouldHide = localStorage.getItem(`hide${hideKey2.charAt(0).toUpperCase() + hideKey2.slice(1)}`) === 'true';
            group.style.display = shouldHide ? 'none' : '';
        }
    });
}

// Mode change listeners
const standardMode = document.getElementById('standardMode');
if (standardMode) {
    standardMode.addEventListener('change', function () {
        if (this.checked) {
            localStorage.setItem('invoiceMode', 'standard');
            applyFieldVisibility();
        }
    });
}

const posMode = document.getElementById('posMode');
if (posMode) {
    posMode.addEventListener('change', function () {
        if (this.checked) {
            localStorage.setItem('invoiceMode', 'pos');
            applyFieldVisibility();
        }
    });
}

// Load saved mode on page load
const savedMode = localStorage.getItem('invoiceMode') || 'standard';
const posModeRadio = document.getElementById('posMode');
const standardModeRadio = document.getElementById('standardMode');

if (savedMode === 'pos' && posModeRadio) {
    posModeRadio.checked = true;
} else if (standardModeRadio) {
    standardModeRadio.checked = true;
}
applyFieldVisibility();


// Debounce utility for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard shortcuts for speed
document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveBtn').click();
    }

    // Ctrl/Cmd + D to save as draft
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        document.getElementById('saveDraftBtn').click();
    }

    // Ctrl/Cmd + N to add new row
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('addRowBtn').click();
    }

    // F2 to focus customer search
    if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('customerCodeSearch').focus();
    }
});

// Preload next invoice number for instant display
async function preloadNextInvoiceNumber() {
    try {
        const response = await fetch('../../../../server/api/sale/pos_invoice/get-next-invoice-number.php');
        const data = await response.json();
        if (data.success && data.nextNumber) {
            const billNoEl = document.getElementById('billNo');
            if (billNoEl) {
                billNoEl.value = data.nextNumber;
            }
        }
    } catch (error) {
        console.error('Error preloading invoice number:', error);
    }
}

// Call on page load if not in edit mode
if (!new URLSearchParams(window.location.search).get('edit')) {
    preloadNextInvoiceNumber();
}


// Compact mode toggle for faster visual scanning
let compactMode = localStorage.getItem('compactMode') === 'true';

function toggleCompactMode() {
    compactMode = !compactMode;
    localStorage.setItem('compactMode', compactMode);
    applyCompactMode();
}

function applyCompactMode() {
    const table = document.getElementById('itemsTable');
    if (compactMode) {
        table.style.fontSize = '11px';
        document.querySelectorAll('.table-input').forEach(input => {
            input.style.padding = '4px 6px';
            input.style.height = '28px';
        });
        document.querySelector('.card').style.padding = '16px';
    } else {
        table.style.fontSize = '';
        document.querySelectorAll('.table-input').forEach(input => {
            input.style.padding = '';
            input.style.height = '';
        });
        document.querySelector('.card').style.padding = '';
    }
}

// Check if product has child products and show variants button
async function checkAndShowVariantsButton(row, productId) {
    try {
        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-child-products.php?parent_id=${productId}`);
        const data = await response.json();
        if (data.success && data.children.length > 0) {
            const variantsBtn = row.cells[17].querySelector('.btn-secondary');
            if (variantsBtn) variantsBtn.style.display = '';
        }
    } catch (error) {
        console.error('Error checking variants:', error);
    }
}

// Open variants modal
function openVariantsModal(parentRow) {
    const productId = parentRow.dataset.productId;
    if (!productId) return;

    fetch(`../../../../server/api/sale/pos_invoice/get-child-products.php?parent_id=${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.children.length > 0) {
                showVariantsModal(parentRow, data.children);
            } else {
                alert('No variants found for this product.');
            }
        })
        .catch(error => {
            console.error('Error loading variants:', error);
            alert('Error loading variants.');
        });
}

// Show variants modal
function showVariantsModal(parentRow, children) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    const savedVariants = localStorage.getItem(`variants_${parentRow.dataset.productId}`);
    const savedData = savedVariants ? JSON.parse(savedVariants) : [];

    const childrenHtml = children.map(child => {
        const saved = savedData.find(s => s.id == child.id);
        const isChecked = saved ? 'checked' : '';
        const savedQty = saved ? saved.qty : 0;
        const isDisabled = saved ? '' : 'disabled';
        
        return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-default);">
            <input type="checkbox" class="variant-checkbox" data-id="${child.id}" data-name="${child.name}" data-code="${child.code}" data-unit="${child.default_unit_id}" data-stock-affects="${child.stock_affects}" data-invoice-affects="${child.invoice_affects}" style="width: auto;" ${isChecked}>
            <span style="flex: 1; cursor: pointer;" class="variant-label" data-id="${child.id}">${child.code} - ${child.name}</span>
            <input type="number" class="variant-qty table-input" data-id="${child.id}" min="0" step="0.01" value="${savedQty}" placeholder="Qty" style="width: 80px;" ${isDisabled}>
        </div>
    `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h3 class="modal-title">Select Product Variants</h3>
            <div style="margin: 16px 0;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="selectAllVariants" style="width: auto;">
                    <strong>Select All</strong>
                </label>
                <div id="variantsContainer">
                    ${childrenHtml}
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelVariantsBtn">Cancel</button>
                <button class="btn btn-primary" id="addVariantsBtn">Add Selected</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Click on label to toggle checkbox
    modal.querySelectorAll('.variant-label').forEach(label => {
        label.addEventListener('click', function() {
            const checkbox = modal.querySelector(`.variant-checkbox[data-id="${this.dataset.id}"]`);
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    // Enable/disable qty input based on checkbox
    modal.querySelectorAll('.variant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const qtyInput = modal.querySelector(`.variant-qty[data-id="${this.dataset.id}"]`);
            qtyInput.disabled = !this.checked;
            if (this.checked && qtyInput.value == 0) qtyInput.value = 1;
        });
    });

    // Select all functionality
    document.getElementById('selectAllVariants').addEventListener('change', function () {
        modal.querySelectorAll('.variant-checkbox').forEach(checkbox => {
            checkbox.checked = this.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    // Cancel button
    document.getElementById('cancelVariantsBtn').addEventListener('click', () => modal.remove());

    // Add button
    document.getElementById('addVariantsBtn').addEventListener('click', () => {
        const selected = [];
        modal.querySelectorAll('.variant-checkbox:checked').forEach(checkbox => {
            const qtyInput = modal.querySelector(`.variant-qty[data-id="${checkbox.dataset.id}"]`);
            const qty = parseFloat(qtyInput.value) || 0;
            if (qty > 0) {
                selected.push({
                    id: checkbox.dataset.id,
                    name: checkbox.dataset.name,
                    code: checkbox.dataset.code,
                    unitId: checkbox.dataset.unit,
                    qty: qty,
                    stockAffects: checkbox.dataset.stockAffects,
                    invoiceAffects: checkbox.dataset.invoiceAffects
                });
            }
        });

        if (selected.length > 0) {
            localStorage.setItem(`variants_${parentRow.dataset.productId}`, JSON.stringify(selected));
            addChildRows(parentRow, selected);
            modal.remove();
        } else {
            alert('Please select at least one variant with quantity.');
        }
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Add child rows below parent
function addChildRows(parentRow, children) {
    const parentRowIndex = parentRow.rowIndex - 1;
    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];

    // Sum child quantities and update parent
    const totalChildQty = children.reduce((sum, child) => sum + child.qty, 0);
    const parentQtyInput = parentRow.cells[3].querySelector('input');
    parentQtyInput.value = totalChildQty.toFixed(2);
    parentQtyInput.dispatchEvent(new Event('input'));

    // Store children in parent row dataset instead of creating visible rows
    if (!parentRow.dataset.childProducts) {
        parentRow.dataset.childProducts = JSON.stringify([]);
    }
    const childProducts = children.map(child => ({
        product_id: child.id,
        product_name: child.name,
        product_code: child.code,
        uom_id: child.unitId,
        quantity: child.qty,
        stock_affects: child.stockAffects,
        invoice_affects: child.invoiceAffects
    }));
    parentRow.dataset.childProducts = JSON.stringify(childProducts);




    updateSerialNumbers();
}

// Apply on load
applyCompactMode();

// Update parent quantity from children
function updateParentQtyFromChildren(parentRow) {
    const parentRowIndex = parentRow.rowIndex - 1;
    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    const rows = itemsTable.rows;

    let totalChildQty = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('child-row') && row.dataset.parentRowIndex == parentRowIndex) {
            const qtyInput = row.cells[3].querySelector('input');
            totalChildQty += parseFloat(qtyInput.value) || 0;
        }
    }

    const parentQtyInput = parentRow.cells[3].querySelector('input');
    parentQtyInput.value = totalChildQty.toFixed(2);
    parentQtyInput.dispatchEvent(new Event('input'));
}

// Validate parent quantity against children sum
function validateParentQty(parentRow) {
    const parentRowIndex = parentRow.rowIndex - 1;
    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    const rows = itemsTable.rows;

    let hasChildren = false;
    let totalChildQty = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('child-row') && row.dataset.parentRowIndex == parentRowIndex) {
            hasChildren = true;
            const qtyInput = row.cells[3].querySelector('input');
            totalChildQty += parseFloat(qtyInput.value) || 0;
        }
    }

    if (hasChildren) {
        const parentQtyInput = parentRow.cells[3].querySelector('input');
        const parentQty = parseFloat(parentQtyInput.value) || 0;

        if (parentQty > totalChildQty) {
            parentQtyInput.style.border = '2px solid var(--error)';
            parentQtyInput.title = `Parent Qty (${parentQty}) cannot exceed sum of children (${totalChildQty})`;
        } else {
            parentQtyInput.style.border = '';
            parentQtyInput.title = '';
        }
    }
}

// Update serial numbers - global function
function updateSerialNumbers() {
    const itemsTable = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    if (!itemsTable) return;

    const rows = itemsTable.rows;
    let serialNumber = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('child-row')) {
            row.cells[0].innerHTML = '<span style="margin-left: 20px;">?</span>';
        } else {
            serialNumber++;
            row.cells[0].textContent = serialNumber;
        }
    }
}

// Validate form - global function
function validateForm() {
    let isValid = true;

    // Reset error states
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

    // Check required fields
    const requiredFields = [
        { id: 'customerCode', errorId: 'customerCodeError' },
        { id: 'branch', errorId: 'branchError' },
        { id: 'currency', errorId: 'currencyError' }
    ];

    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && !element.value) {
            element.classList.add('error');
            const errorElement = document.getElementById(field.errorId);
            if (errorElement) errorElement.style.display = 'block';
            isValid = false;
        }
    });

    // Check if at least one item is added
    const itemsTable = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    if (!itemsTable || itemsTable.rows.length === 0) {
        alert('Please add at least one item to the invoice.');
        isValid = false;
        return isValid;
    }

    // Check each item row for required fields
    const rows = itemsTable.rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip child rows validation
        if (row.classList.contains('child-row')) continue;

        const code = row.cells[1]?.querySelector('.item-code');
        const price = row.querySelector('.price-cell input');
        const unitInputs = row.querySelectorAll('.unit-input');
        
        // Check if product is selected
        if (!code || !code.value) {
            alert(`Row ${i + 1}: Please select a product.`);
            // Focus on the product search input
            const searchInput = row.cells[1]?.querySelector('.search-input');
            if (searchInput) searchInput.focus();
            isValid = false;
            break;
        }
        
        // Check if price is entered
        if (!price || !price.value || parseFloat(price.value) <= 0) {
            alert(`Row ${i + 1}: Please enter a valid price.`);
            if (price) price.focus();
            isValid = false;
            break;
        }
        
        // Check if at least one unit has quantity
        let hasQty = false;
        unitInputs.forEach(input => {
            if (parseFloat(input.value) > 0) {
                hasQty = true;
            }
        });
        
        if (!hasQty) {
            alert(`Row ${i + 1}: Please enter quantity for at least one unit.`);
            // Focus on the first unit input
            if (unitInputs.length > 0) unitInputs[0].focus();
            isValid = false;
            break;
        }

        // Validate parent qty against children
        const parentRowIndex = i;
        let hasChildren = false;
        let totalChildQty = 0;

        for (let j = 0; j < rows.length; j++) {
            if (rows[j].classList.contains('child-row') && rows[j].dataset.parentRowIndex == parentRowIndex) {
                hasChildren = true;
                totalChildQty += parseFloat(rows[j].cells[3].querySelector('input').value) || 0;
            }
        }

        if (hasChildren) {
            const parentQty = parseFloat(qty.value) || 0;
            if (parentQty > totalChildQty) {
                alert(`Row ${i + 1}: Parent Qty (${parentQty}) cannot exceed sum of children (${totalChildQty})`);
                qty.focus();
                isValid = false;
                break;
            }
        }
    }

    return isValid;
}

// Load customers - global function
async function loadCustomers() {
    try {
        const response = await fetch('../../../../server/api/sale/pos_invoice/get-customers.php');
        const data = await response.json();

        if (data.success) {
            customersData = data.customers;
            const codeOptions = document.getElementById('customerCodeOptions');
            if (!codeOptions) return;

            codeOptions.innerHTML = '';

            const fragment = document.createDocumentFragment();
            data.customers.forEach(customer => {
                dataCache.customers.set(customer.id, customer);

                const codeOption = document.createElement('div');
                codeOption.className = 'dropdown-option';
                codeOption.setAttribute('data-value', customer.id);
                codeOption.setAttribute('data-balance', customer.current_balance);
                codeOption.setAttribute('data-address', customer.address || '');
                codeOption.setAttribute('data-discount', customer.default_discount_percentage || 0);
                codeOption.setAttribute('data-sales-officer', customer.associated_sales_officer_id || '');
                codeOption.setAttribute('data-supplier-man', customer.supplier_man_id || '');
                codeOption.setAttribute('data-credit-limit', customer.credit_limit || 0);
                codeOption.setAttribute('data-withholding-tax', customer.advance_income_tax_percentage || 0);
                codeOption.textContent = `${customer.customer_code} | ${customer.customer_name} | ${customer.address || 'N/A'}`;
                
                if (customer.id == 613) {
                    console.log('Customer 613 loaded:', customer);
                    console.log('supplier_man_id:', customer.supplier_man_id);
                }
                
                fragment.appendChild(codeOption);
            });
            codeOptions.appendChild(fragment);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load products - global function
async function loadProducts() {
    try {
        const response = await fetch('../../../../server/api/sale/pos_invoice/get-products.php');
        const data = await response.json();

        if (data.success) {
            productsData = data.products;
            data.products.forEach(product => {
                dataCache.products.set(product.id, product);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Barcode scanner support - auto-submit on Enter
document.addEventListener('keypress', function (e) {
    const activeElement = document.activeElement;
    const isProductSearch = activeElement && activeElement.classList.contains('search-input') &&
        activeElement.closest('.searchable-dropdown');

    if (isProductSearch && e.key === 'Enter') {
        // Barcode scanned, auto-select first match
        const dropdown = activeElement.dropdownOptions || activeElement.closest('.searchable-dropdown').querySelector('.dropdown-options');
        if (dropdown) {
            const firstVisible = Array.from(dropdown.getElementsByClassName('dropdown-option'))
                .find(opt => opt.style.display !== 'none');
            if (firstVisible) {
                firstVisible.click();
            }
        }
    }
});

// Quick customer selection with number keys (1-9 for recent customers)
let recentCustomers = JSON.parse(localStorage.getItem('recentCustomers') || '[]');

function addRecentCustomer(customerId, customerName) {
    recentCustomers = recentCustomers.filter(c => c.id !== customerId);
    recentCustomers.unshift({ id: customerId, name: customerName });
    recentCustomers = recentCustomers.slice(0, 9);
    localStorage.setItem('recentCustomers', JSON.stringify(recentCustomers));
}

// Alt + Number for quick customer selection
document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (recentCustomers[index]) {
            const customer = recentCustomers[index];
            document.getElementById('customerCodeSearch').value = customer.name;
            document.getElementById('customerCode').value = customer.id;
            // Trigger customer selection logic
            const customerOption = document.querySelector(`#customerCodeOptions [data-value="${customer.id}"]`);
            if (customerOption) {
                customerOption.click();
            }
        }
    }

    // Ctrl + P for compact mode toggle
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toggleCompactMode();
    }
});

// Save recent customer on invoice save
const originalSaveInvoice = window.saveInvoice;
window.saveInvoice = function (status) {
    const customerId = document.getElementById('customerCode').value;
    const customerName = document.getElementById('customerCodeSearch').value;
    if (customerId && customerName) {
        addRecentCustomer(customerId, customerName);
    }
    if (originalSaveInvoice) {
        originalSaveInvoice(status);
    }
};


// Auto-select customer with id 1 when POS mode is selected
(function () {
    const posModeRadio = document.getElementById('posMode');
    if (!posModeRadio) return;
    
    const originalChangeHandler = posModeRadio.onchange;

    posModeRadio.addEventListener('change', function () {
        if (this.checked) {
            setTimeout(() => {
                const customerOption = document.querySelector('#customerCodeOptions [data-value="1"]');
                if (customerOption) {
                    customerOption.click();
                }
            }, 300);
        }
    });

    // Auto-select on page load if POS mode is already selected
    if (posModeRadio.checked) {
        setTimeout(() => {
            const customerOption = document.querySelector('#customerCodeOptions [data-value="1"]');
            if (customerOption) {
                customerOption.click();
            }
        }, 800);
    }
})();


// Add row with dynamic UOM columns
async function addRowDynamic() {
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rowCount = tbody.rows.length;
    const row = tbody.insertRow();
    
    // Serial number
    const cell0 = row.insertCell(0);
    cell0.textContent = rowCount + 1;
    
    // Product dropdown
    const cell1 = row.insertCell(1);
    const codeContainer = document.createElement('div');
    codeContainer.className = 'searchable-dropdown';
    const codeOptionsHtml = productsData.map(product => {
        const codes = [];
        if (product.qr_code) codes.push(product.qr_code);
        if (product.barcode) codes.push(product.barcode);
        const codeDisplay = codes.length > 0 ? ` (${codes.join(' - ')})` : '';
        const photoHtml = product.photo ? `<img src="../../../assets/uploads/products/${product.photo}" alt="${product.name}" style="width: 30px; height: 30px; object-fit: cover; margin-right: 8px; border-radius: 4px;">` : '';
        return `<div class="dropdown-option" data-product='${JSON.stringify(product)}' style="display: flex; align-items: center;">${photoHtml}${product.code} - ${product.name}${codeDisplay}</div>`;
    }).join('');
    
    codeContainer.innerHTML = `
        <input type="text" class="search-input table-input" placeholder="Search product...">
        <input type="hidden" class="item-code" required>
    `;
    
    const dropdownOptions = document.createElement('div');
    dropdownOptions.className = 'dropdown-options';
    dropdownOptions.innerHTML = codeOptionsHtml;
    dropdownOptions.style.position = 'absolute';
    dropdownOptions.style.display = 'none';
    dropdownOptions.style.zIndex = '9999';
    document.body.appendChild(dropdownOptions);
    
    codeContainer.querySelector('.search-input').dropdownOptions = dropdownOptions;
    cell1.appendChild(codeContainer);
    initTableDropdownDynamic(codeContainer, row);
    
    // Unit cells will be added dynamically
    // Price
    const priceCell = row.insertCell(2);
    priceCell.className = 'price-cell';
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'table-input';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.required = true;
    priceInput.addEventListener('input', function() {
        const unitInputs = row.querySelectorAll('.unit-input');
        let totalQty = Number(0);
        unitInputs.forEach(input => {
            const qty = Number(input.value) || 0;
            const cf = Number(input.dataset.conversionFactor) || 1;
            totalQty = Number(totalQty) + Number(qty * cf);
        });
        calculateRowAmounts(row, Number(totalQty), Number(this.value) || 0);
    });
    priceCell.appendChild(priceInput);
    
    // Gross Amount
    const grossCell = row.insertCell(3);
    grossCell.className = 'gross-cell';
    const grossInput = document.createElement('input');
    grossInput.type = 'text';
    grossInput.className = 'table-input';
    grossInput.readOnly = true;
    grossInput.value = '0.00';
    grossInput.tabIndex = -1;
    grossCell.appendChild(grossInput);
    
    // Discount %
    const discPercentCell = row.insertCell(4);
    discPercentCell.className = 'disc-percent-cell';
    const discPercentInput = document.createElement('input');
    discPercentInput.type = 'number';
    discPercentInput.className = 'table-input';
    discPercentInput.min = '0';
    discPercentInput.max = '100';
    discPercentInput.step = '0.01';
    discPercentInput.value = '0';
    discPercentInput.addEventListener('input', function() {
        const unitInputs = row.querySelectorAll('.unit-input');
        let totalQty = 0;
        unitInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            const cf = parseFloat(input.dataset.conversionFactor) || 1;
            totalQty = totalQty + (qty * cf);
        });
        const price = parseFloat(row.querySelector('.price-cell input').value) || 0;
        calculateRowAmounts(row, totalQty, price);
    });
    discPercentCell.appendChild(discPercentInput);
    
    // Discount Amount
    const discAmountCell = row.insertCell(5);
    discAmountCell.className = 'disc-amount-cell';
    const discAmountInput = document.createElement('input');
    discAmountInput.type = 'number';
    discAmountInput.className = 'table-input';
    discAmountInput.min = '0';
    discAmountInput.step = '0.01';
    discAmountInput.value = '0.00';
    discAmountCell.appendChild(discAmountInput);
    
    // TO %
    const toPercentCell = row.insertCell(6);
    toPercentCell.className = 'to-percent-cell';
    const toPercentInput = document.createElement('input');
    toPercentInput.type = 'number';
    toPercentInput.className = 'table-input';
    toPercentInput.min = '0';
    toPercentInput.max = '100';
    toPercentInput.step = '0.01';
    toPercentInput.value = '0';
    toPercentInput.addEventListener('input', function() {
        const unitInputs = row.querySelectorAll('.unit-input');
        let totalQty = 0;
        unitInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            const cf = parseFloat(input.dataset.conversionFactor) || 1;
            totalQty = totalQty + (qty * cf);
        });
        const price = parseFloat(row.querySelector('.price-cell input').value) || 0;
        calculateRowAmounts(row, totalQty, price);
    });
    toPercentCell.appendChild(toPercentInput);
    
    // TO Amount
    const toAmountCell = row.insertCell(7);
    toAmountCell.className = 'to-amount-cell';
    const toAmountInput = document.createElement('input');
    toAmountInput.type = 'number';
    toAmountInput.className = 'table-input';
    toAmountInput.min = '0';
    toAmountInput.step = '0.01';
    toAmountInput.value = '0.00';
    toAmountCell.appendChild(toAmountInput);
    
    // GST %
    const gstPercentCell = row.insertCell(8);
    gstPercentCell.className = 'gst-percent-cell';
    const gstPercentInput = document.createElement('input');
    gstPercentInput.type = 'number';
    gstPercentInput.className = 'table-input';
    gstPercentInput.min = '0';
    gstPercentInput.max = '100';
    gstPercentInput.step = '0.01';
    gstPercentInput.value = '0';
    gstPercentInput.addEventListener('input', function() {
        const unitInputs = row.querySelectorAll('.unit-input');
        let totalQty = 0;
        unitInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            const cf = parseFloat(input.dataset.conversionFactor) || 1;
            totalQty = totalQty + (qty * cf);
        });
        const price = parseFloat(row.querySelector('.price-cell input').value) || 0;
        calculateRowAmounts(row, totalQty, price);
    });
    gstPercentCell.appendChild(gstPercentInput);
    
    // GST Amount
    const gstAmountCell = row.insertCell(9);
    gstAmountCell.className = 'gst-amount-cell';
    const gstAmountInput = document.createElement('input');
    gstAmountInput.type = 'number';
    gstAmountInput.className = 'table-input';
    gstAmountInput.min = '0';
    gstAmountInput.step = '0.01';
    gstAmountInput.value = '0.00';
    gstAmountCell.appendChild(gstAmountInput);
    
    // FOC Qty
    const focCell = row.insertCell(10);
    focCell.className = 'foc-cell';
    const focInput = document.createElement('input');
    focInput.type = 'number';
    focInput.className = 'table-input';
    focInput.min = '0';
    focInput.step = '0.01';
    focInput.value = '0';
    focCell.appendChild(focInput);
    
    // Net Amount
    const netCell = row.insertCell(11);
    netCell.className = 'net-cell';
    const netInput = document.createElement('input');
    netInput.type = 'text';
    netInput.className = 'table-input';
    netInput.readOnly = true;
    netInput.value = '0.00';
    netInput.tabIndex = 0;
    netCell.appendChild(netInput);
    
    // Actions
    const actionsCell = row.insertCell(12);
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete row';
    deleteBtn.tabIndex = -1;
    deleteBtn.addEventListener('click', function() {
        const itemsTable = document.getElementById('itemsTable');
        const tbody = itemsTable.getElementsByTagName('tbody')[0];
        if (tbody.rows.length > 1) {
            const searchInput = row.cells[1].querySelector('.search-input');
            if (searchInput.dropdownOptions) {
                searchInput.dropdownOptions.remove();
            }
            row.remove();
            updateSerialNumbers();
            recalculateMaxColumns();
            updateInvoiceSummaryDynamic();
        } else {
            alert('Cannot delete the only row.');
        }
    });
    actionsCell.appendChild(deleteBtn);
}

// Initialize dropdown for dynamic rows
function initTableDropdownDynamic(container, row) {
    const searchInput = container.querySelector('.search-input');
    const optionsContainer = searchInput.dropdownOptions;
    const hiddenInput = container.querySelector('input[type="hidden"]');
    let selectedIndex = -1;
    
    searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
        const rect = searchInput.getBoundingClientRect();
        optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        optionsContainer.style.left = rect.left + 'px';
        optionsContainer.style.width = rect.width + 'px';
        optionsContainer.style.display = 'block';
        filterOptionsDynamic();
    });
    
    searchInput.addEventListener('focus', function(e) {
        const rect = searchInput.getBoundingClientRect();
        optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        optionsContainer.style.left = rect.left + 'px';
        optionsContainer.style.width = rect.width + 'px';
        optionsContainer.style.display = 'block';
        filterOptionsDynamic();
    });
    
    searchInput.addEventListener('keydown', function(e) {
        const visibleOptions = Array.from(optionsContainer.getElementsByClassName('dropdown-option'))
            .filter(option => option.style.display !== 'none');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, visibleOptions.length - 1);
            updateSelectionDynamic(visibleOptions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelectionDynamic(visibleOptions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && visibleOptions[selectedIndex]) {
                visibleOptions[selectedIndex].click();
            } else if (visibleOptions.length > 0) {
                visibleOptions[0].click();
            }
        }
    });
    
    function updateSelectionDynamic(visibleOptions) {
        visibleOptions.forEach((option, index) => {
            option.style.backgroundColor = index === selectedIndex ? 'var(--surface-1)' : '';
        });
    }
    
    searchInput.addEventListener('input', function() {
        selectedIndex = -1;
        filterOptionsDynamic();
    });
    
    optionsContainer.addEventListener('click', async function(e) {
        if (e.target.classList.contains('dropdown-option')) {
            const product = JSON.parse(e.target.getAttribute('data-product'));
            searchInput.value = `${product.code} - ${product.name}`;
            hiddenInput.value = product.id;
            
            // Get UOM details
            const uomDetails = await getProductUOMDetails(product);
            row.dataset.productUomData = JSON.stringify(uomDetails);
            row.dataset.productId = product.id;
            
            // Set price
            row.querySelector('.price-cell input').value = product.trade_price || 0;
            
            // Set default values
            row.querySelector('.disc-percent-cell input').value = product.default_discount || 0;
            row.querySelector('.to-percent-cell input').value = product.trade_offer_discount || 0;
            row.querySelector('.foc-cell input').value = product.default_foc || 0;
            row.querySelector('.gst-percent-cell input').value = product.sales_tax || 0;
            
            optionsContainer.style.display = 'none';
            
            // Recalculate columns
            recalculateMaxColumns();
            
            // Load price history and stock
            const customerId = document.getElementById('customerCode').value;
            if (customerId) {
                loadPriceHistory(product.id);
            }
            loadProductStock(product.id);
            
            // Focus first unit input
            const firstUnitInput = row.querySelector('.unit-input');
            if (firstUnitInput) {
                firstUnitInput.focus();
            }
        }
    });
    
    document.addEventListener('click', function() {
        optionsContainer.style.display = 'none';
    });
    
    function filterOptionsDynamic() {
        const searchTerm = searchInput.value.toLowerCase();
        const options = optionsContainer.getElementsByClassName('dropdown-option');
        
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const text = option.textContent.toLowerCase();
            
            if (text.includes(searchTerm)) {
                option.style.display = 'block';
                option.style.backgroundColor = '';
            } else {
                option.style.display = 'none';
            }
        }
    }
}

// Update serial numbers after row deletion
function updateSerialNumbers() {
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rows = tbody.rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].cells[0].textContent = i + 1;
    }
}


// Save invoice with dynamic UOM data
function saveInvoice(status = 'Posted') {
    if (!validateForm()) return;
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isEditMode = editId !== null;
    
    const formData = {
        saleDate: document.getElementById('saleDate').value,
        customerId: document.getElementById('customerCode').value,
        subAccountId: document.getElementById('subAccount').value || null,
        companyId: document.getElementById('company').value || null,
        branchId: document.getElementById('branch').value,
        saleOrderId: document.getElementById('saleOrder').value || null,
        currencyId: document.getElementById('currency').value,
        salesOfficerId: document.getElementById('salesOfficer').value || null,
        supplierManId: document.getElementById('supplierMan').value || null,
        biltyNo: document.getElementById('biltyNo').value || null,
        transportName: document.getElementById('transportName').value || null,
        previousBalance: document.getElementById('previousBalance')?.value || '0.00',
        totalBill: parseFloat(document.getElementById('totalBill').textContent),
        totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent').value) || 0,
        totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount').value) || 0,
        shippingFees: parseFloat(document.getElementById('shippingFees').value) || 0,
        netAmount: parseFloat(document.getElementById('netAmount').textContent),
        withholdingTaxPercent: parseFloat(document.getElementById('withholdingTaxPercent')?.value) || 0,
        withholdingTaxAmount: parseFloat(document.getElementById('withholdingTaxAmount')?.textContent) || 0,
        paymentMethod: document.getElementById('paymentMethod').value || 'cash',
        bankAccountId: document.getElementById('bankAccount').value || null,
        amountPaid: parseFloat(document.getElementById('amountPaid')?.value) || 0,
        amountPaidAutoFill: document.querySelector('input[name="autoFillAmountPaid"]:checked')?.value || 'no',
        remarks: document.getElementById('remarks').value || null,
        status: status,
        items: []
    };
    
    if (isEditMode) {
        formData.invoice_id = editId;
    }
    
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rows = tbody.rows;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const unitInputs = row.querySelectorAll('.unit-input');
        const productId = row.cells[1].querySelector('.item-code').value;
        const salePrice = parseFloat(row.querySelector('.price-cell input').value);
        const grossAmount = parseFloat(row.querySelector('.gross-cell input').value);
        const discountPercent = parseFloat(row.querySelector('.disc-percent-cell input').value) || 0;
        const discountAmount = parseFloat(row.querySelector('.disc-amount-cell input').value) || 0;
        const tradeOfferPercent = parseFloat(row.querySelector('.to-percent-cell input').value) || 0;
        const tradeOfferAmount = parseFloat(row.querySelector('.to-amount-cell input').value) || 0;
        const gstPercent = parseFloat(row.querySelector('.gst-percent-cell input').value) || 0;
        const gstAmount = parseFloat(row.querySelector('.gst-amount-cell input').value) || 0;
        const focQty = parseFloat(row.querySelector('.foc-cell input').value) || 0;
        const netAmount = parseFloat(row.querySelector('.net-cell input').value);
        
        let isFirstUnit = true;
        unitInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty > 0) {
                const item = {
                    productId: productId,
                    uomId: input.dataset.unitId,
                    quantity: qty,
                    piece: 0,
                    carton: 0,
                    dozen: 0,
                    salePrice: salePrice,
                    grossAmount: isFirstUnit ? grossAmount : 0,
                    discountPercent: isFirstUnit ? discountPercent : 0,
                    discountAmount: isFirstUnit ? discountAmount : 0,
                    tradeOfferPercent: isFirstUnit ? tradeOfferPercent : 0,
                    tradeOfferAmount: isFirstUnit ? tradeOfferAmount : 0,
                    gstPercent: isFirstUnit ? gstPercent : 0,
                    gstAmount: isFirstUnit ? gstAmount : 0,
                    focQty: isFirstUnit ? focQty : 0,
                    netAmount: isFirstUnit ? netAmount : 0,
                    parentRowId: null,
                    stockAffects: parseInt(row.dataset.stockAffects) || 1,
                    invoiceAffects: parseInt(row.dataset.invoiceAffects) || 1
                };
                formData.items.push(item);
                isFirstUnit = false;
            }
        });
    }
    
    const apiUrl = isEditMode ? '../../../../server/api/sale/pos_invoice/pos-edit.php' : '../../../../server/api/sale/pos_invoice/pos-add.php';
    const method = isEditMode ? 'PUT' : 'POST';
    
    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (isEditMode) {
                alert('Invoice updated successfully!');
                window.location.href = 'pos-list.php';
            } else {
                window.lastInvoiceId = data.invoice_id;
                document.getElementById('successModal').style.display = 'flex';
            }
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        alert('Error saving invoice: ' + error.message);
    })
    .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
    });
}

// Validate form
function validateForm() {
    let isValid = true;
    
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    const requiredFields = [
        { id: 'company', errorId: 'companyError' },
        { id: 'customerCode', errorId: 'customerCodeError' },
        { id: 'branch', errorId: 'branchError' },
        { id: 'currency', errorId: 'currencyError' }
    ];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element.value) {
            element.classList.add('error');
            document.getElementById(field.errorId).style.display = 'block';
            isValid = false;
        }
    });
    
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    if (tbody.rows.length === 0) {
        alert('Please add at least one item to the invoice.');
        isValid = false;
    }
    
    const rows = tbody.rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = row.cells[1].querySelector('.item-code');
        const priceCell = row.querySelector('.price-cell');
        const price = priceCell ? priceCell.querySelector('input') : null;
        const unitInputs = row.querySelectorAll('.unit-input');
        let hasQty = false;
        
        unitInputs.forEach(input => {
            if (parseFloat(input.value) > 0) hasQty = true;
        });
        
        if (!code || !code.value || !price || !price.value || !hasQty) {
            alert('Please fill all required fields in the items table.');
            isValid = false;
            break;
        }
    }
    
    return isValid;
}