// Global variables
let productsData = [];
let uomData = [];

document.addEventListener('DOMContentLoaded', function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isEditMode = editId !== null;

    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    const addRowBtn = document.getElementById('addRowBtn');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const form = document.getElementById('invoiceForm');

    Promise.all([loadCustomers(), loadBranches(), loadProducts(), loadUOM(), loadCurrencies(), loadCompanies(), loadPaymentTerms()]).then(() => {
        initSearchableDropdown('customerCodeSearch', 'customerCodeOptions', 'customerCode');
        initSearchableDropdown('branchSearch', 'branchOptions', 'branch');
        applyInvoiceSettings();

        if (isEditMode) {
            loadInvoiceData(editId);
        } else {
            addRowDynamic();
        }
    });

    addRowBtn.addEventListener('click', addRowDynamic);
    resetBtn.addEventListener('click', resetForm);

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (validateForm()) {
            saveInvoice();
        }
    });

    // Button event listeners
    const viewDraftsBtn = document.getElementById('viewDraftsBtn');
    if (viewDraftsBtn) {
        viewDraftsBtn.addEventListener('click', function() {
            alert('View Drafts functionality - Coming soon!');
        });
    }

    const invoiceSettingsBtn = document.getElementById('invoiceSettingsBtn');
    const invoiceSettingsModal = document.getElementById('invoiceSettingsModal');
    if (invoiceSettingsBtn && invoiceSettingsModal) {
        invoiceSettingsBtn.addEventListener('click', function () {
            invoiceSettingsModal.style.display = 'flex';
        });
    }

    const closeInvoiceSettingsBtn = document.getElementById('closeInvoiceSettingsBtn');
    if (closeInvoiceSettingsBtn && invoiceSettingsModal) {
        closeInvoiceSettingsBtn.addEventListener('click', function () {
            invoiceSettingsModal.style.display = 'none';
        });
    }

    const saveInvoiceSettingsBtn = document.getElementById('saveInvoiceSettingsBtn');
    if (saveInvoiceSettingsBtn && invoiceSettingsModal) {
        saveInvoiceSettingsBtn.addEventListener('click', function () {
            invoiceSettingsModal.style.display = 'none';
            applyInvoiceSettings();
        });
    }

    const printSettingsBtn = document.getElementById('printSettingsBtn');
    const printSettingsModal = document.getElementById('printSettingsModal');
    if (printSettingsBtn && printSettingsModal) {
        printSettingsBtn.addEventListener('click', function () {
            printSettingsModal.style.display = 'flex';
        });
    }

    const closePrintSettingsBtn = document.getElementById('closePrintSettingsBtn');
    if (closePrintSettingsBtn && printSettingsModal) {
        closePrintSettingsBtn.addEventListener('click', function () {
            printSettingsModal.style.display = 'none';
        });
    }

    const savePrintSettingsBtn = document.getElementById('savePrintSettingsBtn');
    if (savePrintSettingsBtn && printSettingsModal) {
        savePrintSettingsBtn.addEventListener('click', function () {
            printSettingsModal.style.display = 'none';
        });
    }

    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            alert('Save as Draft functionality - Coming soon!');
        });
    }

    const salesReturnBtn = document.getElementById('salesReturnBtn');
    if (salesReturnBtn) {
        salesReturnBtn.addEventListener('click', function() {
            window.location.href = '../sale_return/return-add.php';
        });
    }

    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', function () {
            if (window.lastInvoiceId) {
                window.open(`invoice-print.php?id=${window.lastInvoiceId}`, '_blank');
            }
            const base = window.top.location.origin + window.top.location.pathname.replace(/\/client\/.*$/, '');
            window.top.location.href = base + '/client/pages/soda_book/soda-book-list.php';
        });
    }

    const printLaterBtn = document.getElementById('printLaterBtn');
    if (printLaterBtn) {
        printLaterBtn.addEventListener('click', function () {
            const base = window.top.location.origin + window.top.location.pathname.replace(/\/client\/.*$/, '');
            window.top.location.href = base + '/client/pages/soda_book/soda-book-list.php';
        });
    }

    const totalDiscountPercent = document.getElementById('totalDiscountPercent');
    if (totalDiscountPercent) totalDiscountPercent.addEventListener('input', updateInvoiceSummaryDynamic);

    const totalDiscountAmount = document.getElementById('totalDiscountAmount');
    if (totalDiscountAmount) totalDiscountAmount.addEventListener('input', updateInvoiceSummaryDynamic);

    const shippingFees = document.getElementById('shippingFees');
    if (shippingFees) shippingFees.addEventListener('input', updateInvoiceSummaryDynamic);

    document.getElementById('currency').addEventListener('change', updateCurrencySymbols);

    async function loadPaymentTerms() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-payment-terms.php');
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('paymentTerm');
                select.innerHTML = '<option value="">Select Payment Term</option>';
                data.payment_terms.forEach(term => {
                    const option = document.createElement('option');
                    option.value = term.id;
                    option.textContent = `${term.term_name} (${term.days} days)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading payment terms:', error);
        }
    }

    async function loadCustomers() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-customers.php');
            const data = await response.json();
            if (data.success) {
                const codeOptions = document.getElementById('customerCodeOptions');
                codeOptions.innerHTML = '';
                data.customers.forEach(customer => {
                    const codeOption = document.createElement('div');
                    codeOption.className = 'dropdown-option';
                    codeOption.setAttribute('data-value', customer.id);
                    codeOption.setAttribute('data-balance', customer.current_balance);
                    codeOption.textContent = `${customer.customer_code} - ${customer.customer_name}`;
                    codeOptions.appendChild(codeOption);
                });
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    async function loadBranches() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-branches.php');
            const data = await response.json();
            if (data.success) {
                const branchOptions = document.getElementById('branchOptions');
                branchOptions.innerHTML = '';
                let defaultBranch = null;
                
                data.branches.forEach(branch => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', branch.id);
                    const displayText = branch.parent_branch_name
                        ? `${branch.parent_branch_name} > ${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`
                        : `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`;
                    option.textContent = displayText;
                    branchOptions.appendChild(option);
                    
                    if (branch.is_default == 1) {
                        defaultBranch = { id: branch.id, text: displayText };
                    }
                });
                
                // Auto-select default branch
                if (defaultBranch) {
                    document.getElementById('branchSearch').value = defaultBranch.text;
                    document.getElementById('branch').value = defaultBranch.id;
                }
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    async function loadProducts() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-products.php');
            const data = await response.json();
            if (data.success) {
                productsData = data.products;
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    async function loadUOM() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-uom.php');
            const data = await response.json();
            if (data.success) {
                uomData = data.uoms;
            }
        } catch (error) {
            console.error('Error loading UOM:', error);
        }
    }

    async function loadCurrencies() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-currencies.php');
            const data = await response.json();
            if (data.success) {
                const currencySelect = document.getElementById('currency');
                currencySelect.innerHTML = '<option value="">Select Currency</option>';
                data.currencies.forEach(currency => {
                    const option = document.createElement('option');
                    option.value = currency.currency_id;
                    option.textContent = `${currency.code} - ${currency.name} (${currency.symbol})`;
                    option.setAttribute('data-symbol', currency.symbol);
                    if (currency.is_base_currency == 1) option.selected = true;
                    currencySelect.appendChild(option);
                });
                updateCurrencySymbols();
            }
        } catch (error) {
            console.error('Error loading currencies:', error);
        }
    }

    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-companies.php');
            const data = await response.json();
            if (data.success) {
                const companySelect = document.getElementById('company');
                companySelect.innerHTML = '<option value="">Select Company</option>';
                data.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = `${company.company_code} - ${company.company_name}`;
                    companySelect.appendChild(option);
                });
                if (data.companies.length === 1) companySelect.value = data.companies[0].id;
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    function updateCurrencySymbols() {
        const currencySelect = document.getElementById('currency');
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        const symbol = selectedOption ? selectedOption.getAttribute('data-symbol') : '';
        if (symbol) {
            const salePriceLabel = document.getElementById('salePriceLabel');
            const grossAmountLabel = document.getElementById('grossAmountLabel');
            const discountAmountLabel = document.getElementById('discountAmountLabel');
            const netAmountLabel = document.getElementById('netAmountLabel');
            const totalBillLabel = document.getElementById('totalBillLabel');
            const totalDiscountAmountLabel = document.getElementById('totalDiscountAmountLabel');
            const netAmountSummaryLabel = document.getElementById('netAmountSummaryLabel');

            if (salePriceLabel) salePriceLabel.textContent = `Sale Price (${symbol})`;
            if (grossAmountLabel) grossAmountLabel.textContent = `Gross Amount (${symbol})`;
            if (discountAmountLabel) discountAmountLabel.textContent = `Discount Amount (${symbol})`;
            if (netAmountLabel) netAmountLabel.textContent = `Net Amount (${symbol})`;
            if (totalBillLabel) totalBillLabel.textContent = `Total Bill (${symbol})`;
            if (totalDiscountAmountLabel) totalDiscountAmountLabel.textContent = `Discount Amount (${symbol})`;
            if (netAmountSummaryLabel) netAmountSummaryLabel.textContent = `Net Amount (${symbol})`;
        }
    }

    function addRowDynamic() {
        const rowCount = itemsTable.rows.length;
        const row = itemsTable.insertRow();

        const cell0 = row.insertCell(0);
        cell0.textContent = rowCount + 1;

        const cell1 = row.insertCell(1);
        const codeContainer = document.createElement('div');
        codeContainer.className = 'searchable-dropdown';
        const codeOptionsHtml = productsData.map(product => {
            const photoHtml = product.photo ? `<img src="../../../assets/uploads/products/${product.photo}" alt="${product.name}" style="width: 30px; height: 30px; object-fit: cover; margin-right: 8px; border-radius: 4px;">` : '';
            return `<div class="dropdown-option" data-product='${JSON.stringify(product)}' style="display: flex; align-items: center;">${photoHtml}${product.code} - ${product.name}</div>`;
        }).join('');

        codeContainer.innerHTML = `
            <input type="text" class="search-input table-input" placeholder="Search product..." autocomplete="off">
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

        const priceCell = row.insertCell(2);
        priceCell.className = 'price-cell';
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'table-input';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.required = true;
        priceInput.addEventListener('input', function () {
            calculateTotalQuantity(row);
        });
        priceCell.appendChild(priceInput);

        const grossCell = row.insertCell(3);
        grossCell.className = 'gross-cell';
        const grossInput = document.createElement('input');
        grossInput.type = 'text';
        grossInput.className = 'table-input';
        grossInput.readOnly = true;
        grossInput.value = '0.00';
        grossInput.tabIndex = -1;
        grossCell.appendChild(grossInput);

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
            calculateTotalQuantity(row);
        });
        discPercentCell.appendChild(discPercentInput);

        const discAmountCell = row.insertCell(5);
        discAmountCell.className = 'disc-amount-cell';
        const discAmountInput = document.createElement('input');
        discAmountInput.type = 'number';
        discAmountInput.className = 'table-input';
        discAmountInput.min = '0';
        discAmountInput.step = '0.01';
        discAmountInput.value = '0.00';
        discAmountCell.appendChild(discAmountInput);

        const netCell = row.insertCell(6);
        netCell.className = 'net-cell';
        const netInput = document.createElement('input');
        netInput.type = 'text';
        netInput.className = 'table-input';
        netInput.readOnly = true;
        netInput.value = '0.00';
        netInput.tabIndex = -1;
        netCell.appendChild(netInput);

        const actionsCell = row.insertCell(7);
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.tabIndex = -1;
        deleteBtn.addEventListener('click', function () {
            if (itemsTable.rows.length > 1) {
                const searchInput = row.cells[1].querySelector('.search-input');
                if (searchInput.dropdownOptions) searchInput.dropdownOptions.remove();
                row.remove();
                updateSerialNumbers();
                recalculateMaxColumns();
                updateInvoiceSummaryDynamic();
            } else {
                alert('Cannot delete the only row.');
            }
        });
        actionsCell.appendChild(deleteBtn);

        applyInvoiceSettings();
    }

    function initTableDropdownDynamic(container, row) {
        const searchInput = container.querySelector('.search-input');
        const optionsContainer = searchInput.dropdownOptions;
        const hiddenInput = container.querySelector('input[type="hidden"]');

        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();
            const rect = searchInput.getBoundingClientRect();
            optionsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
            optionsContainer.style.left = rect.left + 'px';
            optionsContainer.style.width = rect.width + 'px';
            optionsContainer.style.display = 'block';
            filterOptionsDynamic();
        });

        searchInput.addEventListener('input', filterOptionsDynamic);

        optionsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                const product = JSON.parse(e.target.getAttribute('data-product'));
                searchInput.value = `${product.code} - ${product.name}`;
                hiddenInput.value = product.id;

                const uomDetails = getProductUOMDetails(product);
                row.dataset.productUomData = JSON.stringify(uomDetails);
                row.dataset.productId = product.id;

                row.querySelector('.price-cell input').value = product.sale_price || 0;
                row.querySelector('.disc-percent-cell input').value = product.default_discount || 0;

                optionsContainer.style.display = 'none';
                recalculateMaxColumns();
                calculateTotalQuantity(row);
            }
        });

        document.addEventListener('click', function () {
            optionsContainer.style.display = 'none';
        });

        function filterOptionsDynamic() {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');
            for (let option of options) {
                option.style.display = option.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
            }
        }
    }

    function initSearchableDropdown(searchInputId, optionsContainerId, hiddenInputId) {
        const searchInput = document.getElementById(searchInputId);
        const optionsContainer = document.getElementById(optionsContainerId);
        const hiddenInput = document.getElementById(hiddenInputId);

        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();
            optionsContainer.style.display = 'block';
        });

        searchInput.addEventListener('input', function () {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');
            for (let option of options) {
                option.style.display = option.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
            }
        });

        optionsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                searchInput.value = e.target.textContent;
                hiddenInput.value = e.target.getAttribute('data-value');

                if (hiddenInputId === 'customerCode') {
                    const balance = parseFloat(e.target.getAttribute('data-balance'));
                    document.getElementById('previousBalance').value = `${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toFixed(2)}`;
                }

                optionsContainer.style.display = 'none';
            }
        });

        document.addEventListener('click', function () {
            optionsContainer.style.display = 'none';
        });
    }

    function updateSerialNumbers() {
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            rows[i].cells[0].textContent = i + 1;
        }
    }

    function validateForm() {
        const requiredFields = [
            { id: 'company' },
            { id: 'customerCode' },
            { id: 'branch' },
            { id: 'currency' }
        ];

        let isValid = true;
        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            if (!input.value) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        if (itemsTable.rows.length === 0) {
            alert('Please add at least one item');
            isValid = false;
        }

        return isValid;
    }

    async function saveInvoice() {
        const items = [];
        for (let row of itemsTable.rows) {
            const productId = row.cells[1].querySelector('.item-code').value;
            if (!productId) continue;

            const unitInputs = row.querySelectorAll('.unit-input');
            const unitEntries = [];

            unitInputs.forEach(input => {
                const qty = parseFloat(input.value) || 0;
                if (qty > 0) {
                    unitEntries.push({
                        uomId: input.dataset.unitId,
                        quantity: qty
                    });
                }
            });

            if (unitEntries.length === 0) continue;

            items.push({
                productId: productId,
                unitEntries: unitEntries,
                salePrice: parseFloat(row.querySelector('.price-cell input').value) || 0,
                grossAmount: parseFloat(row.querySelector('.gross-cell input').value) || 0,
                discountPercent: parseFloat(row.querySelector('.disc-percent-cell input').value) || 0,
                discountAmount: parseFloat(row.querySelector('.disc-amount-cell input').value) || 0,
                netAmount: parseFloat(row.querySelector('.net-cell input').value) || 0
            });
        }

        const invoiceData = {
            companyId: document.getElementById('company').value,
            saleDate: document.getElementById('saleDate').value,
            customerId: document.getElementById('customerCode').value,
            branchId: document.getElementById('branch').value,
            currencyId: document.getElementById('currency').value,
            previousBalance: document.getElementById('previousBalance').value,
            paymentTermId: document.getElementById('paymentTerm').value || null,
            totalBill: parseFloat(document.getElementById('totalBill').textContent),
            totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent').value) || 0,
            totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount').value) || 0,
            totalGSTPercent: 0,
            totalGSTAmount: 0,
            shippingFees: parseFloat(document.getElementById('shippingFees').value) || 0,
            freight: parseFloat(document.getElementById('freight').value) || 0,
            biltyNo: document.getElementById('biltyNo').value || null,
            transportName: document.getElementById('transportName').value || null,
            rpoNo: document.getElementById('rpoNo').value || null,
            broker: document.getElementById('broker').value,
            deliveredDate: document.getElementById('deliveredDate').value || null,
            millName: document.getElementById('millName').value,
            truckNo: document.getElementById('truckNo').value,
            goods: document.getElementById('goods').value,
            mobileNo: document.getElementById('mobileNo').value,
            netAmount: parseFloat(document.getElementById('netAmount').textContent),
            remarks: document.getElementById('remarks').value,
            items: items
        };

        if (isEditMode) invoiceData.invoice_id = editId;

        console.log('Saving invoice data:', invoiceData);

        try {
            const url = isEditMode ? '../../../../server/api/sale/sale_order/order-edit.php' : '../../../../server/api/sale/sale_order/order-add.php';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (data.success) {
                if (isEditMode) {
                    alert('Sale order updated successfully!');
                    window.location.href = 'order-list.php';
                } else {
                    const successModal = document.getElementById('successModal');
                    if (successModal) successModal.style.display = 'flex';
                    window.lastInvoiceId = data.invoice_id;
                }
            } else {
                alert('Error: ' + data.message);
                console.error('Save error:', data);
            }
        } catch (error) {
            alert('Error saving sale order: ' + error.message);
            console.error('Fetch error:', error);
        }
    }

    function resetForm() {
        if (confirm('Are you sure you want to reset the form?')) {
            window.location.reload();
        }
    }

    function applyInvoiceSettings() {
        // Apply column visibility based on settings
    }

    async function loadInvoiceData(invoiceId) {
        try {
            const response = await fetch(`../../../../server/api/sale/sale_order/order-edit.php?id=${invoiceId}`);
            const data = await response.json();

            if (data.success) {
                const invoiceData = data.invoice;

                document.getElementById('saleDate').value = invoiceData.sale_date;
                document.getElementById('company').value = invoiceData.company_id || '';
                document.getElementById('customerCodeSearch').value = `${invoiceData.customer_code} - ${invoiceData.customer_name}`;
                document.getElementById('customerCode').value = invoiceData.customer_id;
                document.getElementById('previousBalance').value = invoiceData.previous_balance;
                
                const branchText = invoiceData.parent_branch_name
                    ? `${invoiceData.parent_branch_name} > ${invoiceData.branch_name} (${invoiceData.branch_type})`
                    : `${invoiceData.branch_name} (${invoiceData.branch_type})`;
                document.getElementById('branchSearch').value = branchText;
                document.getElementById('branch').value = invoiceData.branch_id;
                
                document.getElementById('currency').value = invoiceData.currency_id;
                document.getElementById('remarks').value = invoiceData.remarks || '';
                document.getElementById('biltyNo').value = invoiceData.bilty_no || '';
                document.getElementById('transportName').value = invoiceData.transport_name || '';
                document.getElementById('rpoNo').value = invoiceData.rpo_no || '';
                document.getElementById('broker').value = invoiceData.broker || '';
                document.getElementById('deliveredDate').value = invoiceData.delivered_date || '';
                document.getElementById('millName').value = invoiceData.mill_name || '';
                document.getElementById('truckNo').value = invoiceData.truck_no || '';
                document.getElementById('goods').value = invoiceData.goods || '';
                document.getElementById('mobileNo').value = invoiceData.mobile_no || '';
                document.getElementById('freight').value = invoiceData.freight || 0;
                document.getElementById('paymentTerm').value = invoiceData.payment_term_id || '';

                updateCurrencySymbols();

                // Clear existing items
                while (itemsTable.rows.length > 0) {
                    itemsTable.deleteRow(0);
                }

                // Add items from invoice
                data.items.forEach(item => {
                    addRowDynamic();
                    const lastRow = itemsTable.rows[itemsTable.rows.length - 1];

                    const product = productsData.find(p => p.id == item.product_id);
                    if (product) {
                        lastRow.cells[1].querySelector('.search-input').value = `${item.product_code} - ${item.product_name}`;
                        lastRow.cells[1].querySelector('.item-code').value = item.product_id;

                        const uomDetails = getProductUOMDetails(product);
                        lastRow.dataset.productUomData = JSON.stringify(uomDetails);
                        lastRow.dataset.productId = product.id;

                        lastRow.querySelector('.price-cell input').value = item.sale_price;
                        lastRow.querySelector('.disc-percent-cell input').value = item.discount_percent;
                        lastRow.querySelector('.disc-amount-cell input').value = item.discount_amount;
                        lastRow.querySelector('.gross-cell input').value = item.gross_amount;
                        lastRow.querySelector('.net-cell input').value = item.net_amount;
                    }
                });

                recalculateMaxColumns();

                // Set unit values for all rows
                data.items.forEach((item, index) => {
                    const row = itemsTable.rows[index];
                    item.unit_entries.forEach(entry => {
                        const unitInput = row.querySelector(`.unit-input[data-unit-id="${entry.uom_id}"]`);
                        if (unitInput) {
                            unitInput.value = entry.quantity;
                        }
                    });
                    calculateTotalQuantity(row);
                });

                // Update summary
                document.getElementById('totalDiscountPercent').value = invoiceData.total_discount_percent;
                document.getElementById('totalDiscountAmount').value = invoiceData.total_discount_amount;
                updateInvoiceSummaryDynamic();

                document.querySelector('.page-title').textContent = `Edit Sale Order - ${invoiceData.bill_no}`;
            } else {
                alert('Error loading order: ' + data.message);
                window.location.href = 'order-list.php';
            }
        } catch (error) {
            console.error('Error loading order:', error);
            alert('Error loading order data: ' + error.message);
            window.location.href = 'order-list.php';
        }
    }
});

