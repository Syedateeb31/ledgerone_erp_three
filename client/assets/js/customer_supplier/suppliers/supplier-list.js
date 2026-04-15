let suppliers = [];
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function () {
    const suppliersTable = document.getElementById('suppliersTable');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const companyFilter = document.getElementById('companyFilter');
    
    loadCompanyFilter();
    loadSuppliers();
    
    function loadSuppliers() {
        const params = new URLSearchParams({
            search: searchInput.value,
            status: statusFilter.value,
            company: companyFilter.value,
            page: currentPage,
            limit: 10
        });
        
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-list.php?${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    suppliers = data.suppliers;
                    renderSuppliers(suppliers);
                    updateStats(data.stats);
                    updatePagination(data.pagination);
                }
            });
    }

    function renderSuppliers(suppliersToRender) {
        suppliersTable.innerHTML = '';
        suppliersToRender.forEach(supplier => {
            const status = supplier.is_blacklisted ? 'blacklisted' : 'active';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="customer-code">${supplier.supplier_code}</span></td>
                <td><span class="customer-name">${supplier.supplier_name}</span></td>
                <td>${supplier.primary_phone || '-'}</td>
                <td>${supplier.email || '-'}</td>
                <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" title="Delete"><i class="fas fa-trash"></i></button>
                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                    </div>
                </td>
            `;
            suppliersTable.appendChild(row);
        });
    }
    
    function updateStats(stats) {
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.total_suppliers;
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = stats.active_suppliers;
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = stats.blacklisted_suppliers;
    }
    
    function updatePagination(pagination) {
        currentPage = pagination.page;
        totalPages = pagination.pages;
        const tableInfo = document.getElementById('tableInfo');
        const start = ((pagination.page - 1) * pagination.limit) + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        tableInfo.textContent = `Showing ${start}-${end} of ${pagination.total} suppliers`;
    }

    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadSuppliers();
        }, 500);
    });

    function loadCompanyFilter() {
        fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.companies.forEach(company => {
                        const option = document.createElement('option');
                        option.value = company.id;
                        option.textContent = company.company_name;
                        companyFilter.appendChild(option);
                    });
                }
            });
    }

    statusFilter.addEventListener('change', function() {
        currentPage = 1;
        loadSuppliers();
    });

    companyFilter.addEventListener('change', function() {
        currentPage = 1;
        loadSuppliers();
    });

    document.getElementById('prevPage').addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            loadSuppliers();
        }
    });

    document.getElementById('nextPage').addEventListener('click', function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadSuppliers();
        }
    });

    function showNotification(title, message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationTitle = document.getElementById('notificationTitle');
        const notificationMessage = document.getElementById('notificationMessage');
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notification.className = 'notification';
        notification.classList.add(type, 'show');
        setTimeout(() => notification.classList.remove('show'), 5000);
    }

    document.getElementById('notificationClose').addEventListener('click', function () {
        document.getElementById('notification').classList.remove('show');
    });
});
