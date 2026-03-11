// Initialize variables
let pdcsData = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredData = [];
let companies = [];

// DOM Elements
const tableBody = document.getElementById('pdcs-table-body');
const totalPdcsEl = document.getElementById('total-pdcs');
const pendingPdcsEl = document.getElementById('pending-pdcs');
const totalAmountEl = document.getElementById('total-amount');
const avgAmountEl = document.getElementById('avg-amount');
const paginationInfoEl = document.getElementById('pagination-info');
const applyFiltersBtn = document.getElementById('apply-filters');
const resetFiltersBtn = document.getElementById('reset-filters');
const addPdcBtn = document.getElementById('add-pdc');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');

// Initialize the application
async function initApp() {
    await loadBanks();
    await loadCompanies();
    await fetchPDCs();
    setupEventListeners();
}

// Load banks for filter dropdown
async function loadBanks() {
    try {
        const response = await fetch('../../../../server/api/banking/post_dated_cheques/get_banks.php');
        const result = await response.json();
        
        if (result.success) {
            const bankFilter = document.getElementById('bank-filter');
            result.data.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank;
                option.textContent = bank;
                bankFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading banks:', error);
    }
}

// Load companies for filter dropdown
async function loadCompanies() {
    try {
        const response = await fetch('../../../../server/api/banking/post_dated_cheques/get_companies.php');
        const result = await response.json();
        
        if (result.success) {
            companies = result.data;
            const companyFilter = document.getElementById('company-filter');
            result.data.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.company_name;
                companyFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// Fetch PDCs from API
async function fetchPDCs() {
    try {
        const params = new URLSearchParams();
        
        const chequeNo = document.getElementById('cheque-no-filter').value;
        const account = document.getElementById('account-filter').value;
        const bank = document.getElementById('bank-filter').value;
        const status = document.getElementById('status-filter').value;
        const type = document.getElementById('type-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const minAmount = document.getElementById('min-amount').value;
        const maxAmount = document.getElementById('max-amount').value;
        const companyId = document.getElementById('company-filter').value;
        
        if (chequeNo) params.append('cheque_no', chequeNo);
        if (account) params.append('account', account);
        if (bank) params.append('bank', bank);
        if (status) params.append('status', status);
        if (type) params.append('type', type);
        if (dateFilter) params.append('date_filter', dateFilter);
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (companyId) params.append('company_id', companyId);
        
        const response = await fetch(`../../../../server/api/banking/post_dated_cheques/post_dated_cheques.php?${params}`);
        const result = await response.json();
        
        if (result.success) {
            pdcsData = result.data;
            filteredData = [...pdcsData];
            currentPage = 1;
            renderTable();
            updateStats();
            initializeChart();
        } else {
            showNotification(result.message || 'Failed to fetch PDCs', 'error');
        }
    } catch (error) {
        console.error('Error fetching PDCs:', error);
        showNotification('Error loading data', 'error');
    }
}

// Render table with current data
function renderTable() {
    tableBody.innerHTML = '';

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px;">
                            No PDCs found matching your filters.
                        </td>
                    </tr>
                `;
        return;
    }

    // Create table rows
    pageData.forEach(pdc => {
        const row = document.createElement('tr');

        // Format date
        const formattedDate = new Date(pdc.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Format amount
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(pdc.amount).replace('$', CURRENCY_SYMBOL);

        // Determine status class
        let statusClass = '';
        switch (pdc.status) {
            case 'Pending': statusClass = 'status-pending'; break;
            case 'Approved': statusClass = 'status-approved'; break;
            case 'Rejected': statusClass = 'status-rejected'; break;
            case 'Cancelled': statusClass = 'status-cancelled'; break;
        }

        // Create row HTML
        row.innerHTML = `
                    <td>${pdc.chequeNo}</td>
                    <td>${pdc.account}</td>
                    <td>${pdc.bankName}</td>
                    <td>${pdc.type}</td>
                    <td><strong>${formattedAmount}</strong></td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${pdc.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            ${pdc.status === 'Pending' ? `
                                <button class="action-btn action-approve" onclick="updateStatus(${pdc.id}, 'Approved')" title="Approve">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="action-btn action-reject" onclick="updateStatus(${pdc.id}, 'Rejected')" title="Reject">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            <button class="action-btn action-cancel" onclick="updateStatus(${pdc.id}, 'Cancelled')" title="Cancel">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                `;

        tableBody.appendChild(row);
    });

    // Update pagination info
    updatePaginationInfo();
}

// Update pagination information
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, filteredData.length);
    paginationInfoEl.textContent = `Showing ${startIndex}-${endIndex} of ${filteredData.length} PDCs`;

    // Update pagination button states
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = endIndex >= filteredData.length;
    
    // Generate page number buttons
    const paginationControls = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    // Clear existing page buttons (keep prev/next)
    const pageButtons = paginationControls.querySelectorAll('.pagination-btn:not(#prev-page):not(#next-page)');
    pageButtons.forEach(btn => btn.remove());
    
    // Insert page number buttons before next button
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
        });
        paginationControls.insertBefore(pageBtn, nextPageBtn);
    }
}

// Update stats cards
function updateStats() {
    // Calculate stats
    const totalPdcs = filteredData.length;
    const pendingPdcs = filteredData.filter(pdc => pdc.status === 'Pending').length;
    const totalAmount = filteredData.reduce((sum, pdc) => sum + pdc.amount, 0);
    const avgAmount = totalPdcs > 0 ? totalAmount / totalPdcs : 0;

    // Update DOM
    totalPdcsEl.textContent = totalPdcs;
    pendingPdcsEl.textContent = pendingPdcs;
    totalAmountEl.textContent = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(totalAmount).replace('$', CURRENCY_SYMBOL);
    avgAmountEl.textContent = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(avgAmount).replace('$', CURRENCY_SYMBOL);
}

// Apply filters
async function applyFilters() {
    await fetchPDCs();
}

// Reset filters
async function resetFilters() {
    document.getElementById('cheque-no-filter').value = '';
    document.getElementById('account-filter').value = '';
    document.getElementById('bank-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('type-filter').value = '';
    document.getElementById('date-filter').value = '';
    document.getElementById('min-amount').value = '';
    document.getElementById('max-amount').value = '';
    document.getElementById('company-filter').value = '';

    await fetchPDCs();
}

// Update PDC status
let pendingStatusUpdate = null;

async function updateStatus(id, newStatus) {
    pendingStatusUpdate = { id, newStatus };
    const modal = document.getElementById('confirmation-modal');
    const message = document.getElementById('modal-message');
    message.textContent = `Are you sure you want to change the status to "${newStatus}"?`;
    modal.classList.add('active');
}

async function confirmStatusUpdate() {
    if (!pendingStatusUpdate) return;
    
    const { id, newStatus } = pendingStatusUpdate;
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('active');
    
    try {
        const response = await fetch('../../../../server/api/banking/post_dated_cheques/update_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`PDC status updated to ${newStatus}`);
            await fetchPDCs();
        } else {
            showNotification(result.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
    
    pendingStatusUpdate = null;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const color = type === 'success' ? '#2FBF71' : '#E34F4F';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-left: 4px solid ${color};
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
        <i class="fas ${icon}" style="color: ${color};"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);

    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('pdcs-chart').getContext('2d');

    // Calculate data for chart
    const statusCounts = {
        'Pending': filteredData.filter(pdc => pdc.status === 'Pending').length,
        'Approved': filteredData.filter(pdc => pdc.status === 'Approved').length,
        'Rejected': filteredData.filter(pdc => pdc.status === 'Rejected').length,
        'Cancelled': filteredData.filter(pdc => pdc.status === 'Cancelled').length
    };

    const typeCounts = {
        'Received': filteredData.filter(pdc => pdc.type === 'Received').length,
        'Paid': filteredData.filter(pdc => pdc.type === 'Paid').length,
        'Expense': filteredData.filter(pdc => pdc.type === 'Expense').length
    };

    // Destroy existing chart if it exists
    if (window.pdcsChart) {
        window.pdcsChart.destroy();
    }

    // Create new chart
    window.pdcsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
            datasets: [{
                label: 'PDCs by Status',
                data: [
                    statusCounts.Pending,
                    statusCounts.Approved,
                    statusCounts.Rejected,
                    statusCounts.Cancelled
                ],
                backgroundColor: [
                    'rgba(232, 178, 63, 0.7)',
                    'rgba(47, 191, 113, 0.7)',
                    'rgba(227, 79, 79, 0.7)',
                    'rgba(107, 114, 128, 0.7)'
                ],
                borderColor: [
                    '#E8B23F',
                    '#2FBF71',
                    '#E34F4F',
                    '#6B7280'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#EFF2F7'
                    },
                    ticks: {
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7280'
                    }
                }
            }
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);

    addPdcBtn.addEventListener('click', () => {
        showNotification('Add PDC feature would open a form in a real application');
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderTable();
        }
    });

    document.getElementById('cheque-no-filter').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    document.getElementById('account-filter').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Modal event listeners
    document.getElementById('modal-confirm').addEventListener('click', confirmStatusUpdate);
    document.getElementById('modal-cancel').addEventListener('click', () => {
        document.getElementById('confirmation-modal').classList.remove('active');
        pendingStatusUpdate = null;
    });
    
    document.getElementById('confirmation-modal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmation-modal') {
            document.getElementById('confirmation-modal').classList.remove('active');
            pendingStatusUpdate = null;
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);