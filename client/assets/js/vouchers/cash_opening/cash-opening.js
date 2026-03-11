// DOM Elements
const branchSelect = document.getElementById('branch');
const asOfDateInput = document.getElementById('asOfDate');
const openingCashInput = document.getElementById('openingCash');
const currencyInput = document.getElementById('currency');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const statusMessage = document.getElementById('statusMessage');
const formContainer = document.getElementById('formContainer');
const lockOverlay = document.getElementById('lockOverlay');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Data storage
let cashRecords = [];
let companies = [];

// Initialize the form
function initializeForm() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    asOfDateInput.value = today;

    // Display current date in header
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', options);

    // Load branches
    loadBranches();
    
    // Load companies
    loadCompanies();

    // Load currency
    loadCurrency();

    // Load existing records
    loadRecords();

    // Check if form should be locked
    checkFormLock();

    // Set up event listeners
    saveBtn.addEventListener('click', saveRecord);
    resetBtn.addEventListener('click', resetForm);
    branchSelect.addEventListener('change', validateBranch);
    asOfDateInput.addEventListener('change', validateDate);
    openingCashInput.addEventListener('input', validateAmount);
}

// Load branches from API
async function loadBranches() {
    try {
        const response = await fetch('../../../../server/api/vouchers/cash_opening/get-branches.php');
        const data = await response.json();
        
        if (data.success && data.branches) {
            data.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branch_id;
                option.textContent = branch.branch_name;
                branchSelect.appendChild(option);
            });
            
            // Initialize Select2
            $(branchSelect).select2({
                placeholder: 'Select Branch',
                allowClear: true,
                width: '100%'
            });
        }
    } catch (error) {
        showStatusMessage('Failed to load branches', 'error');
    }
}

// Load companies from API
async function loadCompanies() {
    try {
        const response = await fetch('../../../../server/api/vouchers/cash_opening/get-companies.php');
        const data = await response.json();
        
        if (data.success && data.data) {
            companies = data.data;
            const companySelect = document.getElementById('company');
            data.data.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.company_name;
                companySelect.appendChild(option);
            });
            
            // Auto-select if only one company
            if (data.data.length === 1) {
                companySelect.value = data.data[0].id;
            }
        }
    } catch (error) {
        showStatusMessage('Failed to load companies', 'error');
    }
}

// Load currency from API
async function loadCurrency() {
    try {
        const response = await fetch('../../../../server/api/vouchers/cash_opening/get-currency.php');
        const data = await response.json();
        
        if (data.success && data.currency) {
            currencyInput.value = data.currency;
        }
    } catch (error) {
        console.error('Failed to load currency');
    }
}

// Validate branch selection
function validateBranch() {
    const branchError = document.getElementById('branchError');
    
    if (!branchSelect.value) {
        branchError.textContent = 'Please select a branch';
        branchError.style.display = 'block';
        branchSelect.classList.add('error');
        return false;
    }
    
    branchError.style.display = 'none';
    branchSelect.classList.remove('error');
    return true;
}

// Validate company selection
function validateCompany() {
    const companySelect = document.getElementById('company');
    const companyError = document.getElementById('companyError');
    
    if (!companySelect.value) {
        companyError.textContent = 'Please select a company';
        companyError.style.display = 'block';
        companySelect.classList.add('error');
        return false;
    }
    
    companyError.style.display = 'none';
    companySelect.classList.remove('error');
    return true;
}

// Check if form should be locked
function checkFormLock() {
    const hasRecords = cashRecords.length > 0;
    
    lockOverlay.style.display = hasRecords ? 'flex' : 'none';
    branchSelect.disabled = hasRecords;
    asOfDateInput.disabled = hasRecords;
    openingCashInput.disabled = hasRecords;
    saveBtn.disabled = hasRecords;
    resetBtn.disabled = hasRecords;
    
    if (hasRecords) {
        showStatusMessage('Opening cash record already exists for this period. Form is locked.', 'warning');
    }
}

