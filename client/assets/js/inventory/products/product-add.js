window.addEventListener('load', function () {
    console.log('QRious available:', typeof QRious !== 'undefined');
    console.log('JsBarcode available:', typeof JsBarcode !== 'undefined');
    
    loadFieldPreferences();
    
    document.getElementById('customizeFieldsBtn').addEventListener('click', openCustomizeModal);
    document.getElementById('closeCustomizeModal').addEventListener('click', closeCustomizeModal);
    document.getElementById('cancelCustomize').addEventListener('click', closeCustomizeModal);
    document.getElementById('saveCustomize').addEventListener('click', saveFieldPreferences);
    document.getElementById('selectAllFields').addEventListener('change', function() {
        document.querySelectorAll('.field-toggle').forEach(cb => cb.checked = this.checked);
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        // Edit mode
        document.querySelector('h1').textContent = 'Edit Product';
        document.getElementById('submitBtn').textContent = 'Update Product';
        loadProductForEdit(productId);
    }
    
    // Load units from database
    loadUnits();
    
    // Load categories and subcategories
    loadCategories();
    
    // Load inventory accounts
    loadInventoryAccounts();

    // Load vendors
    loadVendors();
    
    // Load branches
    loadBranches();
    
    // Initialize parent product dropdown
    initParentProductDropdown();
    
    // Load companies
    loadCompanies();
    

    
    // Category change handler to load subcategories
    document.getElementById('category').addEventListener('change', function() {
        const categoryId = this.value;
        loadSubcategories(categoryId);
    });

    // Product type change handler
    const productTypeRadios = document.querySelectorAll('input[name="productType"]');
    productTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleProductTypeChange);
    });

    // Form submission
    const form = document.getElementById('productForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Prevent form submission on Enter key
    form.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', function () {
        if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
            window.location.href = 'product-list.php'; // Redirect to products list
        }
    });

    // Photo upload
    document.getElementById('photoUpload').addEventListener('click', function () {
        document.getElementById('photo').click();
    });

    document.getElementById('photo').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const preview = document.getElementById('photoPreview');
                const removeBtn = document.getElementById('removePhoto');
                preview.src = event.target.result;
                preview.style.display = 'block';
                removeBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove photo button
    document.getElementById('removePhoto').addEventListener('click', function () {
        const preview = document.getElementById('photoPreview');
        const photoInput = document.getElementById('photo');
        const removeBtn = document.getElementById('removePhoto');
        
        preview.style.display = 'none';
        preview.src = '';
        photoInput.value = '';
        removeBtn.style.display = 'none';
    });

    // Plus/Minus buttons for dropdowns
    document.getElementById('addUnit').addEventListener('click', function () {
        openUnitModal();
    });

    // Unit modal functionality
    document.getElementById('closeUnitModal').addEventListener('click', closeUnitModal);
    document.getElementById('cancelUnit').addEventListener('click', closeUnitModal);
    document.getElementById('unitForm').addEventListener('submit', handleUnitSubmit);
    
    // Base unit checkbox handler
    document.getElementById('isBaseUnit').addEventListener('change', function() {
        const baseUnitGroup = document.getElementById('baseUnitGroup');
        const conversionFactorGroup = document.getElementById('conversionFactorGroup');
        
        if (this.checked) {
            baseUnitGroup.style.display = 'none';
            conversionFactorGroup.style.display = 'none';
            document.getElementById('baseUnit').removeAttribute('required');
            document.getElementById('conversionFactor').removeAttribute('required');
        } else {
            baseUnitGroup.style.display = 'block';
            conversionFactorGroup.style.display = 'block';
            document.getElementById('baseUnit').setAttribute('required', '');
            document.getElementById('conversionFactor').setAttribute('required', '');
        }
    });
    
    // Unit type change handler to load base units
    document.getElementById('unitType').addEventListener('change', loadBaseUnits);
    
    // Close modal on outside click
    document.getElementById('unitModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeUnitModal();
        }
    });

    document.getElementById('removeUnit').addEventListener('click', function () {
        const select = document.getElementById('defaultUnit');
        if (select.selectedIndex > 0) {
            const unitId = select.value;
            const unitName = select.options[select.selectedIndex].text;
            editUnit(unitId, unitName);
        } else {
            alert('Please select a unit to edit');
        }
    });

    // Category modal functionality
    document.getElementById('addCategory').addEventListener('click', function () {
        document.getElementById('categoryModal').style.display = 'flex';
        document.getElementById('categoryName').focus();
    });
    
    document.getElementById('removeCategory').addEventListener('click', function () {
        const select = document.getElementById('category');
        if (select.selectedIndex > 0) {
            const categoryId = select.value;
            const categoryName = select.options[select.selectedIndex].text;
            editCategory(categoryId, categoryName);
        } else {
            alert('Please select a category to edit');
        }
    });
    
    document.getElementById('closeCategoryModal').addEventListener('click', function() {
        document.getElementById('categoryModal').style.display = 'none';
        document.getElementById('categoryForm').reset();
    });
    
    document.getElementById('cancelCategory').addEventListener('click', function() {
        document.getElementById('categoryModal').style.display = 'none';
        document.getElementById('categoryForm').reset();
    });
    
    document.getElementById('categoryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(document.getElementById('categoryForm'));
        
        fetch('../../../../server/api/inventory/products/category-add.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('category');
                const option = document.createElement('option');
                option.value = data.category.id;
                option.textContent = data.category.name;
                select.appendChild(option);
                select.value = option.value;
                document.getElementById('categoryModal').style.display = 'none';
                document.getElementById('categoryForm').reset();
                alert('Category added successfully!');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the category');
        });
    });

    // Subcategory modal functionality
    document.getElementById('addSubcategory').addEventListener('click', function () {
        loadCategoriesForSubcategory();
        document.getElementById('subcategoryModal').style.display = 'flex';
        document.getElementById('subcategoryName').focus();
    });
    
    document.getElementById('removeSubcategory').addEventListener('click', function () {
        const select = document.getElementById('subcategory');
        if (select.selectedIndex > 0) {
            const subcategoryId = select.value;
            const subcategoryName = select.options[select.selectedIndex].text;
            editSubcategory(subcategoryId, subcategoryName);
        } else {
            alert('Please select a subcategory to edit');
        }
    });
    
    document.getElementById('closeSubcategoryModal').addEventListener('click', function() {
        document.getElementById('subcategoryModal').style.display = 'none';
        document.getElementById('subcategoryForm').reset();
    });
    
    document.getElementById('cancelSubcategory').addEventListener('click', function() {
        document.getElementById('subcategoryModal').style.display = 'none';
        document.getElementById('subcategoryForm').reset();
    });
    
    document.getElementById('subcategoryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(document.getElementById('subcategoryForm'));
        
        fetch('../../../../server/api/inventory/products/subcategory-add.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('subcategory');
                const option = document.createElement('option');
                option.value = data.subcategory.id;
                option.textContent = data.subcategory.name;
                select.appendChild(option);
                select.value = option.value;
                document.getElementById('subcategoryModal').style.display = 'none';
                document.getElementById('subcategoryForm').reset();
                alert('Subcategory added successfully!');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the subcategory');
        });
    });

    // QR Code and Barcode generation
    document.getElementById('qrInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('manualQR').click();
        }
    });
    
    document.getElementById('manualQR').addEventListener('click', function () {
        const code = document.getElementById('qrInput').value;
        if (code) {
            generateQRCode(code);
        } else {
            alert('Please enter a QR code value');
        }
    });

    document.getElementById('autoQR').addEventListener('click', function () {
        let productCode = document.getElementById('code').value;
        if (!productCode) {
            productCode = 'PROD-' + Date.now();
        }
        document.getElementById('qrInput').value = productCode;
        generateQRCode(productCode);
    });

    document.getElementById('barcodeInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('manualBarcode').click();
        }
    });
    
    document.getElementById('manualBarcode').addEventListener('click', function () {
        const code = document.getElementById('barcodeInput').value;
        if (code) {
            generateBarcode(code);
        } else {
            alert('Please enter a barcode value');
        }
    });

    document.getElementById('autoBarcode').addEventListener('click', function () {
        let productCode = document.getElementById('code').value;
        if (!productCode) {
            productCode = 'PROD-' + Date.now();
        }
        document.getElementById('barcodeInput').value = productCode;
        generateBarcode(productCode);
    });

    // Clear buttons
    document.getElementById('clearQR').addEventListener('click', function () {
        document.getElementById('qrDisplay').style.display = 'none';
        document.getElementById('qrValue').textContent = '';
        document.getElementById('qrInput').value = '';
        document.getElementById('qrCodeHidden').value = '';
    });

    document.getElementById('clearBarcode').addEventListener('click', function () {
        document.getElementById('barcodeDisplay').style.display = 'none';
        document.getElementById('barcodeValue').textContent = '';
        document.getElementById('barcodeInput').value = '';
        document.getElementById('barcodeHidden').value = '';
    });

    // Stock entry management
    document.getElementById('addStockEntry').addEventListener('click', addStockEntry);
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-stock-entry')) {
            removeStockEntry(e.target);
        }
    });
    
    // Auto-calculate totals when stock values change
    document.addEventListener('input', function(e) {
        if (e.target.name === 'openingQty[]' || e.target.name === 'openingPrice[]') {
            calculateTotalStock();
        }
    });

    // Initial call to set form state based on default product type
    handleProductTypeChange();
});

