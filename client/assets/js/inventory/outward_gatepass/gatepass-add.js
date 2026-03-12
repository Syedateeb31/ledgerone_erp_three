// Sample data for dropdowns
let suppliers = [];
let branches = [];
let products = [];
let units = [];
let companies = [];
let editMode = false;
let editId = null;

// Initialize dropdowns
document.addEventListener('DOMContentLoaded', function () {
    // Check if edit mode
    const urlParams = new URLSearchParams(window.location.search);
    editId = urlParams.get('id');
    editMode = !!editId;

    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Fetch and initialize company dropdown
    fetchCompanies();

    // Fetch and initialize customer dropdown
    fetchCustomers();

    // Fetch and initialize branch dropdown
    fetchBranches();

    // Fetch products
    fetchProducts();

    // Fetch units
    fetchUnits();

    // Load gatepass data if edit mode
    if (editMode) {
        loadGatepassData(editId);
    }

    // Setup form submission
    document.getElementById('submit-form').addEventListener('click', submitForm);

    // Setup add row button
    document.getElementById('add-row-btn').addEventListener('click', function () {
        const rowCount = document.querySelectorAll('#items-table-body tr').length;
        addItemRow(rowCount + 1);
    });
});

// Fetch companies from database
function fetchCompanies() {
    fetch('../../../../server/api/inventory/outward_gatepass/get-companies.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                companies = data.data;
                initDropdown('company', 'company-options', companies, 'company_name');
                if (companies.length === 1) {
                    document.getElementById('company').value = companies[0].company_name;
                    document.getElementById('company').dataset.selectedValue = companies[0].id;
                }
            } else {
                console.error('Failed to fetch companies:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching companies:', error);
        });
}

// Fetch suppliers from database
function fetchCustomers() {
    fetch('../../../../server/api/inventory/outward_gatepass/get-customers.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                suppliers = data.data;
                initDropdown('supplier', 'supplier-options', suppliers, 'name');
            } else {
                console.error('Failed to fetch customers:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching customers:', error);
        });
}

// Fetch branches from database
function fetchBranches() {
    fetch('../../../../server/api/inventory/outward_gatepass/get-branches.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                branches = data.data;
                initDropdown('branch', 'branch-options', branches, 'name');
            } else {
                console.error('Failed to fetch branches:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching branches:', error);
        });
}

// Fetch products from database
function fetchProducts() {
    fetch('../../../../server/api/inventory/outward_gatepass/get-products.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                products = data.data;
                checkAndAddFirstRow();
            } else {
                console.error('Failed to fetch products:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
        });
}

// Fetch units from database
function fetchUnits() {
    fetch('../../../../server/api/inventory/outward_gatepass/get-units.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                units = data.data;
                checkAndAddFirstRow();
            } else {
                console.error('Failed to fetch units:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching units:', error);
        });
}

// Check if both products and units are loaded, then add first row
function checkAndAddFirstRow() {
    if (products.length > 0 && units.length > 0) {
        const tableBody = document.getElementById('items-table-body');
        if (tableBody.children.length === 0 && !editMode) {
            addItemRow(1);
        }
    }
}

