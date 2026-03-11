let suppliers = [];
let currentPage = 1;
let totalPages = 1;
let userPermissions = [];

document.addEventListener('DOMContentLoaded', function () {
    const suppliersTable = document.getElementById('suppliersTable');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const companyFilter = document.getElementById('companyFilter');

    // Check permissions and load suppliers
    fetch('../../../../server/api/auth/check-permission.php?category=Customer / Supplier&form_name=New Supplier')
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
                userPermissions = data.permissions;
            }
            loadCompanyFilter();
            loadSuppliers();
        });

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
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to load suppliers', 'error');
            });
    }

    function renderSuppliers(suppliersToRender) {
        suppliersTable.innerHTML = '';

        suppliersToRender.forEach(supplier => {
            const status = supplier.is_blacklisted ? 'blacklisted' : 'active';

            const editBtn = userPermissions.includes('Edit') ? 
                `<button class="action-btn edit" title="Edit Supplier"><i class="fas fa-edit"></i></button>` : '';
            const deleteBtn = userPermissions.includes('Delete') ? 
                `<button class="action-btn delete" title="Delete Supplier"><i class="fas fa-trash"></i></button>` : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                        <td><span class="supplier-code">${supplier.supplier_code}</span></td>
                        <td><span class="supplier-name">${supplier.supplier_name}</span></td>
                        <td>${supplier.primary_phone || '-'}</td>
                        <td>${supplier.email || '-'}</td>
                        <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                        <td>
                            <div class="action-buttons">
                                ${editBtn}
                                ${deleteBtn}
                                <button class="action-btn" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
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

        // Update pagination buttons
        const paginationControls = document.querySelector('.pagination-controls');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // Clear existing page buttons
        const pageButtons = paginationControls.querySelectorAll('.pagination-btn:not(#prevPage):not(#nextPage)');
        pageButtons.forEach(btn => btn.remove());

        // Generate page buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                loadSuppliers();
            });
            paginationControls.insertBefore(pageBtn, nextBtn);
        }

        // Update prev/next button states
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // Search and filter functionality
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

    statusFilter.addEventListener('change', function () {
        currentPage = 1;
        loadSuppliers();
    });

    companyFilter.addEventListener('change', function () {
        currentPage = 1;
        loadSuppliers();
    });

    // Delete Modal Elements
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalClose = document.getElementById('deleteModalClose');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteSupplierName = document.getElementById('deleteSupplierName');
    let currentDeletingSupplierId = null;

    // Delete Supplier Function
    function deleteSupplier(supplierId, supplierName) {
        currentDeletingSupplierId = supplierId;
        deleteSupplierName.textContent = supplierName;
        deleteModal.classList.add('show');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('show');
        currentDeletingSupplierId = null;
    }

    function confirmDelete() {
        deleteConfirmBtn.disabled = true;
        deleteConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        fetch('../../../../server/api/customer_supplier/suppliers/supplier-delete.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: currentDeletingSupplierId })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Success', data.message, 'success');
                    closeDeleteModal();
                    loadSuppliers();
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to delete supplier', 'error');
            })
            .finally(() => {
                deleteConfirmBtn.disabled = false;
                deleteConfirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Supplier';
            });
    }

    // Delete Modal Event Listeners
    deleteModalClose.addEventListener('click', closeDeleteModal);
    deleteCancelBtn.addEventListener('click', closeDeleteModal);
    deleteConfirmBtn.addEventListener('click', confirmDelete);

    deleteModal.addEventListener('click', function (e) {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // View Modal Elements
    const viewModal = document.getElementById('viewModal');
    const viewModalClose = document.getElementById('viewModalClose');
    const viewCloseBtn = document.getElementById('viewCloseBtn');
    const viewEditBtn = document.getElementById('viewEditBtn');
    let currentViewingSupplierId = null;

    // View Modal Functions
    function openViewModal(supplierId) {
        currentViewingSupplierId = supplierId;

        // Fetch supplier data
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-edit.php?id=${supplierId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    populateViewModal(data.supplier);
                    viewModal.classList.add('show');
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to load supplier data', 'error');
            });
    }

    function populateViewModal(supplier) {
        document.getElementById('viewSupplierCode').textContent = supplier.supplier_code;
        document.getElementById('viewSupplierType').textContent = supplier.supplier_type || 'Manufacturer';
        document.getElementById('viewSupplierName').textContent = supplier.supplier_name;
        
        // Load and display company
        fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && supplier.company_id) {
                    const company = data.companies.find(c => c.id == supplier.company_id);
                    document.getElementById('viewCompany').textContent = company ? company.company_name : '-';
                } else {
                    document.getElementById('viewCompany').textContent = '-';
                }
            })
            .catch(() => {
                document.getElementById('viewCompany').textContent = '-';
            });
        
        document.getElementById('viewAddress').textContent = supplier.address || '';
        document.getElementById('viewPrimaryPhone').textContent = supplier.primary_phone || '';
        document.getElementById('viewSecondaryPhone').textContent = supplier.secondary_phone || '';
        document.getElementById('viewEmail').textContent = supplier.email || '';
        document.getElementById('viewIdentityCard').textContent = supplier.identity_card_no || '';
        document.getElementById('viewOpeningDebit').textContent = `${currencySymbol}${parseFloat(supplier.opening_debit_amount || 0).toFixed(2)}`;
        document.getElementById('viewOpeningCredit').textContent = `${currencySymbol}${parseFloat(supplier.opening_credit_amount || 0).toFixed(2)}`;
        document.getElementById('viewAitPercent').textContent = `${parseFloat(supplier.ait_percent || 0).toFixed(2)}%`;
        document.getElementById('viewCurrentBalance').textContent = `${currencySymbol}${parseFloat(supplier.current_balance || 0).toFixed(2)}`;
        document.getElementById('viewStatus').innerHTML = supplier.is_blacklisted ?
            '<span class="status-badge status-blacklisted">Blacklisted</span>' :
            '<span class="status-badge status-active">Active</span>';
        document.getElementById('viewCreatedAt').textContent = new Date(supplier.created_at).toLocaleDateString();
        document.getElementById('viewUpdatedAt').textContent = new Date(supplier.updated_at).toLocaleDateString();
    }

    function closeViewModal() {
        viewModal.classList.remove('show');
        currentViewingSupplierId = null;
    }

    // View Modal Event Listeners
    viewModalClose.addEventListener('click', closeViewModal);
    viewCloseBtn.addEventListener('click', closeViewModal);

    viewEditBtn.addEventListener('click', function () {
        closeViewModal();
        openEditModal(currentViewingSupplierId);
    });

    viewModal.addEventListener('click', function (e) {
        if (e.target === viewModal) {
            closeViewModal();
        }
    });

    // Export dropdown functionality
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');

    exportBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        exportDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
        exportDropdown.classList.remove('show');
    });

    // Handle export options
    exportDropdown.addEventListener('click', function (e) {
        if (e.target.classList.contains('dropdown-item')) {
            const exportType = e.target.dataset.export;
            exportDropdown.classList.remove('show');

            if (exportType === 'print') {
                // Redirect to print page
                window.open('customer-print.php', '_blank');
            } else if (exportType === 'excel') {
                // Download Excel file
                window.location.href = '../../../../server/api/customer_supplier/customers/customer-export.php';
                showNotification('Export Started', 'Excel file download started...', 'success');
            } else if (exportType === 'json') {
                // Download JSON file
                window.location.href = '../../../../server/api/customer_supplier/customers/customer-export-json.php';
                showNotification('Export Started', 'JSON file download started...', 'success');
            }
        }
    });

    // Edit Modal Elements
    const editModal = document.getElementById('editModal');
    const editModalClose = document.getElementById('editModalClose');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editSupplierForm = document.getElementById('editSupplierForm');
    let currentEditingSupplierId = null;

    // Action buttons
    suppliersTable.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const row = target.closest('tr');
        const supplierCode = row.querySelector('.supplier-code').textContent;
        const supplierName = row.querySelector('.supplier-name').textContent;
        const supplierId = suppliers.find(s => s.supplier_code === supplierCode)?.id;

        if (target.classList.contains('edit')) {
            openEditModal(supplierId);
        } else if (target.classList.contains('delete')) {
            deleteSupplier(supplierId, supplierName);
        } else if (target.querySelector('.fa-eye')) {
            openViewModal(supplierId);
        }
    });

    // Edit Modal Functions
    function openEditModal(supplierId) {
        currentEditingSupplierId = supplierId;

        // Fetch supplier data
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-edit.php?id=${supplierId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    populateEditForm(data.supplier);
                    loadEditSubAccounts(supplierId);
                    editModal.classList.add('show');
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to load supplier data', 'error');
            });
    }

    function populateEditForm(supplier) {
        document.getElementById('editSupplierCode').value = supplier.supplier_code;
        document.getElementById('editSupplierType').value = supplier.supplier_type || 'Manufacturer';
        document.getElementById('editSupplierName').value = supplier.supplier_name;
        
        // Load companies and set value
        fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const editCompany = document.getElementById('editCompany');
                    editCompany.innerHTML = '<option value="">Select Company</option>';
                    data.companies.forEach(company => {
                        const option = document.createElement('option');
                        option.value = company.id;
                        option.textContent = company.company_name;
                        if (company.id == supplier.company_id) option.selected = true;
                        editCompany.appendChild(option);
                    });
                }
            });
        
        document.getElementById('editAddress').value = supplier.address || '';
        document.getElementById('editPrimaryPhone').value = supplier.primary_phone || '';
        document.getElementById('editSecondaryPhone').value = supplier.secondary_phone || '';
        document.getElementById('editEmail').value = supplier.email || '';
        document.getElementById('editIdentityCard').value = supplier.identity_card_no || '';
        document.getElementById('editOpeningDebit').value = supplier.opening_debit_amount || 0;
        document.getElementById('editOpeningCredit').value = supplier.opening_credit_amount || 0;
        document.getElementById('editAitPercent').value = supplier.ait_percent || 0;
        document.getElementById('editBlacklist').checked = supplier.is_blacklisted;
        
        // Set initial lock state
        const editDebit = document.getElementById('editOpeningDebit');
        const editCredit = document.getElementById('editOpeningCredit');
        if (parseFloat(supplier.opening_debit_amount || 0) > 0) {
            editCredit.disabled = true;
        } else if (parseFloat(supplier.opening_credit_amount || 0) > 0) {
            editDebit.disabled = true;
        }
    }

    function loadEditSubAccounts(supplierId) {
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-sub-accounts.php?supplier_id=${supplierId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    populateEditSubAccounts(data.subAccounts);
                }
            });
    }

    function populateEditSubAccounts(subAccounts) {
        const editSubAccountsBody = document.getElementById('editSubAccountsBody');
        editSubAccountsBody.innerHTML = '';
        
        if (subAccounts.length > 0) {
            subAccounts.forEach((subAccount, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><input type="text" class="sub-account-input" value="${subAccount.sub_account_name}" placeholder="Enter sub account name"></td>
                    <td><input type="number" class="sub-account-debit" step="0.01" min="0" value="${subAccount.debit}" placeholder="0.00"></td>
                    <td><input type="number" class="sub-account-credit" step="0.01" min="0" value="${subAccount.credit}" placeholder="0.00"></td>
                    <td>
                        <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                        <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
                    </td>
                `;
                editSubAccountsBody.appendChild(row);
                attachEditSubAccountListeners(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>1</td>
                <td><input type="text" class="sub-account-input" placeholder="Enter sub account name"></td>
                <td><input type="number" class="sub-account-debit" step="0.01" min="0" placeholder="0.00"></td>
                <td><input type="number" class="sub-account-credit" step="0.01" min="0" placeholder="0.00"></td>
                <td>
                    <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                    <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
                </td>
            `;
            editSubAccountsBody.appendChild(row);
            attachEditSubAccountListeners(row);
        }
        updateEditOpeningBalances();
    }

    function closeEditModal() {
        editModal.classList.remove('show');
        currentEditingSupplierId = null;
        editSupplierForm.reset();
    }

    // Edit Modal Event Listeners
    editModalClose.addEventListener('click', closeEditModal);
    editCancelBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', function (e) {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Edit modal opening balance mutual locking
    document.getElementById('editOpeningDebit').addEventListener('input', function () {
        const editCredit = document.getElementById('editOpeningCredit');
        if (this.value && parseFloat(this.value) > 0) {
            editCredit.disabled = true;
            editCredit.value = '';
        } else {
            editCredit.disabled = false;
        }
    });

    document.getElementById('editOpeningCredit').addEventListener('input', function () {
        const editDebit = document.getElementById('editOpeningDebit');
        if (this.value && parseFloat(this.value) > 0) {
            editDebit.disabled = true;
            editDebit.value = '';
        } else {
            editDebit.disabled = false;
        }
    });

    // Edit sub accounts management
    const editSubAccountsBody = document.getElementById('editSubAccountsBody');

    function attachEditSubAccountListeners(row) {
        const debitInput = row.querySelector('.sub-account-debit');
        const creditInput = row.querySelector('.sub-account-credit');

        debitInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                creditInput.disabled = true;
                creditInput.value = '';
            } else {
                creditInput.disabled = false;
            }
            updateEditOpeningBalances();
        });

        creditInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                debitInput.disabled = true;
                debitInput.value = '';
            } else {
                debitInput.disabled = false;
            }
            updateEditOpeningBalances();
        });
    }

    function updateEditOpeningBalances() {
        const rows = editSubAccountsBody.querySelectorAll('tr');
        let totalDebit = 0;
        let totalCredit = 0;
        
        rows.forEach(row => {
            const debitInput = row.querySelector('.sub-account-debit');
            const creditInput = row.querySelector('.sub-account-credit');
            totalDebit += parseFloat(debitInput.value) || 0;
            totalCredit += parseFloat(creditInput.value) || 0;
        });
        
        const editDebit = document.getElementById('editOpeningDebit');
        const editCredit = document.getElementById('editOpeningCredit');
        
        if (totalDebit > 0 || totalCredit > 0) {
            editDebit.value = totalDebit > 0 ? totalDebit.toFixed(2) : '';
            editCredit.value = totalCredit > 0 ? totalCredit.toFixed(2) : '';
            editDebit.readOnly = true;
            editCredit.readOnly = true;
        } else {
            editDebit.readOnly = false;
            editCredit.readOnly = false;
        }
    }

    function addEditSubAccountRow() {
        const row = document.createElement('tr');
        const rowCount = editSubAccountsBody.querySelectorAll('tr').length + 1;
        row.innerHTML = `
            <td>${rowCount}</td>
            <td><input type="text" class="sub-account-input" placeholder="Enter sub account name"></td>
            <td><input type="number" class="sub-account-debit" step="0.01" min="0" placeholder="0.00"></td>
            <td><input type="number" class="sub-account-credit" step="0.01" min="0" placeholder="0.00"></td>
            <td>
                <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
            </td>
        `;
        editSubAccountsBody.appendChild(row);
        updateEditRowNumbers();
        attachEditSubAccountListeners(row);
    }

    function removeEditSubAccountRow(button) {
        const rows = editSubAccountsBody.querySelectorAll('tr');
        if (rows.length > 1) {
            button.closest('tr').remove();
            updateEditRowNumbers();
            updateEditOpeningBalances();
        }
    }

    function updateEditRowNumbers() {
        const rows = editSubAccountsBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
    }

    function getEditSubAccounts() {
        const rows = editSubAccountsBody.querySelectorAll('tr');
        const subAccounts = [];
        rows.forEach(row => {
            const nameInput = row.querySelector('.sub-account-input');
            const debitInput = row.querySelector('.sub-account-debit');
            const creditInput = row.querySelector('.sub-account-credit');
            if (nameInput && nameInput.value.trim()) {
                subAccounts.push({
                    name: nameInput.value.trim(),
                    debit: parseFloat(debitInput.value) || 0,
                    credit: parseFloat(creditInput.value) || 0
                });
            }
        });
        return subAccounts;
    }

    editSubAccountsBody.addEventListener('click', function(e) {
        if (e.target.closest('.btn-add')) {
            addEditSubAccountRow();
        } else if (e.target.closest('.btn-remove')) {
            removeEditSubAccountRow(e.target.closest('.btn-remove'));
        }
    });

    // Edit Form Submission
    editSupplierForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = {
            id: currentEditingSupplierId,
            companyId: document.getElementById('editCompany').value,
            supplierType: document.getElementById('editSupplierType').value,
            supplierName: document.getElementById('editSupplierName').value.trim(),
            address: document.getElementById('editAddress').value.trim(),
            primaryPhone: document.getElementById('editPrimaryPhone').value.trim(),
            secondaryPhone: document.getElementById('editSecondaryPhone').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            identityCard: document.getElementById('editIdentityCard').value.trim(),
            openingDebit: document.getElementById('editOpeningDebit').value || 0,
            openingCredit: document.getElementById('editOpeningCredit').value || 0,
            aitPercent: document.getElementById('editAitPercent').value || 0,
            blacklist: document.getElementById('editBlacklist').checked,
            subAccounts: getEditSubAccounts()
        };

        const editSaveBtn = document.getElementById('editSaveBtn');
        editSaveBtn.disabled = true;
        editSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        fetch('../../../../server/api/customer_supplier/suppliers/supplier-edit.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Success', data.message, 'success');
                    closeEditModal();
                    loadSuppliers(); // Reload the supplier list
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to update supplier', 'error');
            })
            .finally(() => {
                editSaveBtn.disabled = false;
                editSaveBtn.innerHTML = '<i class="fas fa-save"></i> Update Supplier';
            });
    });

    // Pagination
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    prevPage.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            loadSuppliers();
        }
    });

    nextPage.addEventListener('click', function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadSuppliers();
        }
    });

    // Show notification
    function showNotification(title, message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationTitle = document.getElementById('notificationTitle');
        const notificationMessage = document.getElementById('notificationMessage');

        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notification.className = 'notification';
        notification.classList.add(type, 'show');

        // Auto hide after 5 seconds
        setTimeout(function () {
            notification.classList.remove('show');
        }, 5000);
    }

    // Close notification
    const notificationClose = document.getElementById('notificationClose');
    notificationClose.addEventListener('click', function () {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
    });
});