function loadFieldPreferences() {
    const prefs = JSON.parse(localStorage.getItem('fieldPreferences') || '{}');
    document.querySelectorAll('[data-field]').forEach(el => {
        const field = el.dataset.field;
        el.style.display = prefs[field] === false ? 'none' : '';
    });
}

function openCustomizeModal() {
    const prefs = JSON.parse(localStorage.getItem('fieldPreferences') || '{}');
    document.querySelectorAll('.field-toggle').forEach(cb => {
        cb.checked = prefs[cb.dataset.field] !== false;
    });
    document.getElementById('customizeFieldsModal').style.display = 'flex';
}

function closeCustomizeModal() {
    document.getElementById('customizeFieldsModal').style.display = 'none';
}

function saveFieldPreferences() {
    const prefs = {};
    document.querySelectorAll('.field-toggle').forEach(cb => {
        prefs[cb.dataset.field] = cb.checked;
    });
    localStorage.setItem('fieldPreferences', JSON.stringify(prefs));
    loadFieldPreferences();
    closeCustomizeModal();
}

function handleProductTypeChange() {
    const isService = document.getElementById('service').checked;

    // Elements to show/hide based on product type
    const elementsToToggle = [
        'defaultUnitGroup',

        'qrCodeGroup',
        'barcodeGroup',
        'purchasePriceGroup',
        'stockSection',
        'additionalInfoSection'
    ];

    elementsToToggle.forEach(id => {
        const element = document.getElementById(id);
        if (isService) {
            element.classList.add('hidden');
            // Clear required attribute for hidden fields
            const inputs = element.querySelectorAll('[required]');
            inputs.forEach(input => {
                input.removeAttribute('required');
            });
        } else {
            element.classList.remove('hidden');
            // Add back required attribute for visible required fields
            if (id === 'defaultUnitGroup') {
                document.getElementById('defaultUnit').setAttribute('required', '');
            }
        }
    });
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Basic validation
    if (!validateForm()) {
        return;
    }

    // Disable submit button and show loading state
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

    // Prepare form data
    const formData = new FormData(document.getElementById('productForm'));
    const editId = document.getElementById('productForm').dataset.editId;
    
    if (editId) {
        formData.append('id', editId);
    }
    
    const endpoint = editId ? 'product-edit.php' : 'product-add.php';

    // Submit to API
    fetch(`../../../../server/api/inventory/products/${endpoint}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = editId ? 'Product updated successfully!' : 'Product saved successfully!';
            alert(message);
            window.location.href = 'product-list.php';
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while saving the product');
    })
    .finally(() => {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = editId ? 'Update Product' : 'Save Product';
    });
}

function validateForm() {
    let isValid = true;
    const form = document.getElementById('productForm');

    // Clear previous errors
    const errorElements = form.querySelectorAll('.error, .error-text');
    errorElements.forEach(el => {
        el.classList.remove('error', 'error-text');
    });

    // Check required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');

            // Add error message
            let errorMsg = field.parentNode.querySelector('.error-text');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'helper-text error-text';
                field.parentNode.appendChild(errorMsg);
            }
            errorMsg.textContent = 'This field is required';
        }
    });

    // Additional validation for numeric fields
    const numericFields = form.querySelectorAll('input[type="number"]');
    numericFields.forEach(field => {
        if (field.value && field.min && parseFloat(field.value) < parseFloat(field.min)) {
            isValid = false;
            field.classList.add('error');

            let errorMsg = field.parentNode.querySelector('.error-text');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'helper-text error-text';
                field.parentNode.appendChild(errorMsg);
            }
            errorMsg.textContent = `Value must be at least ${field.min}`;
        }

        if (field.value && field.max && parseFloat(field.value) > parseFloat(field.max)) {
            isValid = false;
            field.classList.add('error');

            let errorMsg = field.parentNode.querySelector('.error-text');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'helper-text error-text';
                field.parentNode.appendChild(errorMsg);
            }
            errorMsg.textContent = `Value must be at most ${field.max}`;
        }
    });

    return isValid;
}

function addStockEntry() {
    const stockEntries = document.getElementById('stockEntries');
    const newEntry = document.createElement('div');
    newEntry.className = 'stock-entry';
    
    newEntry.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Branch</label>
                <div class="custom-dropdown">
                    <input type="text" class="branch-search" placeholder="Search branches..." autocomplete="off">
                    <input type="hidden" name="branch[]">
                    <div class="dropdown-list" style="display: none;"></div>
                </div>
            </div>
            <div class="form-group">
                <label>Opening Qty</label>
                <input type="number" name="openingQty[]" step="0.01" min="0">
            </div>
            <div class="form-group">
                <label>Opening Price / Unit</label>
                <input type="number" name="openingPrice[]" step="0.01" min="0">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger remove-stock-entry" style="margin-top: 24px;">Remove</button>
            </div>
        </div>
    `;
    
    stockEntries.appendChild(newEntry);
    
    if (window.branchesData) {
        initBranchDropdown(newEntry.querySelector('.custom-dropdown'));
    }
    
    calculateTotalStock();
}

function removeStockEntry(button) {
    const stockEntries = document.getElementById('stockEntries');
    if (stockEntries.children.length > 1) {
        button.closest('.stock-entry').remove();
        calculateTotalStock();
    } else {
        alert('At least one stock entry is required');
    }
}

function calculateTotalStock() {
    const qtyInputs = document.querySelectorAll('input[name="openingQty[]"]');
    const priceInputs = document.querySelectorAll('input[name="openingPrice[]"]');
    
    let totalQty = 0;
    let totalValue = 0;
    
    for (let i = 0; i < qtyInputs.length; i++) {
        const qty = parseFloat(qtyInputs[i].value) || 0;
        const price = parseFloat(priceInputs[i].value) || 0;
        
        totalQty += qty;
        totalValue += qty * price;
    }
    
    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
    
    document.getElementById('totalQty').textContent = totalQty.toFixed(2);
    document.getElementById('avgPrice').textContent = avgPrice.toFixed(2);
    document.getElementById('totalValue').textContent = totalValue.toFixed(2);
}

function generateQRCode(value) {
    const canvas = document.getElementById('qrCanvas');
    
    if (typeof QRious !== 'undefined') {
        new QRious({
            element: canvas,
            value: value,
            size: 150
        });
    } else {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code: ' + value, canvas.width/2, canvas.height/2);
    }
    
    document.getElementById('qrValue').textContent = value;
    document.getElementById('qrCodeHidden').value = value;
    document.getElementById('qrDisplay').style.display = 'flex';
}

function generateBarcode(value) {
    const canvas = document.getElementById('barcodeCanvas');
    
    if (typeof JsBarcode !== 'undefined') {
        JsBarcode(canvas, value, {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 10
        });
    } else {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Barcode: ' + value, canvas.width/2, canvas.height/2);
    }
    
    document.getElementById('barcodeValue').textContent = value;
    document.getElementById('barcodeHidden').value = value;
    document.getElementById('barcodeDisplay').style.display = 'flex';
}

function openUnitModal() {
    document.getElementById('unitModalTitle').textContent = 'Add New Unit';
    document.getElementById('saveUnit').textContent = 'Save Unit';
    document.getElementById('unitModal').style.display = 'flex';
    document.getElementById('unitName').focus();
    loadBaseUnits();
}

function editUnit(unitId, unitName) {
    showConfirmModal(
        'Unit Action',
        `What would you like to do with "${unitName}"?`,
        'Edit',
        'Delete',
        () => {
            // Edit unit
            document.getElementById('unitModalTitle').textContent = 'Edit Unit';
            document.getElementById('saveUnit').textContent = 'Update Unit';
            document.getElementById('unitName').value = unitName;
            document.getElementById('unitForm').dataset.editId = unitId;
            document.getElementById('unitModal').style.display = 'flex';
            document.getElementById('unitName').focus();
            loadBaseUnits();
        },
        () => {
            // Delete unit - show second confirmation
            showConfirmModal(
                'Delete Unit',
                `Are you sure you want to delete "${unitName}"? This action cannot be undone.`,
                'Cancel',
                'Delete',
                () => {}, // Cancel - do nothing
                () => deleteUnit(unitId) // Delete
            );
        }
    );
}

function deleteUnit(unitId) {
    fetch('../../../../server/api/inventory/products/unit-delete.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `id=${unitId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove from dropdown
            const select = document.getElementById('defaultUnit');
            const option = select.querySelector(`option[value="${unitId}"]`);
            if (option) {
                option.remove();
                select.selectedIndex = 0;
            }
            alert('Unit deleted successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while deleting the unit');
    });
}