// Load gatepass data for editing
function loadGatepassData(id) {
    fetch(`../../../../server/api/inventory/outward_gatepass/gatepass-get.php?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const gatepass = data.data;
                
                // Set form values
                document.getElementById('igp-code').value = gatepass.gatepass_code;
                document.getElementById('date').value = gatepass.date;
                
                // Set company
                setTimeout(() => {
                    const company = companies.find(c => c.id == gatepass.company_id);
                    if (company) {
                        document.getElementById('company').value = company.company_name;
                        document.getElementById('company').dataset.selectedValue = company.id;
                    }
                }, 100);
                
                // Set supplier
                const supplier = suppliers.find(s => s.id == gatepass.supplier_id);
                if (supplier) {
                    document.getElementById('supplier').value = supplier.name;
                    document.getElementById('supplier').dataset.selectedValue = supplier.id;
                }
                
                // Set branch
                const branch = branches.find(b => b.id == gatepass.branch_id);
                if (branch) {
                    document.getElementById('branch').value = branch.name;
                    document.getElementById('branch').dataset.selectedValue = branch.id;
                }
                
                // Load items
                gatepass.items.forEach((item, index) => {
                    const row = addItemRow(index + 1);
                    
                    // Set product
                    const product = products.find(p => p.id == item.product_id);
                    if (product) {
                        const productSelect = row.querySelector('.product-select');
                        productSelect.value = product.name;
                        productSelect.dataset.selectedValue = product.id;
                    }
                    
                    // Set unit
                    const unit = units.find(u => u.id == item.unit_id);
                    if (unit) {
                        row.querySelector('.unit-select').value = unit.name;
                    }
                    
                    // Set quantity
                    row.querySelector('.quantity-input').value = item.quantity;
                });
            } else {
                alert('Error loading gatepass: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load gatepass data');
        });
}

// Initialize a searchable dropdown
function initDropdown(inputId, optionsContainerId, items, displayProperty) {
    const input = document.getElementById(inputId);
    const optionsContainer = document.getElementById(optionsContainerId);
    const dropdownToggle = input.parentElement;
    const dropdownMenu = dropdownToggle.nextElementSibling;
    const searchInput = dropdownMenu.querySelector('input[type="text"]');

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Populate dropdown items
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'dropdown-item';
        itemElement.textContent = item[displayProperty];
        itemElement.dataset.value = item.id;
        itemElement.dataset.display = item[displayProperty];

        itemElement.addEventListener('click', function () {
            input.value = this.dataset.display;
            input.dataset.selectedValue = this.dataset.value;

            // Mark as selected
            optionsContainer.querySelectorAll('.dropdown-item').forEach(el => {
                el.classList.remove('selected');
            });
            this.classList.add('selected');

            dropdownMenu.classList.remove('show');
        });

        optionsContainer.appendChild(itemElement);
    });

    // Toggle dropdown
    dropdownToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');

        if (dropdownMenu.classList.contains('show')) {
            searchInput.value = '';
            searchInput.focus();

            // Reset all items to visible when opening
            optionsContainer.querySelectorAll('.dropdown-item').forEach(item => {
                item.style.display = 'block';
            });
        }
    });

    // Filter items on search
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        optionsContainer.querySelectorAll('.dropdown-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
}

// Add a new item row to the table
function addItemRow(rowNumber) {
    const tableBody = document.getElementById('items-table-body');
    const row = document.createElement('tr');
    row.dataset.rowId = Date.now(); // Unique ID for the row

    row.innerHTML = `
                <td>${rowNumber}</td>
                <td>
                    <div class="searchable-dropdown">
                        <div class="dropdown-toggle">
                            <input 
                                type="text" 
                                class="table-input product-select" 
                                placeholder="Select product" 
                                readonly
                                required
                            >
                            <span class="dropdown-arrow">▼</span>
                        </div>
                        <div class="dropdown-menu">
                            <div class="dropdown-search">
                                <input type="text" placeholder="Search products..." class="product-search">
                            </div>
                            <div class="dropdown-items product-options">
                                <!-- Product options will be populated by JS -->
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <select class="table-select unit-select" required>
                        <option value="">Select unit</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="table-input quantity-input" min="1" value="1" required>
                </td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="action-btn add" title="Add row below">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button type="button" class="action-btn delete" title="Delete row">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </td>
            `;

    tableBody.appendChild(row);

    // Populate unit dropdown
    const unitSelect = row.querySelector('.unit-select');
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.name;
        option.textContent = unit.name;
        option.dataset.unitId = unit.id;
        unitSelect.appendChild(option);
    });

    // Setup product dropdown for this row
    const productDropdown = row.querySelector('.searchable-dropdown');
    const productToggle = row.querySelector('.dropdown-toggle');
    const productSelect = row.querySelector('.product-select');
    const productMenu = productToggle.nextElementSibling;
    const productSearch = productMenu.querySelector('.product-search');
    const productOptions = productMenu.querySelector('.product-options');

    // Clear and populate product options
    productOptions.innerHTML = '';
    products.forEach(product => {
        const option = document.createElement('div');
        option.className = 'dropdown-item';
        option.textContent = product.name;
        option.dataset.value = product.id;
        option.dataset.display = product.name;
        option.dataset.unit = product.unit;

        option.addEventListener('click', function () {
            productSelect.value = this.dataset.display;
            productSelect.dataset.selectedValue = this.dataset.value;

            // Auto-select the unit if product has a default unit
            const unitSelect = row.querySelector('.unit-select');
            if (this.dataset.unit) {
                unitSelect.value = this.dataset.unit;
            }

            // Mark as selected
            productOptions.querySelectorAll('.dropdown-item').forEach(el => {
                el.classList.remove('selected');
            });
            this.classList.add('selected');

            productMenu.classList.remove('show');
        });

        productOptions.appendChild(option);
    });

    // Toggle product dropdown
    productToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        productMenu.classList.toggle('show');

        if (productMenu.classList.contains('show')) {
            productSearch.value = '';
            productSearch.focus();

            // Reset all items to visible when opening
            productOptions.querySelectorAll('.dropdown-item').forEach(item => {
                item.style.display = 'block';
            });
        }
    });

    // Filter product items on search
    productSearch.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        productOptions.querySelectorAll('.dropdown-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Setup add row button (plus button)
    row.querySelector('.action-btn.add').addEventListener('click', function () {
        const currentRowNumber = parseInt(row.cells[0].textContent);
        const newRow = addItemRow(currentRowNumber + 1);

        // Insert the new row after the current row
        tableBody.insertBefore(newRow, row.nextSibling);

        // Update all row numbers
        updateRowNumbers();
    });

    // Setup delete row button (minus button)
    row.querySelector('.action-btn.delete').addEventListener('click', function () {
        if (tableBody.children.length > 1) {
            row.remove();
            updateRowNumbers();
        } else {
            alert("At least one item is required");
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!productMenu.contains(e.target) && !productToggle.contains(e.target)) {
            productMenu.classList.remove('show');
        }
    });

    return row;
}

// Update row numbers after addition/deletion
function updateRowNumbers() {
    const rows = document.querySelectorAll('#items-table-body tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Form submission handler
function submitForm() {
    // Validate required fields
    const requiredFields = [
        { id: 'date', name: 'Date' },
        { id: 'supplier', name: 'Supplier' },
        { id: 'branch', name: 'Branch' }
    ];

    let isValid = true;
    let errorMessage = '';

    // Check main fields
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            isValid = false;
            element.classList.add('error');
            errorMessage += `${field.name} is required.\n`;
        } else {
            element.classList.remove('error');
        }
    });

    // Check company
    const companyElement = document.getElementById('company');
    if (!companyElement.value.trim()) {
        isValid = false;
        companyElement.classList.add('error');
        errorMessage += 'Company is required.\n';
    } else {
        companyElement.classList.remove('error');
    }

    // Check items
    const itemRows = document.querySelectorAll('#items-table-body tr');
    if (itemRows.length === 0) {
        isValid = false;
        errorMessage += "At least one item is required.\n";
    }

    itemRows.forEach((row, index) => {
        const productSelect = row.querySelector('.product-select');
        const unitSelect = row.querySelector('.unit-select');
        const quantityInput = row.querySelector('.quantity-input');

        if (!productSelect.value.trim()) {
            isValid = false;
            productSelect.classList.add('error');
            errorMessage += `Product is required for item ${index + 1}.\n`;
        } else {
            productSelect.classList.remove('error');
        }

        if (!unitSelect.value) {
            isValid = false;
            unitSelect.classList.add('error');
            errorMessage += `Unit is required for item ${index + 1}.\n`;
        } else {
            unitSelect.classList.remove('error');
        }

        if (!quantityInput.value || quantityInput.value <= 0) {
            isValid = false;
            quantityInput.classList.add('error');
            errorMessage += `Valid quantity is required for item ${index + 1}.\n`;
        } else {
            quantityInput.classList.remove('error');
        }
    });

    if (!isValid) {
        alert("Please fix the following errors:\n\n" + errorMessage);
        return;
    }

    // Collect form data
    const formData = {
        date: document.getElementById('date').value,
        company_id: document.getElementById('company').dataset.selectedValue,
        supplier_id: document.getElementById('supplier').dataset.selectedValue,
        branch_id: document.getElementById('branch').dataset.selectedValue,
        items: []
    };

    itemRows.forEach(row => {
        const unitSelect = row.querySelector('.unit-select');
        const selectedOption = unitSelect.options[unitSelect.selectedIndex];
        
        formData.items.push({
            product_id: row.querySelector('.product-select').dataset.selectedValue,
            unit_id: selectedOption.dataset.unitId,
            quantity: row.querySelector('.quantity-input').value
        });
    });

    // Submit to server
    const apiUrl = editMode 
        ? '../../../../server/api/inventory/outward_gatepass/gatepass-update.php'
        : '../../../../server/api/inventory/outward_gatepass/gatepass-add.php';
    
    if (editMode) {
        formData.id = editId;
    }
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = editMode 
                ? 'Outward gatepass updated successfully!'
                : 'Outward gatepass created successfully!\nGatepass Code: ' + data.gatepass_code;
            
            alert(message);
            
            // Redirect to list page
            window.location.href = 'gatepass-list.php';
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to submit gatepass. Please try again.');
    });
}