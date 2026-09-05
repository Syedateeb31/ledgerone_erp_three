const API = '../../../../server/api/sale/vehicle_registration.php';

let allRecords = [];
let allCustomers = [];
let allInvoices = [];
let allBankAccounts = [];
let editingId = null;
let currentViewId = null;

document.addEventListener('DOMContentLoaded', () => {
    setToday();
    loadNextAppNo();
    loadCustomers();
    loadBankAccounts();
    loadVehicleRegistrationList();
    bindEvents();
    initCustomerDropdown();
    initInvoiceDropdown();
    initFieldSettings();
});

function setToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('applicationDate').value = today;
}

async function loadNextAppNo() {
    try {
        const res = await fetch(`${API}?action=next_no`);
        const data = await res.json();
        if (data.success) document.getElementById('applicationNo').value = data.application_no;
    } catch {
        document.getElementById('applicationNo').value = 'VR-0001';
    }
}

async function loadCustomers() {
    try {
        const res = await fetch(`${API}?action=customers`);
        const data = await res.json();
        if (data.success) allCustomers = data.customers;
    } catch (e) {
        console.error('Error loading customers:', e);
    }
}

async function loadBankAccounts() {
    try {
        const res = await fetch(`${API}?action=bank_accounts`);
        const data = await res.json();
        if (data.success) allBankAccounts = data.accounts;
    } catch (e) {
        console.error('Error loading bank accounts:', e);
    }
}

function bindEvents() {
    const form = document.getElementById('vregForm');
    const resetBtn = document.getElementById('resetBtn');
    const showHideBtn = document.getElementById('showHideFieldsBtn');
    const closeShowHide = document.getElementById('closeShowHideModal');
    const closeShowHideBtn = document.getElementById('closeShowHideModalBtn');
    const paymentMethod = document.getElementById('paymentMethod');
    const regFee = document.getElementById('registrationFee');
    const plateFee = document.getElementById('numberPlateFee');
    const smartFee = document.getElementById('smartCardFee');
    const serviceFee = document.getElementById('serviceCharges');
    const amountPaid = document.getElementById('amountPaid');
    const refreshBtn = document.getElementById('refreshListBtn');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    if (showHideBtn) showHideBtn.addEventListener('click', () => {
        const modal = document.getElementById('showHideModal');
        if (modal) modal.classList.add('show');
    });
    if (closeShowHide) closeShowHide.addEventListener('click', () => {
        const modal = document.getElementById('showHideModal');
        if (modal) modal.classList.remove('show');
    });
    if (closeShowHideBtn) closeShowHideBtn.addEventListener('click', () => {
        const modal = document.getElementById('showHideModal');
        if (modal) modal.classList.remove('show');
    });
    if (paymentMethod) paymentMethod.addEventListener('change', (e) => {
        const container = document.getElementById('bankAccountContainer');
        if (e.target.value === 'bank_transfer') {
            if (container) container.style.display = 'block';
            populateBankAccounts();
        } else {
            if (container) container.style.display = 'none';
        }
    });
    if (regFee) regFee.addEventListener('input', calculateBalance);
    if (plateFee) plateFee.addEventListener('input', calculateBalance);
    if (smartFee) smartFee.addEventListener('input', calculateBalance);
    if (serviceFee) serviceFee.addEventListener('input', calculateBalance);
    if (amountPaid) amountPaid.addEventListener('input', calculateBalance);
    if (refreshBtn) refreshBtn.addEventListener('click', loadVehicleRegistrationList);
    if (searchInput) searchInput.addEventListener('input', filterVehicleList);
    if (filterStatus) filterStatus.addEventListener('change', filterVehicleList);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('show');
        });
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}

