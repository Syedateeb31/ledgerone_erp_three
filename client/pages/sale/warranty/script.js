const API = '../../../../server/api/sale/warranty/';

const defaultTerms = [
    'Warranty only valid with original invoice',
    'Physical damage not covered',
    'Water/fire damage not covered',
    'Unauthorized repair cancels warranty',
    'Company decision will be final'
];

let allWarranties  = [];
let allCustomers   = [];
let allComponents  = [];
let coverageItems  = [];
let editingId      = null;
let currentViewId  = null;

document.addEventListener('DOMContentLoaded', () => {
    setToday();
    loadNextWarrantyNo();
    renderTerms(defaultTerms);
    addProductRow();
    loadCustomers();
    loadComponents();
    loadWarrantyList();
    applyChassisVisibility();
    bindEvents();
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function setToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('registrationDate').value = today;
    document.getElementById('warrantyStartDate').value = today;
}

async function loadNextWarrantyNo() {
    try {
        const res  = await fetch(API + 'warranty-list.php?action=next_no');
        const data = await res.json();
        if (data.success) document.getElementById('warrantyNo').value = data.warranty_no;
    } catch { document.getElementById('warrantyNo').value = 'WR-0001'; }
}

// ─────────────────────────────────────────────
// CUSTOMERS — searchable dropdown
// ─────────────────────────────────────────────
async function loadCustomers() {
    try {
        const res  = await fetch(API + 'get-invoice-details.php?action=customers');
        const data = await res.json();
        if (data.success) allCustomers = data.customers;
    } catch (e) { console.error('Error loading customers:', e); }
}

function initCustomerDropdown() {
    const searchEl   = document.getElementById('customerSearch');
    const hiddenEl   = document.getElementById('customerId');
    const dropdownEl = document.getElementById('customerDropdown');

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
                     data-address="${escHtml(c.address || '')}">
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
            (c.phone || '').includes(q)
        );
        renderCustomerOptions(filtered);
    });

    searchEl.addEventListener('blur', () => {
        setTimeout(() => { dropdownEl.style.display = 'none'; }, 150);
    });
}

function selectCustomer(item) {
    document.getElementById('customerSearch').value = item.dataset.name;
    document.getElementById('customerId').value     = item.dataset.id;
    document.getElementById('phoneNumber').value    = item.dataset.phone;
    document.getElementById('email').value          = item.dataset.email;
    document.getElementById('address').value        = item.dataset.address;
    document.getElementById('customerDropdown').style.display = 'none';

    // Reload invoice dropdown filtered by this customer
    document.getElementById('invoiceSearch').value = '';
    document.getElementById('invoiceId').value     = '';
    document.getElementById('saleDate').value      = '';
}

// ─────────────────────────────────────────────
// INVOICE — searchable dropdown
// ─────────────────────────────────────────────
function initInvoiceDropdown() {
    const searchEl   = document.getElementById('invoiceSearch');
    const dropdownEl = document.getElementById('invoiceDropdown');

    let searchTimeout;

    searchEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fetchInvoices(searchEl.value.trim()), 300);
    });

    // Show all invoices (filtered by customer if selected) on focus
    searchEl.addEventListener('focus', () => {
        fetchInvoices(searchEl.value.trim());
    });

    searchEl.addEventListener('blur', () => {
        setTimeout(() => { dropdownEl.style.display = 'none'; }, 200);
    });

    async function fetchInvoices(q) {
        const customerId = document.getElementById('customerId').value;

        // Need at least a customer selected OR a search query
        if (!customerId && q.length < 1) {
            dropdownEl.innerHTML = '<div class="dd-item dd-empty">Select a customer first or type invoice no.</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        // Build URL — if no query, send '*' so PHP returns all for this customer
        const searchParam = q.length > 0 ? encodeURIComponent(q) : '%';
        let url = API + `get-invoice-details.php?search=${searchParam}`;
        if (customerId) url += `&customer_id=${customerId}`;

        try {
            const res  = await fetch(url);
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
                         data-address="${escHtml(inv.address || '')}">
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
        } catch (e) { console.error(e); }
    }
}