// Global helper functions
function openOverlay(url) {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    if (modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
    }
}

function closeOverlay() {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    if (modal && iframe) {
        modal.style.display = 'none';
        iframe.src = '';
    }
}


// ── Payment Terms Modal ──
(function () {
    const API = '../../../../server/api/sale/sale_order/payment-terms-crud.php';

    function openModal() {
        document.getElementById('paymentTermsModal').style.display = 'flex';
        loadPtList();
    }

    function closeModal() {
        document.getElementById('paymentTermsModal').style.display = 'none';
        resetForm();
    }

    function resetForm() {
        document.getElementById('ptEditId').value = '';
        document.getElementById('ptTermName').value = '';
        document.getElementById('ptDays').value = '';
        document.getElementById('ptCancelEditBtn').style.display = 'none';
        document.getElementById('ptSaveBtn').innerHTML = '<i class="fas fa-save"></i> Save';
    }

    async function loadPtList() {
        const tbody = document.getElementById('ptTableBody');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--subtext);">Loading...</td></tr>';
        try {
            const res = await fetch(API);
            const data = await res.json();
            tbody.innerHTML = '';
            if (!data.success || data.payment_terms.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--subtext);">No records found</td></tr>';
                return;
            }
            data.payment_terms.forEach(pt => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px 6px;border-bottom:1px solid var(--border-default);">${pt.term_name}</td>
                    <td style="padding:8px 6px;border-bottom:1px solid var(--border-default);text-align:center;">${pt.days}</td>
                    <td style="padding:8px 6px;border-bottom:1px solid var(--border-default);text-align:center;">
                        <div style="display:flex;gap:4px;justify-content:center;">
                            <button class="btn btn-primary btn-sm pt-edit-btn" data-id="${pt.id}" data-name="${pt.term_name}" data-days="${pt.days}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-sm pt-delete-btn" data-id="${pt.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll('.pt-edit-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    document.getElementById('ptEditId').value = this.dataset.id;
                    document.getElementById('ptTermName').value = this.dataset.name;
                    document.getElementById('ptDays').value = this.dataset.days;
                    document.getElementById('ptCancelEditBtn').style.display = '';
                    document.getElementById('ptSaveBtn').innerHTML = '<i class="fas fa-save"></i> Update';
                    document.getElementById('ptTermName').focus();
                });
            });

            tbody.querySelectorAll('.pt-delete-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    if (!confirm('Delete this payment term?')) return;
                    await fetch(`${API}?id=${this.dataset.id}`, { method: 'DELETE' });
                    loadPtList();
                    reloadPaymentTermsDropdown();
                });
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--error);">Error loading</td></tr>';
        }
    }

    async function reloadPaymentTermsDropdown() {
        try {
            const res = await fetch('../../../../server/api/sale/sale_order/get-payment-terms.php');
            const data = await res.json();
            if (data.success) {
                const select = document.getElementById('paymentTerm');
                const current = select.value;
                select.innerHTML = '<option value="">Select Payment Term</option>';
                data.payment_terms.forEach(term => {
                    const opt = document.createElement('option');
                    opt.value = term.id;
                    opt.textContent = `${term.term_name} (${term.days} days)`;
                    select.appendChild(opt);
                });
                select.value = current;
            }
        } catch (e) {}
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('addPaymentTermBtn').addEventListener('click', openModal);
        document.getElementById('closePaymentTermsBtn').addEventListener('click', closeModal);
        document.getElementById('paymentTermsModal').addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
        document.getElementById('ptCancelEditBtn').addEventListener('click', resetForm);

        document.getElementById('ptSaveBtn').addEventListener('click', async function () {
            const id = document.getElementById('ptEditId').value;
            const term_name = document.getElementById('ptTermName').value.trim();
            const days = document.getElementById('ptDays').value;
            if (!term_name) { alert('Term name is required'); return; }

            const method = id ? 'PUT' : 'POST';
            const body = id ? { id: parseInt(id), term_name, days: parseInt(days) } : { term_name, days: parseInt(days) };

            const res = await fetch(API, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) {
                resetForm();
                loadPtList();
                reloadPaymentTermsDropdown();
            } else {
                alert('Error: ' + data.message);
            }
        });
    });
})();
