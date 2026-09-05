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
                // Check if user has at least one permission
                if (data.permissions.length === 0) {
                    window.location.href = '../../../../../errors/403.php';
                    return;
                }
                initializeListPage(data.permissions);
            }
        });
});

function initializeListPage(permissions) {
    let invoices = [];
    let currentPage = 1;
    let totalPages = 1;
    const invoicesTable = document.getElementById('invoicesTable').getElementsByTagName('tbody')[0];
    let selectedIds = new Set();
    let currentView = 'default'; // 'default' or 'aiq'

    function updateSelectionUI() {
        const count = selectedIds.size;
        const printSelectedBtn = document.getElementById('printSelectedBtn');
        const selectedCount = document.getElementById('selectedCount');
        printSelectedBtn.style.display = count > 0 ? 'inline-flex' : 'none';
        selectedCount.textContent = count;
        const allCheckboxes = invoicesTable.querySelectorAll('.row-checkbox');
        const selectAll = document.getElementById('selectAllCheckbox');
        if (allCheckboxes.length > 0) {
            selectAll.checked = [...allCheckboxes].every(cb => cb.checked);
            selectAll.indeterminate = !selectAll.checked && [...allCheckboxes].some(cb => cb.checked);
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
    }

    function clearSelections() {
        selectedIds.clear();
        updateSelectionUI();
    }

    document.getElementById('selectAllCheckbox').addEventListener('change', function () {
        const checkboxes = invoicesTable.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
            const id = parseInt(cb.dataset.id);
            this.checked ? selectedIds.add(id) : selectedIds.delete(id);
        });
        updateSelectionUI();
    });

    document.getElementById('printSelectedBtn').addEventListener('click', function () {
        if (selectedIds.size === 0) return;
        const ids = [...selectedIds].join(',');
        const savedChoice = localStorage.getItem('pos_print_preference');
        const printType = savedChoice || 'full';
        if (printType === 'thermal') {
            // thermal has no bulk page, open each separately
            [...selectedIds].forEach(id => window.open(`thermal-print.php?id=${id}`, '_blank'));
        } else {
            window.open(`bulk-print.php?ids=${ids}`, '_blank');
        }
    });
    
    // Filter elements
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const companyFilter = document.getElementById('companyFilter');
    const customerFilter = document.getElementById('customerFilter');
    const saleOfficerFilter = document.getElementById('saleOfficerFilter');
    const supplierManFilter = document.getElementById('supplierManFilter');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    // Load invoices from API
    async function loadInvoices(page = 1) {
        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: page,
                limit: 10
            });
            
            // Add filters if present
            if (dateFrom.value) params.append('dateFrom', dateFrom.value);
            if (dateTo.value) params.append('dateTo', dateTo.value);
            if (companyFilter.value) params.append('company', companyFilter.value);
            if (customerFilter.value) params.append('customer', customerFilter.value);
            if (saleOfficerFilter.value) params.append('saleOfficer', saleOfficerFilter.value);
            if (supplierManFilter.value) params.append('supplierMan', supplierManFilter.value);
            if (searchInput.value) params.append('search', searchInput.value);
            if (statusFilter && statusFilter.value) params.append('invoiceType', statusFilter.value);
            
            const response = await fetch(`../../../../server/api/sale/pos_invoice/pos-list.php?${params.toString()}`);
            const data = await response.json();
            
            if (data.success) {
                invoices = data.invoices.map(invoice => ({
                    id: invoice.id,
                    invoiceNo: invoice.bill_no,
                    date: invoice.sale_date,
                    customer: invoice.customer_name,
                    company: invoice.company_name,
                    items: invoice.item_count,
                    totalAmount: parseFloat(invoice.net_amount),
                    amountPaid: parseFloat(invoice.amount_paid || 0),
                    invoiceType: invoice.invoice_type || '',
                    invoiceStatus: invoice.invoice_status || 'pending',
                    itemsDetail: invoice.items_detail || [],
                    currencySymbol: invoice.currency_symbol || ''
                }));
                currentPage = data.pagination.page;
                totalPages = data.pagination.pages;
                clearSelections();
                if (currentView === 'aiq') {
                    populateAiqTable(invoices);
                } else {
                    populateTable(invoices);
                }
                updatePagination(data.pagination);
            } else {
                console.error('Error loading invoices:', data.message);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
        }
    }

    function populateTable(data) {
        invoicesTable.innerHTML = '';
        let totalAmount = 0;
        let invoiceCount = data.length;

        data.forEach(invoice => {
            totalAmount += invoice.totalAmount;
            const row = invoicesTable.insertRow();

            // Checkbox cell
            const checkboxCell = row.insertCell(0);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.dataset.id = invoice.id;
            checkbox.checked = selectedIds.has(invoice.id);
            checkbox.addEventListener('change', function () {
                this.checked ? selectedIds.add(invoice.id) : selectedIds.delete(invoice.id);
                updateSelectionUI();
            });
            checkboxCell.appendChild(checkbox);

            // Format date
            const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Format amount with currency symbol
            const formattedAmount = `${invoice.currencySymbol} ${parseFloat(invoice.totalAmount).toFixed(2)}`;

            // Create cells
            row.insertCell(1).textContent = invoice.invoiceNo;
            row.insertCell(2).textContent = formattedDate;
            row.insertCell(3).textContent = invoice.customer || 'N/A';
            row.insertCell(4).textContent = invoice.items;
            row.insertCell(5).textContent = formattedAmount;

            const statusCell6 = row.insertCell(6);
            const statusBadge6 = document.createElement('span');
            statusBadge6.className = 'status-badge status-' + (invoice.invoiceStatus || 'pending');
            statusBadge6.textContent = invoice.invoiceStatus === 'confirmed' ? 'Confirmed' : 'Pending';
            statusCell6.appendChild(statusBadge6);

            const actionsCell = row.insertCell(7);
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary btn-sm';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit Invoice';
            if (permissions.includes('Edit')) {
                editBtn.addEventListener('click', () => editInvoice(invoice.id));
            } else {
                editBtn.disabled = true;
                editBtn.style.opacity = '0.5';
                editBtn.style.cursor = 'not-allowed';
            }

            // Print button
            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-success btn-sm';
            printBtn.innerHTML = '<i class="fas fa-print"></i>';
            printBtn.title = 'Print Invoice';
            printBtn.addEventListener('click', () => printInvoice(invoice.id));

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Invoice';
            if (permissions.includes('Delete')) {
                deleteBtn.addEventListener('click', () => deleteInvoice(invoice.id));
            } else {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            }

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(printBtn);
            actionButtons.appendChild(deleteBtn);

            actionsCell.appendChild(actionButtons);
        });
        
        updateSummary(invoiceCount, totalAmount, data[0]?.currencySymbol || '', 0, 0);
    }
    
    function updateSummary(count, total, currencySymbol, amountPaid, remaining) {
        document.getElementById('totalInvoiceCount').textContent = count;
        document.getElementById('totalAmountSum').textContent = `${currencySymbol} ${total.toFixed(2)}`;
        const paidEl = document.getElementById('totalAmountPaidSum');
        const remEl = document.getElementById('totalRemainingSum');
        if (paidEl) paidEl.textContent = `₨ ${(amountPaid || 0).toFixed(2)}`;
        if (remEl) remEl.textContent = `₨ ${(remaining || 0).toFixed(2)}`;
        ['aiqExtraSummary1', 'aiqExtraSummary2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (currentView === 'aiq') ? '' : 'none';
        });
    }

    // AIQ view table
    function populateAiqTable(data) {
        const thead = document.getElementById('invoicesTable').getElementsByTagName('thead')[0];
        thead.innerHTML = `<tr>
            <th width="3%"><input type="checkbox" id="selectAllCheckbox" title="Select All"></th>
            <th>Invoice No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Chassis No</th>
            <th>Motor No</th>
            <th>Colour</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Amount Paid (₨)</th>
            <th>Remaining Balance (₨)</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>`;

        // Re-bind selectAll after thead rebuild
        document.getElementById('selectAllCheckbox').addEventListener('change', function () {
            const checkboxes = invoicesTable.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const id = parseInt(cb.dataset.id);
                this.checked ? selectedIds.add(id) : selectedIds.delete(id);
            });
            updateSelectionUI();
        });

        invoicesTable.innerHTML = '';
        let totalAmount = 0;

        data.forEach(invoice => {
            totalAmount += invoice.totalAmount;
            const firstItem = invoice.itemsDetail[0] || {};
            const remaining = invoice.totalAmount - invoice.amountPaid;
            const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

            const row = invoicesTable.insertRow();

            const checkboxCell = row.insertCell(0);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.dataset.id = invoice.id;
            checkbox.checked = selectedIds.has(invoice.id);
            checkbox.addEventListener('change', function () {
                this.checked ? selectedIds.add(invoice.id) : selectedIds.delete(invoice.id);
                updateSelectionUI();
            });
            checkboxCell.appendChild(checkbox);

            row.insertCell(1).textContent = invoice.invoiceNo;
            row.insertCell(2).textContent = formattedDate;
            row.insertCell(3).textContent = invoice.customer || 'N/A';
            row.insertCell(4).textContent = firstItem.product_name || '-';
            row.insertCell(5).textContent = firstItem.chassis_no || '-';
            row.insertCell(6).textContent = firstItem.motor_no || '-';
            row.insertCell(7).textContent = firstItem.colour || '-';
            row.insertCell(8).textContent = invoice.items;
            row.insertCell(9).textContent = `${invoice.currencySymbol} ${invoice.totalAmount.toFixed(2)}`;
            row.insertCell(10).textContent = `₨ ${invoice.amountPaid.toFixed(2)}`;
            row.insertCell(11).textContent = `₨ ${remaining.toFixed(2)}`;

            const statusCell = row.insertCell(12);
            const statusBadge = document.createElement('span');
            const statusText = (invoice.invoiceType === 'Cash' || invoice.invoiceType === 'Credit') ? 'Delivered' : (invoice.invoiceType || '-');
            statusBadge.className = 'status-badge status-' + statusText.toLowerCase().replace(/\s+/g, '-');
            statusBadge.textContent = statusText;
            statusCell.appendChild(statusBadge);

            const actionsCell = row.insertCell(13);
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary btn-sm';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit Invoice';
            if (permissions.includes('Edit')) {
                editBtn.addEventListener('click', () => editInvoice(invoice.id));
            } else {
                editBtn.disabled = true;
                editBtn.style.opacity = '0.5';
                editBtn.style.cursor = 'not-allowed';
            }

            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-success btn-sm';
            printBtn.innerHTML = '<i class="fas fa-print"></i>';
            printBtn.title = 'Print Invoice';
            printBtn.addEventListener('click', () => printInvoice(invoice.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Invoice';
            if (permissions.includes('Delete')) {
                deleteBtn.addEventListener('click', () => deleteInvoice(invoice.id));
            } else {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            }

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(printBtn);
            actionButtons.appendChild(deleteBtn);
            actionsCell.appendChild(actionButtons);
        });

        const totalPaid = data.reduce((s, inv) => s + inv.amountPaid, 0);
        const totalRemaining = data.reduce((s, inv) => s + (inv.totalAmount - inv.amountPaid), 0);
        updateSummary(data.length, totalAmount, data[0]?.currencySymbol || '', totalPaid, totalRemaining);
    }

    // Restore default thead
    function restoreDefaultThead() {
        const thead = document.getElementById('invoicesTable').getElementsByTagName('thead')[0];
        thead.innerHTML = `<tr>
            <th width="3%"><input type="checkbox" id="selectAllCheckbox" title="Select All"></th>
            <th width="12%">Invoice No</th>
            <th width="13%">Date</th>
            <th width="22%">Customer</th>
            <th width="10%">Items</th>
            <th width="13%">Total Amount</th>
            <th width="10%">Status</th>
            <th width="17%">Actions</th>
        </tr>`;
        document.getElementById('selectAllCheckbox').addEventListener('change', function () {
            const checkboxes = invoicesTable.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const id = parseInt(cb.dataset.id);
                this.checked ? selectedIds.add(id) : selectedIds.delete(id);
            });
            updateSelectionUI();
        });
    }

    // Global toggle function
    window.switchView = function(view) {
        currentView = view;
        document.getElementById('defaultViewBtn').classList.toggle('active', view === 'default');
        document.getElementById('aiqViewBtn').classList.toggle('active', view === 'aiq');
        const statusFilterGroup = document.getElementById('statusFilterGroup');
        if (statusFilterGroup) statusFilterGroup.style.display = '';
        if (view === 'default') {
            restoreDefaultThead();
            populateTable(invoices);
        } else {
            populateAiqTable(invoices);
        }
    };

    // Initial load
    loadInvoices();
    loadCustomers();
    loadCompanies();
    loadSalesOfficers();
    loadSupplierMen();
    
    // Load customers for filter
    async function loadCustomers() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-customers.php');
            const data = await response.json();
            if (data.success) {
                const customerFilterOptions = document.getElementById('customerFilterOptions');
                customerFilterOptions.innerHTML = '<div class="dropdown-option" data-value="" data-name="">All Customers</div>';
                data.customers.forEach(customer => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', customer.customer_name);
                    option.setAttribute('data-name', customer.customer_name);
                    option.textContent = `${customer.customer_code} - ${customer.customer_name}`;
                    customerFilterOptions.appendChild(option);
                });
                initSearchableDropdown('customerFilterSearch', 'customerFilterOptions', 'customerFilter');
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }
    
    // Load companies for filter
    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-companies.php');
            const data = await response.json();
            if (data.success) {
                const companyFilterOptions = document.getElementById('companyFilterOptions');
                companyFilterOptions.innerHTML = '<div class="dropdown-option" data-value="" data-name="">All Companies</div>';
                data.companies.forEach(company => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', company.company_name);
                    option.setAttribute('data-name', company.company_name);
                    option.textContent = company.company_name;
                    companyFilterOptions.appendChild(option);
                });
                initSearchableDropdown('companyFilterSearch', 'companyFilterOptions', 'companyFilter');
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }
    
    // Load sales officers for filter
    async function loadSalesOfficers() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-employees.php');
            const data = await response.json();
            if (data.success) {
                const saleOfficerFilterOptions = document.getElementById('saleOfficerFilterOptions');
                saleOfficerFilterOptions.innerHTML = '<div class="dropdown-option" data-value="" data-name="">All Sales Officers</div>';
                data.employees.forEach(employee => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', employee.id);
                    option.setAttribute('data-name', employee.full_name);
                    option.textContent = employee.full_name;
                    saleOfficerFilterOptions.appendChild(option);
                });
                initSearchableDropdown('saleOfficerFilterSearch', 'saleOfficerFilterOptions', 'saleOfficerFilter');
            }
        } catch (error) {
            console.error('Error loading sales officers:', error);
        }
    }
    
    // Load supplier men for filter
    async function loadSupplierMen() {
        try {
            const response = await fetch('../../../../server/api/sale/pos_invoice/get-employees.php');
            const data = await response.json();
            if (data.success) {
                const supplierManFilterOptions = document.getElementById('supplierManFilterOptions');
                supplierManFilterOptions.innerHTML = '<div class="dropdown-option" data-value="" data-name="">All Supplier Men</div>';
                data.employees.forEach(employee => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', employee.id);
                    option.setAttribute('data-name', employee.full_name);
                    option.textContent = employee.full_name;
                    supplierManFilterOptions.appendChild(option);
                });
                initSearchableDropdown('supplierManFilterSearch', 'supplierManFilterOptions', 'supplierManFilter');
            }
        } catch (error) {
            console.error('Error loading supplier men:', error);
        }
    }
    
    // Initialize searchable dropdown
    function initSearchableDropdown(searchInputId, optionsContainerId, hiddenInputId) {
        const searchInput = document.getElementById(searchInputId);
        const optionsContainer = document.getElementById(optionsContainerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        
        searchInput.addEventListener('click', function(e) {
            e.stopPropagation();
            optionsContainer.style.display = 'block';
            filterOptions();
        });
        
        searchInput.addEventListener('input', function() {
            filterOptions();
        });
        
        optionsContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const name = e.target.getAttribute('data-name');
                let defaultText = 'All Items';
                if (hiddenInputId === 'customerFilter') defaultText = 'All Customers';
                else if (hiddenInputId === 'companyFilter') defaultText = 'All Companies';
                else if (hiddenInputId === 'saleOfficerFilter') defaultText = 'All Sales Officers';
                else if (hiddenInputId === 'supplierManFilter') defaultText = 'All Supplier Men';
                searchInput.value = name || defaultText;
                hiddenInput.value = value;
                optionsContainer.style.display = 'none';
                applyFilters();
            }
        });
        
        document.addEventListener('click', function() {
            optionsContainer.style.display = 'none';
        });
        
        function filterOptions() {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');
            
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'block' : 'none';
            }
        }
    }

    function applyFilters() {
        loadInvoices(1); // Reset to page 1 when filters change
    }

    // Add event listeners for filters
    dateFrom.addEventListener('change', applyFilters);
    dateTo.addEventListener('change', applyFilters);
    companyFilter.addEventListener('change', applyFilters);
    customerFilter.addEventListener('change', applyFilters);
    saleOfficerFilter.addEventListener('change', applyFilters);
    supplierManFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    // Update pagination
    function updatePagination(pagination) {
        const { page, limit, total, pages } = pagination;
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        
        document.getElementById('paginationInfo').textContent = 
            `Showing ${start} to ${end} of ${total} entries`;
            
        generatePaginationButtons(page, pages);
    }
    
    // Generate dynamic pagination buttons
    function generatePaginationButtons(currentPage, totalPages) {
        const container = document.getElementById('paginationControls');
        container.innerHTML = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) loadInvoices(currentPage - 1);
        });
        container.appendChild(prevBtn);
        
        // Calculate page range to show
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        // First page button
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-btn';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => loadInvoices(1));
            container.appendChild(firstBtn);
            
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 8px';
                container.appendChild(dots);
            }
        }
        
        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                if (i !== currentPage) loadInvoices(i);
            });
            container.appendChild(pageBtn);
        }
        
        // Last page button
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 8px';
                container.appendChild(dots);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-btn';
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener('click', () => loadInvoices(totalPages));
            container.appendChild(lastBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) loadInvoices(currentPage + 1);
        });
        container.appendChild(nextBtn);
    }

    // Reset filters button
    document.getElementById('resetFiltersBtn').addEventListener('click', function () {
        dateFrom.value = '';
        dateTo.value = '';
        searchInput.value = '';

        [['companyFilter', 'companyFilterSearch', 'All Companies'],
         ['customerFilter', 'customerFilterSearch', 'All Customers'],
         ['saleOfficerFilter', 'saleOfficerFilterSearch', 'All Sales Officers'],
         ['supplierManFilter', 'supplierManFilterSearch', 'All Supplier Men']
        ].forEach(([hiddenId, searchId, placeholder]) => {
            document.getElementById(hiddenId).value = '';
            document.getElementById(searchId).value = '';
            document.getElementById(searchId).placeholder = placeholder;
        });
        if (statusFilter) statusFilter.value = '';

        loadInvoices(1);
    });

    // New invoice button
    document.getElementById('newInvoiceBtn').addEventListener('click', function () {
        if (!permissions.includes('Add')) {
            alert('You do not have permission to add invoices.');
            return;
        }
        window.location.href = 'pos-add.php';
    });

    // Action functions
    function editInvoice(id) {
        if (!permissions.includes('Edit')) {
            alert('You do not have permission to edit invoices.');
            return;
        }
        window.location.href = `pos-add.php?edit=${id}`;
    }

    function printInvoice(id) {
        showPrintOptions(id);
    }
    
    // Print options modal
    function showPrintOptions(invoiceId) {
        const savedChoice = localStorage.getItem('pos_print_preference');
        if (savedChoice) {
            const url = savedChoice === 'full' ? `invoice-print.php?id=${invoiceId}` : `thermal-print.php?id=${invoiceId}`;
            window.open(url, '_blank');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Select Print Format</h3>
                <p>Choose how you want to print the invoice:</p>
                <div class="modal-actions" style="flex-direction: column; gap: 10px;">
                    <button class="btn btn-primary" id="printFullBtnList" style="width: 100%;">
                        <i class="fas fa-file-invoice"></i> Print Full Invoice
                    </button>
                    <button class="btn btn-secondary" id="printThermalBtnList" style="width: 100%;">
                        <i class="fas fa-receipt"></i> Print Thermal Invoice
                    </button>
                    <label style="display: flex; align-items: center; gap: 8px; margin-top: 10px; cursor: pointer;">
                        <input type="checkbox" id="rememberPrintChoiceList" style="width: auto;">
                        <span>Remember my choice</span>
                    </label>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('printFullBtnList').onclick = function() {
            if (document.getElementById('rememberPrintChoiceList').checked) {
                localStorage.setItem('pos_print_preference', 'full');
            }
            window.open(`invoice-print.php?id=${invoiceId}`, '_blank');
            modal.remove();
        };
        
        document.getElementById('printThermalBtnList').onclick = function() {
            if (document.getElementById('rememberPrintChoiceList').checked) {
                localStorage.setItem('pos_print_preference', 'thermal');
            }
            window.open(`thermal-print.php?id=${invoiceId}`, '_blank');
            modal.remove();
        };
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    let deleteInvoiceId = null;
    
    function deleteInvoice(id) {
        if (!permissions.includes('Delete')) {
            alert('You do not have permission to delete invoices.');
            return;
        }
        deleteInvoiceId = id;
        document.getElementById('deleteModal').style.display = 'flex';
    }
    
    // Modal event listeners
    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        document.getElementById('deleteModal').style.display = 'none';
        deleteInvoiceId = null;
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (deleteInvoiceId) {
            try {
                const response = await fetch(`../../../../server/api/sale/pos_invoice/pos-delete.php?id=${deleteInvoiceId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('deleteModal').style.display = 'none';
                    loadInvoices(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                alert('Error deleting invoice: ' + error.message);
            }
            deleteInvoiceId = null;
        }
    });
    
    // Hide modal when clicking outside
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
            deleteInvoiceId = null;
        }
    });
}