async function selectInvoice(item) {
    document.getElementById('invoiceSearch').value = item.dataset.bill;
    document.getElementById('invoiceId').value     = item.dataset.id;
    document.getElementById('saleDate').value      = item.dataset.date;
    document.getElementById('invoiceDropdown').style.display = 'none';

    // If customer not yet selected, auto-fill from invoice
    if (!document.getElementById('customerId').value) {
        document.getElementById('customerSearch').value = item.dataset.customer;
        document.getElementById('phoneNumber').value    = item.dataset.phone;
        document.getElementById('email').value          = item.dataset.email;
        document.getElementById('address').value        = item.dataset.address;
    }

    // Fetch products with chassis/motor/colour
    try {
        const res  = await fetch(API + `get-invoice-details.php?invoice_id=${item.dataset.id}`);
        const data = await res.json();
        if (data.success && data.items.length) {
            document.getElementById('productsContainer').innerHTML = '';
            data.items.forEach(p => addProductRow(p));
        }
    } catch (e) { console.error(e); }
}

// ─────────────────────────────────────────────
// COMPONENTS — load, render, manage
// ─────────────────────────────────────────────
async function loadComponents() {
    try {
        const res  = await fetch(API + 'warranty-components.php');
        const data = await res.json();
        if (data.success) { allComponents = data.components; refreshComponentSelect(); }
    } catch (e) { console.error('loadComponents:', e); }
}

function refreshComponentSelect() {
    const sel = document.getElementById('coverageComponent');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select component...</option>' +
        allComponents.map(c => `<option value="${escHtml(c.component_name)}">${escHtml(c.component_name)}</option>`).join('');
    sel.value = cur;
}

// ─────────────────────────────────────────────
// COVERAGE ITEMS TABLE
// ─────────────────────────────────────────────
function renderCoverageTable() {
    const tbody = document.getElementById('coverageBody');
    if (!coverageItems.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No components added. Click "Add Component".</td></tr>';
        return;
    }
    const typeCls = { Repair: 'badge-repair', Replacement: 'badge-replacement', Service: 'badge-service' };
    tbody.innerHTML = coverageItems.map((item, idx) => `
        <tr>
            <td><strong>${escHtml(item.component_name)}</strong></td>
            <td>${escHtml(item.serial_no || '-')}</td>
            <td><span class="badge ${typeCls[item.warranty_type] || ''}">${escHtml(item.warranty_type)}</span></td>
            <td>${escHtml(item.period)}</td>
            <td>${item.start_date  || '-'}</td>
            <td>${item.expiry_date || '-'}</td>
            <td><button type="button" class="btn-remove-row" style="width:28px;height:28px;" onclick="removeCoverageItem(${idx})" title="Remove"><i class="fas fa-trash" style="font-size:11px;"></i></button></td>
        </tr>`).join('');
}

window.removeCoverageItem = function(idx) {
    coverageItems.splice(idx, 1);
    renderCoverageTable();
};

function calcCoverageExpiry() {
    const start  = document.getElementById('coverageStart').value;
    const period = document.getElementById('coveragePeriod').value.trim();
    if (!start || !period) return;
    const d = new Date(start);
    const y   = period.match(/(\d+)\s*year/i);
    const m   = period.match(/(\d+)\s*month/i);
    const day = period.match(/(\d+)\s*day/i);
    if (y)   d.setFullYear(d.getFullYear() + parseInt(y[1]));
    if (m)   d.setMonth(d.getMonth() + parseInt(m[1]));
    if (day) d.setDate(d.getDate() + parseInt(day[1]));
    if (y || m || day) document.getElementById('coverageExpiry').value = d.toISOString().split('T')[0];
}

