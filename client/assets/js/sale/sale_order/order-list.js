document.addEventListener('DOMContentLoaded', function () {
    // Check permissions
    fetch('../../../../server/api/auth/check-permission.php?category=Sale&form_name=Sale Order')
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

    // Load invoices from API
    async function loadInvoices(page = 1) {
        try {
            const statusValue = document.getElementById('statusFilter')?.value || 'pending';
            const params = new URLSearchParams({ page, limit: 10, status: statusValue });
            const dateFromVal = document.getElementById('dateFrom')?.value;
            const dateToVal = document.getElementById('dateTo')?.value;
            const companyVal = document.getElementById('companyFilter')?.value;
            const customerVal = document.getElementById('customerFilter')?.value;
            const searchVal = document.getElementById('searchInput')?.value;
            if (dateFromVal) params.append('date_from', dateFromVal);
            if (dateToVal) params.append('date_to', dateToVal);
            if (companyVal) params.append('company_id', companyVal);
            if (customerVal) params.append('customer_id', customerVal);
            if (searchVal) params.append('search', searchVal);

            const response = await fetch(`../../../../server/api/sale/sale_order/order-list.php?${params.toString()}`);
            const data = await response.json();
            
            if (data.success) {
                invoices = data.invoices.map(invoice => ({
                    id: invoice.id,
                    invoiceNo: invoice.bill_no,
                    date: invoice.sale_date,
                    lastDate: invoice.last_date,
                    customer: invoice.customer_name,
                    items: invoice.item_count,
                    totalAmount: parseFloat(invoice.net_amount),
                    currencySymbol: invoice.currency_symbol || '',
                    status: invoice.fulfillment_status || 'Pending'
                }));
                currentPage = data.pagination.page;
                totalPages = data.pagination.pages;
                populateTable(invoices);
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

        data.forEach(invoice => {
            const row = invoicesTable.insertRow();

            // Format date
            const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Format amount with currency symbol
            const formattedAmount = `${invoice.currencySymbol} ${parseFloat(invoice.totalAmount).toFixed(2)}`;

            // Create cells
            row.insertCell(0).textContent = invoice.invoiceNo;
            row.insertCell(1).textContent = formattedDate;

            // Last Date cell: the date plus a "days left / overdue" counter against today
            const lastDateCell = row.insertCell(2);
            if (invoice.lastDate) {
                const formattedLastDate = new Date(invoice.lastDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
                const lastDateMidnight = new Date(invoice.lastDate); lastDateMidnight.setHours(0, 0, 0, 0);
                const diffDays = Math.round((lastDateMidnight - todayMidnight) / 86400000);

                let counterText, counterClass;
                if (diffDays < 0) {
                    counterText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
                    counterClass = 'status-overdue';
                } else if (diffDays === 0) {
                    counterText = 'Due today';
                    counterClass = 'status-warning';
                } else {
                    counterText = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
                    counterClass = diffDays <= 3 ? 'status-warning' : 'status-paid';
                }

                lastDateCell.innerHTML = `
                    <div>${formattedLastDate}</div>
                    <span class="status ${counterClass}" style="margin-top: 4px; display: inline-block;">${counterText}</span>
                `;
            } else {
                lastDateCell.textContent = '-';
            }

            row.insertCell(3).textContent = invoice.customer || 'N/A';
            row.insertCell(4).textContent = invoice.items;
            row.insertCell(5).textContent = formattedAmount;

            // Status cell
            const statusCell = row.insertCell(6);
            const statusBadge = document.createElement('span');
            const statusClassMap = {
                'Pending': 'status-pending',
                'Confirmed': 'status-paid',
                'Partially Fulfilled': 'status-warning'
            };
            statusBadge.className = 'status ' + (statusClassMap[invoice.status] || 'status-pending');
            statusBadge.textContent = invoice.status || 'Pending';
            statusCell.appendChild(statusBadge);

            const actionsCell = row.insertCell(7);
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary btn-sm';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit Order';
            if (permissions.includes('Edit')) {
                editBtn.addEventListener('click', () => editInvoice(invoice.id));
            } else {
                editBtn.disabled = true;
                editBtn.style.opacity = '0.5';
                editBtn.style.cursor = 'not-allowed';
            }

            // Convert to Invoice button
            const convertBtn = document.createElement('button');
            convertBtn.className = 'btn btn-warning btn-sm';
            convertBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
            convertBtn.title = 'Convert to Sale Invoice';
            convertBtn.addEventListener('click', () => convertToInvoice(invoice.id));

            // Print button
            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-success btn-sm';
            printBtn.innerHTML = '<i class="fas fa-print"></i>';
            printBtn.title = 'Print Order';
            printBtn.addEventListener('click', () => printInvoice(invoice.id));
            
            // View Fulfillment button
            const fulfillmentBtn = document.createElement('button');
            fulfillmentBtn.className = 'btn btn-warning btn-sm';
            fulfillmentBtn.innerHTML = '<i class="fas fa-tasks"></i>';
            fulfillmentBtn.title = 'View Fulfillment';
            fulfillmentBtn.addEventListener('click', () => viewFulfillment(invoice.id));

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Order';
            if (permissions.includes('Delete')) {
                deleteBtn.addEventListener('click', () => deleteInvoice(invoice.id));
            } else {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            }

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(convertBtn);
            actionButtons.appendChild(printBtn);
            actionButtons.appendChild(fulfillmentBtn);
            actionButtons.appendChild(deleteBtn);

            actionsCell.appendChild(actionButtons);
        });
    }

    // Initial load
    loadInvoices();
    loadCompanies();
    loadCustomers();

    // Load companies
    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-companies.php');
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('companyFilter');
                data.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.company_name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    // Load customers into the searchable Customer filter dropdown
    async function loadCustomers() {
        try {
            const response = await fetch('../../../../server/api/sale/sale_order/get-customers.php');
            const data = await response.json();
            if (data.success) {
                const optionsContainer = document.getElementById('customerFilterOptions');
                optionsContainer.innerHTML = '<div class="dropdown-option" data-value="">All Customers</div>';
                data.customers.forEach(customer => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.setAttribute('data-value', customer.id);
                    option.textContent = `${customer.customer_code} - ${customer.customer_name}`;
                    optionsContainer.appendChild(option);
                });
                initSearchableDropdown('customerFilterSearch', 'customerFilterOptions', 'customerFilter');
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    // Generic searchable dropdown: types to filter, click to select, updates
    // the hidden input and re-fetches from the server (page 1).
    function initSearchableDropdown(searchInputId, optionsContainerId, hiddenInputId) {
        const searchInput = document.getElementById(searchInputId);
        const optionsContainer = document.getElementById(optionsContainerId);
        const hiddenInput = document.getElementById(hiddenInputId);

        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();
            optionsContainer.style.display = 'block';
            filterOptions();
        });

        searchInput.addEventListener('input', filterOptions);

        optionsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                searchInput.value = value ? e.target.textContent : '';
                hiddenInput.value = value;
                optionsContainer.style.display = 'none';
                loadInvoices(1);
            }
        });

        document.addEventListener('click', function () {
            optionsContainer.style.display = 'none';
        });

        function filterOptions() {
            const searchTerm = searchInput.value.toLowerCase();
            const options = optionsContainer.getElementsByClassName('dropdown-option');
            for (let i = 0; i < options.length; i++) {
                const text = options[i].textContent.toLowerCase();
                options[i].style.display = text.includes(searchTerm) ? 'block' : 'none';
            }
        }
    }

    // All filters are applied server-side (see loadInvoices) so pagination and
    // counts stay correct regardless of which page the matching rows fall on.
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const companyFilterEl = document.getElementById('companyFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');

    dateFrom.addEventListener('change', () => loadInvoices(1));
    dateTo.addEventListener('change', () => loadInvoices(1));
    companyFilterEl.addEventListener('change', () => loadInvoices(1));
    statusFilter.addEventListener('change', () => loadInvoices(1));

    // Debounce free-text search so it doesn't re-fetch on every keystroke
    let searchDebounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => loadInvoices(1), 350);
    });

    // Explicit "Filter" button: re-fetches with all current filter values
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => loadInvoices(1));
    }

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
        
        // Page number buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                if (i !== currentPage) loadInvoices(i);
            });
            container.appendChild(pageBtn);
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

    // New invoice button
    document.getElementById('newInvoiceBtn').addEventListener('click', function () {
        if (!permissions.includes('Add')) {
            alert('You do not have permission to add orders.');
            return;
        }
        const base = window.top.location.origin + window.top.location.pathname.replace(/\/client\/.*$/, '');
        window.top.location.href = base + '/client/pages/soda_book/soda-book.php';
    });

    // Action functions
    function editInvoice(id) {
        if (!permissions.includes('Edit')) {
            alert('You do not have permission to edit orders.');
            return;
        }
        window.location.href = `order-add.php?edit=${id}`;
    }

    function convertToInvoice(id) {
        if (confirm('Are you sure you want to convert this sale order to a sale invoice?')) {
            fetch('../../../../server/api/sale/sale_order/convert-to-invoice.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: id })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Sale order converted to invoice successfully!');
                    loadInvoices(currentPage);
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                alert('Error converting order: ' + error.message);
            });
        }
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
                <p>Choose how you want to print the order:</p>
                <div class="modal-actions" style="flex-direction: column; gap: 10px;">
                    <button class="btn btn-primary" id="printFullBtnList" style="width: 100%;">
                        <i class="fas fa-file-invoice"></i> Print Full Order
                    </button>
                    <button class="btn btn-secondary" id="printThermalBtnList" style="width: 100%;">
                        <i class="fas fa-receipt"></i> Print Thermal Order
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
            alert('You do not have permission to delete orders.');
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
    
    document.getElementById('closeFulfillmentBtn').addEventListener('click', function() {
        document.getElementById('fulfillmentModal').style.display = 'none';
    });
    
    // View fulfillment function
    async function viewFulfillment(orderId) {
        document.getElementById('fulfillmentModal').style.display = 'flex';
        const tbody = document.getElementById('fulfillmentTableBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading...</td></tr>';
        
        try {
            const response = await fetch(`../../../../server/api/sale/sale_order/get-order-fulfillment.php?order_id=${orderId}`);
            const data = await response.json();
            
            if (data.success && data.fulfillment.length > 0) {
                tbody.innerHTML = '';
                const parentItems = data.fulfillment.filter(item => !item.parent_row_id);
                const childItems = data.fulfillment.filter(item => item.parent_row_id);
                
                parentItems.forEach((item, index) => {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-default);">${item.product_name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">${item.ordered_qty.toFixed(2)} ${item.uom_name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">${item.served_qty.toFixed(2)} ${item.uom_name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">${item.remaining_qty.toFixed(2)} ${item.uom_name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">
                            <span class="status ${item.fulfillment_percent >= 100 ? 'status-paid' : item.fulfillment_percent > 0 ? 'status-pending' : 'status-overdue'}">
                                ${item.fulfillment_percent.toFixed(0)}%
                            </span>
                        </td>
                    `;
                    
                    const children = childItems.filter(child => child.parent_row_id === (index + 1));
                    children.forEach(child => {
                        const childRow = tbody.insertRow();
                        childRow.style.backgroundColor = 'var(--surface-1)';
                        childRow.innerHTML = `
                            <td style="padding: 8px; padding-left: 30px; border-bottom: 1px solid var(--border-default); color: var(--subtext); font-size: 12px;">↳ ${child.product_name}</td>
                            <td style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right; color: var(--subtext);">${child.ordered_qty.toFixed(2)} ${child.uom_name}</td>
                            <td colspan="3" style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: center; color: var(--subtext);">-</td>
                        `;
                    });
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No fulfillment data available</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--error);">Error loading fulfillment data</td></tr>';
        }
    }
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (deleteInvoiceId) {
            try {
                const response = await fetch(`../../../../server/api/sale/sale_order/order-delete.php?id=${deleteInvoiceId}`, {
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
                alert('Error deleting order: ' + error.message);
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
    
    document.getElementById('fulfillmentModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}