function initCustomerDropdown() {
    const searchEl = document.getElementById('customerSearch');
    const dropdownEl = document.getElementById('customerDropdown');
    if (!searchEl) return;

    function renderCustomerOptions(list) {
        if (!list.length) {
            dropdownEl.innerHTML = '<div class="dd-item dd-empty">No customers found</div>';
        } else {
            dropdownEl.innerHTML = list.map(c => `
                <div class="dd-item"
                     data-id="${c.id}"
                     data-name="${escHtml(c.customer_name)}"
                     data-phone="${escHtml(c.phone || '')}"
                     data-email="${escHtml(c.email || '')}"
                     data-address="${escHtml(c.address || '')}"
                     data-cnic="${escHtml(c.cnic || '')}">
                    <strong>${escHtml(c.customer_name)}</strong>
                    ${c.phone ? `<span class="dd-sub">${escHtml(c.phone)}</span>` : ''}
                </div>`).join('');
            dropdownEl.querySelectorAll('.dd-item[data-id]').forEach(item => {
                item.addEventListener('mousedown', e => {
                    e.preventDefault();
                    selectCustomer(item);
                });
            });
        }
        dropdownEl.style.display = 'block';
    }

    searchEl.addEventListener('focus', () => {
        renderCustomerOptions(allCustomers);
    });
    searchEl.addEventListener('input', () => {
        const q = searchEl.value.toLowerCase();
        const filtered = allCustomers.filter(c =>
            c.customer_name.toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.cnic || '').includes(q)
        );
        renderCustomerOptions(filtered);
    });
    searchEl.addEventListener('blur', () => {
        setTimeout(() => { dropdownEl.style.display = 'none'; }, 150);
    });
}

function selectCustomer(item) {
    document.getElementById('customerSearch').value = item.dataset.name;
    document.getElementById('customerId').value = item.dataset.id;
    document.getElementById('phoneNumber').value = item.dataset.phone;
    document.getElementById('email').value = item.dataset.email;
    document.getElementById('address').value = item.dataset.address;
    document.getElementById('cnicNo').value = item.dataset.cnic;
    document.getElementById('customerDropdown').style.display = 'none';
    document.getElementById('invoiceSearch').value = '';
    document.getElementById('invoiceId').value = '';
}