function openAddCoverageModal() {
    const mainStart = document.getElementById('warrantyStartDate').value;
    document.getElementById('coverageStart').value     = mainStart || new Date().toISOString().split('T')[0];
    document.getElementById('coverageExpiry').value    = '';
    document.getElementById('coverageComponent').value = '';
    document.getElementById('coverageSerial').value    = '';
    document.getElementById('coverageType').value      = '';
    document.getElementById('coveragePeriod').value    = '';
    refreshComponentSelect();
    document.getElementById('addCoverageModal').classList.add('show');
}

function closeAddCoverageModal() {
    document.getElementById('addCoverageModal').classList.remove('show');
}

function confirmAddCoverage() {
    const component = document.getElementById('coverageComponent').value.trim();
    const type      = document.getElementById('coverageType').value;
    const period    = document.getElementById('coveragePeriod').value.trim();
    const start     = document.getElementById('coverageStart').value;
    if (!component) { alert('Please select a component.'); return; }
    if (!type)      { alert('Please select warranty type.'); return; }
    if (!period)    { alert('Please enter warranty period.'); return; }
    if (!start)     { alert('Please enter start date.'); return; }
    coverageItems.push({
        component_name: component,
        serial_no:      document.getElementById('coverageSerial').value.trim(),
        warranty_type:  type,
        period,
        start_date:     start,
        expiry_date:    document.getElementById('coverageExpiry').value
    });
    renderCoverageTable();
    closeAddCoverageModal();
}

// ─────────────────────────────────────────────
// MANAGE COMPONENTS MODAL
// ─────────────────────────────────────────────
function openManageComponentsModal() {
    document.getElementById('newComponentName').value = '';
    renderComponentsList();
    document.getElementById('manageComponentsModal').classList.add('show');
}

