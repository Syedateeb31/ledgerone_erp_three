document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('supplierForm');
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
                        const option = new Option(company.company_name, company.id);
                        companySelect.appendChild(option);
                    });
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

    notificationClose.addEventListener('click', () => notification.classList.remove('show'));

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

        const formData = {
            companyId: companySelect.value,
            salesmanId: document.getElementById('salesmanIds').value || null,
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
            subAccounts: []
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
                setTimeout(() => {
                    form.reset();
                    document.getElementById('supplierCode').value = 'Auto Generated';
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
        }
    });
});
