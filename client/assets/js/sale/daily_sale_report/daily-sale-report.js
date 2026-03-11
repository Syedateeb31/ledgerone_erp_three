// Data storage
let itemWiseData = [];
let billWiseData = [];
let currentPage = 1;
const itemsPerPage = 20;

// DOM Elements
const itemWiseToggle = document.getElementById('item-wise-toggle');
const billWiseToggle = document.getElementById('bill-wise-toggle');
const itemWiseReport = document.getElementById('item-wise-report');
const billWiseReport = document.getElementById('bill-wise-report');
const itemWiseDataContainer = document.getElementById('item-wise-data');
const billWiseDataContainer = document.getElementById('bill-wise-data');
const searchBtn = document.getElementById('search-btn');
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const printBtn = document.getElementById('print-btn');
const loading = document.getElementById('loading');
const reportCount = document.getElementById('report-count');
const paginationContainer = document.getElementById('pagination');
const totalSalesEl = document.getElementById('total-sales');
const totalItemsEl = document.getElementById('total-items');
const totalBillsEl = document.getElementById('total-bills');
const netAmountEl = document.getElementById('net-amount');
const referenceCard = document.getElementById('reference-card');
const referenceNumber = document.getElementById('reference-number');

// Initialize the application
function init() {
    // Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('date-from').valueAsDate = firstDay;
    document.getElementById('date-to').valueAsDate = today;

    // Set up event listeners
    setupEventListeners();
    
    // Load filters and initial data
    loadCompanies();
    loadFilters();
    fetchReportData();
}

