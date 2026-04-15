document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('supplierForm');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.getElementById('notificationClose');
    const companySelect = document.getElementById('company');
    
    // Salesman multi-select elements
    const salesmanSearch = document.getElementById('salesmanSearch');
    const salesmanChipsList = document.getElementById('salesmanChipsList');
    const salesmanDropdown = document.getElementById('salesmanDropdown');
    const salesmanIdsInput = document.getElementById('salesmanIds');
    const salesmanChipsContainer = document.getElementById('salesmanChipsContainer');
    
    let employees = [];
    let selectedSalesmen = [];
    let isSubmitting = false;

    // Load companies and employees
    loadCompanies();
    loadEmployees();

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

        // Add remove listeners
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
            salesmanId: salesmanIdsInput.value || null,
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
                    selectedSalesmen = [];
                    updateSalesmanChips();
                    updateSalesmanIdsInput();
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
        }
    });
});