// Validate date input
function validateDate() {
    const dateError = document.getElementById('asOfDateError');

    if (!asOfDateInput.value) {
        dateError.textContent = 'Please select a date';
        dateError.style.display = 'block';
        asOfDateInput.classList.add('error');
        return false;
    }

    dateError.style.display = 'none';
    asOfDateInput.classList.remove('error');
    return true;
}

// Validate amount input
function validateAmount() {
    const amountError = document.getElementById('openingCashError');

    if (!openingCashInput.value || openingCashInput.value <= 0) {
        amountError.textContent = 'Please enter a valid amount greater than 0';
        amountError.style.display = 'block';
        openingCashInput.classList.add('error');
        return false;
    }

    amountError.style.display = 'none';
    openingCashInput.classList.remove('error');
    return true;
}

// Save the record
async function saveRecord() {
    if (!validateBranch() || !validateCompany() || !validateDate() || !validateAmount()) {
        showStatusMessage('Please fix the errors in the form before saving.', 'error');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await fetch('../../../../server/api/vouchers/cash_opening/cash-opening.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                branch_id: branchSelect.value,
                company_id: document.getElementById('company').value,
                as_of_date: asOfDateInput.value,
                opening_amount: openingCashInput.value,
                currency: currencyInput.value
            })
        });

        const data = await response.json();

        if (data.success) {
            showStatusMessage(`Opening cash of $${parseFloat(openingCashInput.value).toFixed(2)} saved successfully.`, 'success');
            resetForm();
            await loadRecords();
            checkFormLock();
        } else {
            showStatusMessage(data.error || 'Failed to save record', 'error');
            console.error('Error details:', data);
        }
    } catch (error) {
        showStatusMessage('Failed to save record. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Opening Cash';
    }
}

// Load records from API
async function loadRecords() {
    try {
        const response = await fetch('../../../../server/api/vouchers/cash_opening/cash-opening.php');
        const data = await response.json();

        if (data.success) {
            cashRecords = data.records;
            tableBody.innerHTML = '';

            if (cashRecords.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';

            cashRecords.forEach(record => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${record.branch_name || '-'}</td>
                    <td>${record.company_name || '-'}</td>
                    <td>${formatDate(record.as_of_date)}</td>
                    <td><strong>$${parseFloat(record.opening_amount).toFixed(2)}</strong></td>
                    <td>${record.currency}</td>
                    <td>${record.entered_by}</td>
                    <td>${formatDateTime(record.updated_at)}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        showStatusMessage('Failed to load records', 'error');
    }
}

// Reset the form
function resetForm() {
    // Reset to default values
    branchSelect.value = '';
    document.getElementById('company').value = '';
    const today = new Date().toISOString().split('T')[0];
    asOfDateInput.value = today;
    openingCashInput.value = '';

    // Clear errors
    document.getElementById('branchError').style.display = 'none';
    document.getElementById('companyError').style.display = 'none';
    document.getElementById('asOfDateError').style.display = 'none';
    document.getElementById('openingCashError').style.display = 'none';
    branchSelect.classList.remove('error');
    document.getElementById('company').classList.remove('error');
    asOfDateInput.classList.remove('error');
    openingCashInput.classList.remove('error');

    // Clear status message
    statusMessage.style.display = 'none';

    // Focus on first field
    if (!branchSelect.disabled) {
        branchSelect.focus();
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    // Set message content
    statusMessage.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;

    // Set styling based on type
    statusMessage.className = 'status-message';
    statusMessage.classList.add(`status-${type}`);

    // Show the message
    statusMessage.style.display = 'flex';

    // Auto-hide after 5 seconds (except for warnings when form is locked)
    if (type !== 'warning' || cashRecords.length === 0) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format date and time for display
function formatDateTime(dateTimeString) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString('en-US', options);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeForm);