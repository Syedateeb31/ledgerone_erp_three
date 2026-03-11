const API_BASE = '../../../../server/api/inventory/stock_position/stock-position.php';

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let allPositions = [];
let currentCurrency = '$';

// Item-wise Ledger pagination variables
let itemCurrentPage = 1;
let itemTotalItems = 0;
let allLedgerEntries = [];
let itemCurrency = '$';

// Branch-wise Ledger pagination variables
let branchCurrentPage = 1;
let branchTotalItems = 0;
let allBranchEntries = [];
let branchCurrency = '$';

// Detailed Ledger pagination variables
let detailedCurrentPage = 1;
let detailedTotalItems = 0;
let allDetailedEntries = [];
let detailedCurrency = '$';

// Toggle children for a specific product
function toggleChildren(productId) {
    const childRows = document.querySelectorAll(`tr.child-row[data-parent-id="${productId}"]`);
    const toggleIcon = document.querySelector(`tr[data-product-id="${productId}"] i`);
    
    if (childRows.length > 0) {
        const isHidden = childRows[0].style.display === 'none';
        childRows.forEach(row => row.style.display = isHidden ? '' : 'none');
        if (toggleIcon) {
            toggleIcon.className = isHidden ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
        }
    }
}

// Print function
function printList() {
    const branch = document.getElementById('branch').value;
    const product = document.getElementById('product').value;
    const company = document.getElementById('company').value;
    const status = document.getElementById('status').value;
    const fromDate = document.getElementById('from-date').value;
    const toDate = document.getElementById('to-date').value;
    
    let url = 'print.php?';
    if (branch) url += `branch_id=${branch}&`;
    if (product) url += `product_id=${product}&`;
    if (company) url += `company_id=${company}&`;
    if (status) url += `status=${status}&`;
    if (fromDate) url += `from_date=${fromDate}&`;
    if (toDate) url += `to_date=${toDate}&`;
    
    window.open(url, '_blank');
}

// Export functions (placeholders)
function exportToExcel() {
    alert('Excel export functionality to be implemented');
}

function exportToJSON() {
    alert('JSON export functionality to be implemented');
}

// Tab Functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'position') loadStockPosition();
        if (tabId === 'detailed-ledger') loadDetailedLedger();
    });
});

