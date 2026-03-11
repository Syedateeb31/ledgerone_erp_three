document.addEventListener('DOMContentLoaded', function () {
    // Check permissions
    checkPermissions();
    // Set customer code field to show Auto Generated
    document.getElementById('customerCode').value = 'Auto Generated';
    
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('fuelingsys-theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                localStorage.setItem('fuelingsys-theme', 'light');
            } else {
                body.classList.add('dark-mode');
                localStorage.setItem('fuelingsys-theme', 'dark');
            }
        });
    }

    // Form Validation
    const form = document.getElementById('customerForm');
    const customerName = document.getElementById('customerName');
    const primaryPhone = document.getElementById('primaryPhone');
    const secondaryPhone = document.getElementById('secondaryPhone');
    const identityCard = document.getElementById('identityCard');
    const email = document.getElementById('email');
    const openingDebit = document.getElementById('openingDebit');
    const openingCredit = document.getElementById('openingCredit');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.getElementById('notificationClose');

    // Territory dropdowns
    const countrySelect = document.getElementById('country');
    const regionSelect = document.getElementById('region');
    const citySelect = document.getElementById('city');
    const cityZoneSelect = document.getElementById('cityZone');
    const areaSelect = document.getElementById('area');
    const salesOfficerSelect = document.getElementById('salesOfficer');
    const companySelect = document.getElementById('company');

    // Taxation fields
    const isSalesTaxRegistered = document.getElementById('isSalesTaxRegistered');
    const strnGroup = document.getElementById('strnGroup');
    const strn = document.getElementById('strn');
    const isFiler = document.getElementById('isFiler');
    const ntnGroup = document.getElementById('ntnGroup');
    const ntn = document.getElementById('ntn');

    // Opening invoices
    const openingInvoicesSection = document.getElementById('openingInvoicesSection');
    const invoicesTableBody = document.getElementById('invoicesTableBody');
    const addInvoiceBtn = document.getElementById('addInvoiceBtn');
    let invoiceRows = [];
    let suppliers = [];
    let employees = [];

    // Sub accounts
    const subAccountsTableBody = document.getElementById('subAccountsTableBody');
    const addSubAccountBtn = document.getElementById('addSubAccountBtn');
    let subAccountCounter = 0;

    let isSubmitting = false;

    // Load suppliers and employees
    loadSuppliers();
    loadEmployees();

    function loadSuppliers() {
        fetch('../../../../server/api/customer_supplier/customers/get-suppliers.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    suppliers = data.suppliers;
                }
            });
    }

    function loadEmployees() {
        fetch('../../../../server/api/customer_supplier/customers/get-employees.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    employees = data.employees;
                }
            });
    }

    // Validation functions
    function validateName(name) {
        return name.trim().length > 0;
    }

    function validatePhone(phone) {
        if (!phone) return true; // Phone is optional
        const regex = /^[0-9]*$/;
        return regex.test(phone) && phone.length <= 15;
    }

    function validateIdentityCard(card) {
        if (!card) return true; // Identity card is optional
        const regex = /^[0-9]*$/;
        return regex.test(card) && card.length <= 15;
    }

    function validateEmail(email) {
        if (!email) return true; // Email is optional
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email) && email.length <= 300;
    }

    // Real-time validation - only for required fields
    customerName.addEventListener('input', function () {
        const errorElement = document.getElementById('customerNameError');
        if (!validateName(this.value)) {
            this.classList.add('error');
            errorElement.style.display = 'flex';
        } else {
            this.classList.remove('error');
            errorElement.style.display = 'none';
        }
    });

    // Optional field validation (only show errors if field has content)
    primaryPhone.addEventListener('input', function () {
        const errorElement = document.getElementById('primaryPhoneError');
        if (this.value && !validatePhone(this.value)) {
            this.classList.add('error');
            errorElement.style.display = 'flex';
        } else {
            this.classList.remove('error');
            errorElement.style.display = 'none';
        }
    });

    secondaryPhone.addEventListener('input', function () {
        const errorElement = document.getElementById('secondaryPhoneError');
        if (this.value && !validatePhone(this.value)) {
            this.classList.add('error');
            errorElement.style.display = 'flex';
        } else {
            this.classList.remove('error');
            errorElement.style.display = 'none';
        }
    });

    identityCard.addEventListener('input', function () {
        const errorElement = document.getElementById('identityCardError');
        if (this.value && !validateIdentityCard(this.value)) {
            this.classList.add('error');
            errorElement.style.display = 'flex';
        } else {
            this.classList.remove('error');
            errorElement.style.display = 'none';
        }
    });

    email.addEventListener('input', function () {
        const errorElement = document.getElementById('emailError');
        if (this.value && !validateEmail(this.value)) {
            this.classList.add('error');
            errorElement.style.display = 'flex';
        } else {
            this.classList.remove('error');
            errorElement.style.display = 'none';
        }
    });

    // Taxation field visibility
    isSalesTaxRegistered.addEventListener('change', function() {
        strnGroup.style.display = this.checked ? 'flex' : 'none';
        if (!this.checked) strn.value = '';
    });

    isFiler.addEventListener('change', function() {
        ntnGroup.style.display = this.checked ? 'flex' : 'none';
        if (!this.checked) ntn.value = '';
    });

    // Load territory data
    loadCountries();
    loadSalesOfficers();
    loadCompanies();

    // Initialize Select2 on territory dropdowns
    $(document).ready(function() {
        $('#company').select2({ placeholder: 'Select Company', allowClear: false });
        $('#country').select2({ placeholder: 'Select Country', allowClear: true });
        $('#region').select2({ placeholder: 'Select Region', allowClear: true }).prop('disabled', true);
        $('#city').select2({ placeholder: 'Select City', allowClear: true }).prop('disabled', true);
        $('#cityZone').select2({ placeholder: 'Select City Zone', allowClear: true }).prop('disabled', true);
        $('#area').select2({ placeholder: 'Select Area', allowClear: true }).prop('disabled', true);
        $('#salesOfficer').select2({ placeholder: 'Select Sales Officer', allowClear: true });
    });

    $('#country').on('change', function() {
        const countryId = this.value;
        $('#region').prop('disabled', !countryId).empty().append('<option value="">Select Region</option>').trigger('change');
        $('#city').prop('disabled', true).empty().append('<option value="">Select City</option>').trigger('change');
        $('#cityZone').prop('disabled', true).empty().append('<option value="">Select City Zone</option>').trigger('change');
        $('#area').prop('disabled', true).empty().append('<option value="">Select Area</option>').trigger('change');
        if (countryId) loadRegions(countryId);
    });

    $('#region').on('change', function() {
        const regionId = this.value;
        $('#city').prop('disabled', !regionId).empty().append('<option value="">Select City</option>').trigger('change');
        $('#cityZone').prop('disabled', true).empty().append('<option value="">Select City Zone</option>').trigger('change');
        $('#area').prop('disabled', true).empty().append('<option value="">Select Area</option>').trigger('change');
        if (regionId) loadCities(regionId);
    });

    $('#city').on('change', function() {
        const cityId = this.value;
        $('#cityZone').prop('disabled', !cityId).empty().append('<option value="">Select City Zone</option>').trigger('change');
        $('#area').prop('disabled', true).empty().append('<option value="">Select Area</option>').trigger('change');
        if (cityId) loadCityZones(cityId);
    });

    $('#cityZone').on('change', function() {
        const cityZoneId = this.value;
        $('#area').prop('disabled', !cityZoneId).empty().append('<option value="">Select Area</option>').trigger('change');
        if (cityZoneId) loadAreas(cityZoneId);
    });

    function loadCountries() {
        fetch('../../../../server/api/customer_supplier/customers/get-countries.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.countries.forEach(country => {
                        const option = new Option(country.country_name, country.id);
                        $('#country').append(option);
                    });
                    $('#country').trigger('change');
                }
            });
    }

    function loadRegions(countryId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-regions.php?country_id=${countryId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.regions.forEach(region => {
                        const option = new Option(region.region_name, region.id);
                        $('#region').append(option);
                    });
                    $('#region').trigger('change');
                }
            });
    }

    function loadCities(regionId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-cities.php?region_id=${regionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.cities.forEach(city => {
                        const option = new Option(city.city_name, city.id);
                        $('#city').append(option);
                    });
                    $('#city').trigger('change');
                }
            });
    }

    function loadCityZones(cityId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-city-zones.php?city_id=${cityId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.city_zones.forEach(zone => {
                        const option = new Option(zone.city_zone_name, zone.id);
                        $('#cityZone').append(option);
                    });
                    $('#cityZone').trigger('change');
                }
            });
    }

    function loadAreas(cityZoneId) {
        fetch(`../../../../server/api/customer_supplier/customers/get-areas.php?city_zone_id=${cityZoneId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.areas.forEach(area => {
                        const option = new Option(area.area_name, area.id);
                        $('#area').append(option);
                    });
                    $('#area').trigger('change');
                }
            });
    }

    function loadSalesOfficers() {
        fetch('../../../../server/api/customer_supplier/customers/get-employees.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.employees.forEach(employee => {
                        const option = new Option(employee.full_name, employee.id);
                        $('#salesOfficer').append(option);
                    });
                    $('#salesOfficer').trigger('change');
                }
            });
    }

    function loadCompanies() {
        fetch('../../../../server/api/customer_supplier/customers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.companies.forEach(company => {
                        const option = new Option(company.company_name, company.id);
                        $('#company').append(option);
                    });
                    // Auto-select if only one company
                    if (data.companies.length === 1) {
                        $('#company').val(data.companies[0].id).trigger('change');
                    }
                }
            });
    }

    // Opening balance mutual exclusion
    openingDebit.addEventListener('click', function() {
        // Allow manual entry by removing readonly temporarily
        if (invoicesTableBody.querySelectorAll('tr').length === 0) {
            this.removeAttribute('readonly');
        }
    });

    openingDebit.addEventListener('blur', function() {
        // If invoices exist, keep it readonly
        if (invoicesTableBody.querySelectorAll('tr').length > 0) {
            this.setAttribute('readonly', 'readonly');
        }
    });

    openingDebit.addEventListener('input', function() {
        if (this.value && parseFloat(this.value) > 0) {
            openingCredit.disabled = true;
            openingCredit.value = '';
        } else {
            openingCredit.disabled = false;
        }
    });

    openingCredit.addEventListener('input', function() {
        if (this.value && parseFloat(this.value) > 0) {
            openingDebit.disabled = true;
            openingDebit.value = '';
            invoiceRows = [];
            invoicesTableBody.innerHTML = '';
        } else {
            openingDebit.disabled = false;
        }
    });

    // Calculate total from invoices
    function calculateInvoiceTotal() {
        const rows = invoicesTableBody.querySelectorAll('tr');
        let total = 0;
        rows.forEach(row => {
            const debit = parseFloat(row.querySelector('.invoice-debit').value) || 0;
            total += debit;
        });
        openingDebit.value = total > 0 ? total.toFixed(2) : '';
        openingDebit.setAttribute('readonly', 'readonly');
        if (total > 0) {
            openingCredit.disabled = true;
        } else {
            openingCredit.disabled = false;
        }
    }

    // Add invoice row
    addInvoiceBtn.addEventListener('click', function() {
        const rowId = Date.now();
        const row = document.createElement('tr');
        row.dataset.rowId = rowId;
        
        row.innerHTML = `
            <td style="padding: 8px; border: 1px solid var(--border-default);">
                <input type="text" class="invoice-distribution-search" list="suppliers-list-${rowId}" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="Search distribution...">
                <datalist id="suppliers-list-${rowId}">
                    ${suppliers.map(s => `<option value="${s.supplier_name}" data-id="${s.id}">`).join('')}
                </datalist>
                <input type="hidden" class="invoice-distribution" value="">
            </td>
            <td style="padding: 8px; border: 1px solid var(--border-default);">
                <input type="text" class="invoice-sales-officer-search" list="employees-list-${rowId}" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="Search sales officer...">
                <datalist id="employees-list-${rowId}">
                    ${employees.map(e => `<option value="${e.full_name}" data-id="${e.id}">`).join('')}
                </datalist>
                <input type="hidden" class="invoice-sales-officer" value="">
            </td>
            <td style="padding: 8px; border: 1px solid var(--border-default);">
                <input type="text" class="invoice-number" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="Invoice #">
            </td>
            <td style="padding: 8px; border: 1px solid var(--border-default);">
                <input type="number" class="invoice-debit" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="0.00">
            </td>
            <td style="padding: 8px; border: 1px solid var(--border-default);">
                <input type="date" class="invoice-date" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;">
            </td>
            <td style="padding: 8px; border: 1px solid var(--border-default); text-align: center;">
                <button type="button" class="btn-remove-invoice" style="background: var(--error); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-minus"></i>
                </button>
            </td>
        `;
        invoicesTableBody.appendChild(row);
        
        // Handle distribution search
        const distSearch = row.querySelector('.invoice-distribution-search');
        const distHidden = row.querySelector('.invoice-distribution');
        distSearch.addEventListener('input', function() {
            const supplier = suppliers.find(s => s.supplier_name === this.value);
            distHidden.value = supplier ? supplier.id : '';
        });
        
        // Handle sales officer search
        const salesSearch = row.querySelector('.invoice-sales-officer-search');
        const salesHidden = row.querySelector('.invoice-sales-officer');
        salesSearch.addEventListener('input', function() {
            const employee = employees.find(e => e.full_name === this.value);
            salesHidden.value = employee ? employee.id : '';
        });
        
        // Auto-calculate on debit input
        row.querySelector('.invoice-debit').addEventListener('input', calculateInvoiceTotal);
        
        row.querySelector('.btn-remove-invoice').addEventListener('click', function() {
            row.remove();
            calculateInvoiceTotal();
        });
    });

    // Calculate sub account totals
    function calculateSubAccountTotals() {
        const rows = subAccountsTableBody.querySelectorAll('tr');
        let totalDebit = 0;
        let totalCredit = 0;
        rows.forEach(row => {
            const debit = parseFloat(row.querySelector('.sub-account-debit').value) || 0;
            const credit = parseFloat(row.querySelector('.sub-account-credit').value) || 0;
            totalDebit += debit;
            totalCredit += credit;
        });
        openingDebit.value = totalDebit > 0 ? totalDebit.toFixed(2) : '';
        openingCredit.value = totalCredit > 0 ? totalCredit.toFixed(2) : '';
    }

    // Sub accounts functionality
    addSubAccountBtn.addEventListener('click', function() {
        subAccountCounter++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 12px; border: 1px solid var(--border-default);">${subAccountCounter}</td>
            <td style="padding: 12px; border: 1px solid var(--border-default);">
                <input type="text" class="sub-account-name" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="Enter sub account name" required>
            </td>
            <td style="padding: 12px; border: 1px solid var(--border-default);">
                <input type="number" class="sub-account-debit" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="0.00">
            </td>
            <td style="padding: 12px; border: 1px solid var(--border-default);">
                <input type="number" class="sub-account-credit" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: 6px;" placeholder="0.00">
            </td>
            <td style="padding: 12px; border: 1px solid var(--border-default); text-align: center;">
                <button type="button" class="btn-remove-sub-account" style="background: var(--error); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-minus"></i>
                </button>
            </td>
        `;
        subAccountsTableBody.appendChild(row);
        
        const debitInput = row.querySelector('.sub-account-debit');
        const creditInput = row.querySelector('.sub-account-credit');
        
        debitInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                creditInput.disabled = true;
                creditInput.value = '';
            } else {
                creditInput.disabled = false;
            }
            calculateSubAccountTotals();
        });
        
        creditInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                debitInput.disabled = true;
                debitInput.value = '';
            } else {
                debitInput.disabled = false;
            }
            calculateSubAccountTotals();
        });
        
        row.querySelector('.btn-remove-sub-account').addEventListener('click', function() {
            row.remove();
            renumberSubAccounts();
            calculateSubAccountTotals();
        });
    });

    function renumberSubAccounts() {
        const rows = subAccountsTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
        subAccountCounter = rows.length;
    }

    function collectSubAccountData() {
        const rows = subAccountsTableBody.querySelectorAll('tr');
        const subAccounts = [];
        rows.forEach(row => {
            const name = row.querySelector('.sub-account-name').value.trim();
            const debit = parseFloat(row.querySelector('.sub-account-debit').value) || 0;
            const credit = parseFloat(row.querySelector('.sub-account-credit').value) || 0;
            if (name) {
                subAccounts.push({ 
                    sub_account_name: name,
                    debit: debit,
                    credit: credit
                });
            }
        });
        return subAccounts;
    }

    function collectInvoiceData() {
        const rows = invoicesTableBody.querySelectorAll('tr');
        const invoices = [];
        rows.forEach(row => {
            const distribution = row.querySelector('.invoice-distribution').value;
            const salesOfficer = row.querySelector('.invoice-sales-officer').value;
            const invoiceNumber = row.querySelector('.invoice-number').value.trim();
            const debit = parseFloat(row.querySelector('.invoice-debit').value) || 0;
            const invoiceDate = row.querySelector('.invoice-date').value;
            
            if (distribution || salesOfficer || invoiceNumber || debit > 0 || invoiceDate) {
                invoices.push({
                    distribution,
                    salesOfficer,
                    invoiceNumber,
                    debit,
                    invoiceDate
                });
            }
        });
        return invoices;
    }

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate only required fields
        const isNameValid = validateName(customerName.value);
        const isCompanyValid = companySelect.value !== '';

        if (!isCompanyValid) {
            showNotification('Validation Error', 'Company is required', 'error');
            companySelect.focus();
            document.getElementById('companyError').style.display = 'flex';
            return;
        }

        if (!isNameValid) {
            showNotification('Validation Error', 'Customer Name is required', 'error');
            customerName.focus();
            return;
        }

        // Validate optional fields only if they have content
        const isPrimaryPhoneValid = !primaryPhone.value || validatePhone(primaryPhone.value);
        const isSecondaryPhoneValid = !secondaryPhone.value || validatePhone(secondaryPhone.value);
        const isIdentityCardValid = !identityCard.value || validateIdentityCard(identityCard.value);
        const isEmailValid = !email.value || validateEmail(email.value);

        if (!isPrimaryPhoneValid || !isSecondaryPhoneValid || !isIdentityCardValid || !isEmailValid) {
            showNotification('Validation Error', 'Please correct the errors in the form', 'error');
            return;
        }

        // Disable submit button and show loading state
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Saving...';

        // Prepare form data
        const formData = {
            companyId: companySelect.value,
            customerName: customerName.value.trim(),
            address: document.getElementById('address').value.trim(),
            primaryPhone: primaryPhone.value.trim(),
            secondaryPhone: secondaryPhone.value.trim(),
            identityCard: identityCard.value.trim(),
            email: email.value.trim(),
            countryId: countrySelect.value || null,
            regionId: regionSelect.value || null,
            cityId: citySelect.value || null,
            cityZoneId: cityZoneSelect.value || null,
            areaId: areaSelect.value || null,
            salesOfficerId: salesOfficerSelect.value || null,
            isSalesTaxRegistered: isSalesTaxRegistered.checked ? 1 : 0,
            strn: isSalesTaxRegistered.checked && strn.value.trim() ? strn.value.trim() : null,
            isFiler: isFiler.checked ? 1 : 0,
            ntn: isFiler.checked && ntn.value.trim() ? ntn.value.trim() : null,
            defaultDiscount: document.getElementById('defaultDiscount').value || 0,
            openingDebit: document.getElementById('openingDebit').value || 0,
            openingCredit: document.getElementById('openingCredit').value || 0,
            balanceLimit: document.getElementById('balanceLimit').value || 0,
            balancePeriodLimit: document.getElementById('balancePeriodLimit').value || 0,
            isWholesaler: document.getElementById('isWholesaler').checked ? 1 : 0,
            blacklist: document.getElementById('blacklist').checked ? 1 : 0,
            openingInvoices: collectInvoiceData(),
            subAccounts: collectSubAccountData()
        };

        // Send to API
        fetch('../../../../server/api/customer_supplier/customers/customer-add.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', data.message, 'success');
                
                // Reset form after successful submission
                setTimeout(function () {
                    form.reset();
                    document.getElementById('customerCode').value = 'Auto Generated';
                    openingDebit.disabled = false;
                    openingCredit.disabled = false;
                    $('#region').empty().append('<option value="">Select Region</option>').trigger('change').prop('disabled', true);
                    $('#city').empty().append('<option value="">Select City</option>').trigger('change').prop('disabled', true);
                    $('#cityZone').empty().append('<option value="">Select City Zone</option>').trigger('change').prop('disabled', true);
                    $('#area').empty().append('<option value="">Select Area</option>').trigger('change').prop('disabled', true);
                    $('#country').val('').trigger('change');
                    $('#salesOfficer').val('').trigger('change');
                    // Reset company if multiple companies exist
                    if ($('#company option').length > 2) {
                        $('#company').val('').trigger('change');
                    }
                    citySelect.disabled = true;
                    cityZoneSelect.disabled = true;
                    areaSelect.disabled = true;
                    isSalesTaxRegistered.checked = false;
                    isFiler.checked = false;
                    strnGroup.style.display = 'none';
                    ntnGroup.style.display = 'none';
                    invoiceRows = [];
                    invoicesTableBody.innerHTML = '';
                    subAccountCounter = 0;
                    subAccountsTableBody.innerHTML = '';
                    isSubmitting = false;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer';

                    // Clear any error states
                    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                    document.querySelectorAll('.error-text').forEach(el => {
                        el.style.display = 'none';
                    });
                }, 2000);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            showNotification('Error', error.message || 'Failed to save customer', 'error');
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer';
        });
    });

    // Reset form
    resetBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
            form.reset();
            document.getElementById('customerCode').value = 'Auto Generated';
            openingDebit.disabled = false;
            openingCredit.disabled = false;
            countrySelect.value = '';
            $('#region').empty().append('<option value="">Select Region</option>').trigger('change').prop('disabled', true);
            $('#city').empty().append('<option value="">Select City</option>').trigger('change').prop('disabled', true);
            $('#cityZone').empty().append('<option value="">Select City Zone</option>').trigger('change').prop('disabled', true);
            $('#area').empty().append('<option value="">Select Area</option>').trigger('change').prop('disabled', true);
            $('#country').val('').trigger('change');
            $('#salesOfficer').val('').trigger('change');
            // Reset company if multiple companies exist
            if ($('#company option').length > 2) {
                $('#company').val('').trigger('change');
            }
            isSalesTaxRegistered.checked = false;
            isFiler.checked = false;
            strnGroup.style.display = 'none';
            ntnGroup.style.display = 'none';
            invoiceRows = [];
            invoicesTableBody.innerHTML = '';
            subAccountCounter = 0;
            subAccountsTableBody.innerHTML = '';
            // Clear error states
            document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            document.querySelectorAll('.error-text').forEach(el => {
                el.style.display = 'none';
            });
        }
    });


    // Show notification
    function showNotification(title, message, type = 'success') {
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
    notificationClose.addEventListener('click', function () {
        notification.classList.remove('show');
    });
    
    // Check permissions
    function checkPermissions() {
        fetch('../../../../server/api/auth/check-permission.php?category=Customer / Supplier&form_name=New Customer')
            .then(response => response.json())
            .then(data => {
                if (data.redirect) {
                    window.location.href = '../../../../errors/403.php';
                    return;
                }
                if (data.success && data.permissions) {
                    if (!data.permissions.includes('Add')) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<i class="fas fa-lock"></i> No Permission';
                        form.addEventListener('submit', function(e) {
                            e.preventDefault();
                            showNotification('Access Denied', 'You do not have permission to add customers', 'error');
                        });
                    }
                }
            });
    }
});