function showConfirmModal(title, message, cancelText, okText, onCancel, onOk) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    document.getElementById('confirmCancel').textContent = cancelText;
    document.getElementById('confirmOk').textContent = okText;
    
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
    
    // Remove previous event listeners
    const newCancelBtn = document.getElementById('confirmCancel').cloneNode(true);
    const newOkBtn = document.getElementById('confirmOk').cloneNode(true);
    document.getElementById('confirmCancel').parentNode.replaceChild(newCancelBtn, document.getElementById('confirmCancel'));
    document.getElementById('confirmOk').parentNode.replaceChild(newOkBtn, document.getElementById('confirmOk'));
    
    // Add new event listeners
    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onCancel) onCancel();
    });
    
    newOkBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onOk) onOk();
    });
    
    // Close button
    document.getElementById('closeConfirmModal').onclick = () => {
        modal.style.display = 'none';
        if (onCancel) onCancel();
    };
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            if (onCancel) onCancel();
        }
    };
}

function loadCategoriesForSubcategory() {
    const parentCategorySelect = document.getElementById('parentCategory');
    const categorySelect = document.getElementById('category');
    
    // Clear existing options
    parentCategorySelect.innerHTML = '<option value="">Select Category</option>';
    
    // Copy categories from main dropdown
    for (let i = 1; i < categorySelect.options.length; i++) {
        const option = document.createElement('option');
        option.value = categorySelect.options[i].value;
        option.textContent = categorySelect.options[i].textContent;
        parentCategorySelect.appendChild(option);
    }
}

