// Global variables for products and UOM data
let productsData = [];
let uomData = [];

document.addEventListener('DOMContentLoaded', function () {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    
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
    Promise.all([loadSuppliers(), loadBranches(), loadProducts(), loadUOM(), loadCurrencies(), loadPurchaseInvoices(), loadCompanies()]).then(() => {
        initSearchableDropdown('supplierCodeSearch', 'supplierCodeOptions', 'supplierCode');
        initSearchableDropdown('branchSearch', 'branchOptions', 'branch');
        initSearchableDropdown('purchaseInvoiceSearch', 'purchaseInvoiceOptions', 'purchaseInvoice');
        
        // Apply invoice settings
        applyInvoiceSettings();
        
        if (isEditMode) {
            loadInvoiceData(editId);
        } else {
            // Add first row after data is loaded
            addRow();
        }
    });

    // Add row button event
    addRowBtn.addEventListener('click', addRow);

    // Add supplier button event
    document.getElementById('addSupplierBtn').addEventListener('click', function() {
        document.getElementById('supplierIframe').src = '../../customer_supplier/suppliers/supplier-add.php';
        document.getElementById('addSupplierModal').style.display = 'flex';
    });

    // Add product button event
    document.getElementById('addProductBtn').addEventListener('click', function() {
        document.getElementById('productIframe').src = '../../inventory/products/product-add.php';
        document.getElementById('addProductModal').style.display = 'flex';
    });

    // Close supplier modal
    document.getElementById('closeSupplierModalBtn').addEventListener('click', function() {
        document.getElementById('addSupplierModal').style.display = 'none';
        document.getElementById('supplierIframe').src = '';
        loadSuppliers();
    });

    // Close product modal
    document.getElementById('closeProductModalBtn').addEventListener('click', function() {
        document.getElementById('addProductModal').style.display = 'none';
        document.getElementById('productIframe').src = '';
        loadProducts();
    });

    // Close modals when clicking outside
    document.getElementById('addSupplierModal').addEventListener('click', function(e) {
        if (e.target === this) {
            document.getElementById('closeSupplierModalBtn').click();
        }
    });

    document.getElementById('addProductModal').addEventListener('click', function(e) {
        if (e.target === this) {
            document.getElementById('closeProductModalBtn').click();
        }
    });

    // Reset button event
    resetBtn.addEventListener('click', resetForm);

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (validateForm()) {
            saveInvoice();
        }
    });
    
    // Tab navigation from Save Invoice button to Supplier Code
    saveBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('supplierCodeSearch').focus();
        }
    });

    // Load suppliers from API
    async function loadSuppliers() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-suppliers.php');
            const data = await response.json();
            
            if (data.success) {
                const codeOptions = document.getElementById('supplierCodeOptions');
                
                codeOptions.innerHTML = '';
                
                data.suppliers.forEach(supplier => {
                    const codeOption = document.createElement('div');
                    codeOption.className = 'dropdown-option';
                    codeOption.setAttribute('data-value', supplier.id);
                    codeOption.setAttribute('data-balance', supplier.current_balance);
                    codeOption.textContent = `${supplier.supplier_code} - ${supplier.supplier_name}`;
                    codeOptions.appendChild(codeOption);
                });
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    }

    // Load sub-accounts based on supplier
    async function loadSubAccounts(supplierId) {
        try {
            const response = await fetch(`../../../../server/api/purchase/purchase_return/get-sub-accounts.php?supplier_id=${supplierId}`);
            const data = await response.json();
            
            const subAccountSelect = document.getElementById('subAccount');
            subAccountSelect.innerHTML = '<option value="">Select Sub Account</option>';
            
            if (data.success && data.sub_accounts.length > 0) {
                data.sub_accounts.forEach(subAccount => {
                    const option = document.createElement('option');
                    option.value = subAccount.id;
                    option.textContent = subAccount.sub_account_name;
                    subAccountSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading sub-accounts:', error);
        }
    }

    // Load branches from API
    async function loadBranches() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-branches.php');
            const data = await response.json();
            
            if (data.success) {
                const branchOptions = document.getElementById('branchOptions');
                branchOptions.innerHTML = '';
                
                data.branches.forEach(branch => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', branch.id);
                    const displayText = branch.parent_branch_name 
                        ? `${branch.parent_branch_name} > ${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`
                        : `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`;
                    option.textContent = displayText;
                    branchOptions.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    // Load purchase invoices from API
    async function loadPurchaseInvoices() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-purchase-invoices.php');
            const data = await response.json();
            
            if (data.success) {
                const invoiceOptions = document.getElementById('purchaseInvoiceOptions');
                invoiceOptions.innerHTML = '';
                
                data.invoices.forEach(invoice => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', invoice.id);
                    const amount = parseFloat(invoice.net_amount).toFixed(2);
                    option.textContent = `${invoice.bill_no} - ${invoice.supplier_name} (${invoice.purchase_date}) - ${invoice.currency_symbol} ${amount}`;
                    invoiceOptions.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading purchase invoices:', error);
        }
    }

    // Load purchase invoice details and populate form
    async function loadPurchaseInvoiceDetails(invoiceId) {
        try {
            const response = await fetch(`../../../../server/api/purchase/purchase_return/get-purchase-invoice-details.php?id=${invoiceId}`);
            const data = await response.json();
            
            if (data.success) {
                const invoice = data.invoice;
                
                // Populate form fields
                document.getElementById('purchaseDate').value = invoice.purchase_date;
                document.getElementById('supplierCodeSearch').value = `${invoice.supplier_code} - ${invoice.supplier_name}`;
                document.getElementById('supplierCode').value = invoice.supplier_id;
                const balance = parseFloat(invoice.current_balance);
                document.getElementById('previousBalance').value = `${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toFixed(2)}`;
                const branchText = invoice.parent_branch_name 
                    ? `${invoice.parent_branch_name} > ${invoice.branch_code} - ${invoice.branch_name} (${invoice.branch_type})`
                    : `${invoice.branch_code} - ${invoice.branch_name} (${invoice.branch_type})`;
                document.getElementById('branchSearch').value = branchText;
                document.getElementById('branch').value = invoice.branch_id;
                document.getElementById('currency').value = invoice.currency_id;
                document.getElementById('biltyNo').value = invoice.bilty_no || '';
                document.getElementById('transportName').value = invoice.transport_name || '';
                document.getElementById('remarks').value = invoice.remarks || '';
                
                // Populate company
                if (invoice.company_id) {
                    document.getElementById('company').value = invoice.company_id;
                }
                
                // Update currency symbols
                updateCurrencySymbols();
                
                // Clear existing items
                itemsTable.innerHTML = '';
                
                // Load invoice items
                data.items.forEach(item => {
                    addRow();
                    const lastRow = itemsTable.rows[itemsTable.rows.length - 1];
                    
                    // Populate item data
                    lastRow.cells[1].querySelector('.search-input').value = item.product_name;
                    lastRow.cells[1].querySelector('.item-code').value = item.product_id;
                    lastRow.cells[2].querySelector('select').value = item.uom_id;
                    lastRow.cells[3].querySelector('input').value = item.quantity;
                    lastRow.cells[4].querySelector('input').value = item.purchase_price;
                    lastRow.cells[5].querySelector('input').value = item.gross_amount;
                    lastRow.cells[6].querySelector('input').value = item.discount_percent;
                    lastRow.cells[7].querySelector('input').value = item.discount_amount;
                    lastRow.cells[8].querySelector('input').value = item.trade_offer_percent || 0;
                    lastRow.cells[9].querySelector('input').value = item.trade_offer_amount || 0;
                    lastRow.cells[10].querySelector('input').value = item.gst_percent || 0;
                    lastRow.cells[11].querySelector('input').value = item.gst_amount || 0;
                    lastRow.cells[12].querySelector('input').value = item.foc_quantity || 0;
                    lastRow.cells[13].querySelector('input').value = item.net_amount;
                });
                
                // Update summary
                document.getElementById('totalDiscountPercent').value = invoice.total_discount_percent;
                document.getElementById('totalDiscountAmount').value = invoice.total_discount_amount;
                document.getElementById('totalGSTPercent').value = invoice.total_gst_percent || 0;
                document.getElementById('totalGSTAmount').value = invoice.total_gst_amount || 0;
                document.getElementById('shippingFees').value = invoice.shipping_fees || 0;
                updateInvoiceSummary();
            } else {
                alert('Error loading invoice details: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading invoice details:', error);
            alert('Error loading invoice details');
        }
    }



    // Load products from API
    async function loadProducts() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-products.php');
            const data = await response.json();
            
            if (data.success) {
                productsData = data.products;
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Load UOM from API
    async function loadUOM() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-uom.php');
            const data = await response.json();
            
            if (data.success) {
                uomData = data.uoms;
            }
        } catch (error) {
            console.error('Error loading UOM:', error);
        }
    }

    // Load currencies from API
    async function loadCurrencies() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-currencies.php');
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

    // Load companies from API
    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/purchase/purchase_return/get-companies.php');
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
                if (data.companies.length === 1) {
                    companySelect.value = data.companies[0].id;
                }
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }
    
    // Update currency symbols in labels and values
    function updateCurrencySymbols() {
        const currencySelect = document.getElementById('currency');
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        const symbol = selectedOption ? selectedOption.getAttribute('data-symbol') : '';
        
        if (symbol) {
            // Update table headers
            document.getElementById('purchasePriceLabel').textContent = `Purchase Price (${symbol})`;
            document.getElementById('grossAmountLabel').textContent = `Gross Amount (${symbol})`;
            document.getElementById('discountAmountLabel').textContent = `Discount Amount (${symbol})`;
            document.getElementById('netAmountLabel').textContent = `Net Amount (${symbol})`;
            
            // Update summary labels
            document.getElementById('totalBillLabel').textContent = `Total Bill (${symbol})`;
            document.getElementById('totalDiscountAmountLabel').textContent = `Discount Amount (${symbol})`;
            document.getElementById('netAmountSummaryLabel').textContent = `Net Amount (${symbol})`;
        }
    }
    
    // Add currency change event listener
    document.getElementById('currency').addEventListener('change', updateCurrencySymbols);
    
    // Load invoice data for editing
    async function loadInvoiceData(invoiceId) {
        try {
            const response = await fetch(`../../../../server/api/purchase/purchase_return/return-edit.php?id=${invoiceId}`);
            const data = await response.json();
            
            if (data.success) {
                const invoice = data.invoice;
                
                // Populate form fields
                document.getElementById('purchaseDate').value = invoice.purchase_date;
                document.getElementById('purchaseInvoiceSearch').value = invoice.purchase_invoice_no || '';
                document.getElementById('purchaseInvoice').value = invoice.purchase_invoice_id || '';
                document.getElementById('biltyNo').value = invoice.bilty_no || '';
                document.getElementById('transportName').value = invoice.transport_name || '';
                document.getElementById('supplierCodeSearch').value = invoice.supplier_name;
                document.getElementById('supplierCode').value = invoice.supplier_id;
                
                // Load sub-accounts and set selected value
                await loadSubAccounts(invoice.supplier_id);
                if (invoice.sub_account_id) {
                    document.getElementById('subAccount').value = invoice.sub_account_id;
                }
                
                const branchText = invoice.parent_branch_name 
                    ? `${invoice.parent_branch_name} > ${invoice.branch_code} - ${invoice.branch_name} (${invoice.branch_type})`
                    : `${invoice.branch_code} - ${invoice.branch_name} (${invoice.branch_type})`;
                document.getElementById('branchSearch').value = branchText;
                document.getElementById('branch').value = invoice.branch_id;
                document.getElementById('currency').value = invoice.currency_id;
                document.getElementById('company').value = invoice.company_id || '';
                document.getElementById('previousBalance').value = invoice.previous_balance;
                document.getElementById('remarks').value = invoice.remarks || '';
                
                // Update currency symbols
                updateCurrencySymbols();
                
                // Load invoice items
                data.items.forEach(item => {
                    addRow();
                    const lastRow = itemsTable.rows[itemsTable.rows.length - 1];
                    
                    // Populate item data
                    lastRow.cells[1].querySelector('.search-input').value = item.product_name;
                    lastRow.cells[1].querySelector('.item-code').value = item.product_id;
                    lastRow.cells[2].querySelector('select').value = item.uom_id;
                    lastRow.cells[3].querySelector('input').value = item.quantity;
                    lastRow.cells[4].querySelector('input').value = item.purchase_price;
                    lastRow.cells[5].querySelector('input').value = item.gross_amount;
                    lastRow.cells[6].querySelector('input').value = item.discount_percent;
                    lastRow.cells[7].querySelector('input').value = item.discount_amount;
                    lastRow.cells[8].querySelector('input').value = item.trade_offer_percent || 0;
                    lastRow.cells[9].querySelector('input').value = item.trade_offer_amount || 0;
                    lastRow.cells[10].querySelector('input').value = item.gst_percent || 0;
                    lastRow.cells[11].querySelector('input').value = item.gst_amount || 0;
                    lastRow.cells[12].querySelector('input').value = item.foc_qty || 0;
                    lastRow.cells[13].querySelector('input').value = item.net_amount;
                });
                
                // Update summary
                document.getElementById('totalDiscountPercent').value = invoice.total_discount_percent;
                document.getElementById('totalDiscountAmount').value = invoice.total_discount_amount;
                updateInvoiceSummary();
                
                // Update page title
                document.querySelector('.page-title').textContent = `Edit Purchase Return - ${invoice.bill_no}`;
                
            } else {
                alert('Error loading return: ' + data.message);
                window.location.href = 'purchase-list.php';
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
            alert('Error loading return data');
            window.location.href = 'purchase-list.php';
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
        searchInput.addEventListener('keydown', function(e) {
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
                option.style.backgroundColor = index === selectedIndex ? 'var(--surface-1)' : '';
            });
        }

        // Filter options based on search input
        searchInput.addEventListener('input', function() {
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

                // Update related fields for supplier selection
                if (hiddenInputId === 'supplierCode') {
                    const balance = parseFloat(e.target.getAttribute('data-balance'));
                    document.getElementById('previousBalance').value = `${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toFixed(2)}`;
                    // Load sub-accounts for selected supplier
                    loadSubAccounts(value);
                }

                // Load purchase invoice details when selected
                if (hiddenInputId === 'purchaseInvoice') {
                    loadPurchaseInvoiceDetails(value);
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
            return `<div class="dropdown-option" data-value="${product.id}" data-price="${product.purchase_price}" data-unit="${product.default_unit_id}" data-carton-conversion="${product.carton_conversion || 0}" data-discount="${product.default_discount || 0}" data-trade-offer="${product.trade_offer_discount || 0}" data-foc="${product.default_foc || 0}" data-gst="${product.sales_tax || 0}" style="display: flex; align-items: center;">${photoHtml}${product.code} - ${product.name}${codeDisplay}</div>`;
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
        unitSelect.addEventListener('change', function() {
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
        cell3.appendChild(qtyInput);

        // Purchase Price (input)
        const cell4 = row.insertCell(4);
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'table-input';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.required = true;
        cell4.appendChild(priceInput);

        // Gross Amount (readonly)
        const cell5 = row.insertCell(5);
        const grossAmount = document.createElement('input');
        grossAmount.type = 'text';
        grossAmount.className = 'table-input';
        grossAmount.readOnly = true;
        grossAmount.value = '0.00';
        grossAmount.tabIndex = -1;
        cell5.appendChild(grossAmount);

        // Discount % (input)
        const cell6 = row.insertCell(6);
        const discountPercent = document.createElement('input');
        discountPercent.type = 'number';
        discountPercent.className = 'table-input';
        discountPercent.min = '0';
        discountPercent.max = '100';
        discountPercent.step = '0.01';
        discountPercent.value = '0';
        cell6.appendChild(discountPercent);

        // Discount Amount (input)
        const cell7 = row.insertCell(7);
        const discountAmount = document.createElement('input');
        discountAmount.type = 'number';
        discountAmount.className = 'table-input';
        discountAmount.min = '0';
        discountAmount.step = '0.01';
        discountAmount.value = '0.00';
        cell7.appendChild(discountAmount);

        // Trade Offer % (input)
        const cell8 = row.insertCell(8);
        const tradeOfferPercent = document.createElement('input');
        tradeOfferPercent.type = 'number';
        tradeOfferPercent.className = 'table-input';
        tradeOfferPercent.min = '0';
        tradeOfferPercent.max = '100';
        tradeOfferPercent.step = '0.01';
        tradeOfferPercent.value = '0';
        cell8.appendChild(tradeOfferPercent);

        // Trade Offer Amount (input)
        const cell9 = row.insertCell(9);
        const tradeOfferAmount = document.createElement('input');
        tradeOfferAmount.type = 'number';
        tradeOfferAmount.className = 'table-input';
        tradeOfferAmount.min = '0';
        tradeOfferAmount.step = '0.01';
        tradeOfferAmount.value = '0.00';
        cell9.appendChild(tradeOfferAmount);

        // GST % (input)
        const cell10 = row.insertCell(10);
        const gstPercent = document.createElement('input');
        gstPercent.type = 'number';
        gstPercent.className = 'table-input';
        gstPercent.min = '0';
        gstPercent.max = '100';
        gstPercent.step = '0.01';
        gstPercent.value = '0';
        cell10.appendChild(gstPercent);

        // GST Amount (input)
        const cell11 = row.insertCell(11);
        const gstAmount = document.createElement('input');
        gstAmount.type = 'number';
        gstAmount.className = 'table-input';
        gstAmount.min = '0';
        gstAmount.step = '0.01';
        gstAmount.value = '0.00';
        cell11.appendChild(gstAmount);

        // FOC Quantity (input)
        const cell12 = row.insertCell(12);
        const focQty = document.createElement('input');
        focQty.type = 'number';
        focQty.className = 'table-input';
        focQty.min = '0';
        focQty.step = '0.01';
        focQty.value = '0';
        cell12.appendChild(focQty);
        
        // Apply settings to new row
        const enableInlineCashDiscount = localStorage.getItem('enableInlineCashDiscount') === 'true';
        const enableInlineCashDiscountAmount = localStorage.getItem('enableInlineCashDiscountAmount') === 'true';
        const enableTradeOffer = localStorage.getItem('enableTradeOffer') === 'true';
        const enableTradeOfferAmount = localStorage.getItem('enableTradeOfferAmount') === 'true';
        const enableFOC = localStorage.getItem('enableFOC') === 'true';
        const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
        
        cell6.style.display = enableInlineCashDiscount ? '' : 'none';
        cell7.style.display = enableInlineCashDiscountAmount ? '' : 'none';
        cell8.style.display = enableTradeOffer ? '' : 'none';
        cell9.style.display = enableTradeOfferAmount ? '' : 'none';
        cell10.style.display = enableTaxation ? '' : 'none';
        cell11.style.display = enableTaxation ? '' : 'none';
        cell12.style.display = enableFOC ? '' : 'none';

        // Net Amount (readonly)
        const cell13 = row.insertCell(13);
        const netAmount = document.createElement('input');
        netAmount.type = 'text';
        netAmount.className = 'table-input';
        netAmount.readOnly = true;
        netAmount.value = '0.00';
        netAmount.tabIndex = 0;
        
        // Add tab navigation logic for Net Amount
        netAmount.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && !e.shiftKey) {
                const codeInput = row.cells[1].querySelector('.item-code');
                if (codeInput.value) {
                    e.preventDefault();
                    const currentRowIndex = row.rowIndex - 1; // Subtract 1 for header row
                    const nextRowIndex = currentRowIndex + 1;
                    
                    if (nextRowIndex < itemsTable.rows.length) {
                        // Focus on existing next row
                        const nextRow = itemsTable.rows[nextRowIndex];
                        nextRow.cells[1].querySelector('.search-input').focus();
                    } else {
                        // Create new row and focus on it
                        addRow();
                        setTimeout(() => {
                            const newRow = itemsTable.rows[itemsTable.rows.length - 1];
                            newRow.cells[1].querySelector('.search-input').focus();
                        }, 10);
                    }
                } else {
                    e.preventDefault();
                    // Delete current row if there are multiple rows
                    if (itemsTable.rows.length > 1) {
                        // Clean up dropdown options
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
        
        cell13.appendChild(netAmount);

        // Actions (delete button)
        const cell14 = row.insertCell(14);
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete row';
        deleteBtn.tabIndex = -1;
        cell14.appendChild(deleteBtn);

        // Add event listeners for calculations
        qtyInput.addEventListener('input', calculateRow);
        priceInput.addEventListener('input', calculateRow);
        discountPercent.addEventListener('input', calculateRow);
        discountAmount.addEventListener('input', calculateRowFromAmount);
        tradeOfferPercent.addEventListener('input', calculateRow);
        tradeOfferAmount.addEventListener('input', calculateRowFromTradeOfferAmount);
        gstPercent.addEventListener('input', calculateRow);
        gstAmount.addEventListener('input', calculateRowFromGSTAmount);
        focQty.addEventListener('input', updateInvoiceSummary);

        // Add event listener for delete button
        deleteBtn.addEventListener('click', function () {
            if (itemsTable.rows.length > 1) {
                row.remove();
                updateSerialNumbers();
                updateInvoiceSummary();
            } else {
                alert('Cannot delete the only row. Add another row first.');
            }
        });

        function calculateRow() {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountPct = parseFloat(discountPercent.value) || 0;
            const tradeOfferPct = parseFloat(tradeOfferPercent.value) || 0;
            const gstPct = parseFloat(gstPercent.value) || 0;

            // Calculate gross amount
            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount amount
            const discountAmt = gross * (discountPct / 100);
            discountAmount.value = discountAmt.toFixed(2);

            // Calculate after discount
            const afterDiscount = gross - discountAmt;

            // Calculate trade offer amount
            const tradeOfferAmt = afterDiscount * (tradeOfferPct / 100);
            tradeOfferAmount.value = tradeOfferAmt.toFixed(2);

            // Calculate after trade offer
            const afterTradeOffer = afterDiscount - tradeOfferAmt;

            // Calculate GST amount
            const gstAmt = afterTradeOffer * (gstPct / 100);
            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }
        
        function calculateRowFromAmount() {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountAmt = parseFloat(discountAmount.value) || 0;
            const tradeOfferPct = parseFloat(tradeOfferPercent.value) || 0;
            const gstPct = parseFloat(gstPercent.value) || 0;

            // Calculate gross amount
            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate discount percentage from amount
            const discountPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
            discountPercent.value = discountPct.toFixed(2);

            // Calculate after discount
            const afterDiscount = gross - discountAmt;

            // Calculate trade offer amount
            const tradeOfferAmt = afterDiscount * (tradeOfferPct / 100);
            tradeOfferAmount.value = tradeOfferAmt.toFixed(2);

            // Calculate after trade offer
            const afterTradeOffer = afterDiscount - tradeOfferAmt;

            // Calculate GST amount
            const gstAmt = afterTradeOffer * (gstPct / 100);
            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }
        
        function calculateRowFromTradeOfferAmount() {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountAmt = parseFloat(discountAmount.value) || 0;
            const tradeOfferAmt = parseFloat(tradeOfferAmount.value) || 0;
            const gstPct = parseFloat(gstPercent.value) || 0;

            // Calculate gross amount
            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate after discount
            const afterDiscount = gross - discountAmt;

            // Calculate trade offer percentage from amount
            const tradeOfferPct = afterDiscount > 0 ? (tradeOfferAmt / afterDiscount) * 100 : 0;
            tradeOfferPercent.value = tradeOfferPct.toFixed(2);

            // Calculate after trade offer
            const afterTradeOffer = afterDiscount - tradeOfferAmt;

            // Calculate GST amount
            const gstAmt = afterTradeOffer * (gstPct / 100);
            gstAmount.value = gstAmt.toFixed(2);

            // Calculate net amount
            const net = afterTradeOffer + gstAmt;
            netAmount.value = net.toFixed(2);

            // Update invoice summary
            updateInvoiceSummary();
        }
        
        function calculateRowFromGSTAmount() {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const discountAmt = parseFloat(discountAmount.value) || 0;
            const tradeOfferAmt = parseFloat(tradeOfferAmount.value) || 0;
            const gstAmt = parseFloat(gstAmount.value) || 0;

            // Calculate gross amount
            const gross = qty * price;
            grossAmount.value = gross.toFixed(2);

            // Calculate after discount
            const afterDiscount = gross - discountAmt;

            // Calculate after trade offer
            const afterTradeOffer = afterDiscount - tradeOfferAmt;

            // Calculate GST percentage from amount
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
        
        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
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
                option.style.backgroundColor = index === selectedIndex ? 'var(--surface-1)' : '';
            });
        }

        // Filter options based on search input
        searchInput.addEventListener('input', function() {
            selectedIndex = -1;
            filterOptions();
        });

        // Select option
        optionsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const displayText = e.target.textContent;
                const price = e.target.getAttribute('data-price');
                const unitId = e.target.getAttribute('data-unit');
                const cartonConversion = e.target.getAttribute('data-carton-conversion');
                const discount = e.target.getAttribute('data-discount');
                const tradeOffer = e.target.getAttribute('data-trade-offer');
                const foc = e.target.getAttribute('data-foc');
                const gst = e.target.getAttribute('data-gst');

                // Set the search input to display the selected option
                searchInput.value = displayText;
                hiddenInput.value = value;
                
                // Store carton conversion in row data
                row.dataset.cartonConversion = cartonConversion || 0;

                // Update related fields
                row.cells[4].querySelector('input').value = price;
                if (unitId) row.cells[2].querySelector('select').value = unitId;
                
                // Auto-populate based on settings
                const enableInlineCashDiscount = localStorage.getItem('enableInlineCashDiscount') === 'true';
                const enableTradeOffer = localStorage.getItem('enableTradeOffer') === 'true';
                const enableFOC = localStorage.getItem('enableFOC') === 'true';
                const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
                
                if (enableInlineCashDiscount && discount) {
                    row.cells[6].querySelector('input').value = discount;
                }
                if (enableTradeOffer && tradeOffer) {
                    row.cells[8].querySelector('input').value = tradeOffer;
                }
                if (enableFOC && foc) {
                    row.cells[12].querySelector('input').value = foc;
                }
                if (enableTaxation && gst) {
                    row.cells[10].querySelector('input').value = gst;
                }

                // Hide options
                optionsContainer.style.display = 'none';
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
    function updateSerialNumbers() {
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            rows[i].cells[0].textContent = i + 1;
        }
    }

    // Update invoice summary
    function updateInvoiceSummary() {
        let totalBill = 0;
        let totalQty = 0;
        let totalPurchasePrice = 0;
        let totalGrossAmount = 0;
        let totalDiscountAmountItems = 0;
        let totalNetAmountItems = 0;
        const rows = itemsTable.rows;

        for (let i = 0; i < rows.length; i++) {
            const qtyInput = rows[i].cells[3].querySelector('input');
            const purchasePriceInput = rows[i].cells[4].querySelector('input');
            const grossAmountInput = rows[i].cells[5].querySelector('input');
            const discountAmountInput = rows[i].cells[7].querySelector('input');
            const tradeOfferAmountInput = rows[i].cells[9].querySelector('input');
            const gstAmountInput = rows[i].cells[11].querySelector('input');
            const focQtyInput = rows[i].cells[12].querySelector('input');
            const netAmountInput = rows[i].cells[13].querySelector('input');
            
            if (netAmountInput) {
                totalQty += parseFloat(qtyInput.value) || 0;
                totalPurchasePrice += parseFloat(purchasePriceInput.value) || 0;
                totalGrossAmount += parseFloat(grossAmountInput.value) || 0;
                totalDiscountAmountItems += parseFloat(discountAmountInput.value) || 0;
                totalNetAmountItems += parseFloat(netAmountInput.value) || 0;
                totalBill += parseFloat(netAmountInput.value) || 0;
            }
        }

        // Calculate total Trade Offer Amount
        let totalTradeOfferAmountItems = 0;
        for (let i = 0; i < rows.length; i++) {
            const tradeOfferAmountInput = rows[i].cells[9].querySelector('input');
            if (tradeOfferAmountInput) {
                totalTradeOfferAmountItems += parseFloat(tradeOfferAmountInput.value) || 0;
            }
        }

        // Calculate total GST Amount
        let totalGSTAmountItems = 0;
        for (let i = 0; i < rows.length; i++) {
            const gstAmountInput = rows[i].cells[11].querySelector('input');
            if (gstAmountInput) {
                totalGSTAmountItems += parseFloat(gstAmountInput.value) || 0;
            }
        }

        // Calculate total FOC Qty
        let totalFOCQty = 0;
        for (let i = 0; i < rows.length; i++) {
            const focQtyInput = rows[i].cells[12].querySelector('input');
            if (focQtyInput) {
                totalFOCQty += parseFloat(focQtyInput.value) || 0;
            }
        }

        // Update totals row
        document.getElementById('totalQty').textContent = totalQty.toFixed(2);
        document.getElementById('totalPurchasePrice').textContent = totalPurchasePrice.toFixed(2);
        document.getElementById('totalGrossAmount').textContent = totalGrossAmount.toFixed(2);
        document.getElementById('totalDiscountAmountItems').textContent = totalDiscountAmountItems.toFixed(2);
        document.getElementById('totalTradeOfferAmountItems').textContent = totalTradeOfferAmountItems.toFixed(2);
        document.getElementById('totalGSTAmountItems').textContent = totalGSTAmountItems.toFixed(2);
        document.getElementById('totalFOCQty').textContent = totalFOCQty.toFixed(2);
        document.getElementById('totalNetAmountItems').textContent = totalNetAmountItems.toFixed(2);

        document.getElementById('totalBill').textContent = totalBill.toFixed(2);

        const discountPercent = parseFloat(document.getElementById('totalDiscountPercent').value) || 0;
        const discountAmount = totalBill * (discountPercent / 100);
        const afterDiscount = totalBill - discountAmount;
        
        const gstPercent = parseFloat(document.getElementById('totalGSTPercent').value) || 0;
        const gstAmount = afterDiscount * (gstPercent / 100);
        const shippingFees = parseFloat(document.getElementById('shippingFees').value) || 0;
        const netAmount = afterDiscount + gstAmount + shippingFees;

        document.getElementById('totalDiscountAmount').value = discountAmount.toFixed(2);
        document.getElementById('totalGSTAmount').value = gstAmount.toFixed(2);
        document.getElementById('netAmount').textContent = netAmount.toFixed(2);
    }

    // Add event listener for total discount percent
    document.getElementById('totalDiscountPercent').addEventListener('input', updateInvoiceSummary);
    
    // Add event listener for total discount amount
    document.getElementById('totalDiscountAmount').addEventListener('input', updateInvoiceSummaryFromAmount);
    
    // Add event listener for total GST percent
    document.getElementById('totalGSTPercent').addEventListener('input', updateInvoiceSummary);
    
    // Add event listener for total GST amount
    document.getElementById('totalGSTAmount').addEventListener('input', updateInvoiceSummaryFromGSTAmount);
    
    // Add event listener for shipping fees
    document.getElementById('shippingFees').addEventListener('input', updateInvoiceSummary);
    
    // Update invoice summary from discount amount
    function updateInvoiceSummaryFromAmount() {
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
        const discountPercent = totalBill > 0 ? (discountAmount / totalBill) * 100 : 0;
        const afterDiscount = totalBill - discountAmount;
        
        const gstPercent = parseFloat(document.getElementById('totalGSTPercent').value) || 0;
        const gstAmount = afterDiscount * (gstPercent / 100);
        const shippingFees = parseFloat(document.getElementById('shippingFees').value) || 0;
        const netAmount = afterDiscount + gstAmount + shippingFees;

        document.getElementById('totalDiscountPercent').value = discountPercent.toFixed(2);
        document.getElementById('totalGSTAmount').value = gstAmount.toFixed(2);
        document.getElementById('netAmount').textContent = netAmount.toFixed(2);
    }
    
    // Update invoice summary from GST amount
    function updateInvoiceSummaryFromGSTAmount() {
        let totalBill = 0;
        const rows = itemsTable.rows;

        for (let i = 0; i < rows.length; i++) {
            const netAmountInput = rows[i].cells[13].querySelector('input');
            if (netAmountInput) {
                totalBill += parseFloat(netAmountInput.value) || 0;
            }
        }

        document.getElementById('totalBill').textContent = totalBill.toFixed(2);

        const discountPercent = parseFloat(document.getElementById('totalDiscountPercent').value) || 0;
        const discountAmount = totalBill * (discountPercent / 100);
        const afterDiscount = totalBill - discountAmount;
        
        const gstAmount = parseFloat(document.getElementById('totalGSTAmount').value) || 0;
        const gstPercent = afterDiscount > 0 ? (gstAmount / afterDiscount) * 100 : 0;
        const shippingFees = parseFloat(document.getElementById('shippingFees').value) || 0;
        const netAmount = afterDiscount + gstAmount + shippingFees;

        document.getElementById('totalDiscountAmount').value = discountAmount.toFixed(2);
        document.getElementById('totalGSTPercent').value = gstPercent.toFixed(2);
        document.getElementById('netAmount').textContent = netAmount.toFixed(2);
    }

    // Validate form before submission
    function validateForm() {
        let isValid = true;

        // Reset error states
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

        // Check required fields
        const requiredFields = [
            { id: 'company', errorId: 'companyError' },
            { id: 'supplierCode', errorId: 'supplierCodeError' },
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

        // Check if at least one item is added
        if (itemsTable.rows.length === 0) {
            alert('Please add at least one item to the invoice.');
            isValid = false;
        }

        // Check each item row for required fields
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            const code = rows[i].cells[1].querySelector('.item-code');
            const unit = rows[i].cells[2].querySelector('select');
            const qty = rows[i].cells[4].querySelector('input');
            const price = rows[i].cells[5].querySelector('input');

            if (!code.value || !unit.value || !qty.value || !price.value) {
                alert('Please fill all required fields in the items table.');
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    // Save invoice
    function saveInvoice() {
        // Disable save button to prevent multiple clicks
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Collect form data
        const formData = {
            companyId: document.getElementById('company').value,
            purchaseDate: document.getElementById('purchaseDate').value,
            purchaseInvoiceId: document.getElementById('purchaseInvoice').value || null,
            biltyNo: document.getElementById('biltyNo').value || null,
            transportName: document.getElementById('transportName').value || null,
            supplierId: document.getElementById('supplierCode').value,
            subAccountId: document.getElementById('subAccount').value || null,
            branchId: document.getElementById('branch').value,
            currencyId: document.getElementById('currency').value,
            previousBalance: document.getElementById('previousBalance').value,
            totalBill: parseFloat(document.getElementById('totalBill').textContent),
            totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent').value) || 0,
            totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount').value),
            totalGSTPercent: parseFloat(document.getElementById('totalGSTPercent').value) || 0,
            totalGSTAmount: parseFloat(document.getElementById('totalGSTAmount').value) || 0,
            shippingFees: parseFloat(document.getElementById('shippingFees').value) || 0,
            netAmount: parseFloat(document.getElementById('netAmount').textContent),
            remarks: document.getElementById('remarks').value,
            items: []
        };
        
        // Add invoice_id if in edit mode
        if (isEditMode) {
            formData.invoice_id = editId;
        }

        // Collect items data
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const item = {
                productId: row.cells[1].querySelector('.item-code').value,
                uomId: row.cells[2].querySelector('select').value,
                vehicleNo: null,
                quantity: parseFloat(row.cells[3].querySelector('input').value),
                purchasePrice: parseFloat(row.cells[4].querySelector('input').value),
                grossAmount: parseFloat(row.cells[5].querySelector('input').value),
                discountPercent: parseFloat(row.cells[6].querySelector('input').value) || 0,
                discountAmount: parseFloat(row.cells[7].querySelector('input').value),
                tradeOfferPercent: parseFloat(row.cells[8].querySelector('input').value) || 0,
                tradeOfferAmount: parseFloat(row.cells[9].querySelector('input').value) || 0,
                gstPercent: parseFloat(row.cells[10].querySelector('input').value) || 0,
                gstAmount: parseFloat(row.cells[11].querySelector('input').value) || 0,
                focQty: parseFloat(row.cells[12].querySelector('input').value) || 0,
                netAmount: parseFloat(row.cells[13].querySelector('input').value)
            };
            formData.items.push(item);
        }

        // Send to API
        const apiUrl = isEditMode ? 
            '../../../../server/api/purchase/purchase_return/return-edit.php' : 
            '../../../../server/api/purchase/purchase_return/return-add.php';
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
                // Store invoice ID for print functionality
                window.lastInvoiceId = data.invoice_id;
                document.getElementById('successModal').style.display = 'flex';
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

    // Reset form with confirmation
    function resetForm() {
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            performReset();
        }
    }
    
    // Silent reset without confirmation
    function performReset() {
        // Clean up dropdown options from table rows
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            const searchInput = rows[i].cells[1].querySelector('.search-input');
            if (searchInput && searchInput.dropdownOptions) {
                searchInput.dropdownOptions.remove();
            }
        }
        form.reset();

        // Clear items table
        while (itemsTable.rows.length > 0) {
            itemsTable.deleteRow(0);
        }

        // Add one empty row
        addRow();

        // Reset summary
        document.getElementById('totalBill').textContent = '0.00';
        document.getElementById('totalDiscountAmount').value = '0.00';
        document.getElementById('netAmount').textContent = '0.00';

        // Set default date to today
        document.getElementById('purchaseDate').value = today;

        // Reset searchable dropdowns
        document.getElementById('supplierCodeSearch').value = '';
        document.getElementById('supplierCode').value = '';
        document.getElementById('branchSearch').value = '';
        document.getElementById('branch').value = '';
        document.getElementById('previousBalance').value = '0.00';
        
        // Reset currency to base currency
        loadCurrencies();
        
        // Reset currency symbols
        setTimeout(updateCurrencySymbols, 100);
    }

    // Modal button events
    document.getElementById('printLaterBtn').addEventListener('click', function () {
        document.getElementById('successModal').style.display = 'none';
        performReset();
    });

    document.getElementById('printInvoiceBtn').addEventListener('click', function () {
        document.getElementById('successModal').style.display = 'none';
        const invoiceId = isEditMode ? editId : window.lastInvoiceId;
        if (invoiceId) {
            window.open(`invoice-print.php?id=${invoiceId}`, '_blank');
        }
        performReset();
    });

    // Invoice Settings Modal
    document.getElementById('invoiceSettingsBtn').addEventListener('click', function() {
        // Load settings from localStorage
        document.getElementById('enableTradeOffer').checked = localStorage.getItem('enableTradeOffer') === 'true';
        document.getElementById('enableTradeOfferAmount').checked = localStorage.getItem('enableTradeOfferAmount') === 'true';
        document.getElementById('enableFOC').checked = localStorage.getItem('enableFOC') === 'true';
        document.getElementById('enableTaxation').checked = localStorage.getItem('enableTaxation') === 'true';
        document.getElementById('enableInlineCashDiscount').checked = localStorage.getItem('enableInlineCashDiscount') === 'true';
        document.getElementById('enableInlineCashDiscountAmount').checked = localStorage.getItem('enableInlineCashDiscountAmount') === 'true';
        document.getElementById('enableInvoiceCashDiscount').checked = localStorage.getItem('enableInvoiceCashDiscount') === 'true';
        document.getElementById('enableInvoiceCashDiscountAmount').checked = localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
        document.getElementById('enableShippingFees').checked = localStorage.getItem('enableShippingFees') === 'true';
        document.getElementById('settingsModal').style.display = 'flex';
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', function() {
        document.getElementById('settingsModal').style.display = 'none';
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', function() {
        // Save settings to localStorage
        localStorage.setItem('enableTradeOffer', document.getElementById('enableTradeOffer').checked);
        localStorage.setItem('enableTradeOfferAmount', document.getElementById('enableTradeOfferAmount').checked);
        localStorage.setItem('enableFOC', document.getElementById('enableFOC').checked);
        localStorage.setItem('enableTaxation', document.getElementById('enableTaxation').checked);
        localStorage.setItem('enableInlineCashDiscount', document.getElementById('enableInlineCashDiscount').checked);
        localStorage.setItem('enableInlineCashDiscountAmount', document.getElementById('enableInlineCashDiscountAmount').checked);
        localStorage.setItem('enableInvoiceCashDiscount', document.getElementById('enableInvoiceCashDiscount').checked);
        localStorage.setItem('enableInvoiceCashDiscountAmount', document.getElementById('enableInvoiceCashDiscountAmount').checked);
        localStorage.setItem('enableShippingFees', document.getElementById('enableShippingFees').checked);
        document.getElementById('settingsModal').style.display = 'none';
        
        // Apply settings immediately
        applyInvoiceSettings();
    });

    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Apply invoice settings to show/hide columns
    function applyInvoiceSettings() {
        const enableTradeOffer = localStorage.getItem('enableTradeOffer') === 'true';
        const enableTradeOfferAmount = localStorage.getItem('enableTradeOfferAmount') === 'true';
        const enableFOC = localStorage.getItem('enableFOC') === 'true';
        const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
        const enableInlineCashDiscount = localStorage.getItem('enableInlineCashDiscount') === 'true';
        const enableInlineCashDiscountAmount = localStorage.getItem('enableInlineCashDiscountAmount') === 'true';
        const enableInvoiceCashDiscount = localStorage.getItem('enableInvoiceCashDiscount') === 'true';
        const enableInvoiceCashDiscountAmount = localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
        const enableShippingFees = localStorage.getItem('enableShippingFees') === 'true';
        
        // Get table
        const table = document.getElementById('itemsTable');
        const headerRow = table.querySelector('thead tr');
        const footerRow = table.querySelector('tfoot tr');
        
        // Column indices (0-based)
        const DISC_PERCENT_COL = 6;
        const DISC_AMOUNT_COL = 7;
        const TO_PERCENT_COL = 8;
        const TO_AMOUNT_COL = 9;
        const GST_PERCENT_COL = 10;
        const GST_AMOUNT_COL = 11;
        const FOC_COL = 12;
        
        // Hide/show header columns
        headerRow.cells[DISC_PERCENT_COL].style.display = enableInlineCashDiscount ? '' : 'none';
        headerRow.cells[DISC_AMOUNT_COL].style.display = enableInlineCashDiscountAmount ? '' : 'none';
        headerRow.cells[TO_PERCENT_COL].style.display = enableTradeOffer ? '' : 'none';
        headerRow.cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
        headerRow.cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
        headerRow.cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
        headerRow.cells[FOC_COL].style.display = enableFOC ? '' : 'none';
        
        // Hide/show footer columns
        footerRow.cells[DISC_PERCENT_COL].style.display = enableInlineCashDiscount ? '' : 'none';
        footerRow.cells[DISC_AMOUNT_COL].style.display = enableInlineCashDiscountAmount ? '' : 'none';
        footerRow.cells[TO_PERCENT_COL].style.display = enableTradeOffer ? '' : 'none';
        footerRow.cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
        footerRow.cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
        footerRow.cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
        footerRow.cells[FOC_COL].style.display = enableFOC ? '' : 'none';
        
        // Hide/show body columns for existing rows
        const rows = itemsTable.rows;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].cells[DISC_PERCENT_COL]) rows[i].cells[DISC_PERCENT_COL].style.display = enableInlineCashDiscount ? '' : 'none';
            if (rows[i].cells[DISC_AMOUNT_COL]) rows[i].cells[DISC_AMOUNT_COL].style.display = enableInlineCashDiscountAmount ? '' : 'none';
            if (rows[i].cells[TO_PERCENT_COL]) rows[i].cells[TO_PERCENT_COL].style.display = enableTradeOffer ? '' : 'none';
            if (rows[i].cells[TO_AMOUNT_COL]) rows[i].cells[TO_AMOUNT_COL].style.display = enableTradeOfferAmount ? '' : 'none';
            if (rows[i].cells[GST_PERCENT_COL]) rows[i].cells[GST_PERCENT_COL].style.display = enableTaxation ? '' : 'none';
            if (rows[i].cells[GST_AMOUNT_COL]) rows[i].cells[GST_AMOUNT_COL].style.display = enableTaxation ? '' : 'none';
            if (rows[i].cells[FOC_COL]) rows[i].cells[FOC_COL].style.display = enableFOC ? '' : 'none';
        }
        
        // Hide/show invoice summary fields
        const summaryGrid = document.querySelector('.summary-grid');
        const discountPercentItem = document.getElementById('totalDiscountPercent').closest('.summary-item');
        const discountAmountItem = document.getElementById('totalDiscountAmount').closest('.summary-item');
        const gstPercentItem = document.getElementById('totalGSTPercent').closest('.summary-item');
        const gstAmountItem = document.getElementById('totalGSTAmount').closest('.summary-item');
        const shippingFeesItem = document.getElementById('shippingFees').closest('.summary-item');
        
        if (discountPercentItem) discountPercentItem.style.display = enableInvoiceCashDiscount ? '' : 'none';
        if (discountAmountItem) discountAmountItem.style.display = enableInvoiceCashDiscountAmount ? '' : 'none';
        if (gstPercentItem) gstPercentItem.style.display = enableTaxation ? '' : 'none';
        if (gstAmountItem) gstAmountItem.style.display = enableTaxation ? '' : 'none';
        if (shippingFeesItem) shippingFeesItem.style.display = enableShippingFees ? '' : 'none';
    }
    
    // Handle UOM change for price conversion
    function handleUOMChange(row, unitSelect) {
        const oldUnitId = unitSelect.dataset.previousValue || unitSelect.value;
        const newUnitId = unitSelect.value;
        
        // Store current value for next change
        unitSelect.dataset.previousValue = newUnitId;
        
        // Only convert if both units are set and different
        if (!oldUnitId || !newUnitId || oldUnitId === newUnitId) return;
        
        const priceInput = row.cells[4].querySelector('input');
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
});