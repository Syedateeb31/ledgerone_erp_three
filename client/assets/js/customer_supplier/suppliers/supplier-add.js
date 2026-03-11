document.addEventListener('DOMContentLoaded', function () {
    // Check permissions
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
            if (data.success && !data.permissions.includes('Add')) {
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('submitBtn').title = 'No permission to add suppliers';
            }
        });

    // Set supplier code field to show Auto Generated
    document.getElementById('supplierCode').value = 'Auto Generated';

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
    const form = document.getElementById('supplierForm');
    const supplierName = document.getElementById('supplierName');
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
    const companySelect = document.getElementById('company');

    let isSubmitting = false;

    // Load companies
    loadCompanies();

    function loadCompanies() {
        fetch('../../../../server/api/customer_supplier/suppliers/get-companies.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.companies.forEach(company => {
                        const option = document.createElement('option');
                        option.value = company.id;
                        option.textContent = company.company_name;
                        companySelect.appendChild(option);
                    });
                    // Auto-select if only one company
                    if (data.companies.length === 1) {
                        companySelect.value = data.companies[0].id;
                    }
                }
            });
    }

    // Sub Accounts Management
    const subAccountsBody = document.getElementById('subAccountsBody');

    function updateRowNumbers() {
        const rows = subAccountsBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
    }

    function attachSubAccountListeners(row) {
        const debitInput = row.querySelector('.sub-account-debit');
        const creditInput = row.querySelector('.sub-account-credit');

        debitInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                creditInput.disabled = true;
                creditInput.value = '';
            } else {
                creditInput.disabled = false;
            }
            updateOpeningBalances();
        });

        creditInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) > 0) {
                debitInput.disabled = true;
                debitInput.value = '';
            } else {
                debitInput.disabled = false;
            }
            updateOpeningBalances();
        });
    }

    function updateOpeningBalances() {
        const rows = subAccountsBody.querySelectorAll('tr');
        let totalDebit = 0;
        let totalCredit = 0;
        
        rows.forEach(row => {
            const debitInput = row.querySelector('.sub-account-debit');
            const creditInput = row.querySelector('.sub-account-credit');
            totalDebit += parseFloat(debitInput.value) || 0;
            totalCredit += parseFloat(creditInput.value) || 0;
        });
        
        if (totalDebit > 0 || totalCredit > 0) {
            openingDebit.value = totalDebit > 0 ? totalDebit.toFixed(2) : '';
            openingCredit.value = totalCredit > 0 ? totalCredit.toFixed(2) : '';
            openingDebit.readOnly = true;
            openingCredit.readOnly = true;
        } else {
            openingDebit.readOnly = false;
            openingCredit.readOnly = false;
        }
    }

    // Attach listeners to initial row
    attachSubAccountListeners(subAccountsBody.querySelector('tr'));

    function addSubAccountRow() {
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
        subAccountsBody.appendChild(row);
        updateRowNumbers();
        attachSubAccountListeners(row);
    }

    function removeSubAccountRow(button) {
        const rows = subAccountsBody.querySelectorAll('tr');
        if (rows.length > 1) {
            button.closest('tr').remove();
            updateRowNumbers();
            updateOpeningBalances();
        }
    }

    subAccountsBody.addEventListener('click', function(e) {
        if (e.target.closest('.btn-add')) {
            addSubAccountRow();
        } else if (e.target.closest('.btn-remove')) {
            removeSubAccountRow(e.target.closest('.btn-remove'));
        }
    });

    function getSubAccounts() {
        const rows = subAccountsBody.querySelectorAll('tr');
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
    supplierName.addEventListener('input', function () {
        const errorElement = document.getElementById('supplierNameError');
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

    // Opening balance mutual locking - works when no sub accounts have values
    openingDebit.addEventListener('input', function () {
        if (this.value && parseFloat(this.value) > 0) {
            openingCredit.disabled = true;
            openingCredit.value = '';
        } else {
            openingCredit.disabled = false;
        }
    });

    openingCredit.addEventListener('input', function () {
        if (this.value && parseFloat(this.value) > 0) {
            openingDebit.disabled = true;
            openingDebit.value = '';
        } else {
            openingDebit.disabled = false;
        }
    });

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate only required fields
        const isNameValid = validateName(supplierName.value);
        const isCompanyValid = companySelect.value !== '';

        if (!isCompanyValid) {
            showNotification('Validation Error', 'Company is required', 'error');
            companySelect.focus();
            document.getElementById('companyError').style.display = 'flex';
            return;
        }

        if (!isNameValid) {
            showNotification('Validation Error', 'Supplier Name is required', 'error');
            supplierName.focus();
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
            supplierType: document.getElementById('supplierType').value,
            supplierName: supplierName.value.trim(),
            address: document.getElementById('address').value.trim(),
            primaryPhone: primaryPhone.value.trim(),
            secondaryPhone: secondaryPhone.value.trim(),
            identityCard: identityCard.value.trim(),
            email: email.value.trim(),
            openingDebit: document.getElementById('openingDebit').value || 0,
            openingCredit: document.getElementById('openingCredit').value || 0,
            aitPercent: document.getElementById('aitPercent').value || 0,
            blacklist: document.getElementById('blacklist').checked,
            subAccounts: getSubAccounts()
        };

        // Send to API
        fetch('../../../../server/api/customer_supplier/suppliers/supplier-add.php', {
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
                        document.getElementById('supplierCode').value = 'Auto Generated';
                        // Reset company if multiple companies exist
                        if (companySelect.options.length > 2) {
                            companySelect.value = '';
                        }
                        isSubmitting = false;
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Supplier';

                        // Reset sub accounts table
                        subAccountsBody.innerHTML = `
                            <tr>
                                <td>1</td>
                                <td><input type="text" class="sub-account-input" placeholder="Enter sub account name"></td>
                                <td><input type="number" class="sub-account-debit" step="0.01" min="0" placeholder="0.00"></td>
                                <td><input type="number" class="sub-account-credit" step="0.01" min="0" placeholder="0.00"></td>
                                <td>
                                    <button type="button" class="btn-icon btn-add" title="Add Row"><i class="fas fa-plus"></i></button>
                                    <button type="button" class="btn-icon btn-remove" title="Remove Row"><i class="fas fa-minus"></i></button>
                                </td>
                            </tr>
                        `;
                        attachSubAccountListeners(subAccountsBody.querySelector('tr'));

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
                showNotification('Error', error.message || 'Failed to save supplier', 'error');
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Supplier';
            });
    });

    // Reset form
    resetBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
            form.reset();
            document.getElementById('supplierCode').value = 'Auto Generated';
            // Reset company if multiple companies exist
            if (companySelect.options.length > 2) {
                companySelect.value = '';
            }
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
});