function editCategory(categoryId, categoryName) {
    showConfirmModal(
        'Category Action',
        `What would you like to do with "${categoryName}"?`,
        'Edit',
        'Delete',
        () => {
            // Edit category
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('saveCategory').textContent = 'Update Category';
            document.getElementById('categoryName').value = categoryName;
            document.getElementById('categoryForm').dataset.editId = categoryId;
            document.getElementById('categoryModal').style.display = 'flex';
            document.getElementById('categoryName').focus();
        },
        () => {
            // Delete category
            showConfirmModal(
                'Delete Category',
                `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
                'Cancel',
                'Delete',
                () => {},
                () => deleteCategory(categoryId)
            );
        }
    );
}

function editSubcategory(subcategoryId, subcategoryName) {
    showConfirmModal(
        'Subcategory Action',
        `What would you like to do with "${subcategoryName}"?`,
        'Edit',
        'Delete',
        () => {
            // Edit subcategory
            document.getElementById('subcategoryModalTitle').textContent = 'Edit Subcategory';
            document.getElementById('saveSubcategory').textContent = 'Update Subcategory';
            document.getElementById('subcategoryName').value = subcategoryName;
            document.getElementById('subcategoryForm').dataset.editId = subcategoryId;
            loadCategoriesForSubcategory();
            document.getElementById('subcategoryModal').style.display = 'flex';
            document.getElementById('subcategoryName').focus();
        },
        () => {
            // Delete subcategory
            showConfirmModal(
                'Delete Subcategory',
                `Are you sure you want to delete "${subcategoryName}"? This action cannot be undone.`,
                'Cancel',
                'Delete',
                () => {},
                () => deleteSubcategory(subcategoryId)
            );
        }
    );
}

function deleteCategory(categoryId) {
    fetch('../../../../server/api/inventory/products/category-delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${categoryId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const select = document.getElementById('category');
            const option = select.querySelector(`option[value="${categoryId}"]`);
            if (option) {
                option.remove();
                select.selectedIndex = 0;
            }
            alert('Category deleted successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while deleting the category');
    });
}

function deleteSubcategory(subcategoryId) {
    fetch('../../../../server/api/inventory/products/subcategory-delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${subcategoryId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const select = document.getElementById('subcategory');
            const option = select.querySelector(`option[value="${subcategoryId}"]`);
            if (option) {
                option.remove();
                select.selectedIndex = 0;
            }
            alert('Subcategory deleted successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while deleting the subcategory');
    });
}

function loadBaseUnits() {
    const unitType = document.getElementById('unitType').value;
    const baseUnitSelect = document.getElementById('baseUnit');
    
    // Clear existing options
    baseUnitSelect.innerHTML = '<option value="">Select Base Unit</option>';
    
    // Load base units of same type via API
    fetch(`../../../../server/api/inventory/products/unit-list.php?type=${unitType}&base_only=1`)
    .then(response => response.json())
    .then(data => {
        if (data.success && data.units) {
            data.units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = unit.uom_name;
                baseUnitSelect.appendChild(option);
            });
            // Select first base unit by default
            if (data.units.length > 0) {
                baseUnitSelect.selectedIndex = 1;
            }
        }
    })
    .catch(error => console.error('Error loading base units:', error));
}

function loadUnits() {
    fetch('../../../../server/api/inventory/products/unit-list.php')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.units) {
            const select = document.getElementById('defaultUnit');
            data.units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = unit.uom_name;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error loading units:', error));
}

function loadCategories() {
    fetch('../../../../server/api/inventory/products/category-list.php')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.categories) {
            const select = document.getElementById('category');
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.category_name;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error loading categories:', error));
}

function loadSubcategories(categoryId = '') {
    const select = document.getElementById('subcategory');
    
    // Clear existing options
    select.innerHTML = '<option value="">Select Sub-category</option>';
    
    if (!categoryId) return;
    
    fetch(`../../../../server/api/inventory/products/subcategory-list.php?category_id=${categoryId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success && data.subcategories) {
            data.subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.id;
                option.textContent = subcategory.subcategory_name;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error loading subcategories:', error));
}

function loadInventoryAccounts() {
    fetch('../../../../server/api/inventory/products/account-list.php')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.accounts) {
            const select = document.getElementById('inventoryAccount');
            data.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                select.appendChild(option);
            });
            select.value = '33';
        }
    })
    .catch(error => console.error('Error loading accounts:', error));
}