function initInvoiceDropdown() {
    const searchEl = document.getElementById('invoiceSearch');
    const dropdownEl = document.getElementById('invoiceDropdown');
    if (!searchEl) return;

    let searchTimeout;
    searchEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fetchInvoices(searchEl.value.trim()), 300);
    });
    searchEl.addEventListener('focus', () => {
        fetchInvoices(searchEl.value.trim());
    });
    searchEl.addEventListener('blur', () => {
        setTimeout(() => { dropdownEl.style.display = 'none'; }, 200);
    });

    async function fetchInvoices(q) {
        const customerId = document.getElementById('customerId').value;
        const searchParam = q.length > 0 ? encodeURIComponent(q) : '%';
        let url = `${API}?action=invoices&q=${searchParam}`;
        if (customerId) url += `&customer_id=${customerId}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!data.success) { dropdownEl.style.display = 'none'; return; }

            if (!data.invoices.length) {
                dropdownEl.innerHTML = '<div class="dd-item dd-empty">No invoices found</div>';
            } else {
                dropdownEl.innerHTML = data.invoices.map(inv => `
                    <div class="dd-item"
                         data-id="${inv.id}"
                         data-bill="${escHtml(inv.bill_no)}"
                         data-date="${inv.sale_date}"
                         data-customer="${escHtml(inv.customer_name || '')}"
                         data-phone="${escHtml(inv.phone || '')}"
                         data-email="${escHtml(inv.email || '')}"
                         data-address="${escHtml(inv.address || '')}"
                         data-cnic="${escHtml(inv.cnic || '')}">
                        <strong>${escHtml(inv.bill_no)}</strong>
                        <span class="dd-sub">${escHtml(inv.customer_name || '')} — ${inv.sale_date}</span>
                    </div>`).join('');
                dropdownEl.querySelectorAll('.dd-item[data-id]').forEach(item => {
                    item.addEventListener('mousedown', e => {
                        e.preventDefault();
                        selectInvoice(item);
                    });
                });
            }
            dropdownEl.style.display = 'block';
        } catch (e) {
            console.error('Error fetching invoices:', e);
        }
    }
}

async function selectInvoice(item) {
    document.getElementById('invoiceSearch').value = item.dataset.bill;
    document.getElementById('invoiceId').value = item.dataset.id;
    document.getElementById('saleDate').value = item.dataset.date;
    document.getElementById('invoiceDropdown').style.display = 'none';

    if (!document.getElementById('customerId').value) {
        document.getElementById('customerSearch').value = item.dataset.customer;
        document.getElementById('customerId').value = '';
        document.getElementById('phoneNumber').value = item.dataset.phone;
        document.getElementById('email').value = item.dataset.email;
        document.getElementById('address').value = item.dataset.address;
        document.getElementById('cnicNo').value = item.dataset.cnic;
    }

    try {
        const res = await fetch(`${API}?action=invoice_items&invoice_id=${item.dataset.id}`);
        const data = await res.json();
        if (data.success && data.items.length) {
            const invoiceItem = data.items[0];
            document.getElementById('productName').value = invoiceItem.product_name || '';
            document.getElementById('chassisNo').value = invoiceItem.chassis_no || '';
            document.getElementById('motorNo').value = invoiceItem.motor_no || '';
            document.getElementById('colour').value = invoiceItem.colour || '';
        }
    } catch (e) {
        console.error('Error fetching invoice items:', e);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerSearch').value.trim();
    const regType = document.getElementById('registrationType').value;
    const regCity = document.getElementById('registrationCity').value;
    const productName = document.getElementById('productName').value.trim();
    const regStatus = document.getElementById('regStatus').value;

    if (!customerName || !regType || !regCity || !productName || !regStatus) {
        alert('Please fill all required fields');
        return;
    }

    const formData = collectFormData();

    try {
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${API}?id=${editingId}` : API;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.success) {
            alert(data.message);
            resetForm();
            loadVehicleRegistrationList();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function collectFormData() {
    const regFee = parseFloat(document.getElementById('registrationFee').value || 0);
    const plateFee = parseFloat(document.getElementById('numberPlateFee').value || 0);
    const smartCardFee = parseFloat(document.getElementById('smartCardFee').value || 0);
    const serviceCharges = parseFloat(document.getElementById('serviceCharges').value || 0);
    const total = regFee + plateFee + smartCardFee + serviceCharges;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value || 0);

    return {
        application_no: document.getElementById('applicationNo').value,
        application_date: document.getElementById('applicationDate').value,
        registration_no: document.getElementById('registrationNo').value || null,
        registration_type: document.getElementById('registrationType').value,
        registration_city: document.getElementById('registrationCity').value,
        reg_status: document.getElementById('regStatus').value,
        customer_id: document.getElementById('customerId').value || null,
        customer_name: document.getElementById('customerSearch').value.trim(),
        phone_number: document.getElementById('phoneNumber').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        cnic_no: document.getElementById('cnicNo').value,
        invoice_id: document.getElementById('invoiceId').value || null,
        invoice_number: document.getElementById('invoiceSearch').value || null,
        sale_date: document.getElementById('saleDate').value,
        product_name: document.getElementById('productName').value.trim(),
        chassis_no: document.getElementById('chassisNo').value,
        motor_no: document.getElementById('motorNo').value,
        colour: document.getElementById('colour').value,
        model_year: document.getElementById('modelYear').value,
        registration_fee: regFee,
        number_plate_fee: plateFee,
        smart_card_fee: smartCardFee,
        service_charges: serviceCharges,
        total_amount: total,
        payment_method: document.getElementById('paymentMethod').value,
        bank_account_id: document.getElementById('bankAccount').value || null,
        amount_paid: amountPaid,
        remaining_balance: total - amountPaid,
        expected_delivery_date: document.getElementById('expectedDeliveryDate').value,
        submitted_date: document.getElementById('submittedDate').value,
        completed_date: document.getElementById('completedDate').value,
        remarks: document.getElementById('remarks').value,
        delivery_date: document.getElementById('deliveryDate').value,
        delivered_to: document.getElementById('deliveredTo').value,
        delivered_by: document.getElementById('deliveredBy').value,
        delivery_notes: document.getElementById('deliveryNotes').value,
        notes: document.getElementById('notes').value
    };
}

