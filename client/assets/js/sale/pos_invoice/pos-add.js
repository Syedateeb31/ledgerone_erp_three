// Minimal loader: import modular core and legacy implementation
(async function () {
    try {
        await import('./pos-add-core.js');
        await import('./pos-add-legacy.js');
        console.info('pos-add modules loaded');
    } catch (err) {
        console.error('Failed to load pos-add modules', err);
    }
})();

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
    totalDiscountPercent.addEventListener('input', function () {
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
    copyNetAmountBtn.addEventListener('click', function () {
        const netAmount = parseFloat(document.getElementById('netAmount').textContent) || 0;
        document.getElementById('amountPaid').value = netAmount.toFixed(2);
        updateRemainingBalance();
    });
}

// Auto-fill Amount Paid radio buttons
const autoFillRadios = document.querySelectorAll('input[name="autoFillAmountPaid"]');
autoFillRadios.forEach(radio => {
    radio.addEventListener('change', function () {
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

// Load product stock (delegates network call to pos-add-data)
async function loadProductStock(productId) {
    const branchId = document.getElementById('branch')?.value;
    if (!productId) {
        const sc = document.getElementById('stockContainer'); if (sc) sc.style.display = 'none';
        return;
    }

    try {
        const data = await (window.posData?.loadProductStock ? window.posData.loadProductStock(productId) : fetch(`../../../../server/api/sale/pos_invoice/get-product-stock.php?product_id=${productId}${branchId ? `&branch_id=${branchId}` : ''}`).then(r => r.json()));

        if (data && data.success) {
            const stock = parseFloat(data.stock);
            const stockColor = stock > 0 ? 'var(--success)' : 'var(--error)';
            const sc = document.getElementById('stockContent');
            if (sc) sc.innerHTML = `<div style="color: ${stockColor}; font-weight: 600;">${stock.toFixed(2)} units</div>`;
            const scWrap = document.getElementById('stockContainer'); if (scWrap) scWrap.style.display = 'block';
        } else {
            const scWrap = document.getElementById('stockContainer'); if (scWrap) scWrap.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading stock:', error);
        const scWrap = document.getElementById('stockContainer'); if (scWrap) scWrap.style.display = 'none';
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
        label.addEventListener('click', function () {
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

// Load customers - delegates fetch to data module and updates UI
async function loadCustomers() {
    try {
        const data = await (window.posData?.loadCustomers ? window.posData.loadCustomers() : fetch('../../../../server/api/sale/pos_invoice/get-customers.php').then(r => r.json()));

        if (data && data.success) {
            customersData = data.customers;
            // delegate rendering and caching to UI module
            if (window.posUI && typeof window.posUI.renderCustomerOptions === 'function') {
                window.posUI.renderCustomerOptions(data.customers, dataCache);
            } else {
                // fallback: inline render (keeps previous behavior)
                const codeOptions = document.getElementById('customerCodeOptions');
                if (codeOptions) {
                    codeOptions.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    data.customers.forEach(customer => {
                        dataCache.customers.set(customer.id, customer);
                        const codeOption = document.createElement('div');
                        codeOption.className = 'dropdown-option';
                        codeOption.setAttribute('data-value', customer.id);
                        codeOption.textContent = `${customer.customer_code} | ${customer.customer_name} | ${customer.address || 'N/A'}`;
                        fragment.appendChild(codeOption);
                    });
                    codeOptions.appendChild(fragment);
                }
            }
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load products - delegates fetch to data module and updates caches
async function loadProducts() {
    try {
        const data = await (window.posData?.loadProducts ? window.posData.loadProducts() : fetch('../../../../server/api/sale/pos_invoice/get-products.php').then(r => r.json()));

        if (data && data.success) {
            productsData = data.products;
            if (window.posUI && typeof window.posUI.cacheProducts === 'function') {
                window.posUI.cacheProducts(data.products, dataCache);
            } else {
                data.products.forEach(product => {
                    dataCache.products.set(product.id, product);
                });
            }
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
    priceInput.addEventListener('input', function () {
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
    discPercentInput.addEventListener('input', function () {
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
    toPercentInput.addEventListener('input', function () {
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
    gstPercentInput.addEventListener('input', function () {
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
    deleteBtn.addEventListener('click', function () {
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

    searchInput.addEventListener('click', function (e) {
        e.stopPropagation();
        const rect = searchInput.getBoundingClientRect();
        optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        optionsContainer.style.left = rect.left + 'px';
        optionsContainer.style.width = rect.width + 'px';
        optionsContainer.style.display = 'block';
        filterOptionsDynamic();
    });

    searchInput.addEventListener('focus', function (e) {
        const rect = searchInput.getBoundingClientRect();
        optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
        optionsContainer.style.left = rect.left + 'px';
        optionsContainer.style.width = rect.width + 'px';
        optionsContainer.style.display = 'block';
        filterOptionsDynamic();
    });

    searchInput.addEventListener('keydown', function (e) {
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

    searchInput.addEventListener('input', function () {
        selectedIndex = -1;
        filterOptionsDynamic();
    });

    optionsContainer.addEventListener('click', async function (e) {
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

    document.addEventListener('click', function () {
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