function loadVendors() {
    fetch('../../../../server/api/inventory/products/supplier-list.php')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.suppliers) {
            const select = document.getElementById('vendor');
            data.suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.supplier_name;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error loading vendors:', error));
}

function loadCompanies() {
    fetch('../../../../server/api/inventory/products/get-companies.php')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const companySelect = document.getElementById('company');
            companySelect.innerHTML = '<option value="">Select Company</option>';
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.company_code} - ${company.company_name}`;
                companySelect.appendChild(option);
            });
            if (data.companies.length === 1) {
                companySelect.value = data.companies[0].id;
            }
        }
    })
    .catch(error => console.error('Error loading companies:', error));
}

function initParentProductDropdown() {
    const searchInput = document.getElementById('parentProductSearch');
    const hiddenInput = document.getElementById('parentProduct');
    const dropdown = document.getElementById('parentProductDropdown');
    let debounceTimer;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const searchTerm = this.value.trim();
        
        // Clear hidden input if search is cleared
        if (searchTerm === '') {
            hiddenInput.value = '';
        }
        
        debounceTimer = setTimeout(() => {
            const editId = document.getElementById('productForm').dataset.editId || '';
            fetch(`../../../../server/api/inventory/products/parent-product-list.php?search=${encodeURIComponent(searchTerm)}&exclude_id=${editId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products) {
                    dropdown.innerHTML = '';
                    
                    if (data.products.length === 0) {
                        dropdown.innerHTML = '<div class="dropdown-item" style="color: var(--subtext);">No products found</div>';
                    } else {
                        data.products.forEach(product => {
                            const item = document.createElement('div');
                            item.className = 'dropdown-item';
                            item.textContent = `${product.code} - ${product.name}`;
                            item.dataset.id = product.id;
                            item.addEventListener('mousedown', function(e) {
                                e.preventDefault();
                                searchInput.value = `${product.code} - ${product.name}`;
                                hiddenInput.value = product.id;
                                dropdown.style.display = 'none';
                            });
                            dropdown.appendChild(item);
                        });
                    }
                    
                    dropdown.style.display = 'block';
                }
            })
            .catch(error => console.error('Error loading parent products:', error));
        }, 300);
    });
    
    searchInput.addEventListener('focus', function() {
        const editId = document.getElementById('productForm').dataset.editId || '';
        fetch(`../../../../server/api/inventory/products/parent-product-list.php?search=&exclude_id=${editId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products) {
                dropdown.innerHTML = '';
                
                if (data.products.length === 0) {
                    dropdown.innerHTML = '<div class="dropdown-item" style="color: var(--subtext);">No products found</div>';
                } else {
                    data.products.forEach(product => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';
                        item.textContent = `${product.code} - ${product.name}`;
                        item.dataset.id = product.id;
                        item.addEventListener('mousedown', function(e) {
                            e.preventDefault();
                            searchInput.value = `${product.code} - ${product.name}`;
                            hiddenInput.value = product.id;
                            dropdown.style.display = 'none';
                        });
                        dropdown.appendChild(item);
                    });
                }
                
                dropdown.style.display = 'block';
            }
        })
        .catch(error => console.error('Error loading parent products:', error));
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}


function loadProductForEdit(productId) {
    fetch(`../../../../server/api/inventory/products/product-get.php?id=${productId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const product = data.product;
            
            // Populate form fields
            document.getElementById('code').value = product.code;
            document.getElementById('name').value = product.name;
            document.getElementById('company').value = product.company_id || '';
            document.querySelector(`input[name="productType"][value="${product.product_type}"]`).checked = true;
            document.getElementById('description').value = product.description || '';
            document.getElementById('purchasePrice').value = product.purchase_price || '';
            document.getElementById('tradePrice').value = product.trade_price || '';
            document.getElementById('wholesalePrice').value = product.wholesale_price || '';
            document.getElementById('mrp').value = product.mrp || '';
            document.getElementById('defaultDiscount').value = product.default_discount || '';
            document.getElementById('tradeOfferDiscount').value = product.trade_offer_discount || '';
            document.getElementById('defaultFoc').value = product.default_foc || '';
            document.getElementById('cartonConversion').value = product.carton_conversion || '';
            document.getElementById('salesTaxType').value = product.sales_tax_type || '';
            document.getElementById('salesTax').value = product.sales_tax || '';
            document.getElementById('furtherTax').value = product.further_tax || '';
            document.getElementById('minStock').value = product.min_stock_level || '';
            document.getElementById('maxStock').value = product.max_stock_level || '';
            document.getElementById('manufacturingDate').value = (product.manufacturing_date && product.manufacturing_date !== '0000-00-00') ? product.manufacturing_date : '';
            document.getElementById('expiryDate').value = (product.expiry_date && product.expiry_date !== '0000-00-00') ? product.expiry_date : '';
            document.getElementById('active').checked = product.is_active == 1;
            document.getElementById('stockAffects').checked = product.stock_affects == 1;
            document.getElementById('invoiceAffects').checked = product.invoice_affects == 1;
            
            // Set dropdown values after they are loaded
            setTimeout(() => {
                if (product.company_id) {
                    document.getElementById('company').value = product.company_id;
                }
                if (product.default_unit_id) {
                    document.getElementById('defaultUnit').value = product.default_unit_id;
                }
                if (product.category_id) {
                    document.getElementById('category').value = product.category_id;
                    // Load subcategories for selected category
                    loadSubcategories(product.category_id);
                    setTimeout(() => {
                        if (product.subcategory_id) {
                            document.getElementById('subcategory').value = product.subcategory_id;
                        }
                    }, 500);
                }
                if (product.inventory_account_id) {
                    document.getElementById('inventoryAccount').value = product.inventory_account_id;
                }
                if (product.vendor_id) {
                    document.getElementById('vendor').value = product.vendor_id;
                }
                if (product.parent_product_id) {
                    loadParentProductForEdit(product.parent_product_id);
                }
            }, 1000);
            
            // Set form to edit mode
            document.getElementById('productForm').dataset.editId = productId;
            
            // Load existing photo if available
            if (product.photo) {
                const preview = document.getElementById('photoPreview');
                const removeBtn = document.getElementById('removePhoto');
                preview.src = `../../../assets/uploads/products/${product.photo}`;
                preview.style.display = 'block';
                removeBtn.style.display = 'block';
            }
            
            // Load existing QR code if available
            if (product.qr_code) {
                document.getElementById('qrInput').value = product.qr_code;
                generateQRCode(product.qr_code);
            }
            
            // Load existing barcode if available
            if (product.barcode) {
                document.getElementById('barcodeInput').value = product.barcode;
                generateBarcode(product.barcode);
            }
            
            // Load existing stock opening data
            loadStockOpeningData(productId);
            
            handleProductTypeChange();
        } else {
            alert('Error loading product: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while loading the product');
    });
}

function loadStockOpeningData(productId) {
    fetch(`../../../../server/api/inventory/products/stock-opening-get.php?product_id=${productId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success && data.stock_entries.length > 0) {
            const stockEntries = document.getElementById('stockEntries');
            stockEntries.innerHTML = ''; // Clear existing entries
            
            data.stock_entries.forEach((entry) => {
                addStockEntry();
                const entryDiv = stockEntries.lastElementChild;
                
                const branchInput = entryDiv.querySelector('.branch-search');
                const branchHidden = entryDiv.querySelector('input[name="branch[]"]');
                const qtyInput = entryDiv.querySelector('input[name="openingQty[]"]');
                const priceInput = entryDiv.querySelector('input[name="openingPrice[]"]');
                
                if (branchInput) branchInput.value = entry.branch_display;
                if (branchHidden) branchHidden.value = entry.branch_id;
                if (qtyInput) qtyInput.value = entry.opening_qty;
                if (priceInput) priceInput.value = entry.opening_price;
            });
            
            calculateTotalStock();
        }
    })
    .catch(error => console.error('Error loading stock opening data:', error));
}

function loadParentProductForEdit(parentProductId) {
    fetch(`../../../../server/api/inventory/products/product-get.php?id=${parentProductId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success && data.product) {
            const product = data.product;
            document.getElementById('parentProductSearch').value = `${product.code} - ${product.name}`;
            document.getElementById('parentProduct').value = product.id;
        }
    })
    .catch(error => console.error('Error loading parent product:', error));
}