function resetForm() {
    const form = document.getElementById('vregForm');
    const formCard = document.getElementById('formCard');
    const listCard = document.getElementById('listCard');
    
    if (form) form.reset();
    editingId = null;
    setToday();
    loadNextAppNo();
    if (formCard) formCard.style.display = 'block';
    if (listCard) listCard.style.display = 'block';
}

async function loadVehicleRegistrationList() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        if (data.success) {
            allRecords = data.records || [];
            renderVehicleList(allRecords);
        }
    } catch (e) {
        console.error('Error loading list:', e);
    }
}

function renderVehicleList(records) {
    const tbody = document.getElementById('vregTableBody');
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-row">No vehicle registrations found</td></tr>';
        return;
    }

    const statusBadges = {
        'PENDING': 'badge-pending',
        'SUBMITTED': 'badge-submitted',
        'IN_PROCESS': 'badge-inprocess',
        'COMPLETED': 'badge-completed',
        'DELIVERED': 'badge-delivered',
        'CANCELLED': 'badge-cancelled'
    };

    tbody.innerHTML = records.map(rec => `
        <tr>
            <td><strong>${escHtml(rec.application_no)}</strong></td>
            <td>${rec.application_date}</td>
            <td>${escHtml(rec.customer_name)}</td>
            <td>${escHtml(rec.product_name)}</td>
            <td>${escHtml(rec.chassis_no || '-')}</td>
            <td>${escHtml(rec.motor_no || '-')}</td>
            <td>${escHtml(rec.registration_type)}</td>
            <td><strong>${formatCurrency(rec.total_amount)}</strong></td>
            <td><span style="color:#10b981;font-weight:600;">${formatCurrency(rec.amount_paid)}</span></td>
            <td><span style="color:#ef4444;font-weight:600;">${formatCurrency(rec.remaining_balance)}</span></td>
            <td><span class="badge ${statusBadges[rec.reg_status] || ''}">${rec.reg_status}</span></td>
            <td>
                <button class="btn-action" onclick="viewRecord(${rec.id})" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn-action" onclick="editRecord(${rec.id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-danger" onclick="deleteRecord(${rec.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function filterVehicleList() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const filtered = allRecords.filter(rec => {
        const matchSearch = !search || 
            rec.application_no.toLowerCase().includes(search) ||
            (rec.registration_no || '').toLowerCase().includes(search) ||
            rec.customer_name.toLowerCase().includes(search);
        
        const matchStatus = !statusFilter || rec.reg_status === statusFilter;
        
        return matchSearch && matchStatus;
    });

    renderVehicleList(filtered);
}

async function viewRecord(id) {
    try {
        const res = await fetch(`${API}?id=${id}`);
        const data = await res.json();
        if (data.success && data.record) {
            displayViewModal(data.record);
        }
    } catch (e) {
        alert('Error loading record');
    }
}

async function editRecord(id) {
    try {
        const res = await fetch(`${API}?id=${id}`);
        const data = await res.json();
        if (data.success && data.record) {
            populateFormFromRecord(data.record);
            editingId = id;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        alert('Error loading record');
    }
}

async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
        const res = await fetch(`${API}?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert('Record deleted successfully');
            loadVehicleRegistrationList();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function populateFormFromRecord(rec) {
    document.getElementById('applicationNo').value = rec.application_no || '';
    document.getElementById('applicationDate').value = rec.application_date || '';
    document.getElementById('registrationNo').value = rec.registration_no || '';
    document.getElementById('registrationType').value = rec.registration_type || '';
    document.getElementById('registrationCity').value = rec.registration_city || '';
    document.getElementById('regStatus').value = rec.reg_status || '';
    document.getElementById('customerId').value = rec.customer_id || '';
    document.getElementById('customerSearch').value = rec.customer_name || '';
    document.getElementById('phoneNumber').value = rec.phone_number || '';
    document.getElementById('email').value = rec.email || '';
    document.getElementById('address').value = rec.address || '';
    document.getElementById('cnicNo').value = rec.cnic_no || '';
    document.getElementById('invoiceId').value = rec.invoice_id || '';
    document.getElementById('invoiceSearch').value = rec.invoice_number || '';
    document.getElementById('saleDate').value = rec.sale_date || '';
    document.getElementById('productName').value = rec.product_name || '';
    document.getElementById('chassisNo').value = rec.chassis_no || '';
    document.getElementById('motorNo').value = rec.motor_no || '';
    document.getElementById('colour').value = rec.colour || '';
    document.getElementById('modelYear').value = rec.model_year || '';
    document.getElementById('registrationFee').value = rec.registration_fee || '0';
    document.getElementById('numberPlateFee').value = rec.number_plate_fee || '0';
    document.getElementById('smartCardFee').value = rec.smart_card_fee || '0';
    document.getElementById('serviceCharges').value = rec.service_charges || '0';
    document.getElementById('paymentMethod').value = rec.payment_method || '';
    document.getElementById('bankAccount').value = rec.bank_account_id || '';
    document.getElementById('amountPaid').value = rec.amount_paid || '0';
    document.getElementById('expectedDeliveryDate').value = rec.expected_delivery_date || '';
    document.getElementById('submittedDate').value = rec.submitted_date || '';
    document.getElementById('completedDate').value = rec.completed_date || '';
    document.getElementById('remarks').value = rec.remarks || '';
    document.getElementById('deliveryDate').value = rec.delivery_date || '';
    document.getElementById('deliveredTo').value = rec.delivered_to || '';
    document.getElementById('deliveredBy').value = rec.delivered_by || '';
    document.getElementById('deliveryNotes').value = rec.delivery_notes || '';
    document.getElementById('notes').value = rec.notes || '';
    
    calculateBalance();
    
    if (rec.payment_method === 'bank_transfer') {
        document.getElementById('bankAccountContainer').style.display = 'block';
        populateBankAccounts();
    }
}

function displayViewModal(rec) {
    const modal = document.getElementById('viewModal');
    const title = document.getElementById('viewModalTitle');
    const body = document.getElementById('viewModalBody');

    title.textContent = `Vehicle Registration - ${rec.application_no}`;

    const statusBadges = {
        'PENDING': 'badge-pending',
        'SUBMITTED': 'badge-submitted',
        'IN_PROCESS': 'badge-inprocess',
        'COMPLETED': 'badge-completed',
        'DELIVERED': 'badge-delivered',
        'CANCELLED': 'badge-cancelled'
    };

    body.innerHTML = `
        <div class="view-section">
            <h4>Application Details</h4>
            <div class="view-grid">
                <div><strong>Application No:</strong> ${escHtml(rec.application_no)}</div>
                <div><strong>Application Date:</strong> ${rec.application_date}</div>
                <div><strong>Registration No:</strong> ${escHtml(rec.registration_no || '-')}</div>
                <div><strong>Status:</strong> <span class="badge ${statusBadges[rec.reg_status] || ''}">${rec.reg_status}</span></div>
            </div>
        </div>

        <div class="view-section">
            <h4>Customer Information</h4>
            <div class="view-grid">
                <div><strong>Customer Name:</strong> ${escHtml(rec.customer_name)}</div>
                <div><strong>Phone:</strong> ${escHtml(rec.phone_number || '-')}</div>
                <div><strong>Email:</strong> ${escHtml(rec.email || '-')}</div>
                <div><strong>CNIC:</strong> ${escHtml(rec.cnic_no || '-')}</div>
                <div style="grid-column: 1/-1;"><strong>Address:</strong> ${escHtml(rec.address || '-')}</div>
            </div>
        </div>

        <div class="view-section">
            <h4>Product & Vehicle Details</h4>
            <div class="view-grid">
                <div><strong>Product:</strong> ${escHtml(rec.product_name)}</div>
                <div><strong>Chassis No:</strong> ${escHtml(rec.chassis_no || '-')}</div>
                <div><strong>Motor No:</strong> ${escHtml(rec.motor_no || '-')}</div>
                <div><strong>Colour:</strong> ${escHtml(rec.colour || '-')}</div>
                <div><strong>Model Year:</strong> ${rec.model_year || '-'}</div>
            </div>
        </div>

        <div class="view-section">
            <h4>Financial Details</h4>
            <div class="view-grid">
                <div><strong>Registration Fee:</strong> ${formatCurrency(rec.registration_fee)}</div>
                <div><strong>Number Plate Fee:</strong> ${formatCurrency(rec.number_plate_fee)}</div>
                <div><strong>Smart Card Fee:</strong> ${formatCurrency(rec.smart_card_fee)}</div>
                <div><strong>Service Charges:</strong> ${formatCurrency(rec.service_charges)}</div>
                <div><strong>Total Amount:</strong> ${formatCurrency(rec.total_amount)}</div>
                <div><strong>Amount Paid:</strong> ${formatCurrency(rec.amount_paid)}</div>
                <div><strong>Remaining Balance:</strong> ${formatCurrency(rec.remaining_balance)}</div>
            </div>
        </div>

        ${rec.delivery_date ? `
        <div class="view-section">
            <h4>Delivery Details</h4>
            <div class="view-grid">
                <div><strong>Delivery Date:</strong> ${rec.delivery_date}</div>
                <div><strong>Delivered To:</strong> ${escHtml(rec.delivered_to || '-')}</div>
                <div><strong>Delivered By:</strong> ${escHtml(rec.delivered_by || '-')}</div>
                <div style="grid-column: 1/-1;"><strong>Delivery Notes:</strong> ${escHtml(rec.delivery_notes || '-')}</div>
            </div>
        </div>
        ` : ''}

        ${rec.notes ? `
        <div class="view-section">
            <h4>Notes</h4>
            <div>${escHtml(rec.notes)}</div>
        </div>
        ` : ''}
    `;

    modal.classList.add('show');
}

function escHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR'
    }).format(num);
}

