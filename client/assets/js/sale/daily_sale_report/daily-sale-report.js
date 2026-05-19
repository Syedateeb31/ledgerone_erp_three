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
const itemsSoldItem = document.getElementById('items-sold-item');
const billsGeneratedItem = document.getElementById('bills-generated-item');

// Selected sales officers map: { id -> name }
let selectedSalesOfficers = {};

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
    loadCities();
    loadAllAreas();
    initSalesOfficerDropdown();
    fetchReportData();
}

function initSalesOfficerDropdown() {
    const trigger = document.getElementById('sales-officer-trigger');
    const options = document.getElementById('sales-officer-options');
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        trigger.classList.toggle('open');
        options.classList.toggle('open');
    });
    document.addEventListener('click', function() {
        trigger.classList.remove('open');
        options.classList.remove('open');
    });
}

function updateSalesOfficerLabel() {
    const label = document.getElementById('sales-officer-label');
    const names = Object.values(selectedSalesOfficers);
    label.textContent = names.length === 0 ? 'All Sales Officers' : names.join(', ');
}

function getSelectedOfficerIds() {
    return Object.keys(selectedSalesOfficers);
}

async function loadCities() {
    try {
        const response = await fetch('../../../../server/api/sale/daily_sale_report/get-cities.php');
        const result = await response.json();
        if (result.success) {
            const citySelect = document.getElementById('city-filter');
            result.cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city.id;
                option.textContent = city.city_name;
                citySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

async function loadCityZones(cityId) {
    const cityZoneSelect = document.getElementById('city-zone-filter');
    cityZoneSelect.innerHTML = '<option value="">All City Zones</option>';
    document.getElementById('area-filter').innerHTML = '<option value="">All Areas</option>';
    if (!cityId) return;
    try {
        const response = await fetch(`../../../../server/api/sale/daily_sale_report/get-city-zones.php?city_id=${cityId}`);
        const result = await response.json();
        if (result.success) {
            result.city_zones.forEach(zone => {
                const option = document.createElement('option');
                option.value = zone.id;
                option.textContent = zone.city_zone_name;
                cityZoneSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading city zones:', error);
    }
}

async function loadAreas(cityZoneId) {
    const areaSelect = document.getElementById('area-filter');
    const currentVal = areaSelect.value;
    areaSelect.innerHTML = '<option value="">All Areas</option>';
    try {
        const url = cityZoneId
            ? `../../../../server/api/sale/daily_sale_report/get-areas.php?city_zone_id=${cityZoneId}`
            : `../../../../server/api/sale/daily_sale_report/get-areas.php`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
            result.areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = area.area_name;
                areaSelect.appendChild(option);
            });
            if (currentVal) areaSelect.value = currentVal;
        }
    } catch (error) {
        console.error('Error loading areas:', error);
    }
}

async function loadAllAreas() {
    await loadAreas(null);
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
            // Populate sales officers as checkboxes
            const salesOfficerOptions = document.getElementById('sales-officer-options');
            salesOfficerOptions.innerHTML = '';
            result.salesOfficers.forEach(officer => {
                const label = document.createElement('label');
                label.className = 'multi-select-option';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = officer.id;
                cb.addEventListener('change', function() {
                    if (this.checked) {
                        selectedSalesOfficers[officer.id] = officer.full_name;
                    } else {
                        delete selectedSalesOfficers[officer.id];
                    }
                    updateSalesOfficerLabel();
                });
                label.appendChild(cb);
                label.appendChild(document.createTextNode(officer.full_name));
                salesOfficerOptions.appendChild(label);
            });
            
            // Populate supplier men
            const supplierManSelect = document.getElementById('supplier-man');
            supplierManSelect.innerHTML = '<option value="">All Supplier Men</option>';
            result.supplierMen.forEach(man => {
                const option = document.createElement('option');
                option.value = man.id;
                option.textContent = man.full_name;
                supplierManSelect.appendChild(option);
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
    
    // City cascading (top-down)
    document.getElementById('city-filter').addEventListener('change', function() {
        loadCityZones(this.value);
    });
    document.getElementById('city-zone-filter').addEventListener('change', function() {
        loadAreas(this.value);
    });

    // Area selected — auto-populate City and City Zone (bottom-up)
    document.getElementById('area-filter').addEventListener('change', async function() {
        const areaId = this.value;
        if (!areaId) return;
        try {
            const response = await fetch(`../../../../server/api/sale/daily_sale_report/get-area-hierarchy.php?area_id=${areaId}`);
            const result = await response.json();
            if (result.success && result.hierarchy) {
                const h = result.hierarchy;

                // Set City
                document.getElementById('city-filter').value = h.city_id;

                // Load City Zones for that city, then set the correct one
                await loadCityZones(h.city_id);
                document.getElementById('city-zone-filter').value = h.city_zone_id;

                // Reload areas for that city zone, keep area selection
                await loadAreas(h.city_zone_id);
                document.getElementById('area-filter').value = areaId;
            }
        } catch (error) {
            console.error('Error loading area hierarchy:', error);
        }
    });
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
    const officerIds = getSelectedOfficerIds();
    const salesOfficerStr = officerIds.length > 0 ? officerIds.join('-') : '0';
    const vendor = document.getElementById('vendor').value || '0';
    const dateFrom = document.getElementById('date-from').value.replace(/-/g, '');
    const dateTo = document.getElementById('date-to').value.replace(/-/g, '');
    return `DSR-${reportType}-${salesOfficerStr}-${vendor}-${dateFrom}-${dateTo}`;
}

// Fetch report data from API
async function fetchReportData() {
    loading.classList.add('active');
    
    const reportType = itemWiseToggle.classList.contains('active') ? 'item-wise' : 'bill-wise';
    const invoiceType = document.getElementById('invoice-type').value;
    const officerIds = getSelectedOfficerIds();
    const supplierMan = document.getElementById('supplier-man').value;
    const vendor = document.getElementById('vendor').value;
    const company = document.getElementById('company').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const cityId = document.getElementById('city-filter').value;
    const cityZoneId = document.getElementById('city-zone-filter').value;
    const areaId = document.getElementById('area-filter').value;
    
    const params = new URLSearchParams({
        report_type: reportType,
        ...(invoiceType && { invoice_type: invoiceType }),
        ...(supplierMan && { supplier_man_id: supplierMan }),
        ...(vendor && { vendor_id: vendor }),
        ...(company && { company_id: company }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(cityId && { city_id: cityId }),
        ...(cityZoneId && { city_zone_id: cityZoneId }),
        ...(areaId && { area_id: areaId })
    });
    officerIds.forEach(id => params.append('sales_officer_ids[]', id));
    
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
        itemWiseDataContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No data found</td></tr>';
        reportCount.textContent = '0 items found';
        paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = itemWiseData.slice(startIndex, endIndex);

    // Group by sales_officer_name if multiple officers selected
    const officerIds = getSelectedOfficerIds();
    const groupByOfficer = officerIds.length > 1;

    if (groupByOfficer) {
        // Group items by officer
        const groups = {};
        paginatedData.forEach(item => {
            const key = item.sales_officer_name || 'Unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        let globalIndex = startIndex;
        Object.entries(groups).forEach(([officerName, items]) => {
            // Officer header row
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `<td colspan="6" style="background: var(--surface-2); font-weight: 600; font-size: 13px; padding: 8px 16px; color: var(--primary);">${officerName}</td>`;
            itemWiseDataContainer.appendChild(headerRow);

            items.forEach(item => {
                globalIndex++;
                const row = document.createElement('tr');
                const indent = item.isChild ? 'padding-left: 30px;' : '';
                const quantityStr = item.units.map(u => `${u.unit} ${parseInt(u.qty)}`).join(', ');
                row.innerHTML = `
                    <td>${globalIndex}</td>
                    <td style="${indent}">${item.isChild ? '↳ ' : ''}${item.product}</td>
                    <td class="text-right">${quantityStr}</td>
                    <td class="text-right">${parseFloat(item.foc_qty || 0).toLocaleString()}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.rate).toFixed(2)}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.amount).toLocaleString()}</td>
                `;
                itemWiseDataContainer.appendChild(row);
            });
        });
    } else {
        paginatedData.forEach((item, index) => {
            const row = document.createElement('tr');
            const indent = item.isChild ? 'padding-left: 30px;' : '';
            const quantityStr = item.units.map(u => `${u.unit} ${parseInt(u.qty)}`).join(', ');
            row.innerHTML = `
                    <td>${startIndex + index + 1}</td>
                    <td style="${indent}">${item.isChild ? '↳ ' : ''}${item.product}</td>
                    <td class="text-right">${quantityStr}</td>
                    <td class="text-right">${parseFloat(item.foc_qty || 0).toLocaleString()}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.rate).toFixed(2)}</td>
                    <td class="text-right">${currencySymbol}${parseFloat(item.amount).toLocaleString()}</td>
                `;
            itemWiseDataContainer.appendChild(row);
        });
    }

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

    const officerIds = getSelectedOfficerIds();
    const groupByOfficer = officerIds.length > 1;

    if (groupByOfficer) {
        const groups = {};
        paginatedData.forEach(item => {
            const key = item.sales_officer_name || 'Unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        let globalIndex = startIndex;
        Object.entries(groups).forEach(([officerName, items]) => {
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `<td colspan="6" style="background: var(--surface-2); font-weight: 600; font-size: 13px; padding: 8px 16px; color: var(--primary);">${officerName}</td>`;
            billWiseDataContainer.appendChild(headerRow);

            items.forEach(item => {
                globalIndex++;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${globalIndex}</td>
                    <td><strong>${item.invoiceNo}</strong></td>
                    <td>${item.custCode}</td>
                    <td>${item.custName}</td>
                    <td>${item.address || '-'}</td>
                    <td class="text-right"><strong>${currencySymbol}${parseFloat(item.netAmount).toLocaleString()}</strong></td>
                `;
                billWiseDataContainer.appendChild(row);
            });
        });
    } else {
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
    }

    reportCount.textContent = `${billWiseData.length} bills found`;
    renderPagination(billWiseData.length);
}

// Update summary card
function updateSummary() {
    if (itemWiseToggle.classList.contains('active')) {
        // Item-wise summary
        const totalQty = itemWiseData.filter(item => !item.isChild).reduce((sum, item) => {
            return sum + item.units.reduce((unitSum, u) => unitSum + parseInt(u.qty), 0);
        }, 0);
        const totalAmount = itemWiseData.filter(item => !item.isChild).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        totalSalesEl.textContent = `${currencySymbol}${totalAmount.toLocaleString()}`;
        totalItemsEl.textContent = totalQty.toLocaleString();
        netAmountEl.textContent = `${currencySymbol}${totalAmount.toLocaleString()}`;
        
        // Hide Bills Generated in item-wise view
        itemsSoldItem.style.display = 'block';
        billsGeneratedItem.style.display = 'none';
    } else {
        // Bill-wise summary
        const totalBills = billWiseData.length;
        const totalNetAmount = billWiseData.reduce((sum, item) => sum + parseFloat(item.netAmount || 0), 0);

        totalSalesEl.textContent = `${currencySymbol}${totalNetAmount.toLocaleString()}`;
        totalItemsEl.textContent = '-';
        totalBillsEl.textContent = totalBills;
        netAmountEl.textContent = `${currencySymbol}${totalNetAmount.toLocaleString()}`;
        
        // Show Bills Generated in bill-wise view
        itemsSoldItem.style.display = 'none';
        billsGeneratedItem.style.display = 'block';
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
    document.getElementById('invoice-type').value = '';
    // Reset sales officers
    selectedSalesOfficers = {};
    document.querySelectorAll('#sales-officer-options input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateSalesOfficerLabel();
    document.getElementById('supplier-man').value = '';
    document.getElementById('vendor').value = '';
    document.getElementById('company').value = '';
    document.getElementById('city-filter').value = '';
    document.getElementById('city-zone-filter').innerHTML = '<option value="">All City Zones</option>';
    document.getElementById('area-filter').innerHTML = '<option value="">All Areas</option>';
    loadAllAreas();

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
    const invoiceType = document.getElementById('invoice-type').value;
    const officerIds = getSelectedOfficerIds();
    const supplierMan = document.getElementById('supplier-man').value;
    const vendor = document.getElementById('vendor').value;
    const company = document.getElementById('company').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const cityId = document.getElementById('city-filter').value;
    const cityZoneId = document.getElementById('city-zone-filter').value;
    const areaId = document.getElementById('area-filter').value;
    const refNum = generateReference();
    
    const params = new URLSearchParams({
        report_type: reportType,
        reference: refNum,
        ...(invoiceType && { invoice_type: invoiceType }),
        ...(supplierMan && { supplier_man_id: supplierMan }),
        ...(vendor && { vendor_id: vendor }),
        ...(company && { company_id: company }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(cityId && { city_id: cityId }),
        ...(cityZoneId && { city_zone_id: cityZoneId }),
        ...(areaId && { area_id: areaId })
    });
    officerIds.forEach(id => params.append('sales_officer_ids[]', id));
    
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