function loadBranches() {
    fetch('../../../../server/api/inventory/products/branch-list.php')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.branches) {
            window.branchesData = data.branches;
            document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
                initBranchDropdown(dropdown);
            });
        }
    })
    .catch(error => console.error('Error loading branches:', error));
}

function initBranchDropdown(container) {
    const searchInput = container.querySelector('.branch-search');
    const hiddenInput = container.querySelector('input[type="hidden"]');
    const dropdownList = container.querySelector('.dropdown-list');
    
    if (!searchInput || !hiddenInput || !dropdownList) return;
    
    searchInput.addEventListener('focus', () => {
        renderBranchList('', dropdownList, searchInput, hiddenInput);
        dropdownList.style.display = 'block';
    });
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        renderBranchList(query, dropdownList, searchInput, hiddenInput);
    });
    
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdownList.style.display = 'none';
        }
    });
}

function renderBranchList(query, dropdownList, searchInput, hiddenInput) {
    dropdownList.innerHTML = '';
    
    const parentBranches = window.branchesData.filter(b => !b.parent_branch_id || b.parent_branch_id === null);
    const childBranches = window.branchesData.filter(b => b.parent_branch_id && b.parent_branch_id !== null);
    
    let hasResults = false;
    
    parentBranches.forEach(parent => {
        const parentMatches = parent.branch_name.toLowerCase().includes(query);
        const children = childBranches.filter(c => 
            c.parent_branch_id === parent.id && 
            c.branch_name.toLowerCase().includes(query)
        );
        
        if (parentMatches || children.length > 0 || query === '') {
            const parentItem = document.createElement('div');
            parentItem.className = 'dropdown-item dropdown-parent';
            parentItem.textContent = `${parent.branch_name} (${parent.branch_type})`;
            parentItem.style.fontWeight = '600';
            parentItem.style.color = 'var(--subtext)';
            parentItem.style.cursor = 'not-allowed';
            dropdownList.appendChild(parentItem);
            hasResults = true;
            
            const relatedChildren = query === '' ? 
                childBranches.filter(c => c.parent_branch_id === parent.id) : 
                children;
            
            relatedChildren.forEach(child => {
                const childItem = document.createElement('div');
                childItem.className = 'dropdown-item dropdown-child';
                childItem.textContent = `${child.branch_name} (${child.branch_type})`;
                childItem.style.paddingLeft = '30px';
                childItem.dataset.id = child.id;
                
                childItem.addEventListener('click', () => {
                    searchInput.value = `${child.branch_name} (${child.branch_type})`;
                    hiddenInput.value = child.id;
                    dropdownList.style.display = 'none';
                });
                
                dropdownList.appendChild(childItem);
                hasResults = true;
            });
        }
    });
    
    if (!hasResults) {
        dropdownList.innerHTML = '<div class="dropdown-item" style="color: var(--subtext); cursor: default;">No branches found</div>';
    }
}

function closeUnitModal() {
    document.getElementById('unitModal').style.display = 'none';
    document.getElementById('unitForm').reset();
    delete document.getElementById('unitForm').dataset.editId;
}

function handleUnitSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('unitForm');
    const formData = new FormData(form);
    const editId = form.dataset.editId;
    
    if (editId) {
        formData.append('id', editId);
    }
    
    // Set default conversion factor if empty
    if (!formData.get('conversionFactor') || formData.get('conversionFactor') === '') {
        formData.set('conversionFactor', '1');
    }
    
    const endpoint = editId ? 'unit-edit.php' : 'unit-add.php';
    
    fetch(`../../../../server/api/inventory/products/${endpoint}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (editId) {
                // Update existing option
                const select = document.getElementById('defaultUnit');
                const option = select.querySelector(`option[value="${editId}"]`);
                if (option) {
                    option.textContent = data.unit.name;
                }
                alert('Unit updated successfully!');
            } else {
                // Add new option
                const select = document.getElementById('defaultUnit');
                const option = document.createElement('option');
                option.value = data.unit.id;
                option.textContent = data.unit.name;
                select.appendChild(option);
                select.value = option.value;
                alert('Unit added successfully!');
            }
            closeUnitModal();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while saving the unit');
    });
}