function calculateBalance() {
    const regFee = parseFloat(document.getElementById('registrationFee').value || 0);
    const plateFee = parseFloat(document.getElementById('numberPlateFee').value || 0);
    const smartCardFee = parseFloat(document.getElementById('smartCardFee').value || 0);
    const serviceCharges = parseFloat(document.getElementById('serviceCharges').value || 0);
    const total = regFee + plateFee + smartCardFee + serviceCharges;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value || 0);
    const balance = Math.max(0, total - amountPaid);

    document.getElementById('totalAmount').value = total.toFixed(2);
    document.getElementById('remainingBalance').value = balance.toFixed(2);
}

function populateBankAccounts() {
    const select = document.getElementById('bankAccount');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Bank Account</option>';
    
    allBankAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.account_title} (${account.account_number})`;
        select.appendChild(option);
    });
}

function saveFieldSettings() {
    const chkChassis = document.getElementById('chkChassis');
    const chkMotor = document.getElementById('chkMotor');
    const chkColour = document.getElementById('chkColour');
    
    const settings = {
        chassis: chkChassis ? chkChassis.checked : false,
        motor: chkMotor ? chkMotor.checked : false,
        colour: chkColour ? chkColour.checked : false
    };
    localStorage.setItem('vregFieldSettings', JSON.stringify(settings));
    applyFieldSettings();
}

function applyFieldSettings() {
    const settings = JSON.parse(localStorage.getItem('vregFieldSettings') || '{}');
    const chassisElements = document.querySelectorAll('.vreg-chassis-col');
    const motorElements = document.querySelectorAll('.vreg-motor-col');
    const colourElements = document.querySelectorAll('.vreg-colour-col');
    
    chassisElements.forEach(el => {
        el.style.display = settings.chassis ? 'flex' : 'none';
    });
    motorElements.forEach(el => {
        el.style.display = settings.motor ? 'flex' : 'none';
    });
    colourElements.forEach(el => {
        el.style.display = settings.colour ? 'flex' : 'none';
    });
}

function initFieldSettings() {
    const settings = JSON.parse(localStorage.getItem('vregFieldSettings') || '{}');
    const chkChassis = document.getElementById('chkChassis');
    const chkMotor = document.getElementById('chkMotor');
    const chkColour = document.getElementById('chkColour');
    
    if (chkChassis) chkChassis.checked = settings.chassis || false;
    if (chkMotor) chkMotor.checked = settings.motor || false;
    if (chkColour) chkColour.checked = settings.colour || false;
    
    applyFieldSettings();
}
