const API     = '../../../../../server/api/sale/warranty/';
const WAR_API = '../../../../../server/api/sale/warranty/';

let allClaims    = [];
let allCustomers = [];
let allWarranties = [];
let allComponents = [];
let claimItems   = [];
let editingId    = null;
let currentClaimId = null;

document.addEventListener('DOMContentLoaded', () => {
    setToday();
    loadNextClaimNo();
    loadCustomers();
    loadWarranties();
    loadComponents();
    loadClaimList();
    applyChassisVisibility();
    bindEvents();
});

// ─── INIT ────────────────────────────────────────────────────────────────────
function setToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('claimDate').value = today;
}

async function loadNextClaimNo() {
    try {
        const res  = await fetch(API + 'claim-list.php?action=next_no');
        const data = await res.json();
        if (data.success) document.getElementById('claimNo').value = data.claim_no;
    } catch { document.getElementById('claimNo').value = 'CLM-0001'; }
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
async function loadCustomers() {
    try {
        const res  = await fetch(WAR_API + 'get-invoice-details.php?action=customers');
        const data = await res.json();
        if (data.success) { allCustomers = data.customers; initCustomerDropdown(); }
    } catch (e) { console.error(e); }
}

function initCustomerDropdown() {
    const searchEl   = document.getElementById('customerSearch');
    const dropdownEl = document.getElementById('customerDropdown');

    function render(list) {
        dropdownEl.innerHTML = !list.length
            ? '<div class="dd-item dd-empty">No customers found</div>'
            : list.map(c => `<div class="dd-item" data-id="${c.id}" data-name="${esc(c.customer_name)}" data-phone="${esc(c.phone||'')}" data-email="${esc(c.email||'')}" data-address="${esc(c.address||'')}">
                <strong>${esc(c.customer_name)}</strong>
                ${c.phone ? `<span class="dd-sub">${esc(c.phone)}</span>` : ''}
              </div>`).join('');
        dropdownEl.querySelectorAll('.dd-item[data-id]').forEach(item => {
            item.addEventListener('mousedown', e => { e.preventDefault(); selectCustomer(item); });
        });
        dropdownEl.style.display = 'block';
    }

    searchEl.addEventListener('focus', () => render(allCustomers));
    searchEl.addEventListener('input', () => {
        const q = searchEl.value.toLowerCase();
        render(allCustomers.filter(c => c.customer_name.toLowerCase().includes(q) || (c.phone||'').includes(q)));
    });
    searchEl.addEventListener('blur', () => setTimeout(() => { dropdownEl.style.display = 'none'; }, 150));
}

function selectCustomer(item) {
    document.getElementById('customerSearch').value = item.dataset.name;
    document.getElementById('customerId').value     = item.dataset.id;
    document.getElementById('phoneNumber').value    = item.dataset.phone;
    document.getElementById('email').value          = item.dataset.email;
    document.getElementById('address').value        = item.dataset.address;
    document.getElementById('customerDropdown').style.display = 'none';
}

// ─── WARRANTIES ──────────────────────────────────────────────────────────────
async function loadWarranties() {
    try {
        const res  = await fetch(WAR_API + 'warranty-list.php');
        const data = await res.json();
        if (data.success) { allWarranties = data.warranties; initWarrantyDropdown(); }
    } catch (e) { console.error(e); }
}

function initWarrantyDropdown() {
    const searchEl   = document.getElementById('warrantySearch');
    const dropdownEl = document.getElementById('warrantyDropdown');

    function render(list) {
        dropdownEl.innerHTML = !list.length
            ? '<div class="dd-item dd-empty">No warranties found</div>'
            : list.map(w => `<div class="dd-item"
                data-id="${w.id}"
                data-no="${esc(w.warranty_no)}"
                data-type="${esc(w.warranty_type)}"
                data-start="${w.warranty_start_date||''}"
                data-expiry="${w.warranty_expiry_date||''}"
                data-customer="${esc(w.customer_name)}"
                data-phone="${esc(w.phone_number||'')}"
                data-email="${esc(w.email||'')}"
                data-address="${esc(w.address||'')}">
                <strong>${esc(w.warranty_no)}</strong>
                <span class="dd-sub">${esc(w.customer_name)} — ${w.warranty_type}</span>
              </div>`).join('');
        dropdownEl.querySelectorAll('.dd-item[data-id]').forEach(item => {
            item.addEventListener('mousedown', e => { e.preventDefault(); selectWarranty(item); });
        });
        dropdownEl.style.display = 'block';
    }

    searchEl.addEventListener('focus', () => render(allWarranties));
    searchEl.addEventListener('input', () => {
        const q = searchEl.value.toLowerCase();
        render(allWarranties.filter(w =>
            w.warranty_no.toLowerCase().includes(q) ||
            w.customer_name.toLowerCase().includes(q)
        ));
    });
    searchEl.addEventListener('blur', () => setTimeout(() => { dropdownEl.style.display = 'none'; }, 150));
}

async function selectWarranty(item) {
    document.getElementById('warrantySearch').value  = item.dataset.no;
    document.getElementById('warrantyId').value      = item.dataset.id;
    document.getElementById('warrantyType').value    = item.dataset.type;
    document.getElementById('warrantyStart').value   = item.dataset.start;
    document.getElementById('warrantyExpiry').value  = item.dataset.expiry;
    document.getElementById('warrantyDropdown').style.display = 'none';

    // Expiry validation
    checkExpiryWarning(item.dataset.expiry);

    // Auto-fill customer if not already filled
    if (!document.getElementById('customerId').value) {
        document.getElementById('customerSearch').value = item.dataset.customer;
        document.getElementById('phoneNumber').value    = item.dataset.phone;
        document.getElementById('email').value          = item.dataset.email;
        document.getElementById('address').value        = item.dataset.address;
    }

    // Fetch warranty details — products + sale date
    try {
        const res  = await fetch(WAR_API + `warranty-list.php?id=${item.dataset.id}`);
        const data = await res.json();
        if (data.success) {
            const w = data.warranty;
            if (w.products && w.products.length > 0) {
                const p = w.products[0];
                document.getElementById('productName').value = p.product_name || '';
                document.getElementById('chassisNo').value   = p.chassis_no   || '';
                document.getElementById('motorNo').value     = p.motor_no     || '';
                document.getElementById('colour').value      = p.colour       || '';
            }
            if (w.invoice_number) document.getElementById('invoiceNo').value = w.invoice_number;
            if (w.sale_date)      document.getElementById('saleDate').value   = w.sale_date;
        }
    } catch (e) { console.error(e); }
}

// ─── CHASSIS / MOTOR / COLOUR TOGGLE ─────────────────────────────────────────────
function applyChassisVisibility() {
    const showChassis = localStorage.getItem('claim_showChassis') !== 'false';
    const showMotor   = localStorage.getItem('claim_showMotor')   !== 'false';
    const showColour  = localStorage.getItem('claim_showColour')  !== 'false';

    const chkC  = document.getElementById('chkChassis');
    const chkM  = document.getElementById('chkMotor');
    const chkCo = document.getElementById('chkColour');
    if (chkC)  chkC.checked  = showChassis;
    if (chkM)  chkM.checked  = showMotor;
    if (chkCo) chkCo.checked = showColour;

    document.querySelectorAll('.claim-chassis-col').forEach(el => el.style.display = showChassis ? '' : 'none');
    document.querySelectorAll('.claim-motor-col').forEach(el   => el.style.display = showMotor   ? '' : 'none');
    document.querySelectorAll('.claim-colour-col').forEach(el  => el.style.display = showColour  ? '' : 'none');
}

window.saveChassisSettings = function() {
    localStorage.setItem('claim_showChassis', document.getElementById('chkChassis').checked);
    localStorage.setItem('claim_showMotor',   document.getElementById('chkMotor').checked);
    localStorage.setItem('claim_showColour',  document.getElementById('chkColour').checked);
    applyChassisVisibility();
};

// ─── COMPONENTS ─────────────────────────────────────────────────────────────
async function loadComponents() {
    try {
        const res  = await fetch(API + 'warranty-components.php');
        const data = await res.json();
        if (data.success) {
            allComponents = data.components;
            const sel = document.getElementById('itemComponent');
            if (sel) {
                sel.innerHTML = '<option value="">Select component...</option>' +
                    allComponents.map(c => `<option value="${esc(c.component_name)}">${esc(c.component_name)}</option>`).join('');
            }
        }
    } catch (e) { console.error(e); }
}

// ─── CLAIM ITEMS TABLE ───────────────────────────────────────────────────────
function renderClaimItems() {
    const tbody = document.getElementById('claimItemsBody');
    if (!claimItems.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No components added. Click "Add Component".</td></tr>';
        return;
    }
    tbody.innerHTML = claimItems.map((item, idx) => {
        const wsCls = item.warranty_status === 'Valid' ? 'ws-valid' : item.warranty_status === 'Expired' ? 'ws-expired' : 'ws-unknown';
        return `<tr>
            <td><strong>${esc(item.component_name)}</strong></td>
            <td>${esc(item.serial_no || '-')}</td>
            <td><span class="${wsCls}">${item.warranty_status || '-'}</span></td>
            <td>${esc(item.issue_description)}</td>
            <td><button type="button" class="btn-remove-item" onclick="removeClaimItem(${idx})" title="Remove"><i class="fas fa-trash" style="font-size:11px;"></i></button></td>
        </tr>`;
    }).join('');
}

window.removeClaimItem = function(idx) {
    claimItems.splice(idx, 1);
    renderClaimItems();
};

function openClaimItemModal() {
    document.getElementById('itemComponent').value = '';
    document.getElementById('itemSerial').value    = '';
    document.getElementById('itemIssue').value     = '';
    // Pre-fill serial from warranty coverage items if available
    const warrantyId = document.getElementById('warrantyId').value;
    document.getElementById('addClaimItemModal').classList.add('show');
}

function confirmClaimItem() {
    const component = document.getElementById('itemComponent').value.trim();
    const issue     = document.getElementById('itemIssue').value.trim();
    if (!component) { alert('Please select a component.'); return; }
    if (!issue)     { alert('Please enter issue description.'); return; }

    // Auto check warranty status
    const expiry = document.getElementById('warrantyExpiry').value;
    let warrantyStatus = 'Unknown';
    if (expiry) {
        warrantyStatus = new Date(expiry) >= new Date() ? 'Valid' : 'Expired';
    }

    claimItems.push({
        component_name:    component,
        serial_no:         document.getElementById('itemSerial').value.trim(),
        warranty_status:   warrantyStatus,
        issue_description: issue
    });
    renderClaimItems();
    document.getElementById('addClaimItemModal').classList.remove('show');
}

// ─── EXPIRY VALIDATION ───────────────────────────────────────────────────────
function checkExpiryWarning(expiryDate) {
    const warningEl = document.getElementById('expiryWarning');
    const textEl    = document.getElementById('expiryWarningText');
    if (!expiryDate) { warningEl.style.display = 'none'; return; }

    const today  = new Date();
    const expiry = new Date(expiryDate);
    const diff   = Math.ceil((expiry - today) / 86400000);

    warningEl.className = 'expiry-warning';
    warningEl.style.display = 'flex';

    if (diff < 0) {
        warningEl.classList.add('expired');
        textEl.textContent = `Warranty EXPIRED ${Math.abs(diff)} days ago. Claim may not be valid.`;
    } else if (diff <= 30) {
        warningEl.classList.add('expiring');
        textEl.textContent = `Warranty expiring in ${diff} days.`;
    } else {
        warningEl.classList.add('valid');
        textEl.textContent = `Warranty is valid. Expires on ${expiry.toLocaleDateString()}.`;
    }
}

// ─── COLLECT FORM DATA ───────────────────────────────────────────────────────
function collectFormData() {
    return {
        claim_no:             document.getElementById('claimNo').value,
        claim_date:           document.getElementById('claimDate').value,
        claim_status:         document.getElementById('claimStatus').value,
        claim_priority:       document.getElementById('claimPriority').value,
        warranty_id:          document.getElementById('warrantyId').value || null,
        warranty_no:          document.getElementById('warrantySearch').value.trim(),
        warranty_type:        document.getElementById('warrantyType').value,
        warranty_start_date:  document.getElementById('warrantyStart').value,
        warranty_expiry_date: document.getElementById('warrantyExpiry').value,
        customer_id:          document.getElementById('customerId').value || null,
        customer_name:        document.getElementById('customerSearch').value.trim(),
        phone_number:         document.getElementById('phoneNumber').value.trim(),
        email:                document.getElementById('email').value.trim(),
        address:              document.getElementById('address').value.trim(),
        product_name:         document.getElementById('productName').value.trim(),
        chassis_no:           document.getElementById('chassisNo').value.trim(),
        motor_no:             document.getElementById('motorNo').value.trim(),
        colour:               document.getElementById('colour').value.trim(),
        sale_date:            document.getElementById('saleDate').value,
        invoice_no:           document.getElementById('invoiceNo').value.trim(),
        claim_type:           document.getElementById('claimType').value,
        fault_category:       document.getElementById('faultCategory').value,
        problem_description:  document.getElementById('problemDescription').value.trim(),
        customer_complaint:   document.getElementById('customerComplaint').value.trim(),
        inspection_date:      document.getElementById('inspectionDate').value,
        inspected_by:         document.getElementById('inspectedBy').value.trim(),
        inspection_findings:  document.getElementById('inspectionFindings').value.trim(),
        resolution_date:      document.getElementById('resolutionDate').value,
        resolved_by:          document.getElementById('resolvedBy').value.trim(),
        resolution_details:   document.getElementById('resolutionDetails').value.trim(),
        notes:                document.getElementById('notes').value.trim(),
        claim_items:          claimItems
    };
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
async function saveClaim() {
    const data = collectFormData();
    if (!data.customer_name)      { alert('Customer name is required.');      return; }
    if (!data.claim_status)       { alert('Claim status is required.');       return; }
    if (!data.claim_priority)     { alert('Priority is required.');           return; }
    if (!data.product_name)       { alert('Product name is required.');       return; }
    if (!data.claim_type)         { alert('Claim type is required.');         return; }
    if (!data.fault_category)     { alert('Fault category is required.');     return; }
    if (!data.problem_description){ alert('Problem description is required.'); return; }

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const url    = editingId ? API + `claim-add.php?id=${editingId}` : API + 'claim-add.php';
        const method = editingId ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert(editingId ? 'Claim updated!' : 'Claim saved!');
            resetForm();
            loadClaimList();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Claim';
    }
}

// ─── RESET ───────────────────────────────────────────────────────────────────
function resetForm() {
    editingId = null;
    document.getElementById('claimForm').reset();
    document.getElementById('customerId').value      = '';
    document.getElementById('warrantyId').value      = '';
    document.getElementById('warrantyType').value    = '';
    document.getElementById('warrantyStart').value   = '';
    document.getElementById('warrantyExpiry').value  = '';
    document.getElementById('saleDate').value        = '';
    document.getElementById('expiryWarning').style.display = 'none';
    claimItems = [];
    renderClaimItems();
    setToday();
    loadNextClaimNo();
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Claim';
}

// ─── LIST ────────────────────────────────────────────────────────────────────
async function loadClaimList() {
    try {
        const res  = await fetch(API + 'claim-list.php');
        const data = await res.json();
        if (data.success) { allClaims = data.claims; renderTable(allClaims); }
    } catch {
        document.getElementById('claimTableBody').innerHTML =
            '<tr><td colspan="9" style="text-align:center;color:#ef4444;">Error loading data</td></tr>';
    }
}

function renderTable(claims) {
    const tbody = document.getElementById('claimTableBody');
    if (!claims.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No claims found</td></tr>';
        return;
    }
    tbody.innerHTML = claims.map(c => `
        <tr>
            <td><strong>${c.claim_no}</strong></td>
            <td>${c.claim_date}</td>
            <td>${esc(c.customer_name)}</td>
            <td>${c.warranty_no || '-'}</td>
            <td>${esc(c.product_name)}</td>
            <td>${c.claim_type}</td>
            <td><span class="badge ${statusBadge(c.claim_status)}">${c.claim_status}</span></td>
            <td><span class="priority-${(c.claim_priority||'').toLowerCase()}">${c.claim_priority}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="viewClaim(${c.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" onclick="printClaim(${c.id})" title="Print"><i class="fas fa-print"></i></button>
                    <button class="btn-icon" onclick="editClaim(${c.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteClaim(${c.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function statusBadge(s) {
    const map = {
        'Pending':          'badge-pending',
        'Under Inspection': 'badge-review',
        'Approved':         'badge-approved',
        'Rejected':         'badge-rejected',
        'Completed':        'badge-resolved'
    };
    return map[s] || 'badge-pending';
}

function filterList() {
    const q  = document.getElementById('searchInput').value.toLowerCase();
    const st = document.getElementById('filterStatus').value;
    renderTable(allClaims.filter(c =>
        (!q  || (c.claim_no||'').toLowerCase().includes(q) || (c.customer_name||'').toLowerCase().includes(q) || (c.warranty_no||'').toLowerCase().includes(q)) &&
        (!st || c.claim_status === st)
    ));
}

// ─── VIEW ────────────────────────────────────────────────────────────────────
async function viewClaim(id) {
    try {
        const res  = await fetch(API + `claim-list.php?id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Error loading claim'); return; }
        const c = data.claim;
        currentClaimId = id;

        document.getElementById('viewModalTitle').textContent = `Claim — ${c.claim_no}`;
        document.getElementById('viewModalBody').innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-file-alt"></i> Claim Information</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Claim No</span><span class="detail-value">${c.claim_no}</span></div>
                    <div class="detail-item"><span class="detail-label">Claim Date</span><span class="detail-value">${c.claim_date}</span></div>
                    <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="badge ${statusBadge(c.claim_status)}">${c.claim_status}</span></span></div>
                    <div class="detail-item"><span class="detail-label">Priority</span><span class="detail-value"><span class="priority-${(c.claim_priority||'').toLowerCase()}">${c.claim_priority}</span></span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-certificate"></i> Warranty Reference</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Warranty No</span><span class="detail-value">${c.warranty_no || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Warranty Type</span><span class="detail-value">${c.warranty_type || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Start Date</span><span class="detail-value">${c.warranty_start_date || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Expiry Date</span><span class="detail-value">${c.warranty_expiry_date || '-'}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-user"></i> Customer</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name</span><span class="detail-value">${esc(c.customer_name)}</span></div>
                    <div class="detail-item"><span class="detail-label">Phone</span><span class="detail-value">${c.phone_number || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${c.email || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Address</span><span class="detail-value">${esc(c.address || '-')}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-box"></i> Product</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Product</span><span class="detail-value">${esc(c.product_name)}</span></div>
                    <div class="detail-item"><span class="detail-label">Invoice No</span><span class="detail-value">${c.invoice_no || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Chassis No</span><span class="detail-value">${c.chassis_no || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Motor No</span><span class="detail-value">${c.motor_no || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Colour</span><span class="detail-value">${c.colour || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Sale Date</span><span class="detail-value">${c.sale_date || '-'}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-exclamation-triangle"></i> Claim Details</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Claim Type</span><span class="detail-value">${c.claim_type}</span></div>
                    <div class="detail-item"><span class="detail-label">Fault Category</span><span class="detail-value">${c.fault_category}</span></div>
                </div>
                <div style="margin-top:10px;">
                    <div class="detail-item"><span class="detail-label">Problem Description</span><span class="detail-value" style="margin-top:4px;">${esc(c.problem_description)}</span></div>
                    ${c.customer_complaint ? `<div class="detail-item" style="margin-top:8px;"><span class="detail-label">Customer Complaint</span><span class="detail-value" style="margin-top:4px;">${esc(c.customer_complaint)}</span></div>` : ''}
                </div>
            </div>
            ${c.inspection_date || c.inspected_by || c.inspection_findings ? `
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-search"></i> Inspection</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Inspection Date</span><span class="detail-value">${c.inspection_date || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Inspected By</span><span class="detail-value">${esc(c.inspected_by || '-')}</span></div>
                </div>
                ${c.inspection_findings ? `<div class="detail-item" style="margin-top:8px;"><span class="detail-label">Findings</span><span class="detail-value" style="margin-top:4px;">${esc(c.inspection_findings)}</span></div>` : ''}
            </div>` : ''}
            ${c.resolution_date || c.resolved_by || c.resolution_details ? `
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-check-circle"></i> Resolution</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Resolution Date</span><span class="detail-value">${c.resolution_date || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Resolved By</span><span class="detail-value">${esc(c.resolved_by || '-')}</span></div>
                </div>
                ${c.resolution_details ? `<div class="detail-item" style="margin-top:8px;"><span class="detail-label">Resolution Details</span><span class="detail-value" style="margin-top:4px;">${esc(c.resolution_details)}</span></div>` : ''}
            </div>` : ''}
            ${(() => { try { const items = JSON.parse(c.claim_items_json || '[]'); return items.length ? `
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-tools"></i> Claim Items / Components</div>
                <table style="width:100%;font-size:12px;border-collapse:collapse;border:1px solid #e2e8f0;">
                    <thead><tr style="background:#f8fafc;">
                        <th style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">Component</th>
                        <th style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">Serial No</th>
                        <th style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">Warranty Status</th>
                        <th style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">Issue</th>
                    </tr></thead>
                    <tbody>${items.map(it => `<tr>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;"><strong>${esc(it.component_name)}</strong></td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${it.serial_no||'-'}</td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;"><span class="${it.warranty_status==='Valid'?'ws-valid':it.warranty_status==='Expired'?'ws-expired':'ws-unknown'}">${it.warranty_status||'-'}</span></td>
                        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${esc(it.issue_description)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>` : ''; } catch(e){ return ''; } })()}
        `;
        document.getElementById('viewModal').classList.add('show');
    } catch (e) { alert('Error: ' + e.message); }
}

// ─── EDIT ────────────────────────────────────────────────────────────────────
async function editClaim(id) {
    try {
        const res  = await fetch(API + `claim-list.php?id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Error loading claim'); return; }
        const c = data.claim;
        editingId = id;

        document.getElementById('claimNo').value              = c.claim_no;
        document.getElementById('claimDate').value            = c.claim_date;
        document.getElementById('claimStatus').value          = c.claim_status;
        document.getElementById('claimPriority').value        = c.claim_priority;
        document.getElementById('warrantySearch').value       = c.warranty_no || '';
        document.getElementById('warrantyId').value           = c.warranty_id || '';
        document.getElementById('warrantyType').value         = c.warranty_type || '';
        document.getElementById('warrantyStart').value        = c.warranty_start_date || '';
        document.getElementById('warrantyExpiry').value       = c.warranty_expiry_date || '';
        document.getElementById('customerSearch').value       = c.customer_name;
        document.getElementById('customerId').value           = c.customer_id || '';
        document.getElementById('phoneNumber').value          = c.phone_number || '';
        document.getElementById('email').value                = c.email || '';
        document.getElementById('address').value              = c.address || '';
        document.getElementById('productName').value          = c.product_name;
        document.getElementById('chassisNo').value            = c.chassis_no || '';
        document.getElementById('motorNo').value              = c.motor_no || '';
        document.getElementById('colour').value               = c.colour || '';
        document.getElementById('saleDate').value             = c.sale_date || '';
        document.getElementById('invoiceNo').value            = c.invoice_no || '';
        document.getElementById('claimType').value            = c.claim_type;
        document.getElementById('faultCategory').value        = c.fault_category;
        document.getElementById('problemDescription').value   = c.problem_description;
        document.getElementById('customerComplaint').value    = c.customer_complaint || '';
        document.getElementById('inspectionDate').value       = c.inspection_date || '';
        document.getElementById('inspectedBy').value          = c.inspected_by || '';
        document.getElementById('inspectionFindings').value   = c.inspection_findings || '';
        document.getElementById('resolutionDate').value       = c.resolution_date || '';
        document.getElementById('resolvedBy').value           = c.resolved_by || '';
        document.getElementById('resolutionDetails').value    = c.resolution_details || '';
        document.getElementById('notes').value                = c.notes || '';

        // Load claim items
        try { claimItems = JSON.parse(c.claim_items_json || '[]'); } catch(e) { claimItems = []; }
        renderClaimItems();

        // Expiry check
        checkExpiryWarning(c.warranty_expiry_date);

        document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Claim';
        document.getElementById('formCard').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { alert('Error: ' + e.message); }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
async function deleteClaim(id) {
    if (!confirm('Delete this warranty claim?')) return;
    try {
        const res  = await fetch(API + `claim-add.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) loadClaimList();
        else alert('Error: ' + data.message);
    } catch (e) { alert('Error: ' + e.message); }
}

// ─── PRINT ───────────────────────────────────────────────────────────────────
function printClaim(id) {
    window.open(`claim-print.php?id=${id}`, '_blank');
}

// ─── BIND EVENTS ─────────────────────────────────────────────────────────────
function bindEvents() {
    document.getElementById('claimForm').addEventListener('submit', e => { e.preventDefault(); saveClaim(); });
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('refreshListBtn').addEventListener('click', loadClaimList);
    document.getElementById('searchInput').addEventListener('input', filterList);
    document.getElementById('filterStatus').addEventListener('change', filterList);

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

    // Claim item modal
    document.getElementById('addClaimItemBtn').addEventListener('click', openClaimItemModal);
    document.getElementById('closeClaimItemModal').addEventListener('click', () => document.getElementById('addClaimItemModal').classList.remove('show'));
    document.getElementById('cancelClaimItemBtn').addEventListener('click', () => document.getElementById('addClaimItemModal').classList.remove('show'));
    document.getElementById('confirmClaimItemBtn').addEventListener('click', confirmClaimItem);
    document.getElementById('addClaimItemModal').addEventListener('click', e => {
        if (e.target === document.getElementById('addClaimItemModal')) document.getElementById('addClaimItemModal').classList.remove('show');
    });

    document.getElementById('closeViewModal').addEventListener('click',    () => document.getElementById('viewModal').classList.remove('show'));
    document.getElementById('closeViewModalBtn').addEventListener('click', () => document.getElementById('viewModal').classList.remove('show'));
    document.getElementById('printClaimBtn').addEventListener('click', () => { if (currentClaimId) printClaim(currentClaimId); });
    document.getElementById('viewModal').addEventListener('click', e => {
        if (e.target === document.getElementById('viewModal')) document.getElementById('viewModal').classList.remove('show');
    });
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.viewClaim   = viewClaim;
window.editClaim   = editClaim;
window.deleteClaim = deleteClaim;
window.printClaim  = printClaim;