function renderComponentsList() {
    const el = document.getElementById('componentsList');
    if (!allComponents.length) {
        el.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">No components yet. Add one above.</div>';
        return;
    }
    el.innerHTML = allComponents.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;">${escHtml(c.component_name)}</span>
            <button type="button" class="btn-remove-term" onclick="deleteComponent(${c.id})" title="Delete"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

async function saveNewComponent() {
    const name = document.getElementById('newComponentName').value.trim();
    if (!name) { alert('Enter component name.'); return; }
    try {
        const res  = await fetch(API + 'warranty-components.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ component_name: name })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('newComponentName').value = '';
            await loadComponents();
            renderComponentsList();
        } else { alert('Error: ' + data.message); }
    } catch (e) { alert('Error: ' + e.message); }
}

window.deleteComponent = async function(id) {
    if (!confirm('Delete this component?')) return;
    try {
        const res  = await fetch(API + `warranty-components.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { await loadComponents(); renderComponentsList(); }
        else alert('Error: ' + data.message);
    } catch (e) { alert('Error: ' + e.message); }
};

// ─────────────────────────────────────────────
// PRODUCT ROWS
// ─────────────────────────────────────────────
function addProductRow(data = {}) {
    const container = document.getElementById('productsContainer');
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
        <div>
            <label>Product Name</label>
            <input type="text" class="prod-name" value="${escHtml(data.product_name || '')}" placeholder="Product name">
        </div>
        <div class="prod-chassis-col">
            <label>Chassis No</label>
            <input type="text" class="prod-chassis" value="${escHtml(data.chassis_no || '')}" placeholder="Chassis No">
        </div>
        <div class="prod-motor-col">
            <label>Motor No</label>
            <input type="text" class="prod-motor" value="${escHtml(data.motor_no || '')}" placeholder="Motor No">
        </div>
        <div class="prod-colour-col">
            <label>Colour</label>
            <input type="text" class="prod-colour" value="${escHtml(data.colour || '')}" placeholder="Colour">
        </div>
        <button type="button" class="btn-remove-row" title="Remove"><i class="fas fa-trash"></i></button>
    `;
    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (document.querySelectorAll('.product-row').length > 1) row.remove();
        else alert('At least one product row is required.');
    });
    container.appendChild(row);
    applyChassisVisibility();
}

// ─────────────────────────────────────────────
// CHASSIS / MOTOR / COLOUR TOGGLE
// ─────────────────────────────────────────────
function applyChassisVisibility() {
    const showChassis = localStorage.getItem('warranty_showChassis') !== 'false';
    const showMotor   = localStorage.getItem('warranty_showMotor')   !== 'false';
    const showColour  = localStorage.getItem('warranty_showColour')  !== 'false';

    // Set checkboxes
    const chkC = document.getElementById('chkChassis');
    const chkM = document.getElementById('chkMotor');
    const chkCo = document.getElementById('chkColour');
    if (chkC)  chkC.checked  = showChassis;
    if (chkM)  chkM.checked  = showMotor;
    if (chkCo) chkCo.checked = showColour;

    // Show/hide columns in all product rows
    document.querySelectorAll('.prod-chassis-col').forEach(el => el.style.display = showChassis ? '' : 'none');
    document.querySelectorAll('.prod-motor-col').forEach(el   => el.style.display = showMotor   ? '' : 'none');
    document.querySelectorAll('.prod-colour-col').forEach(el  => el.style.display = showColour  ? '' : 'none');

    // Adjust product-row grid columns dynamically
    const visibleCols = 1 + (showChassis ? 1 : 0) + (showMotor ? 1 : 0) + (showColour ? 1 : 0);
    const colTemplate = `2fr${showChassis ? ' 1.2fr' : ''}${showMotor ? ' 1.2fr' : ''}${showColour ? ' 1.2fr' : ''} 36px`;
    document.querySelectorAll('.product-row').forEach(row => {
        row.style.gridTemplateColumns = colTemplate;
    });
}

window.saveChassisSettings = function() {
    localStorage.setItem('warranty_showChassis', document.getElementById('chkChassis').checked);
    localStorage.setItem('warranty_showMotor',   document.getElementById('chkMotor').checked);
    localStorage.setItem('warranty_showColour',  document.getElementById('chkColour').checked);
    applyChassisVisibility();
};

// ─────────────────────────────────────────────
// TERMS
// ─────────────────────────────────────────────
function renderTerms(terms) {
    document.getElementById('termsList').innerHTML = '';
    terms.forEach(t => addTermItem(t));
}

function addTermItem(text = '') {
    const list = document.getElementById('termsList');
    const div  = document.createElement('div');
    div.className = 'term-item';
    div.innerHTML = `
        <i class="fas fa-grip-vertical" style="color:#cbd5e1;font-size:12px;"></i>
        <input type="text" value="${escHtml(text)}" placeholder="Enter term...">
        <button type="button" class="btn-remove-term" title="Remove"><i class="fas fa-times"></i></button>
    `;
    div.querySelector('.btn-remove-term').addEventListener('click', () => div.remove());
    list.appendChild(div);
}

// ─────────────────────────────────────────────
// EXPIRY AUTO CALC
// ─────────────────────────────────────────────
function calcExpiry() {
    const startDate = document.getElementById('warrantyStartDate').value;
    const period    = document.getElementById('warrantyPeriod').value.trim();
    if (!startDate || !period) return;

    const d = new Date(startDate);
    const yearMatch  = period.match(/(\d+)\s*year/i);
    const monthMatch = period.match(/(\d+)\s*month/i);
    const dayMatch   = period.match(/(\d+)\s*day/i);

    if (yearMatch)  d.setFullYear(d.getFullYear() + parseInt(yearMatch[1]));
    if (monthMatch) d.setMonth(d.getMonth() + parseInt(monthMatch[1]));
    if (dayMatch)   d.setDate(d.getDate() + parseInt(dayMatch[1]));

    if (yearMatch || monthMatch || dayMatch) {
        document.getElementById('warrantyExpiryDate').value = d.toISOString().split('T')[0];
    }
}

// ─────────────────────────────────────────────
// COLLECT FORM DATA
// ─────────────────────────────────────────────
function collectFormData() {
    const products = [];
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.prod-name').value.trim();
        if (name) products.push({
            product_name: name,
            chassis_no:   row.querySelector('.prod-chassis').value.trim(),
            motor_no:     row.querySelector('.prod-motor').value.trim(),
            colour:       row.querySelector('.prod-colour').value.trim()
        });
    });

    const terms = [];
    document.querySelectorAll('#termsList .term-item input[type="text"]').forEach(inp => {
        if (inp.value.trim()) terms.push(inp.value.trim());
    });

    return {
        warranty_no:          document.getElementById('warrantyNo').value,
        registration_date:    document.getElementById('registrationDate').value,
        customer_name:        document.getElementById('customerSearch').value.trim(),
        customer_id:          document.getElementById('customerId').value || null,
        phone_number:         document.getElementById('phoneNumber').value.trim(),
        email:                document.getElementById('email').value.trim(),
        address:              document.getElementById('address').value.trim(),
        sale_invoice_id:      document.getElementById('invoiceId').value || null,
        invoice_number:       document.getElementById('invoiceSearch').value.trim(),
        sale_date:            document.getElementById('saleDate').value,
        warranty_type:        document.getElementById('warrantyType').value,
        warranty_period:      document.getElementById('warrantyPeriod').value.trim(),
        warranty_start_date:  document.getElementById('warrantyStartDate').value,
        warranty_expiry_date: document.getElementById('warrantyExpiryDate').value,
        notes:                document.getElementById('notes').value.trim(),
        products,
        coverage_items: coverageItems,
        terms
    };
}

