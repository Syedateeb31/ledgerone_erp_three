let suppliers = [];
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function () {
    const suppliersTable = document.getElementById('suppliersTable');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const companyFilter = document.getElementById('companyFilter');
    const cityFilter = document.getElementById('cityFilter');

    // Link this Supplier to a Customer (same real-world party trading both ways)
    const editPartyLink = initPartyLink({
        partyType: 'supplier',
        container: document.getElementById('editPartyLinkContainer'),
        dropdownParent: '#editModal'
    });

    loadCompanyFilter();
    loadCityFilter();
    loadSuppliers();

    function loadSuppliers() {
        const params = new URLSearchParams({
            search: searchInput.value,
            status: statusFilter.value,
            company: companyFilter.value,
            city: cityFilter.value,
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
                        <button class="action-btn edit" data-id="${supplier.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" data-id="${supplier.id}" title="Delete"><i class="fas fa-trash"></i></button>
                        <button class="action-btn view" data-id="${supplier.id}" title="View"><i class="fas fa-eye"></i></button>
                    </div>
                </td>
            `;
            suppliersTable.appendChild(row);
        });
    }

    // Action buttons event delegation
    suppliersTable.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const supplierId = target.dataset.id;
        const supplier = suppliers.find(s => s.id == supplierId);

        if (target.classList.contains('edit')) {
            openEditModal(supplierId);
        } else if (target.classList.contains('delete')) {
            openDeleteModal(supplierId, supplier.supplier_name);
        } else if (target.classList.contains('view')) {
            openViewModal(supplierId);
        }
    });

    // Delete Modal
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalClose = document.getElementById('deleteModalClose');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteSupplierName = document.getElementById('deleteSupplierName');
    let currentDeletingId = null;

    function openDeleteModal(id, name) {
        currentDeletingId = id;
        deleteSupplierName.textContent = name;
        deleteModal.classList.add('show');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('show');
        currentDeletingId = null;
    }

    deleteModalClose.addEventListener('click', closeDeleteModal);
    deleteCancelBtn.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) closeDeleteModal();
    });

    deleteConfirmBtn.addEventListener('click', function() {
        deleteConfirmBtn.disabled = true;
        deleteConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        fetch('../../../../server/api/customer_supplier/suppliers/supplier-delete.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentDeletingId })
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
    });

    // View Modal
    const viewModal = document.getElementById('viewModal');
    const viewModalClose = document.getElementById('viewModalClose');
    const viewCloseBtn = document.getElementById('viewCloseBtn');
    const viewEditBtn = document.getElementById('viewEditBtn');
    let currentViewingId = null;

    function openViewModal(id) {
        currentViewingId = id;
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-edit.php?id=${id}`)
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
        document.getElementById('viewSupplierName').textContent = supplier.supplier_name;
        document.getElementById('viewBrandName').textContent = supplier.brand_name || '-';
        document.getElementById('viewAddress').textContent = supplier.address || '-';
        document.getElementById('viewPrimaryPhone').textContent = supplier.primary_phone || '-';
        document.getElementById('viewSecondaryPhone').textContent = supplier.secondary_phone || '-';
        document.getElementById('viewEmail').textContent = supplier.email || '-';
        document.getElementById('viewIdentityCard').textContent = supplier.identity_card_no || '-';
        document.getElementById('viewOpeningDebit').textContent = `${currencySymbol}${parseFloat(supplier.opening_debit_amount || 0).toFixed(2)}`;
        document.getElementById('viewOpeningCredit').textContent = `${currencySymbol}${parseFloat(supplier.opening_credit_amount || 0).toFixed(2)}`;
        document.getElementById('viewAitPercent').textContent = `${parseFloat(supplier.ait_percent || 0).toFixed(2)}%`;
        document.getElementById('viewCurrentBalance').textContent = `${currencySymbol}${parseFloat(supplier.current_balance || 0).toFixed(2)}`;
        document.getElementById('viewStatus').innerHTML = supplier.is_blacklisted ?
            '<span class="status-badge status-blacklisted">Blacklisted</span>' :
            '<span class="status-badge status-active">Active</span>';
        document.getElementById('viewCreatedAt').textContent = new Date(supplier.created_at).toLocaleDateString();
        document.getElementById('viewUpdatedAt').textContent = new Date(supplier.updated_at).toLocaleDateString();

        // Territory names via lookup
        const base = '../../../../server/api/customer_supplier/customers/';
        const setField = (id, val) => { document.getElementById(id).textContent = val || '-'; };

        Promise.all([
            fetch(base + 'get-countries.php').then(r => r.json()),
            fetch(base + 'get-all-regions.php').then(r => r.json()),
            fetch(base + 'get-all-cities.php').then(r => r.json()),
            fetch(base + 'get-all-city-zones.php').then(r => r.json()),
            fetch(base + 'get-all-areas.php').then(r => r.json())
        ]).then(([countries, regions, cities, zones, areas]) => {
            const find = (list, key, id) => (list[key] || []).find(i => i.id == id);
            setField('viewCountry', find(countries, 'countries', supplier.country_id)?.country_name);
            setField('viewRegion', find(regions, 'regions', supplier.region_id)?.region_name);
            setField('viewCity', find(cities, 'cities', supplier.city_id)?.city_name);
            setField('viewCityZone', find(zones, 'city_zones', supplier.city_zone_id)?.city_zone_name);
            setField('viewArea', find(areas, 'areas', supplier.area_id)?.area_name);
        });

        // Salesman name
        if (supplier.salesman_id) {
            fetch('../../../../server/api/customer_supplier/suppliers/get-employees.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const employee = data.employees.find(e => e.id == supplier.salesman_id);
                        document.getElementById('viewSalesman').textContent = employee ? employee.full_name : '-';
                    }
                });
        } else {
            document.getElementById('viewSalesman').textContent = '-';
        }
    }

    function closeViewModal() {
        viewModal.classList.remove('show');
        currentViewingId = null;
    }

    viewModalClose.addEventListener('click', closeViewModal);
    viewCloseBtn.addEventListener('click', closeViewModal);
    viewModal.addEventListener('click', function(e) {
        if (e.target === viewModal) closeViewModal();
    });

    viewEditBtn.addEventListener('click', function() {
        closeViewModal();
        openEditModal(currentViewingId);
    });

    // Edit Modal (placeholder - to be implemented)
    function openEditModal(id) {
        const editModal = document.getElementById('editModal');
        const editModalClose = document.getElementById('editModalClose');
        const editCancelBtn = document.getElementById('editCancelBtn');
        const editSupplierForm = document.getElementById('editSupplierForm');
        const editSaveBtn = document.getElementById('editSaveBtn');

        let currentEditingId = id;

        // Fetch supplier data
        fetch(`../../../../server/api/customer_supplier/suppliers/supplier-edit.php?id=${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    populateEditForm(data.supplier);
                    editPartyLink.loadExisting(id);
                    editModal.classList.add('show');
                } else {
                    showNotification('Error', data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error', 'Failed to load supplier data', 'error');
            });

        function populateEditForm(supplier) {
            document.getElementById('editSupplierCode').value = supplier.supplier_code;
            document.getElementById('editSupplierName').value = supplier.supplier_name;
            document.getElementById('editBrandName').value = supplier.brand_name || '';
            document.getElementById('editAddress').value = supplier.address || '';
            document.getElementById('editPrimaryPhone').value = supplier.primary_phone || '';
            document.getElementById('editSecondaryPhone').value = supplier.secondary_phone || '';
            document.getElementById('editEmail').value = supplier.email || '';
            document.getElementById('editIdentityCard').value = supplier.identity_card_no || '';
            document.getElementById('editOpeningDebit').value = supplier.opening_debit_amount || 0;
            document.getElementById('editOpeningCredit').value = supplier.opening_credit_amount || 0;
            document.getElementById('editAitPercent').value = supplier.ait_percent || 0;
            document.getElementById('editBlacklist').checked = supplier.is_blacklisted == 1;

            // Load companies
            fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const editCompany = document.getElementById('editCompany');
                        editCompany.innerHTML = '<option value="">Select Company</option>';
                        data.companies.forEach(company => {
                            const option = new Option(company.company_name, company.id);
                            if (company.id == supplier.company_id) option.selected = true;
                            editCompany.appendChild(option);
                        });
                    }
                });

            // Load employees for salesman
            fetch('../../../../server/api/customer_supplier/suppliers/get-employees.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const editSalesman = document.getElementById('editSalesman');
                        editSalesman.innerHTML = '<option value="">Select Salesman</option>';
                        data.employees.forEach(employee => {
                            const option = new Option(employee.full_name, employee.id);
                            if (employee.id == supplier.salesman_id) option.selected = true;
                            editSalesman.appendChild(option);
                        });
                    }
                });

            // Load territory dropdowns
            loadEditTerritoryDropdowns(supplier);

            // Load sub accounts
            fetch(`../../../../server/api/customer_supplier/suppliers/supplier-sub-accounts.php?supplier_id=${supplier.id}`)
                .then(response => response.json())
                .then(data => {
                    const tbody = document.getElementById('editSubAccountsBody');
                    tbody.innerHTML = '';

                    if (data.success && data.subAccounts && data.subAccounts.length > 0) {
                        data.subAccounts.forEach((subAccount, index) => {
                            const row = document.createElement('tr');
                            row.dataset.subAccountId = subAccount.id;
                            row.innerHTML = `
                                <td>${index + 1}</td>
                                <td><input type="text" class="sub-account-input" value="${subAccount.sub_account_name}" placeholder="Enter sub account name"></td>
                                <td><input type="number" class="sub-account-debit" value="${subAccount.debit || 0}" step="0.01" min="0" placeholder="0.00"></td>
                                <td><input type="number" class="sub-account-credit" value="${subAccount.credit || 0}" step="0.01" min="0" placeholder="0.00"></td>
                                <td>
                                    <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                                    <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
                                </td>
                            `;
                            tbody.appendChild(row);
                            attachSubAccountRowListeners(row);
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
                        tbody.appendChild(row);
                        attachSubAccountRowListeners(row);
                    }
                });
        }

        async function loadEditTerritoryDropdowns(supplier) {
            const base = '../../../../server/api/customer_supplier/customers/';

            // Countries
            const cRes = await fetch(base + 'get-countries.php').then(r => r.json());
            const editCountry = document.getElementById('editCountry');
            editCountry.innerHTML = '<option value="">Select Country</option>';
            if (cRes.success) cRes.countries.forEach(c => editCountry.appendChild(new Option(c.country_name, c.id)));
            editCountry.value = supplier.country_id || '';

            // Regions
            const rRes = await fetch(base + 'get-all-regions.php').then(r => r.json());
            const editRegion = document.getElementById('editRegion');
            editRegion.innerHTML = '<option value="">Select Region</option>';
            if (rRes.success) rRes.regions.forEach(r => editRegion.appendChild(new Option(r.region_name, r.id)));
            editRegion.value = supplier.region_id || '';

            // Cities
            const ciRes = await fetch(base + 'get-all-cities.php').then(r => r.json());
            const editCity = document.getElementById('editCity');
            editCity.innerHTML = '<option value="">Select City</option>';
            if (ciRes.success) ciRes.cities.forEach(c => editCity.appendChild(new Option(c.city_name, c.id)));
            editCity.value = supplier.city_id || '';

            // City Zones
            const czRes = await fetch(base + 'get-all-city-zones.php').then(r => r.json());
            const editCityZone = document.getElementById('editCityZone');
            editCityZone.innerHTML = '<option value="">Select City Zone</option>';
            if (czRes.success) czRes.city_zones.forEach(z => editCityZone.appendChild(new Option(z.city_zone_name, z.id)));
            editCityZone.value = supplier.city_zone_id || '';

            // Areas
            const aRes = await fetch(base + 'get-all-areas.php').then(r => r.json());
            const editArea = document.getElementById('editArea');
            editArea.innerHTML = '<option value="">Select Area</option>';
            if (aRes.success) aRes.areas.forEach(a => editArea.appendChild(new Option(a.area_name, a.id)));
            editArea.value = supplier.area_id || '';
        }

        function updateSubAccountRowNumbers() {
            const tbody = document.getElementById('editSubAccountsBody');
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                row.querySelector('td:first-child').textContent = index + 1;
            });
        }

        function attachSubAccountRowListeners(row) {
            const addBtn = row.querySelector('.btn-add');
            const removeBtn = row.querySelector('.btn-remove');

            if (addBtn) {
                addBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tbody = document.getElementById('editSubAccountsBody');
                    const newRow = document.createElement('tr');
                    const rowCount = tbody.querySelectorAll('tr').length + 1;
                    newRow.innerHTML = `
                        <td>${rowCount}</td>
                        <td><input type="text" class="sub-account-input" placeholder="Enter sub account name"></td>
                        <td><input type="number" class="sub-account-debit" step="0.01" min="0" placeholder="0.00"></td>
                        <td><input type="number" class="sub-account-credit" step="0.01" min="0" placeholder="0.00"></td>
                        <td>
                            <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                            <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
                        </td>
                    `;
                    tbody.appendChild(newRow);
                    attachSubAccountRowListeners(newRow);
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tbody = document.getElementById('editSubAccountsBody');
                    if (tbody.querySelectorAll('tr').length > 1) {
                        row.remove();
                        updateSubAccountRowNumbers();
                    } else {
                        alert('At least one sub-account row must remain');
                    }
                });
            }
        }

        function closeEditModal() {
            editModal.classList.remove('show');
            editSupplierForm.reset();
            editPartyLink.reset();
        }

        editModalClose.addEventListener('click', closeEditModal);
        editCancelBtn.addEventListener('click', closeEditModal);
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) closeEditModal();
        });

        // Attach listeners to initial sub-account rows
        const initialRows = document.getElementById('editSubAccountsBody').querySelectorAll('tr');
        initialRows.forEach(row => {
            attachSubAccountRowListeners(row);
        });

        // Form submission
        editSupplierForm.onsubmit = function(e) {
            e.preventDefault();

            // Collect sub accounts
            const subAccounts = [];
            const rows = document.getElementById('editSubAccountsBody').querySelectorAll('tr');
            rows.forEach(row => {
                const name = row.querySelector('.sub-account-input').value.trim();
                const debit = parseFloat(row.querySelector('.sub-account-debit').value) || 0;
                const credit = parseFloat(row.querySelector('.sub-account-credit').value) || 0;
                if (name) {
                    const subAccount = { name, debit, credit };
                    if (row.dataset.subAccountId) {
                        subAccount.id = parseInt(row.dataset.subAccountId);
                    }
                    subAccounts.push(subAccount);
                }
            });

            const formData = {
                id: currentEditingId,
                companyId: document.getElementById('editCompany').value,
                salesmanId: document.getElementById('editSalesman').value || null,
                supplierName: document.getElementById('editSupplierName').value.trim(),
                brandName: document.getElementById('editBrandName').value.trim(),
                address: document.getElementById('editAddress').value.trim(),
                primaryPhone: document.getElementById('editPrimaryPhone').value.trim(),
                secondaryPhone: document.getElementById('editSecondaryPhone').value.trim(),
                identityCard: document.getElementById('editIdentityCard').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                countryId: document.getElementById('editCountry').value || null,
                regionId: document.getElementById('editRegion').value || null,
                cityId: document.getElementById('editCity').value || null,
                cityZoneId: document.getElementById('editCityZone').value || null,
                areaId: document.getElementById('editArea').value || null,
                openingDebit: document.getElementById('editOpeningDebit').value || 0,
                openingCredit: document.getElementById('editOpeningCredit').value || 0,
                aitPercent: document.getElementById('editAitPercent').value || 0,
                blacklist: document.getElementById('editBlacklist').checked,
                subAccounts: subAccounts
            };

            editSaveBtn.disabled = true;
            editSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            fetch('../../../../server/api/customer_supplier/suppliers/supplier-edit.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Success', data.message, 'success');

                    // If the user opted to link this supplier to a customer, do that now
                    editPartyLink.applyLink(currentEditingId, () => ({
                        name: formData.supplierName,
                        address: formData.address,
                        primaryPhone: formData.primaryPhone,
                        secondaryPhone: formData.secondaryPhone,
                        email: formData.email,
                        identityCard: formData.identityCard,
                        companyId: formData.companyId
                    })).then(linkResult => {
                        if (linkResult && linkResult.success === false) {
                            showNotification('Linking Failed', linkResult.message || 'Supplier was updated but could not be linked to a customer', 'error');
                        }
                    });

                    closeEditModal();
                    loadSuppliers();
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
        };
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

    function loadCityFilter() {
        fetch('../../../../server/api/customer_supplier/customers/get-all-cities.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.cities.forEach(city => {
                        const option = document.createElement('option');
                        option.value = city.id;
                        option.textContent = city.city_name;
                        cityFilter.appendChild(option);
                    });
                }
            });
    }

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

    cityFilter.addEventListener('change', function() {
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