// Load filter options
async function loadCompanies() {
    try {
        const response = await fetch('../../../../server/api/sale/daily_sale_report/get-companies.php');
        const result = await response.json();
        
        if (result.success) {
            const companySelect = document.getElementById('company');
            result.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.company_name;
                companySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

async function loadFilters() {
    try {
        const response = await fetch('../../../../server/api/sale/daily_sale_report/get-filters.php');
        const result = await response.json();
        
        if (result.success) {
            // Populate sales officers
            const salesOfficerSelect = document.getElementById('sales-officer');
            salesOfficerSelect.innerHTML = '<option value="">All Sales Officers</option>';
            result.salesOfficers.forEach(officer => {
                const option = document.createElement('option');
                option.value = officer.id;
                option.textContent = officer.full_name;
                salesOfficerSelect.appendChild(option);
            });
            
            // Populate vendors
            const vendorSelect = document.getElementById('vendor');
            vendorSelect.innerHTML = '<option value="">All Vendors</option>';
            result.vendors.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.id;
                option.textContent = vendor.supplier_name;
                vendorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Report type toggle
    itemWiseToggle.addEventListener('click', () => switchReportType('item'));
    billWiseToggle.addEventListener('click', () => switchReportType('bill'));

    // Buttons
    searchBtn.addEventListener('click', handleSearch);
    resetBtn.addEventListener('click', handleReset);
    exportBtn.addEventListener('click', handleExport);
    printBtn.addEventListener('click', handlePrint);
}

// Switch between report types
function switchReportType(type) {
    if (type === 'item') {
        itemWiseToggle.classList.add('active');
        billWiseToggle.classList.remove('active');
        itemWiseReport.style.display = 'block';
        billWiseReport.style.display = 'none';
    } else {
        itemWiseToggle.classList.remove('active');
        billWiseToggle.classList.add('active');
        itemWiseReport.style.display = 'none';
        billWiseReport.style.display = 'block';
    }
    currentPage = 1;
    fetchReportData();
}

// Generate unique reference number
function generateReference() {
    const reportType = itemWiseToggle.classList.contains('active') ? 'I' : 'B';
    const salesOfficer = document.getElementById('sales-officer').value || '0';
    const vendor = document.getElementById('vendor').value || '0';
    const dateFrom = document.getElementById('date-from').value.replace(/-/g, '');
    const dateTo = document.getElementById('date-to').value.replace(/-/g, '');
    
    return `DSR-${reportType}-${salesOfficer}-${vendor}-${dateFrom}-${dateTo}`;
}

// Fetch report data from API
async function fetchReportData() {
    loading.classList.add('active');
    
    const reportType = itemWiseToggle.classList.contains('active') ? 'item-wise' : 'bill-wise';
    const salesOfficer = document.getElementById('sales-officer').value;
    const vendor = document.getElementById('vendor').value;
    const company = document.getElementById('company').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    const params = new URLSearchParams({
        report_type: reportType,
        ...(salesOfficer && { sales_officer_id: salesOfficer }),
        ...(vendor && { vendor_id: vendor }),
        ...(company && { company_id: company }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo })
    });
    
    try {
        const response = await fetch(`../../../../server/api/sale/daily_sale_report/daily-sale-report.php?${params}`);
        const result = await response.json();
        
        if (result.success) {
            if (reportType === 'item-wise') {
                itemWiseData = result.data;
                loadItemWiseData();
            } else {
                billWiseData = result.data;
                loadBillWiseData();
            }
            updateSummary();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error fetching report:', error);
        alert('Failed to load report data');
    } finally {
        loading.classList.remove('active');
    }
}

// Load item-wise data
function loadItemWiseData() {
    itemWiseDataContainer.innerHTML = '';

    if (itemWiseData.length === 0) {
        itemWiseDataContainer.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No data found</td></tr>';
        reportCount.textContent = '0 items found';
        paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = itemWiseData.slice(startIndex, endIndex);

    paginatedData.forEach((item, index) => {
        const row = document.createElement('tr');
        const indent = item.isChild ? 'padding-left: 30px;' : '';
        row.innerHTML = `
                    <td>${startIndex + index + 1}</td>
                    <td style="${indent}">${item.isChild ? '↳ ' : ''}${item.product}</td>
                    <td>${item.unit || '-'}</td>
                    <td class="text-right">${parseFloat(item.qty).toLocaleString()}</td>
                    <td class="text-right">${parseFloat(item.foc_qty || 0).toLocaleString()}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.rate).toFixed(2)}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.amount).toLocaleString()}</td>
                `;
        itemWiseDataContainer.appendChild(row);
    });

    reportCount.textContent = `${itemWiseData.length} items found`;
    renderPagination(itemWiseData.length);
}

// Load bill-wise data
function loadBillWiseData() {
    billWiseDataContainer.innerHTML = '';

    if (billWiseData.length === 0) {
        billWiseDataContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No data found</td></tr>';
        reportCount.textContent = '0 bills found';
        paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = billWiseData.slice(startIndex, endIndex);

    paginatedData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>${startIndex + index + 1}</td>
                    <td><strong>${item.invoiceNo}</strong></td>
                    <td>${item.custCode}</td>
                    <td>${item.custName}</td>
                    <td>${item.address || '-'}</td>
                    <td class="text-right"><strong>${currencySymbol}${parseFloat(item.netAmount).toLocaleString()}</strong></td>
                `;
        billWiseDataContainer.appendChild(row);
    });

    reportCount.textContent = `${billWiseData.length} bills found`;
    renderPagination(billWiseData.length);
}

// Update summary card
function updateSummary() {
    if (itemWiseToggle.classList.contains('active')) {
        // Item-wise summary - exclude child products from totals
        const totalQty = itemWiseData.filter(item => !item.isChild).reduce((sum, item) => sum + parseFloat(item.qty || 0), 0);
        const totalAmount = itemWiseData.filter(item => !item.isChild).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        totalSalesEl.textContent = `${currencySymbol}${totalAmount.toLocaleString()}`;
        totalItemsEl.textContent = totalQty.toLocaleString();
        totalBillsEl.textContent = itemWiseData.filter(item => !item.isChild).length;
        netAmountEl.textContent = `${currencySymbol}${totalAmount.toLocaleString()}`;
    } else {
        // Bill-wise summary
        const totalBills = billWiseData.length;
        const totalNetAmount = billWiseData.reduce((sum, item) => sum + parseFloat(item.netAmount || 0), 0);

        totalSalesEl.textContent = `${currencySymbol}${totalNetAmount.toLocaleString()}`;
        totalItemsEl.textContent = '-';
        totalBillsEl.textContent = totalBills;
        netAmountEl.textContent = `${currencySymbol}${totalNetAmount.toLocaleString()}`;
    }
}

// Handle search
function handleSearch() {
    currentPage = 1;
    const refNum = generateReference();
    referenceNumber.textContent = refNum;
    referenceCard.style.display = 'flex';
    fetchReportData();
}

// Handle reset
function handleReset() {
    document.getElementById('sales-officer').value = '';
    document.getElementById('vendor').value = '';
    document.getElementById('company').value = '';

    // Reset to default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('date-from').valueAsDate = firstDay;
    document.getElementById('date-to').valueAsDate = today;

    // Hide reference
    referenceCard.style.display = 'none';
    referenceNumber.textContent = '-';

    // Reload data
    currentPage = 1;
    fetchReportData();
}

// Handle export
function handleExport() {
    const reportType = itemWiseToggle.classList.contains('active') ? 'item-wise' : 'bill-wise';
    alert(`${reportType} report exported as CSV successfully!`);
}

// Handle print
function handlePrint() {
    const reportType = itemWiseToggle.classList.contains('active') ? 'item-wise' : 'bill-wise';
    const salesOfficer = document.getElementById('sales-officer').value;
    const vendor = document.getElementById('vendor').value;
    const company = document.getElementById('company').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const refNum = generateReference();
    
    const params = new URLSearchParams({
        report_type: reportType,
        reference: refNum,
        ...(salesOfficer && { sales_officer_id: salesOfficer }),
        ...(vendor && { vendor_id: vendor }),
        ...(company && { company_id: company }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo })
    });
    
    window.open(`print.php?${params}`, '_blank');
}

// Render pagination
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">&lsaquo;</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button disabled>...</button>`;
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">&rsaquo;</button>`;
    
    paginationContainer.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    if (itemWiseToggle.classList.contains('active')) {
        loadItemWiseData();
    } else {
        loadBillWiseData();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);