// Load Stock Position
async function loadStockPosition() {
    try {
        const branchInput = document.getElementById('branch').value;
        const product = document.getElementById('product').value;
        const company = document.getElementById('company').value;
        const inventoryType = document.getElementById('inventory-type').value;
        const distribution = document.getElementById('distribution').value;
        const stockStatus = document.getElementById('stock-status').value;
        const status = document.getElementById('status').value;
        const fromDate = document.getElementById('from-date').value;
        const toDate = document.getElementById('to-date').value;
        const valuationMethod = document.getElementById('valuation-method').value;
        
        // Find branch ID from datalist
        let branchId = null;
        if (branchInput) {
            const options = document.querySelectorAll('#branch-list option');
            for (let option of options) {
                if (option.value === branchInput) {
                    branchId = option.getAttribute('data-id');
                    break;
                }
            }
        }
        
        // Find product ID from datalist
        let productId = null;
        if (product) {
            const options = document.querySelectorAll('#product-list option');
            for (let option of options) {
                if (option.value === product) {
                    productId = option.getAttribute('data-id');
                    break;
                }
            }
        }
        
        let url = `${API_BASE}?action=position`;
        if (branchId) url += `&branch_id=${branchId}`;
        if (productId) url += `&product_id=${productId}`;
        if (company) url += `&company_id=${company}`;
        if (inventoryType) url += `&inventory_type_id=${inventoryType}`;
        if (distribution) url += `&vendor_id=${distribution}`;
        if (stockStatus) url += `&stock_status=${stockStatus}`;
        if (status) url += `&status=${status}`;
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;
        if (valuationMethod) url += `&valuation_method=${valuationMethod}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allPositions = Array.isArray(data.data) ? data.data : [];
            
            // Add product_id to each position for toggle functionality
            allPositions = allPositions.map((pos, idx) => ({
                ...pos,
                product_id: pos.product_id || `temp_${idx}`
            }));
            
            totalItems = allPositions.length;
            currentPage = 1;
            currentCurrency = data.currency || '$';
            updatePositionTable(currentCurrency);
            updatePaginationControls();
        }
    } catch (error) {
        console.error('Error loading stock position:', error);
    }
}

function updatePositionTable(currency = '$') {
    const tbody = document.querySelector('#position .table tbody');
    
    // Get current page data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = allPositions.slice(startIndex, endIndex);
    
    // Calculate totals for all data (only parent products or standalone products - exclude children)
    const totalValue = allPositions.reduce((sum, pos) => {
        if (!pos.parent_product_id) {  // Only count if it's NOT a child (parent or standalone)
            return sum + parseFloat(pos.stock_value);
        }
        return sum;
    }, 0);
    const totalEntries = allPositions.filter(pos => !pos.parent_product_id).length;
    
    // Calculate unit-wise totals for all data (only parent products or standalone products)
    const unitTotals = allPositions.reduce((totals, pos) => {
        if (!pos.parent_product_id) {  // Only count if it's NOT a child
            const unit = pos.unit_symbol || 'L';
            totals[unit] = (totals[unit] || 0) + parseFloat(pos.current_stock);
        }
        return totals;
    }, {});
    
    const unitTotalsText = Object.entries(unitTotals)
        .map(([unit, total]) => `${total.toFixed(2)} ${unit}`)
        .join(', ');
    
    tbody.innerHTML = pageData.map((pos, idx) => {
        const isChild = pos.parent_product_id;
        const hasChildren = !isChild && pageData.some(p => p.parent_product_id === pos.product_id);
        const toggleBtn = hasChildren ? `<i class="fas fa-chevron-down" style="cursor: pointer; margin-right: 8px;" onclick="toggleChildren(${pos.product_id})"></i>` : '';
        const productDisplay = isChild ? `<span style="margin-left: 28px; color: var(--subtext);">↳ ${pos.product_name}</span>` : `${toggleBtn}${pos.product_name}`;
        
        return `
        <tr class="${isChild ? 'child-row' : 'parent-row'}" data-product-id="${pos.product_id}" data-parent-id="${pos.parent_product_id || ''}" style="${isChild ? 'background-color: var(--table-row-alt);' : ''}">
            <td>${productDisplay}</td>
            <td>${pos.branch_display}</td>
            <td>${pos.inventory_type || '-'}</td>
            <td>${parseFloat(pos.opening_balance || 0).toFixed(2)} ${pos.unit_symbol || 'L'}</td>
            <td>${parseFloat(pos.total_qty_in || 0).toFixed(2)} ${pos.unit_symbol || 'L'}</td>
            <td>${parseFloat(pos.total_qty_out || 0).toFixed(2)} ${pos.unit_symbol || 'L'}</td>
            <td>${parseFloat(pos.current_stock).toFixed(2)} ${pos.unit_symbol || 'L'}</td>
            <td>${currency}${parseFloat(pos.unit_cost).toFixed(2)}</td>
            <td>${currency}${parseFloat(pos.stock_value).toFixed(2)}</td>
            <td><span class="status-badge status-${pos.status}">${pos.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></td>
        </tr>
    `;
    }).join('') + `
        <tr style="font-weight: bold; background-color: var(--table-header);">
            <td colspan="3">Total (${totalEntries} entries)</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${unitTotalsText}</td>
            <td>-</td>
            <td>${currency}${totalValue.toFixed(2)}</td>
            <td></td>
        </tr>
    `;
}

function updatePaginationControls() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    document.getElementById('position-pagination-info').textContent = `Showing ${startItem} - ${endItem} of ${totalItems} entries`;
    document.getElementById('position-page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('position-prev-btn').disabled = currentPage === 1;
    document.getElementById('position-next-btn').disabled = currentPage === totalPages || totalPages === 0;
}

function updateLedgerTable(ledger, currency = '$') {
    allLedgerEntries = ledger;
    itemTotalItems = allLedgerEntries.length;
    itemCurrentPage = 1;
    itemCurrency = currency;
    
    renderLedgerTable(itemCurrency);
    updateItemPaginationControls();
}

function renderLedgerTable(currency = '$') {
    const tbody = document.querySelector('#item-ledger .table tbody');
    
    // Get current page data
    const startIndex = (itemCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = allLedgerEntries.slice(startIndex, endIndex);
    
    // Calculate totals for all data
    const totalQtyIn = allLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_in || 0), 0);
    const totalQtyOut = allLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_out || 0), 0);
    const finalBalance = allLedgerEntries.length > 0 ? parseFloat(allLedgerEntries[allLedgerEntries.length - 1].balance) : 0;
    const finalValue = allLedgerEntries.length > 0 ? parseFloat(allLedgerEntries[allLedgerEntries.length - 1].value) : 0;
    
    tbody.innerHTML = pageData.map(entry => `
        <tr>
            <td>${entry.transaction_date}</td>
            <td><span class="transaction-badge transaction-${entry.transaction_type.toLowerCase().replace(' ', '-')}">${entry.transaction_type}</span></td>
            <td>${entry.qty_in > 0 ? parseFloat(entry.qty_in).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>${entry.qty_out > 0 ? parseFloat(entry.qty_out).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>${parseFloat(entry.balance).toFixed(2)} ${entry.unit_symbol || 'L'}</td>
            <td>${currency}${parseFloat(entry.unit_cost).toFixed(2)}</td>
            <td>${currency}${parseFloat(entry.value).toFixed(2)}</td>
        </tr>
    `).join('') + `
        <tr style="font-weight: bold; background-color: var(--table-header);">
            <td colspan="2">Total (${allLedgerEntries.length} transactions)</td>
            <td>${totalQtyIn.toFixed(2)} ${allLedgerEntries[0]?.unit_symbol || 'L'}</td>
            <td>${totalQtyOut.toFixed(2)} ${allLedgerEntries[0]?.unit_symbol || 'L'}</td>
            <td>${finalBalance.toFixed(2)} ${allLedgerEntries[0]?.unit_symbol || 'L'}</td>
            <td>-</td>
            <td>${currency}${finalValue.toFixed(2)}</td>
        </tr>
    `;
}

function updateItemPaginationControls() {
    const totalPages = Math.ceil(itemTotalItems / itemsPerPage);
    const startItem = itemTotalItems === 0 ? 0 : (itemCurrentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(itemCurrentPage * itemsPerPage, itemTotalItems);
    
    document.getElementById('item-pagination-info').textContent = `Showing ${startItem} - ${endItem} of ${itemTotalItems} entries`;
    document.getElementById('item-page-info').textContent = `Page ${itemCurrentPage} of ${totalPages}`;
    
    document.getElementById('item-prev-btn').disabled = itemCurrentPage === 1;
    document.getElementById('item-next-btn').disabled = itemCurrentPage === totalPages || totalPages === 0;
}

// Load Detailed Ledger
async function loadDetailedLedger() {
    try {
        const response = await fetch(`${API_BASE}?action=detailed-ledger`);
        const data = await response.json();
        
        if (data.success) {
            updateDetailedLedgerTable(data.data, data.currency);
        }
    } catch (error) {
        console.error('Error loading detailed ledger:', error);
    }
}

function updateDetailedLedgerTable(ledger, currency = '$') {
    allDetailedEntries = ledger;
    detailedTotalItems = allDetailedEntries.length;
    detailedCurrentPage = 1;
    detailedCurrency = currency;
    
    renderDetailedLedgerTable(detailedCurrency);
    updateDetailedPaginationControls();
}

function renderDetailedLedgerTable(currency = '$') {
    const tbody = document.querySelector('#detailed-ledger .table tbody');
    
    // Calculate running balance by product-branch combination for all data
    const balances = {};
    const processedLedger = allDetailedEntries.map(entry => {
        const key = `${entry.product_name}-${entry.branch_name}`;
        if (!balances[key]) balances[key] = 0;
        
        balances[key] += parseFloat(entry.qty_in || 0) - parseFloat(entry.qty_out || 0);
        entry.balance = balances[key];
        entry.value = balances[key] * parseFloat(entry.unit_cost);
        
        return entry;
    });
    
    // Get current page data
    const startIndex = (detailedCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = processedLedger.slice(startIndex, endIndex);
    
    // Calculate totals for all data
    const totalQtyIn = allDetailedEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_in || 0), 0);
    const totalQtyOut = allDetailedEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_out || 0), 0);
    const totalBalance = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
    const totalValue = Object.values(balances).reduce((sum, balance, index) => {
        const costs = Object.keys(balances).map(key => {
            const lastEntry = processedLedger.find(e => `${e.product_name}-${e.branch_name}` === key);
            return lastEntry ? parseFloat(lastEntry.unit_cost) : 0;
        });
        return sum + (balance * (costs[index] || 0));
    }, 0);
    
    tbody.innerHTML = pageData.map(entry => `
        <tr>
            <td>${entry.transaction_date}</td>
            <td>${entry.product_name}</td>
            <td>${entry.branch_name}</td>
            <td><span class="transaction-badge transaction-${entry.transaction_type.toLowerCase().replace(' ', '-')}">${entry.transaction_type}</span></td>
            <td>${entry.qty_in > 0 ? parseFloat(entry.qty_in).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>${entry.qty_out > 0 ? parseFloat(entry.qty_out).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>${parseFloat(entry.balance).toFixed(2)} ${entry.unit_symbol || 'L'}</td>
            <td>${currency}${parseFloat(entry.unit_cost).toFixed(2)}</td>
            <td>${currency}${parseFloat(entry.value).toFixed(2)}</td>
        </tr>
    `).join('') + `
        <tr style="font-weight: bold; background-color: var(--table-header);">
            <td colspan="4">Total (${allDetailedEntries.length} transactions)</td>
            <td>${totalQtyIn.toFixed(2)} ${allDetailedEntries[0]?.unit_symbol || 'L'}</td>
            <td>${totalQtyOut.toFixed(2)} ${allDetailedEntries[0]?.unit_symbol || 'L'}</td>
            <td>${totalBalance.toFixed(2)} ${allDetailedEntries[0]?.unit_symbol || 'L'}</td>
            <td>-</td>
            <td>${currency}${totalValue.toFixed(2)}</td>
        </tr>
    `;
}

function updateDetailedPaginationControls() {
    const totalPages = Math.ceil(detailedTotalItems / itemsPerPage);
    const startItem = detailedTotalItems === 0 ? 0 : (detailedCurrentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(detailedCurrentPage * itemsPerPage, detailedTotalItems);
    
    document.getElementById('detailed-pagination-info').textContent = `Showing ${startItem} - ${endItem} of ${detailedTotalItems} entries`;
    document.getElementById('detailed-page-info').textContent = `Page ${detailedCurrentPage} of ${totalPages}`;
    
    document.getElementById('detailed-prev-btn').disabled = detailedCurrentPage === 1;
    document.getElementById('detailed-next-btn').disabled = detailedCurrentPage === totalPages || totalPages === 0;
}

function updateBranchLedgerTable(ledger, currency = '$') {
    allBranchEntries = ledger;
    branchTotalItems = allBranchEntries.length;
    branchCurrentPage = 1;
    branchCurrency = currency;
    
    renderBranchLedgerTable(branchCurrency);
    updateBranchPaginationControls();
}

function renderBranchLedgerTable(currency = '$') {
    const tbody = document.querySelector('#branch-ledger .table tbody');
    
    // Get current page data
    const startIndex = (branchCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = allBranchEntries.slice(startIndex, endIndex);
    
    // Calculate totals for all data
    const totalQtyIn = allBranchEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_in || 0), 0);
    const totalQtyOut = allBranchEntries.reduce((sum, entry) => sum + parseFloat(entry.qty_out || 0), 0);
    const totalBalance = totalQtyIn - totalQtyOut;
    const totalValue = allBranchEntries.reduce((sum, entry) => sum + (parseFloat(entry.qty_in || 0) - parseFloat(entry.qty_out || 0)) * parseFloat(entry.unit_cost), 0);
    
    tbody.innerHTML = pageData.map(entry => `
        <tr>
            <td>${entry.transaction_date}</td>
            <td>${entry.product_name}</td>
            <td><span class="transaction-badge transaction-${entry.transaction_type.toLowerCase().replace(' ', '-')}">${entry.transaction_type}</span></td>
            <td>${entry.qty_in > 0 ? parseFloat(entry.qty_in).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>${entry.qty_out > 0 ? parseFloat(entry.qty_out).toFixed(2) + ' ' + (entry.unit_symbol || 'L') : '-'}</td>
            <td>-</td>
            <td>${currency}${parseFloat(entry.unit_cost).toFixed(2)}</td>
            <td>${currency}${((parseFloat(entry.qty_in || 0) - parseFloat(entry.qty_out || 0)) * parseFloat(entry.unit_cost)).toFixed(2)}</td>
        </tr>
    `).join('') + `
        <tr style="font-weight: bold; background-color: var(--table-header);">
            <td colspan="3">Total (${allBranchEntries.length} transactions)</td>
            <td>${totalQtyIn.toFixed(2)} ${allBranchEntries[0]?.unit_symbol || 'L'}</td>
            <td>${totalQtyOut.toFixed(2)} ${allBranchEntries[0]?.unit_symbol || 'L'}</td>
            <td>${totalBalance.toFixed(2)} ${allBranchEntries[0]?.unit_symbol || 'L'}</td>
            <td>-</td>
            <td>${currency}${totalValue.toFixed(2)}</td>
        </tr>
    `;
}

function updateBranchPaginationControls() {
    const totalPages = Math.ceil(branchTotalItems / itemsPerPage);
    const startItem = branchTotalItems === 0 ? 0 : (branchCurrentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(branchCurrentPage * itemsPerPage, branchTotalItems);
    
    document.getElementById('branch-pagination-info').textContent = `Showing ${startItem} - ${endItem} of ${branchTotalItems} entries`;
    document.getElementById('branch-page-info').textContent = `Page ${branchCurrentPage} of ${totalPages}`;
    
    document.getElementById('branch-prev-btn').disabled = branchCurrentPage === 1;
    document.getElementById('branch-next-btn').disabled = branchCurrentPage === totalPages || totalPages === 0;
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const company = document.getElementById('company').value;
        let url = `${API_BASE}?action=stats`;
        if (company) url += `&company_id=${company}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.data, data.currency || '$');
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(stats, currency = '$') {
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = `${currency}${parseFloat(stats.total_value || 0).toFixed(2)}`;
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = `${stats.in_stock || 0} Products`;
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = `${stats.low_stock || 0} Products`;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = `${stats.out_of_stock || 0} Products`;
    document.querySelector('.stat-card:nth-child(5) .stat-value').textContent = `${stats.overstock || 0} Products`;
}

// Load Branches
async function loadBranches() {
    try {
        const response = await fetch(`${API_BASE}?action=branches`);
        const data = await response.json();
        
        if (data.success) {
            populateBranchDropdowns(data.data);
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

function populateBranchDropdowns(branches) {
    const branchLists = ['#branch-list', '#branch-ledger-list'];
    branchLists.forEach(selector => {
        const datalist = document.querySelector(selector);
        if (datalist) {
            datalist.innerHTML = branches.map(branch => `<option value="${branch.display_name}" data-id="${branch.id}">`).join('');
        }
    });
}

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}?action=products`);
        const data = await response.json();
        
        if (data.success) {
            populateProductDropdowns(data.data);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function populateProductDropdowns(products) {
    const productLists = ['#product-list', '#item-list'];
    productLists.forEach(selector => {
        const datalist = document.querySelector(selector);
        if (datalist) {
            datalist.innerHTML = products.map(product => `<option value="${product.name}" data-id="${product.id}">`).join('');
        }
    });
}

// Load Inventory Types
async function loadInventoryTypes() {
    try {
        const response = await fetch(`${API_BASE}?action=inventory-types`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('inventory-type');
            data.data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading inventory types:', error);
    }
}

// Load Distributions
async function loadDistributions() {
    try {
        const response = await fetch(`${API_BASE}?action=distributions`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('distribution');
            data.data.forEach(dist => {
                const option = document.createElement('option');
                option.value = dist.id;
                option.textContent = dist.supplier_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading distributions:', error);
    }
}

// Load Companies
async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}?action=companies`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('company');
            data.data.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.company_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    // Apply Position Filters
    document.getElementById('applyPositionFilters').addEventListener('click', () => {
        loadStockPosition();
    });

    // Clear Position Filters
    document.getElementById('clearPositionFilters').addEventListener('click', () => {
        document.getElementById('branch').value = '';
        document.getElementById('product').value = '';
        document.getElementById('company').value = '';
        document.getElementById('inventory-type').value = '';
        document.getElementById('distribution').value = '';
        document.getElementById('stock-status').value = '';
        document.getElementById('status').value = '';
        document.getElementById('from-date').value = '';
        document.getElementById('to-date').value = '';
        document.getElementById('valuation-method').value = 'AVCO';
        loadStockPosition();
        loadDashboardStats();
    });

    // Clear Item Filters
    document.getElementById('clearItemFilters').addEventListener('click', () => {
        document.getElementById('item').value = '';
        document.getElementById('from-date').value = '';
        document.getElementById('to-date').value = '';
        const tbody = document.querySelector('#item-ledger .table tbody');
        tbody.innerHTML = '';
        document.getElementById('item-pagination-info').textContent = 'Showing 0 - 0 of 0 entries';
        document.getElementById('item-page-info').textContent = 'Page 1 of 1';
    });

    // Apply Item Filters
    document.getElementById('applyFilters').addEventListener('click', async () => {
        const itemName = document.getElementById('item').value;
        const fromDate = document.getElementById('from-date').value;
        const toDate = document.getElementById('to-date').value;
        
        if (!itemName) {
            alert('Please select an item');
            return;
        }
        
        // Find product ID from datalist
        const options = document.querySelectorAll('#item-list option');
        let productId = null;
        for (let option of options) {
            if (option.value === itemName) {
                productId = option.getAttribute('data-id');
                break;
            }
        }
        
        if (!productId) {
            alert('Invalid product selected');
            return;
        }
        
        try {
            let url = `${API_BASE}?action=ledger&product_id=${productId}`;
            if (fromDate) url += `&from_date=${fromDate}`;
            if (toDate) url += `&to_date=${toDate}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                updateLedgerTable(data.data, data.currency);
            }
        } catch (error) {
            console.error('Error loading ledger:', error);
        }
    });

    // Clear Branch Filters
    document.getElementById('clearBranchFilters').addEventListener('click', () => {
        document.querySelector('input[list="branch-ledger-list"]').value = '';
        document.getElementById('from-date-branch').value = '';
        document.getElementById('to-date-branch').value = '';
        const tbody = document.querySelector('#branch-ledger .table tbody');
        tbody.innerHTML = '';
        document.getElementById('branch-pagination-info').textContent = 'Showing 0 - 0 of 0 entries';
        document.getElementById('branch-page-info').textContent = 'Page 1 of 1';
    });

    // Apply Branch Filters
    document.getElementById('applyBranchFilters').addEventListener('click', async () => {
        const branchName = document.querySelector('input[list="branch-ledger-list"]').value;
        const fromDate = document.getElementById('from-date-branch').value;
        const toDate = document.getElementById('to-date-branch').value;
        
        console.log('Branch name:', branchName);
        
        if (!branchName || branchName.trim() === '') {
            alert('Please select a branch');
            return;
        }
        
        // Find branch ID from datalist
        const options = document.querySelectorAll('#branch-ledger-list option');
        let branchId = null;
        for (let option of options) {
            if (option.value === branchName) {
                branchId = option.getAttribute('data-id');
                break;
            }
        }
        
        if (!branchId) {
            alert('Invalid branch selected');
            return;
        }
        
        try {
            let url = `${API_BASE}?action=branch-ledger&branch_id=${branchId}`;
            if (fromDate) url += `&from_date=${fromDate}`;
            if (toDate) url += `&to_date=${toDate}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                updateBranchLedgerTable(data.data, data.currency);
            }
        } catch (error) {
            console.error('Error loading branch ledger:', error);
        }
    });

    // Stock Position pagination event listeners
    document.getElementById('position-prev-btn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePositionTable(currentCurrency);
            updatePaginationControls();
        }
    });
    
    document.getElementById('position-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePositionTable(currentCurrency);
            updatePaginationControls();
        }
    });

    // Item-wise Ledger pagination event listeners
    document.getElementById('item-prev-btn').addEventListener('click', () => {
        if (itemCurrentPage > 1) {
            itemCurrentPage--;
            renderLedgerTable(itemCurrency);
            updateItemPaginationControls();
        }
    });
    
    document.getElementById('item-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(itemTotalItems / itemsPerPage);
        if (itemCurrentPage < totalPages) {
            itemCurrentPage++;
            renderLedgerTable(itemCurrency);
            updateItemPaginationControls();
        }
    });

    // Branch-wise Ledger pagination event listeners
    document.getElementById('branch-prev-btn').addEventListener('click', () => {
        if (branchCurrentPage > 1) {
            branchCurrentPage--;
            renderBranchLedgerTable(branchCurrency);
            updateBranchPaginationControls();
        }
    });
    
    document.getElementById('branch-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(branchTotalItems / itemsPerPage);
        if (branchCurrentPage < totalPages) {
            branchCurrentPage++;
            renderBranchLedgerTable(branchCurrency);
            updateBranchPaginationControls();
        }
    });

    // Detailed Ledger pagination event listeners
    document.getElementById('detailed-prev-btn').addEventListener('click', () => {
        if (detailedCurrentPage > 1) {
            detailedCurrentPage--;
            renderDetailedLedgerTable(detailedCurrency);
            updateDetailedPaginationControls();
        }
    });
    
    document.getElementById('detailed-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(detailedTotalItems / itemsPerPage);
        if (detailedCurrentPage < totalPages) {
            detailedCurrentPage++;
            renderDetailedLedgerTable(detailedCurrency);
            updateDetailedPaginationControls();
        }
    });

    // Load initial data
    loadDashboardStats();
    loadBranches();
    loadProducts();
    loadInventoryTypes();
    loadDistributions();
    loadCompanies();
    loadStockPosition();
    
    // Expand/Collapse functionality
    document.getElementById('expandAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.child-row').forEach(row => row.style.display = '');
    });
    
    document.getElementById('collapseAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.child-row').forEach(row => row.style.display = 'none');
    });
});