document.addEventListener('DOMContentLoaded', function () {
    // ===== CUSTOMIZE FIELDS FUNCTIONALITY =====
    const CUSTOMIZE_FIELDS_KEY = 'supplierFormCustomizeFields';

    const allFields = [
        { id: 'company', label: 'Company', visible: true },
        { id: 'supplierCode', label: 'Supplier Code', visible: true },
        { id: 'salesmanSearch', label: 'Salesman', visible: true },
        { id: 'supplierName', label: 'Brand Name', visible: true },
        { id: 'brandName', label: 'Supplier Name', visible: true },
        { id: 'address', label: 'Address', visible: false },
        { id: 'primaryPhone', label: 'Primary Phone', visible: false },
        { id: 'secondaryPhone', label: 'Secondary Phone', visible: false },
        { id: 'email', label: 'Email Address', visible: false },
        { id: 'identityCard', label: 'Identity Card No', visible: false },
        { id: 'country', label: 'Country', visible: false },
        { id: 'region', label: 'Region', visible: false },
        { id: 'city', label: 'City', visible: false },
        { id: 'cityZone', label: 'City Zone', visible: false },
        { id: 'area', label: 'Area', visible: true },
        { id: 'openingDebit', label: 'Opening Debit Amount', visible: false },
        { id: 'openingCredit', label: 'Opening Credit Amount', visible: false },
        { id: 'aitPercent', label: 'AIT %', visible: false },
        { id: 'blacklist', label: 'Blacklist Supplier', visible: false },
        { id: 'subAccountsTable', label: '📋 Sub Accounts', visible: false }
    ];

    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.getElementById('notificationClose');

    function getFieldVisibility() {
        const stored = localStorage.getItem(CUSTOMIZE_FIELDS_KEY);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { return getDefaultVisibility(); }
        }
        return getDefaultVisibility();
    }

    function getDefaultVisibility() {
        const defaults = {};
        allFields.forEach(field => { defaults[field.id] = field.visible; });
        return defaults;
    }

    function saveFieldVisibility(visibility) {
        localStorage.setItem(CUSTOMIZE_FIELDS_KEY, JSON.stringify(visibility));
    }

    function getFieldFormGroup(fieldId) {
        // Special case: subAccountsTable -> hide entire form-section
        if (fieldId === 'subAccountsTable') {
            const el = document.getElementById(fieldId);
            return el ? el.closest('.form-section') : null;
        }
        // Special case: salesmanSearch is inside salesmanChipsContainer, go up to form-group
        if (fieldId === 'salesmanSearch') {
            const el = document.getElementById('salesmanChipsContainer');
            return el ? el.closest('.form-group') : null;
        }
        const element = document.getElementById(fieldId);
        if (!element) return null;
        let parent = element.closest('.form-group');
        if (parent) return parent;
        parent = element.closest('.checkbox-group');
        if (parent && parent.closest('.form-group')) return parent.closest('.form-group');
        return parent;
    }

    function toggleFieldVisibility(fieldId, isVisible) {
        if (fieldId === 'subAccountsTable') {
            const section = getFieldFormGroup(fieldId);
            if (section) section.style.display = isVisible ? '' : 'none';
            return;
        }
        const formGroup = getFieldFormGroup(fieldId);
        if (formGroup) formGroup.style.display = isVisible ? '' : 'none';
        hideSectionIfEmpty(fieldId);
    }

    function hideSectionIfEmpty(fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) return;
        const section = element.closest('.form-section');
        if (!section) return;
        const formGroups = section.querySelectorAll('.form-group');
        let hasVisibleField = false;
        formGroups.forEach(fg => {
            const hasInput = fg.querySelector('input, select, textarea');
            if (hasInput && fg.style.display !== 'none') hasVisibleField = true;
        });
        const heading = section.querySelector('.section-title');
        if (heading) heading.style.display = hasVisibleField ? '' : 'none';
    }

    function applyFieldVisibility() {
        const visibility = getFieldVisibility();
        allFields.forEach(field => {
            if (visibility.hasOwnProperty(field.id)) {
                toggleFieldVisibility(field.id, visibility[field.id]);
            }
        });
    }

    function showNotification(title, message, type = 'success') {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notification.className = 'notification';
        notification.classList.add(type, 'show');
        setTimeout(() => notification.classList.remove('show'), 5000);
    }

    const customizeFieldsBtn = document.getElementById('customizeFieldsBtn');
    const customizeFieldsModal = document.getElementById('customizeFieldsModal');
    const customizeFieldsModalClose = document.getElementById('customizeFieldsModalClose');
    const customizeFieldsList = document.getElementById('customizeFieldsList');
    const customizeFieldsSaveBtn = document.getElementById('customizeFieldsSaveBtn');
    const customizeFieldsResetBtn = document.getElementById('customizeFieldsResetBtn');
    const customizeFieldsSelectAllBtn = document.getElementById('customizeFieldsSelectAllBtn');
    const customizeFieldsDeselectAllBtn = document.getElementById('customizeFieldsDeselectAllBtn');

    function populateCustomizeFieldsList() {
        const visibility = getFieldVisibility();
        customizeFieldsList.innerHTML = '';
        allFields.forEach(field => {
            const isVisible = visibility[field.id] !== undefined ? visibility[field.id] : field.visible;
            const div = document.createElement('div');
            div.className = 'customize-field-item';
            div.innerHTML = `
                <label class="customize-field-label">
                    <input type="checkbox" class="customize-field-checkbox" data-field-id="${field.id}" ${isVisible ? 'checked' : ''}>
                    <span>${field.label}</span>
                </label>
            `;
            customizeFieldsList.appendChild(div);
        });
    }

    customizeFieldsBtn.addEventListener('click', function () {
        populateCustomizeFieldsList();
        customizeFieldsModal.classList.add('show');
    });

    function closeCustomizeFieldsModal() {
        customizeFieldsModal.classList.remove('show');
    }

    customizeFieldsModalClose.addEventListener('click', closeCustomizeFieldsModal);
    customizeFieldsModal.addEventListener('click', function (e) {
        if (e.target === customizeFieldsModal) closeCustomizeFieldsModal();
    });

    customizeFieldsSaveBtn.addEventListener('click', function () {
        const checkboxes = customizeFieldsList.querySelectorAll('.customize-field-checkbox');
        const visibility = {};
        checkboxes.forEach(checkbox => {
            visibility[checkbox.dataset.fieldId] = checkbox.checked;
        });
        saveFieldVisibility(visibility);
        applyFieldVisibility();

        document.querySelectorAll('.form-section').forEach(section => {
            const formGroups = section.querySelectorAll('.form-group');
            let hasVisibleField = false;
            formGroups.forEach(fg => {
                const hasInput = fg.querySelector('input, select, textarea');
                const hasCheckbox = fg.querySelector('input[type="checkbox"]');
                if ((hasInput || hasCheckbox) && fg.style.display !== 'none') hasVisibleField = true;
            });
            const heading = section.querySelector('.section-title');
            if (heading) heading.style.display = hasVisibleField ? '' : 'none';
            formGroups.forEach(fg => {
                const hasInput = fg.querySelector('input, select, textarea');
                const hasCheckbox = fg.querySelector('input[type="checkbox"]');
                if (!hasInput && !hasCheckbox) fg.style.display = hasVisibleField ? '' : 'none';
            });
        });

        closeCustomizeFieldsModal();
        showNotification('Success', 'Field preferences saved successfully!', 'success');
    });

    customizeFieldsResetBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset to default field visibility?')) {
            saveFieldVisibility(getDefaultVisibility());
            applyFieldVisibility();
            populateCustomizeFieldsList();
            showNotification('Success', 'Field visibility reset to default', 'success');
        }
    });

    customizeFieldsSelectAllBtn.addEventListener('click', function () {
        customizeFieldsList.querySelectorAll('.customize-field-checkbox').forEach(cb => cb.checked = true);
    });

    customizeFieldsDeselectAllBtn.addEventListener('click', function () {
        customizeFieldsList.querySelectorAll('.customize-field-checkbox').forEach(cb => cb.checked = false);
    });

    notificationClose.addEventListener('click', () => notification.classList.remove('show'));

    // Apply visibility on page load
    applyFieldVisibility();

    document.querySelectorAll('.form-section').forEach(section => {
        const formGroups = section.querySelectorAll('.form-group');
        let hasVisibleField = false;
        formGroups.forEach(fg => {
            const hasInput = fg.querySelector('input, select, textarea');
            const hasCheckbox = fg.querySelector('input[type="checkbox"]');
            if ((hasInput || hasCheckbox) && fg.style.display !== 'none') hasVisibleField = true;
        });
        const heading = section.querySelector('.section-title');
        if (heading && !hasVisibleField) heading.style.display = 'none';
    });
    // ===== END CUSTOMIZE FIELDS =====

    const form = document.getElementById('supplierForm');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const companySelect = document.getElementById('company');

    // Link this Supplier to a Customer (same real-world party trading both ways)
    const partyLink = initPartyLink({
        partyType: 'supplier',
        container: document.getElementById('partyLinkContainer')
    });

    // Salesman multi-select elements
    const salesmanSearch = document.getElementById('salesmanSearch');
    const salesmanChipsList = document.getElementById('salesmanChipsList');
    const salesmanDropdown = document.getElementById('salesmanDropdown');
    const salesmanIdsInput = document.getElementById('salesmanIds');
    const salesmanChipsContainer = document.getElementById('salesmanChipsContainer');

    let employees = [];
    let selectedSalesmen = [];
    let isSubmitting = false;

    // Territory Select2 init + cascade events + initial data load
    $(document).ready(function() {
        $('#company').select2({ placeholder: 'Select Company', allowClear: false });
        $('#country').select2({ placeholder: 'Select Country', allowClear: true });
        $('#region').select2({ placeholder: 'Select Region', allowClear: true });
        $('#city').select2({ placeholder: 'Select City', allowClear: true });
        $('#cityZone').select2({ placeholder: 'Select City Zone', allowClear: true });
        $('#area').select2({ placeholder: 'Select Area', allowClear: true });

        loadCompanies();
        loadEmployees();
        loadCountries();
        loadAllRegions();
        loadAllCities();
        loadAllCityZones();
        loadAllAreas();

        $('#country').on('change', function() {
            const countryId = this.value;
            if (countryId) { loadRegions(countryId); } else { loadAllRegions(); }
        });

        $('#region').on('change', function() {
            const regionId = this.value;
            if (regionId) { loadRegionHierarchy(regionId); loadCities(regionId); } else { loadAllCities(); }
        });

        $('#city').on('change', function() {
            const cityId = this.value;
            if (cityId) { loadCityHierarchy(cityId); loadCityZones(cityId); } else { loadAllCityZones(); }
        });

        $('#cityZone').on('change', function() {
            const cityZoneId = this.value;
            if (cityZoneId) { loadCityZoneHierarchy(cityZoneId); loadAreas(cityZoneId); } else { loadAllAreas(); }
        });

        $('#area').on('change', function() {
            const areaId = this.value;
            if (areaId) { loadFullHierarchyFromArea(areaId); }
        });
    });

    function loadCountries() {
        fetch('../../../../server/api/customer_supplier/customers/get-countries.php')
            .then(r => r.json()).then(data => {
                if (data.success) data.countries.forEach(c => $('#country').append(new Option(c.country_name, c.id)));
            });
    }

    function loadAllRegions() {
        fetch('../../../../server/api/customer_supplier/customers/get-all-regions.php')
            .then(r => r.json()).then(data => {
                if (data.success) data.regions.forEach(r => $('#region').append(new Option(r.region_name, r.id)));
            });
    }

    function loadAllCities() {
        fetch('../../../../server/api/customer_supplier/customers/get-all-cities.php')
            .then(r => r.json()).then(data => {
                if (data.success) data.cities.forEach(c => $('#city').append(new Option(c.city_name, c.id)));
            });
    }

    function loadAllCityZones() {
        fetch('../../../../server/api/customer_supplier/customers/get-all-city-zones.php')
            .then(r => r.json()).then(data => {
                if (data.success) data.city_zones.forEach(z => $('#cityZone').append(new Option(z.city_zone_name, z.id)));
            });
    }

    function loadAllAreas() {
        fetch('../../../../server/api/customer_supplier/customers/get-all-areas.php')
            .then(r => r.json()).then(data => {
                if (data.success) {
                    $('#area').empty().append('<option value="">Select Area</option>');
                    data.areas.forEach(a => $('#area').append(new Option(a.area_name, a.id)));
                }
            });
    }

    function loadRegions(countryId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-regions.php?country_id=${countryId}`)
            .then(r => r.json()).then(data => {
                if (data.success) {
                    $('#region').empty().append('<option value="">Select Region</option>');
                    data.regions.forEach(r => $('#region').append(new Option(r.region_name, r.id)));
                }
            });
    }

    function loadCities(regionId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-cities.php?region_id=${regionId}`)
            .then(r => r.json()).then(data => {
                if (data.success) {
                    $('#city').empty().append('<option value="">Select City</option>');
                    data.cities.forEach(c => $('#city').append(new Option(c.city_name, c.id)));
                }
            });
    }

    function loadCityZones(cityId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-city-zones.php?city_id=${cityId}`)
            .then(r => r.json()).then(data => {
                if (data.success) {
                    $('#cityZone').empty().append('<option value="">Select City Zone</option>');
                    data.city_zones.forEach(z => $('#cityZone').append(new Option(z.city_zone_name, z.id)));
                }
            });
    }

    function loadAreas(cityZoneId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-areas.php?city_zone_id=${cityZoneId}`)
            .then(r => r.json()).then(data => {
                if (data.success) {
                    $('#area').empty().append('<option value="">Select Area</option>');
                    data.areas.forEach(a => $('#area').append(new Option(a.area_name, a.id)));
                }
            });
    }

    function loadRegionHierarchy(regionId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-region-hierarchy.php?country_id=${regionId}`)
            .then(r => r.json()).then(data => {
                if (data.success && data.hierarchy) $('#country').val(data.hierarchy.country_id).trigger('change.select2');
            });
    }

    function loadCityHierarchy(cityId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-city-hierarchy.php?region_id=${cityId}`)
            .then(r => r.json()).then(data => {
                if (data.success && data.hierarchy) {
                    $('#country').val(data.hierarchy.country_id).trigger('change.select2');
                    $('#region').val(data.hierarchy.region_id).trigger('change.select2');
                }
            });
    }

    function loadCityZoneHierarchy(cityZoneId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-city-zone-hierarchy.php?city_id=${cityZoneId}`)
            .then(r => r.json()).then(data => {
                if (data.success && data.hierarchy) {
                    $('#country').val(data.hierarchy.country_id).trigger('change.select2');
                    $('#region').val(data.hierarchy.region_id).trigger('change.select2');
                    $('#city').val(data.hierarchy.city_id).trigger('change.select2');
                }
            });
    }

    function loadFullHierarchyFromArea(areaId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-area-hierarchy.php?area_id=${areaId}`)
            .then(r => r.json()).then(data => {
                if (data.success && data.hierarchy) {
                    $('#country').val(data.hierarchy.country_id).trigger('change.select2');
                    $('#region').val(data.hierarchy.region_id).trigger('change.select2');
                    $('#city').val(data.hierarchy.city_id).trigger('change.select2');
                    $('#cityZone').val(data.hierarchy.city_zone_id).trigger('change.select2');
                }
            });
    }

    function loadCompanies() {
        fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.companies.forEach(company => {
                        const option = new Option(company.company_name, company.id);
                        companySelect.appendChild(option);
                    });
                }
            });
    }

    function loadEmployees() {
        fetch('../../../../server/api/customer_supplier/suppliers/get-employees.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    employees = data.employees;
                }
            });
    }

    // Salesman search functionality
    salesmanSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        if (searchTerm.length === 0) {
            salesmanDropdown.style.display = 'none';
            return;
        }

        const filtered = employees.filter(emp =>
            emp.full_name.toLowerCase().includes(searchTerm) &&
            !selectedSalesmen.find(s => s.id === emp.id)
        );

        if (filtered.length > 0) {
            salesmanDropdown.innerHTML = filtered.map(emp => `
                <div class="salesman-dropdown-item" data-id="${emp.id}" data-name="${emp.full_name}">
                    ${emp.full_name}
                </div>
            `).join('');
            salesmanDropdown.style.display = 'block';
        } else {
            salesmanDropdown.style.display = 'none';
        }
    });

    // Handle dropdown item click
    salesmanDropdown.addEventListener('click', function(e) {
        const item = e.target.closest('.salesman-dropdown-item');
        if (item) {
            const id = item.dataset.id;
            const name = item.dataset.name;
            addSalesmanChip(id, name);
            salesmanSearch.value = '';
            salesmanDropdown.style.display = 'none';
        }
    });

    // Add salesman chip
    function addSalesmanChip(id, name) {
        if (selectedSalesmen.find(s => s.id === id)) return;
        selectedSalesmen.push({ id, name });
        updateSalesmanChips();
        updateSalesmanIdsInput();
    }

    // Remove salesman chip
    function removeSalesmanChip(id) {
        selectedSalesmen = selectedSalesmen.filter(s => s.id !== id);
        updateSalesmanChips();
        updateSalesmanIdsInput();
    }

    // Update chips display
    function updateSalesmanChips() {
        salesmanChipsList.innerHTML = selectedSalesmen.map(s => `
            <div class="salesman-chip">
                <span>${s.name}</span>
                <span class="chip-remove" data-id="${s.id}">×</span>
            </div>
        `).join('');

        salesmanChipsList.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                removeSalesmanChip(this.dataset.id);
            });
        });
    }

    // Update hidden input with comma-separated IDs
    function updateSalesmanIdsInput() {
        salesmanIdsInput.value = selectedSalesmen.map(s => s.id).join(',');
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!salesmanChipsContainer.contains(e.target) && !salesmanDropdown.contains(e.target)) {
            salesmanDropdown.style.display = 'none';
        }
    });

    // Focus search input when clicking container
    salesmanChipsContainer.addEventListener('click', function() {
        salesmanSearch.focus();
    });

    // Sub-accounts table management
    const subAccountsBody = document.getElementById('subAccountsBody');

    function updateRowNumbers() {
        const rows = subAccountsBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
    }

    function addSubAccountRow() {
        const rowCount = subAccountsBody.querySelectorAll('tr').length + 1;
        const newRow = document.createElement('tr');
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
        subAccountsBody.appendChild(newRow);
        attachSubAccountRowListeners(newRow);
    }

    function removeSubAccountRow(button) {
        const row = button.closest('tr');
        if (subAccountsBody.querySelectorAll('tr').length > 1) {
            row.remove();
            updateRowNumbers();
        } else {
            alert('At least one sub-account row must remain');
        }
    }

    function attachSubAccountRowListeners(row) {
        const addBtn = row.querySelector('.btn-add');
        const removeBtn = row.querySelector('.btn-remove');

        if (addBtn) {
            addBtn.addEventListener('click', function(e) {
                e.preventDefault();
                addSubAccountRow();
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                removeSubAccountRow(this);
            });
        }
    }

    // Attach listeners to initial row
    subAccountsBody.querySelectorAll('tr').forEach(row => {
        attachSubAccountRowListeners(row);
    });

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (isSubmitting) return;

        if (!companySelect.value) {
            showNotification('Validation Error', 'Company is required', 'error');
            return;
        }

        if (!document.getElementById('supplierName').value.trim()) {
            showNotification('Validation Error', 'Supplier Name is required', 'error');
            return;
        }

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Collect sub accounts from table
        const subAccounts = [];
        const subAccountRows = document.querySelectorAll('#subAccountsBody tr');
        subAccountRows.forEach(row => {
            const nameInput = row.querySelector('.sub-account-input');
            const debitInput = row.querySelector('.sub-account-debit');
            const creditInput = row.querySelector('.sub-account-credit');

            if (nameInput && nameInput.value.trim()) {
                subAccounts.push({
                    name: nameInput.value.trim(),
                    debit: debitInput ? parseFloat(debitInput.value) || 0 : 0,
                    credit: creditInput ? parseFloat(creditInput.value) || 0 : 0
                });
            }
        });

        const formData = {
            companyId: companySelect.value,
            salesmanId: salesmanIdsInput.value || null,
            countryId: document.getElementById('country').value || null,
            regionId: document.getElementById('region').value || null,
            cityId: document.getElementById('city').value || null,
            cityZoneId: document.getElementById('cityZone').value || null,
            areaId: document.getElementById('area').value || null,
            supplierName: document.getElementById('supplierName').value.trim(),
            brandName: document.getElementById('brandName').value.trim(),
            address: document.getElementById('address').value.trim(),
            primaryPhone: document.getElementById('primaryPhone').value.trim(),
            secondaryPhone: document.getElementById('secondaryPhone').value.trim(),
            identityCard: document.getElementById('identityCard').value.trim(),
            email: document.getElementById('email').value.trim(),
            openingDebit: document.getElementById('openingDebit').value || 0,
            openingCredit: document.getElementById('openingCredit').value || 0,
            aitPercent: document.getElementById('aitPercent').value || 0,
            blacklist: document.getElementById('blacklist').checked,
            subAccounts: subAccounts
        };

        fetch('../../../../server/api/customer_supplier/suppliers/supplier-add.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', data.message, 'success');

                // If the user opted to link this supplier to a customer, do that now
                partyLink.applyLink(data.supplier_id, () => ({
                    name: document.getElementById('supplierName').value.trim(),
                    address: document.getElementById('address').value.trim(),
                    primaryPhone: document.getElementById('primaryPhone').value.trim(),
                    secondaryPhone: document.getElementById('secondaryPhone').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    identityCard: document.getElementById('identityCard').value.trim(),
                    companyId: companySelect.value
                })).then(linkResult => {
                    if (linkResult && linkResult.success === false) {
                        showNotification('Linking Failed', linkResult.message || 'Supplier was saved but could not be linked to a customer', 'error');
                    }
                });

                setTimeout(() => {
                    form.reset();
                    document.getElementById('supplierCode').value = 'Auto Generated';
                    selectedSalesmen = [];
                    updateSalesmanChips();
                    updateSalesmanIdsInput();
                    $('#country').val('').trigger('change');
                    $('#region').empty().append('<option value="">Select Region</option>');
                    $('#city').empty().append('<option value="">Select City</option>');
                    $('#cityZone').empty().append('<option value="">Select City Zone</option>');
                    loadAllAreas();
                    partyLink.reset();
                }, 2000);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            showNotification('Error', error.message || 'Failed to save supplier', 'error');
        })
        .finally(() => {
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Supplier';
        });
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the form?')) {
            form.reset();
            document.getElementById('supplierCode').value = 'Auto Generated';
            selectedSalesmen = [];
            updateSalesmanChips();
            updateSalesmanIdsInput();
            $('#country').val('').trigger('change');
            $('#region').empty().append('<option value="">Select Region</option>');
            $('#city').empty().append('<option value="">Select City</option>');
            $('#cityZone').empty().append('<option value="">Select City Zone</option>');
            loadAllAreas();
            partyLink.reset();
        }
    });
});