// ─────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────
async function saveWarranty() {
    const data = collectFormData();

    if (!data.customer_name)       { alert('Customer name is required.');       return; }
    if (!data.warranty_type)       { alert('Warranty type is required.');       return; }
    if (!data.warranty_period)     { alert('Warranty period is required.');     return; }
    if (!data.warranty_start_date) { alert('Warranty start date is required.'); return; }
    if (!data.products.length)     { alert('At least one product is required.'); return; }

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const url    = editingId ? API + `warranty-add.php?id=${editingId}` : API + 'warranty-add.php';
        const method = editingId ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert(editingId ? 'Warranty updated!' : 'Warranty saved!');
            resetForm();
            loadWarrantyList();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Warranty';
    }
}

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────
function resetForm() {
    editingId = null;
    document.getElementById('warrantyForm').reset();
    document.getElementById('productsContainer').innerHTML = '';
    document.getElementById('customerId').value  = '';
    document.getElementById('invoiceId').value   = '';
    document.getElementById('saleDate').value    = '';
    document.getElementById('warrantyExpiryDate').value = '';
    coverageItems = [];
    renderCoverageTable();
    setToday();
    loadNextWarrantyNo();
    renderTerms(defaultTerms);
    addProductRow();
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Warranty';
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
async function loadWarrantyList() {
    try {
        const res  = await fetch(API + 'warranty-list.php');
        const data = await res.json();
        if (data.success) { allWarranties = data.warranties; renderTable(allWarranties); }
    } catch {
        document.getElementById('warrantyTableBody').innerHTML =
            '<tr><td colspan="9" style="text-align:center;color:#ef4444;">Error loading data</td></tr>';
    }
}

function renderTable(warranties) {
    const tbody = document.getElementById('warrantyTableBody');
    if (!warranties.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No records found</td></tr>';
        return;
    }
    tbody.innerHTML = warranties.map(w => {
        const s = getStatus(w.warranty_expiry_date);
        return `<tr>
            <td><strong>${w.warranty_no}</strong></td>
            <td>${w.registration_date}</td>
            <td>${escHtml(w.customer_name)}</td>
            <td>${w.invoice_number || '-'}</td>
            <td>${w.warranty_type}</td>
            <td>${w.warranty_start_date}</td>
            <td>${w.warranty_expiry_date || '-'}</td>
            <td><span class="badge badge-${s.cls}">${s.label}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="viewWarranty(${w.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" onclick="printWarranty(${w.id})" title="Print"><i class="fas fa-print"></i></button>
                    <button class="btn-icon" onclick="editWarranty(${w.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteWarranty(${w.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function getStatus(expiryDate) {
    if (!expiryDate) return { cls: 'active', label: 'Active' };
    const diff = (new Date(expiryDate) - new Date()) / 86400000;
    if (diff < 0)   return { cls: 'expired',  label: 'Expired' };
    if (diff <= 30) return { cls: 'expiring', label: 'Expiring Soon' };
    return { cls: 'active', label: 'Active' };
}

// ─────────────────────────────────────────────
// VIEW
// ─────────────────────────────────────────────
async function viewWarranty(id) {
    try {
        const res  = await fetch(API + `warranty-list.php?id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Error loading warranty'); return; }
        const w        = data.warranty;
        currentViewId  = id;
        const products      = w.products       || [];
        const coverageView  = w.coverage_items || [];
        const terms         = JSON.parse(w.terms_json || '[]');

        document.getElementById('viewModalTitle').textContent = `Warranty — ${w.warranty_no}`;
        document.getElementById('viewModalBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Warranty No</span><span class="detail-value">${w.warranty_no}</span></div>
                <div class="detail-item"><span class="detail-label">Registration Date</span><span class="detail-value">${w.registration_date}</span></div>
                <div class="detail-item"><span class="detail-label">Customer</span><span class="detail-value">${escHtml(w.customer_name)}</span></div>
                <div class="detail-item"><span class="detail-label">Phone</span><span class="detail-value">${w.phone_number || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${w.email || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Address</span><span class="detail-value">${escHtml(w.address || '-')}</span></div>
                <div class="detail-item"><span class="detail-label">Invoice No</span><span class="detail-value">${w.invoice_number || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Sale Date</span><span class="detail-value">${w.sale_date || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Warranty Type</span><span class="detail-value">${w.warranty_type}</span></div>
                <div class="detail-item"><span class="detail-label">Period</span><span class="detail-value">${w.warranty_period}</span></div>
                <div class="detail-item"><span class="detail-label">Start Date</span><span class="detail-value">${w.warranty_start_date}</span></div>
                <div class="detail-item"><span class="detail-label">Expiry Date</span><span class="detail-value">${w.warranty_expiry_date || '-'}</span></div>
            </div>
            ${coverageView.length ? `
            <div class="section-title" style="margin-top:12px;"><i class="fas fa-tools"></i> Coverage Items / Parts</div>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:8px;border:1px solid #e2e8f0;">Component</th>
                    <th style="padding:8px;border:1px solid #e2e8f0;">Serial No</th>
                    <th style="padding:8px;border:1px solid #e2e8f0;">Type</th>
                    <th style="padding:8px;border:1px solid #e2e8f0;">Period</th>
                    <th style="padding:8px;border:1px solid #e2e8f0;">Start</th>
                    <th style="padding:8px;border:1px solid #e2e8f0;">Expiry</th>
                </tr></thead>
                <tbody>${coverageView.map(c => `<tr>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${escHtml(c.component_name)}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${c.serial_no || '-'}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${c.warranty_type}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${c.period}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${c.start_date || '-'}</td>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${c.expiry_date || '-'}</td>
                </tr>`).join('')}</tbody>
            </table>` : ''}
            ${products.length ? `
            <div class="section-title" style="margin-top:12px;"><i class="fas fa-box"></i> Products</div>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:8px;border:1px solid #e2e8f0;">Product</th>
                    ${localStorage.getItem('warranty_showChassis') !== 'false' ? '<th style="padding:8px;border:1px solid #e2e8f0;">Chassis No</th>' : ''}
                    ${localStorage.getItem('warranty_showMotor')   !== 'false' ? '<th style="padding:8px;border:1px solid #e2e8f0;">Motor No</th>'   : ''}
                    ${localStorage.getItem('warranty_showColour')  !== 'false' ? '<th style="padding:8px;border:1px solid #e2e8f0;">Colour</th>'     : ''}
                </tr></thead>
                <tbody>${products.map(p => `<tr>
                    <td style="padding:8px;border:1px solid #e2e8f0;">${escHtml(p.product_name)}</td>
                    ${localStorage.getItem('warranty_showChassis') !== 'false' ? `<td style="padding:8px;border:1px solid #e2e8f0;">${p.chassis_no || '-'}</td>` : ''}
                    ${localStorage.getItem('warranty_showMotor')   !== 'false' ? `<td style="padding:8px;border:1px solid #e2e8f0;">${p.motor_no   || '-'}</td>` : ''}
                    ${localStorage.getItem('warranty_showColour')  !== 'false' ? `<td style="padding:8px;border:1px solid #e2e8f0;">${p.colour     || '-'}</td>` : ''}
                </tr>`).join('')}</tbody>
            </table>` : ''}
            ${terms.length ? `
            <div class="section-title" style="margin-top:12px;"><i class="fas fa-list-ul"></i> Terms &amp; Conditions</div>
            <ul style="padding-left:18px;font-size:13px;line-height:1.9;">${terms.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` : ''}
            ${w.notes ? `<div class="section-title" style="margin-top:12px;"><i class="fas fa-sticky-note"></i> Notes</div><p style="font-size:13px;">${escHtml(w.notes)}</p>` : ''}
        `;
        document.getElementById('viewModal').classList.add('show');
    } catch (e) { alert('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────
async function editWarranty(id) {
    try {
        const res  = await fetch(API + `warranty-list.php?id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Error loading warranty'); return; }
        const w = data.warranty;
        editingId = id;

        document.getElementById('warrantyNo').value         = w.warranty_no;
        document.getElementById('registrationDate').value   = w.registration_date;
        document.getElementById('customerSearch').value     = w.customer_name;
        document.getElementById('customerId').value         = w.customer_id || '';
        document.getElementById('phoneNumber').value        = w.phone_number || '';
        document.getElementById('email').value              = w.email || '';
        document.getElementById('address').value            = w.address || '';
        document.getElementById('invoiceSearch').value      = w.invoice_number || '';
        document.getElementById('invoiceId').value          = w.sale_invoice_id || '';
        document.getElementById('saleDate').value           = w.sale_date || '';
        document.getElementById('warrantyType').value       = w.warranty_type;
        document.getElementById('warrantyPeriod').value     = w.warranty_period;
        document.getElementById('warrantyStartDate').value  = w.warranty_start_date;
        document.getElementById('warrantyExpiryDate').value = w.warranty_expiry_date || '';
        document.getElementById('notes').value              = w.notes || '';

        const products = w.products || [];
        document.getElementById('productsContainer').innerHTML = '';
        (products.length ? products : [{}]).forEach(p => addProductRow(p));

        coverageItems = w.coverage_items || [];
        renderCoverageTable();

        const terms = JSON.parse(w.terms_json || '[]');
        renderTerms(terms.length ? terms : defaultTerms);

        document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Warranty';
        document.getElementById('formCard').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { alert('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
async function deleteWarranty(id) {
    if (!confirm('Delete this warranty registration?')) return;
    try {
        const res  = await fetch(API + `warranty-add.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) loadWarrantyList();
        else alert('Error: ' + data.message);
    } catch (e) { alert('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
// BIND EVENTS
// ─────────────────────────────────────────────
function bindEvents() {
    document.getElementById('warrantyForm').addEventListener('submit', e => { e.preventDefault(); saveWarranty(); });
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('addProductRow').addEventListener('click', () => addProductRow());
    document.getElementById('addTermBtn').addEventListener('click', () => addTermItem());
    document.getElementById('refreshListBtn').addEventListener('click', loadWarrantyList);

    document.getElementById('warrantyStartDate').addEventListener('change', calcExpiry);
    document.getElementById('warrantyPeriod').addEventListener('input', calcExpiry);

    document.getElementById('searchInput').addEventListener('input', function () {
        const q = this.value.toLowerCase();
        renderTable(allWarranties.filter(w =>
            (w.warranty_no     || '').toLowerCase().includes(q) ||
            (w.customer_name   || '').toLowerCase().includes(q) ||
            (w.invoice_number  || '').toLowerCase().includes(q)
        ));
    });

    // Show/Hide Fields modal
    document.getElementById('showHideFieldsBtn').addEventListener('click', () => {
        applyChassisVisibility();
        document.getElementById('showHideModal').classList.add('show');
    });
    document.getElementById('closeShowHideModal').addEventListener('click',    () => document.getElementById('showHideModal').classList.remove('show'));
    document.getElementById('closeShowHideModalBtn').addEventListener('click', () => document.getElementById('showHideModal').classList.remove('show'));
    document.getElementById('showHideModal').addEventListener('click', e => {
        if (e.target === document.getElementById('showHideModal')) document.getElementById('showHideModal').classList.remove('show');
    });

    // Coverage items
    document.getElementById('addCoverageRowBtn').addEventListener('click', openAddCoverageModal);
    document.getElementById('manageComponentsBtn').addEventListener('click', openManageComponentsModal);
    document.getElementById('closeAddCoverageModal').addEventListener('click', closeAddCoverageModal);
    document.getElementById('cancelAddCoverageBtn').addEventListener('click', closeAddCoverageModal);
    document.getElementById('confirmAddCoverageBtn').addEventListener('click', confirmAddCoverage);
    document.getElementById('coverageStart').addEventListener('change', calcCoverageExpiry);
    document.getElementById('coveragePeriod').addEventListener('input', calcCoverageExpiry);
    document.getElementById('addCoverageModal').addEventListener('click', e => {
        if (e.target === document.getElementById('addCoverageModal')) closeAddCoverageModal();
    });
    // Manage components
    document.getElementById('closeManageComponentsModal').addEventListener('click', () => document.getElementById('manageComponentsModal').classList.remove('show'));
    document.getElementById('closeManageComponentsBtn').addEventListener('click',   () => document.getElementById('manageComponentsModal').classList.remove('show'));
    document.getElementById('saveNewComponentBtn').addEventListener('click', saveNewComponent);
    document.getElementById('newComponentName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveNewComponent(); } });
    document.getElementById('manageComponentsModal').addEventListener('click', e => {
        if (e.target === document.getElementById('manageComponentsModal')) document.getElementById('manageComponentsModal').classList.remove('show');
    });
    // View modal
    document.getElementById('closeViewModal').addEventListener('click',    () => document.getElementById('viewModal').classList.remove('show'));
    document.getElementById('closeViewModalBtn').addEventListener('click', () => document.getElementById('viewModal').classList.remove('show'));
    document.getElementById('printWarrantyBtn').addEventListener('click',  () => window.print());
    document.getElementById('viewModal').addEventListener('click', e => {
        if (e.target === document.getElementById('viewModal')) document.getElementById('viewModal').classList.remove('show');
    });

    // Init dropdowns after DOM ready
    initCustomerDropdown();
    initInvoiceDropdown();
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Expose globals for inline onclick
window.viewWarranty   = viewWarranty;
window.editWarranty   = editWarranty;
window.deleteWarranty = deleteWarranty;
window.printWarranty  = function(id) {
    const sc = localStorage.getItem('warranty_showChassis') !== 'false' ? 1 : 0;
    const sm = localStorage.getItem('warranty_showMotor')   !== 'false' ? 1 : 0;
    const so = localStorage.getItem('warranty_showColour')  !== 'false' ? 1 : 0;
    window.open(`warranty-print.php?id=${id}&sc=${sc}&sm=${sm}&so=${so}`, '_blank');
};
