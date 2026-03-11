// Global state
let productsData = [];
let uomData = [];
let itemsTable, saveBtn, isEditMode, editId;

document.addEventListener('DOMContentLoaded', init);

function init() {
    itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    saveBtn = document.getElementById('saveBtn');
    
    const urlParams = new URLSearchParams(window.location.search);
    editId = urlParams.get('edit');
    isEditMode = editId !== null;
    
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    
    Promise.all([
        loadSuppliers(), loadBranches(), loadProducts(), 
        loadUOM(), loadCurrencies(), loadPurchaseOrders(), loadCompanies()
    ]).then(() => {
        initDropdowns();
        applySettings();
        isEditMode ? loadInvoiceData(editId) : addRow();
    });
    
    attachEventListeners();
}

function attachEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addRow);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('invoiceForm').addEventListener('submit', handleSubmit);
    document.getElementById('currency').addEventListener('change', updateCurrencySymbols);
    document.getElementById('totalDiscountPercent').addEventListener('input', updateSummary);
    document.getElementById('totalDiscountAmount').addEventListener('input', updateSummaryFromAmount);
    document.getElementById('whtRate').addEventListener('input', updateSummary);
    document.getElementById('shippingFees').addEventListener('input', updateSummary);
    
    // Modals
    document.getElementById('addSupplierBtn').addEventListener('click', () => openModal('supplier'));
    document.getElementById('addProductBtn').addEventListener('click', () => openModal('product'));
    document.getElementById('closeSupplierModalBtn').addEventListener('click', () => closeModal('supplier'));
    document.getElementById('closeProductModalBtn').addEventListener('click', () => closeModal('product'));
    document.getElementById('invoiceSettingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'none');
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('printLaterBtn').addEventListener('click', () => { document.getElementById('successModal').style.display = 'none'; performReset(); });
    document.getElementById('printInvoiceBtn').addEventListener('click', printInvoice);
    
    saveBtn.addEventListener('keydown', e => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('supplierCodeSearch').focus();
        }
    });
}

// Data Loading
async function loadSuppliers() {
    const data = await fetchAPI('get-suppliers.php');
    if (data.success) {
        populateDropdown('supplierCodeOptions', data.suppliers.map(s => ({
            value: s.id,
            text: `${s.supplier_code} - ${s.supplier_name}`,
            balance: s.current_balance
        })));
    }
}

async function loadBranches() {
    const data = await fetchAPI('get-branches.php');
    if (data.success) {
        populateDropdown('branchOptions', data.branches.map(b => ({
            value: b.id,
            text: b.parent_branch_name 
                ? `${b.parent_branch_name} > ${b.branch_code} - ${b.branch_name} (${b.branch_type})`
                : `${b.branch_code} - ${b.branch_name} (${b.branch_type})`
        })));
    }
}

async function loadProducts() {
    const data = await fetchAPI('get-products.php');
    if (data.success) productsData = data.products;
}

async function loadUOM() {
    const data = await fetchAPI('get-uom.php');
    if (data.success) uomData = data.uoms;
}

async function loadCurrencies() {
    const data = await fetchAPI('get-currencies.php');
    if (data.success) {
        const select = document.getElementById('currency');
        select.innerHTML = '<option value="">Select Currency</option>';
        data.currencies.forEach(c => {
            const opt = new Option(`${c.code} - ${c.name} (${c.symbol})`, c.currency_id, c.is_base_currency == 1, c.is_base_currency == 1);
            opt.dataset.symbol = c.symbol;
            select.add(opt);
        });
        updateCurrencySymbols();
    }
}

async function loadCompanies() {
    const data = await fetchAPI('get-companies.php');
    if (data.success) {
        const select = document.getElementById('company');
        select.innerHTML = '<option value="">Select Company</option>';
        data.companies.forEach(c => select.add(new Option(`${c.company_code} - ${c.company_name}`, c.id)));
        if (data.companies.length === 1) select.value = data.companies[0].id;
    }
}

async function loadPurchaseOrders() {
    const data = await fetchAPI('get-purchase-orders.php');
    if (data.success) {
        populateDropdown('purchaseOrderOptions', data.orders.map(o => ({
            value: o.id,
            text: o.bill_no
        })));
    }
}

async function loadSubAccounts(supplierId) {
    const data = await fetchAPI(`get-sub-accounts.php?supplier_id=${supplierId}`);
    if (data.success && data.subAccounts.length > 0) {
        populateDropdown('subAccountOptions', data.subAccounts.map(s => ({
            value: s.id,
            text: s.sub_account_name
        })));
    }
}

// Utilities
async function fetchAPI(endpoint) {
    try {
        const res = await fetch(`../../../../server/api/purchase/purchase_invoice/${endpoint}`);
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false };
    }
}

function populateDropdown(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => 
        `<div class="dropdown-option" data-value="${item.value}" ${item.balance !== undefined ? `data-balance="${item.balance}"` : ''}>${item.text}</div>`
    ).join('');
}

function updateCurrencySymbols() {
    const select = document.getElementById('currency');
    const symbol = select.options[select.selectedIndex]?.dataset.symbol || '';
    if (symbol) {
        ['purchasePrice', 'grossAmount', 'discountAmount', 'netAmount'].forEach(id => {
            document.getElementById(`${id}Label`).textContent = `${id.replace(/([A-Z])/g, ' $1').trim()} (${symbol})`;
        });
        ['totalBill', 'totalDiscountAmount', 'netAmountSummary'].forEach(id => {
            document.getElementById(`${id}Label`).textContent = `${id.replace(/([A-Z])/g, ' $1').replace('Summary', '').trim()} (${symbol})`;
        });
    }
}
// Dropdown Management
function initDropdowns() {
    initSearchable('supplierCodeSearch', 'supplierCodeOptions', 'supplierCode', onSupplierSelect);
    initSearchable('branchSearch', 'branchOptions', 'branch');
    initSearchable('purchaseOrderSearch', 'purchaseOrderOptions', 'purchaseOrder', onPurchaseOrderSelect);
    initSearchable('subAccountSearch', 'subAccountOptions', 'subAccount');
}

function initSearchable(searchId, optionsId, hiddenId, onSelect) {
    const search = document.getElementById(searchId);
    const options = document.getElementById(optionsId);
    const hidden = document.getElementById(hiddenId);
    let selectedIndex = -1;

    search.addEventListener('click', e => { e.stopPropagation(); showOptions(); });
    search.addEventListener('focus', showOptions);
    search.addEventListener('input', () => { selectedIndex = -1; filterOptions(); });
    
    search.addEventListener('keydown', e => {
        const visible = Array.from(options.querySelectorAll('.dropdown-option')).filter(o => o.style.display !== 'none');
        if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, visible.length - 1); updateHighlight(visible); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, -1); updateHighlight(visible); }
        else if (e.key === 'Enter') { e.preventDefault(); (visible[selectedIndex] || visible[0])?.click(); }
    });

    options.addEventListener('click', e => {
        if (e.target.classList.contains('dropdown-option')) {
            search.value = e.target.textContent;
            hidden.value = e.target.dataset.value;
            options.style.display = 'none';
            hidden.classList.remove('error');
            document.getElementById(hiddenId + 'Error')?.style.remove('display');
            if (onSelect) onSelect(e.target);
        }
    });

    document.addEventListener('click', () => options.style.display = 'none');

    function showOptions() { options.style.display = 'block'; filterOptions(); }
    function filterOptions() {
        const term = search.value.toLowerCase();
        options.querySelectorAll('.dropdown-option').forEach(o => {
            o.style.display = o.textContent.toLowerCase().includes(term) ? 'block' : 'none';
            o.style.backgroundColor = '';
        });
    }
    function updateHighlight(visible) {
        visible.forEach((o, i) => o.style.backgroundColor = i === selectedIndex ? 'var(--surface-1)' : '');
    }
}

function onSupplierSelect(target) {
    const balance = parseFloat(target.dataset.balance);
    document.getElementById('previousBalance').value = `${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toFixed(2)}`;
    loadSubAccounts(target.dataset.value);
    updateWHTRate();
}

async function onPurchaseOrderSelect(target) {
    const data = await fetchAPI(`get-purchase-order-details.php?id=${target.dataset.value}`);
    if (data.success) populateFromPO(data.order, data.items);
}

function populateFromPO(order, items) {
    document.getElementById('supplierInvoiceNo').value = order.supplier_invoice_no || '';
    document.getElementById('supplierInvoiceDate').value = order.supplier_invoice_date || '';
    document.getElementById('biltyNo').value = order.bilty_no || '';
    document.getElementById('transportName').value = order.transport_name || '';
    document.getElementById('remarks').value = order.remarks || '';
    document.getElementById('supplierCodeSearch').value = `${order.supplier_code} - ${order.supplier_name}`;
    document.getElementById('supplierCode').value = order.supplier_id;
    document.getElementById('currency').value = order.currency_id;
    document.getElementById('company').value = order.company_id;
    updateCurrencySymbols();
    
    clearTable();
    items.forEach(item => {
        addRow();
        const row = itemsTable.rows[itemsTable.rows.length - 1];
        fillRow(row, item);
    });
    updateSummary();
}

// Row Management
function addRow() {
    const row = itemsTable.insertRow();
    row.innerHTML = `
        <td>${itemsTable.rows.length}</td>
        <td><div class="searchable-dropdown">
            <input type="text" class="search-input table-input" placeholder="Search product...">
            <input type="hidden" class="item-code" required>
        </div></td>
        <td><select class="table-input" required tabindex="-1"><option value="">Select Unit</option>${uomData.map(u => `<option value="${u.id}">${u.uom_name}</option>`).join('')}</select></td>
        <td><input type="number" class="table-input qty" min="0" step="0.01" required></td>
        <td><input type="number" class="table-input" min="0" step="0.01" value="0"></td>
        <td><input type="number" class="table-input" min="0" step="0.01" value="0"></td>
        <td><input type="number" class="table-input" min="0" step="0.01" value="0"></td>
        <td><input type="number" class="table-input price" min="0" step="0.01" required></td>
        <td><input type="text" class="table-input" readonly value="0.00" tabindex="-1"></td>
        <td><input type="number" class="table-input disc-pct" min="0" max="100" step="0.01" value="0"></td>
        <td><input type="number" class="table-input disc-amt" min="0" step="0.01" value="0.00"></td>
        <td><input type="number" class="table-input to-pct" min="0" max="100" step="0.01" value="0"></td>
        <td><input type="number" class="table-input to-amt" min="0" step="0.01" value="0.00"></td>
        <td><input type="number" class="table-input tax-pct" min="0" max="100" step="0.01" value="0" readonly tabindex="-1"></td>
        <td><input type="text" class="table-input tax-amt" readonly value="0.00" tabindex="-1"></td>
        <td><input type="number" class="table-input foc" min="0" step="0.01" value="0"></td>
        <td><input type="text" class="table-input net" readonly value="0.00" tabindex="0"></td>
        <td>
            <button type="button" class="btn btn-secondary btn-sm" style="display:none;" tabindex="-1"><i class="fas fa-boxes"></i></button>
            <button type="button" class="btn btn-danger btn-sm" tabindex="-1"><i class="fas fa-trash"></i></button>
        </td>
    `;
    
    initTableRow(row);
    applyRowSettings(row);
}

function initTableRow(row) {
    const dropdown = row.cells[1].querySelector('.searchable-dropdown');
    const search = dropdown.querySelector('.search-input');
    const hidden = dropdown.querySelector('.item-code');
    
    const opts = document.createElement('div');
    opts.className = 'dropdown-options';
    opts.style.cssText = 'position:absolute;display:none;z-index:9999';
    opts.innerHTML = productsData.map(p => 
        `<div class="dropdown-option" data-value="${p.id}" data-price="${p.purchase_price}" data-unit="${p.default_unit_id}" data-discount="${p.default_discount || 0}" data-trade="${p.trade_offer_discount || 0}" data-foc="${p.default_foc || 0}" data-type="${p.product_type || 'physical'}">${p.code} - ${p.name}</div>`
    ).join('');
    document.body.appendChild(opts);
    search.dropdownOptions = opts;
    
    search.addEventListener('click', e => { e.stopPropagation(); showDropdown(); });
    search.addEventListener('focus', showDropdown);
    search.addEventListener('input', filterDropdown);
    
    opts.addEventListener('click', async e => {
        if (e.target.classList.contains('dropdown-option')) {
            search.value = e.target.textContent;
            hidden.value = e.target.dataset.value;
            row.cells[2].querySelector('select').value = e.target.dataset.unit;
            row.cells[7].querySelector('input').value = e.target.dataset.price;
            row.cells[9].querySelector('input').value = e.target.dataset.discount;
            row.cells[11].querySelector('input').value = e.target.dataset.trade;
            row.cells[15].querySelector('input').value = e.target.dataset.foc;
            row.dataset.productId = e.target.dataset.value;
            row.dataset.productType = e.target.dataset.type;
            
            // Fetch tax info
            const enableSalesTax = localStorage.getItem('enableSalesTax') === 'true';
            if (enableSalesTax) {
                const invoiceDate = document.getElementById('purchaseDate').value;
                const taxInfo = await fetchAPI(`get-product-tax-info.php?product_id=${e.target.dataset.value}&date=${invoiceDate}`);
                if (taxInfo.success) {
                    row.dataset.taxRegime = taxInfo.tax_regime;
                    row.dataset.taxRate = taxInfo.tax_rate;
                    row.dataset.mrp = taxInfo.mrp;
                    row.dataset.isTaxInclusive = taxInfo.is_tax_inclusive;
                    row.dataset.hsCodeRate = taxInfo.hs_code_rate || 0;
                    row.cells[13].querySelector('input').value = taxInfo.tax_rate.toFixed(2);
                }
            }
            
            checkAndShowVariantsButton(row, e.target.dataset.value);
            opts.style.display = 'none';
            updateWHTRate();
            row.cells[3].querySelector('input').focus();
        }
    });
    
    function showDropdown() {
        const rect = search.getBoundingClientRect();
        opts.style.top = (rect.bottom + window.scrollY) + 'px';
        opts.style.left = rect.left + 'px';
        opts.style.width = rect.width + 'px';
        opts.style.display = 'block';
        filterDropdown();
    }
    
    function filterDropdown() {
        const term = search.value.toLowerCase();
        opts.querySelectorAll('.dropdown-option').forEach(o => 
            o.style.display = o.textContent.toLowerCase().includes(term) ? 'block' : 'none'
        );
    }
    
    // Calculations
    const calc = () => calculate(row);
    row.cells[3].querySelector('input').addEventListener('input', calc);
    row.cells[7].querySelector('input').addEventListener('input', calc);
    row.cells[9].querySelector('input').addEventListener('input', calc);
    row.cells[10].querySelector('input').addEventListener('input', () => calcFromDiscAmt(row));
    row.cells[11].querySelector('input').addEventListener('input', calc);
    row.cells[12].querySelector('input').addEventListener('input', () => calcFromTOAmt(row));
    
    // Variants button
    row.cells[17].querySelectorAll('button')[0].addEventListener('click', () => openVariantsModal(row));
    
    // Delete
    row.cells[17].querySelectorAll('button')[1].addEventListener('click', () => {
        if (itemsTable.rows.length > 1) {
            search.dropdownOptions?.remove();
            row.remove();
            updateSerialNumbers();
            updateSummary();
        }
    });
    
    // Tab navigation
    row.cells[16].querySelector('input').addEventListener('keydown', e => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (hidden.value) {
                if (row.rowIndex < itemsTable.rows.length) {
                    itemsTable.rows[row.rowIndex].cells[1].querySelector('.search-input').focus();
                } else {
                    addRow();
                    setTimeout(() => itemsTable.rows[itemsTable.rows.length - 1].cells[1].querySelector('.search-input').focus(), 10);
                }
            } else {
                if (itemsTable.rows.length > 1) {
                    search.dropdownOptions?.remove();
                    row.remove();
                    updateSerialNumbers();
                    updateSummary();
                }
                document.getElementById('totalDiscountPercent').focus();
            }
        }
    });
}
// Calculations - UNIFIED
function calculate(row) {
    const qty = parseFloat(row.cells[3].querySelector('input').value) || 0;
    const price = parseFloat(row.cells[7].querySelector('input').value) || 0;
    const discPct = parseFloat(row.cells[9].querySelector('input').value) || 0;
    const toPct = parseFloat(row.cells[11].querySelector('input').value) || 0;
    
    const gross = qty * price;
    const discAmt = gross * (discPct / 100);
    const afterDisc = gross - discAmt;
    const toAmt = afterDisc * (toPct / 100);
    const afterTO = afterDisc - toAmt;
    
    // Calculate sales tax based on regime
    let taxAmount = 0;
    const enableSalesTax = localStorage.getItem('enableSalesTax') === 'true';
    
    if (enableSalesTax) {
        const taxRegime = row.dataset.taxRegime || 'standard';
        const taxRate = parseFloat(row.dataset.taxRate) || 0;
        const mrp = parseFloat(row.dataset.mrp) || 0;
        
        switch(taxRegime.toLowerCase()) {
            case 'standard_gst':
            case 'standard':
                taxAmount = afterTO * (taxRate / 100);
                break;
                
            case 'third_schedule':
                if (mrp > 0) {
                    const taxPerUnit = mrp - (mrp / (1 + taxRate / 100));
                    taxAmount = taxPerUnit * qty;
                }
                break;
                
            case 'mrp_tax_exclusive':
                if (mrp > 0) {
                    // Tax = MRP × Qty × Rate% (tax component only)
                    taxAmount = mrp * qty * (taxRate / 100);
                }
                break;
                
            case 'eighth_schedule':
                // Use HS code rate instead of standard tax rate
                const hsCodeRate = parseFloat(row.dataset.hsCodeRate) || 0;
                taxAmount = afterTO * (hsCodeRate / 100);
                break;
                
            case 'zero_rated':
            case 'exempt':
                taxAmount = 0;
                break;
                
            default:
                taxAmount = afterTO * (taxRate / 100);
        }
    }
    
    const net = afterTO + taxAmount;
    
    row.cells[8].querySelector('input').value = gross.toFixed(2);
    row.cells[10].querySelector('input').value = discAmt.toFixed(2);
    row.cells[12].querySelector('input').value = toAmt.toFixed(2);
    row.cells[14].querySelector('input').value = taxAmount.toFixed(2);
    row.cells[16].querySelector('input').value = net.toFixed(2);
    
    updateSummary();
}

function calcFromDiscAmt(row) {
    const gross = parseFloat(row.cells[8].querySelector('input').value) || 0;
    const discAmt = parseFloat(row.cells[10].querySelector('input').value) || 0;
    row.cells[9].querySelector('input').value = gross > 0 ? ((discAmt / gross) * 100).toFixed(2) : '0';
    calculate(row);
}

function calcFromTOAmt(row) {
    const afterDisc = parseFloat(row.cells[8].querySelector('input').value) - parseFloat(row.cells[10].querySelector('input').value);
    const toAmt = parseFloat(row.cells[12].querySelector('input').value) || 0;
    row.cells[11].querySelector('input').value = afterDisc > 0 ? ((toAmt / afterDisc) * 100).toFixed(2) : '0';
    calculate(row);
}

function updateSummary() {
    let totalBill = 0, totalQty = 0, totalPcs = 0, totalCtn = 0, totalDz = 0;
    let totalPrice = 0, totalGross = 0, totalDisc = 0, totalTO = 0, totalTax = 0, totalFOC = 0, totalNet = 0;
    
    Array.from(itemsTable.rows).forEach(row => {
        totalQty += parseFloat(row.cells[3].querySelector('input').value) || 0;
        totalPcs += parseFloat(row.cells[4].querySelector('input').value) || 0;
        totalCtn += parseFloat(row.cells[5].querySelector('input').value) || 0;
        totalDz += parseFloat(row.cells[6].querySelector('input').value) || 0;
        totalPrice += parseFloat(row.cells[7].querySelector('input').value) || 0;
        totalGross += parseFloat(row.cells[8].querySelector('input').value) || 0;
        totalDisc += parseFloat(row.cells[10].querySelector('input').value) || 0;
        totalTO += parseFloat(row.cells[12].querySelector('input').value) || 0;
        totalTax += parseFloat(row.cells[14].querySelector('input').value) || 0;
        totalFOC += parseFloat(row.cells[15].querySelector('input').value) || 0;
        totalNet += parseFloat(row.cells[16].querySelector('input').value) || 0;
        totalBill += parseFloat(row.cells[16].querySelector('input').value) || 0;
    });
    
    document.getElementById('totalQty').textContent = totalQty.toFixed(2);
    document.getElementById('totalPcs').textContent = totalPcs.toFixed(2);
    document.getElementById('totalCtn').textContent = totalCtn.toFixed(2);
    document.getElementById('totalDz').textContent = totalDz.toFixed(2);
    document.getElementById('totalPurchasePrice').textContent = totalPrice.toFixed(2);
    document.getElementById('totalGrossAmount').textContent = totalGross.toFixed(2);
    document.getElementById('totalDiscountAmountItems').textContent = totalDisc.toFixed(2);
    document.getElementById('totalTradeOfferAmountItems').textContent = totalTO.toFixed(2);
    document.getElementById('totalSalesTaxAmountItems').textContent = totalTax.toFixed(2);
    document.getElementById('totalFOCQty').textContent = totalFOC.toFixed(2);
    document.getElementById('totalNetAmountItems').textContent = totalNet.toFixed(2);
    document.getElementById('totalBill').textContent = totalBill.toFixed(2);
    
    const discPct = parseFloat(document.getElementById('totalDiscountPercent').value) || 0;
    const discAmt = totalBill * (discPct / 100);
    const afterDiscount = totalBill - discAmt;
    
    document.getElementById('totalDiscountAmount').value = discAmt.toFixed(2);
    document.getElementById('totalSalesTax').textContent = totalTax.toFixed(2);
    
    // Calculate WHT
    const enableWHT = localStorage.getItem('enableWHT') === 'true';
    let whtAmount = 0;
    if (enableWHT) {
        const whtRate = parseFloat(document.getElementById('whtRate').value) || 0;
        const subtotalInclTax = afterDiscount + totalTax;
        whtAmount = subtotalInclTax * (whtRate / 100);
    }
    document.getElementById('whtAmount').textContent = whtAmount.toFixed(2);
    
    const shipping = parseFloat(document.getElementById('shippingFees').value) || 0;
    const netAmount = afterDiscount + totalTax - whtAmount + shipping;
    
    document.getElementById('netAmount').textContent = netAmount.toFixed(2);
}

function updateSummaryFromAmount() {
    const totalBill = parseFloat(document.getElementById('totalBill').textContent) || 0;
    const discAmt = parseFloat(document.getElementById('totalDiscountAmount').value) || 0;
    const discPct = totalBill > 0 ? (discAmt / totalBill) * 100 : 0;
    document.getElementById('totalDiscountPercent').value = discPct.toFixed(2);
    updateSummary();
}

function updateSerialNumbers() {
    Array.from(itemsTable.rows).forEach((row, i) => row.cells[0].textContent = i + 1);
}

// Form Operations
function handleSubmit(e) {
    e.preventDefault();
    if (validateForm()) saveInvoice();
}

function validateForm() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    const required = [
        { id: 'company', errorId: 'companyError' },
        { id: 'supplierCode', errorId: 'supplierCodeError' },
        { id: 'branch', errorId: 'branchError' },
        { id: 'currency', errorId: 'currencyError' }
    ];
    
    let valid = true;
    required.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el.value) {
            el.classList.add('error');
            document.getElementById(f.errorId).style.display = 'block';
            valid = false;
        }
    });
    
    if (itemsTable.rows.length === 0) {
        alert('Please add at least one item');
        return false;
    }
    
    for (let row of itemsTable.rows) {
        if (!row.cells[1].querySelector('.item-code').value || 
            !row.cells[2].querySelector('select').value ||
            !row.cells[3].querySelector('input').value ||
            !row.cells[7].querySelector('input').value) {
            alert('Please fill all required fields in items table');
            return false;
        }
    }
    
    return valid;
}

async function saveInvoice() {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const formData = {
        purchaseDate: document.getElementById('purchaseDate').value,
        supplierInvoiceNo: document.getElementById('supplierInvoiceNo').value || null,
        supplierInvoiceDate: document.getElementById('supplierInvoiceDate').value || null,
        purchaseOrderId: document.getElementById('purchaseOrder').value || null,
        biltyNo: document.getElementById('biltyNo').value || null,
        transportName: document.getElementById('transportName').value || null,
        companyId: document.getElementById('company').value,
        supplierId: document.getElementById('supplierCode').value,
        subAccountId: document.getElementById('subAccount').value || null,
        branchId: document.getElementById('branch').value,
        currencyId: document.getElementById('currency').value,
        previousBalance: parseFloat(document.getElementById('previousBalance').value) || 0,
        totalBill: parseFloat(document.getElementById('totalBill').textContent),
        totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent').value) || 0,
        totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount').value),
        totalSalesTaxAmount: parseFloat(document.getElementById('totalSalesTax').textContent) || 0,
        whtRate: parseFloat(document.getElementById('whtRate').value) || 0,
        whtAmount: parseFloat(document.getElementById('whtAmount').textContent) || 0,
        shippingFees: parseFloat(document.getElementById('shippingFees').value) || 0,
        netAmount: parseFloat(document.getElementById('netAmount').textContent),
        remarks: document.getElementById('remarks').value,
        items: []
    };
    
    if (isEditMode) formData.invoice_id = editId;
    
    Array.from(itemsTable.rows).forEach((row, index) => {
        formData.items.push({
            productId: row.cells[1].querySelector('.item-code').value,
            uomId: row.cells[2].querySelector('select').value,
            vehicleNo: null,
            quantity: parseFloat(row.cells[3].querySelector('input').value),
            pcs: parseFloat(row.cells[4].querySelector('input').value) || 0,
            ctn: parseFloat(row.cells[5].querySelector('input').value) || 0,
            dz: parseFloat(row.cells[6].querySelector('input').value) || 0,
            purchasePrice: parseFloat(row.cells[7].querySelector('input').value),
            grossAmount: parseFloat(row.cells[8].querySelector('input').value),
            discountPercent: parseFloat(row.cells[9].querySelector('input').value) || 0,
            discountAmount: parseFloat(row.cells[10].querySelector('input').value),
            tradeOfferPercent: parseFloat(row.cells[11].querySelector('input').value) || 0,
            tradeOfferAmount: parseFloat(row.cells[12].querySelector('input').value) || 0,
            salesTaxPercent: parseFloat(row.cells[13].querySelector('input').value) || 0,
            salesTaxAmount: parseFloat(row.cells[14].querySelector('input').value) || 0,
            focQty: parseFloat(row.cells[15].querySelector('input').value) || 0,
            netAmount: parseFloat(row.cells[16].querySelector('input').value),
            parentRowId: null
        });
        
        // Add child products
        if (row.dataset.childProducts) {
            const children = JSON.parse(row.dataset.childProducts);
            children.forEach(child => {
                formData.items.push({
                    productId: child.product_id,
                    uomId: child.uom_id,
                    quantity: parseFloat(child.quantity),
                    pcs: 0,
                    ctn: 0,
                    dz: 0,
                    purchasePrice: parseFloat(child.purchase_price) || 0,
                    grossAmount: 0,
                    discountPercent: 0,
                    discountAmount: 0,
                    tradeOfferPercent: 0,
                    tradeOfferAmount: 0,
                    salesTaxPercent: 0,
                    salesTaxAmount: 0,
                    focQty: 0,
                    netAmount: 0,
                    parentRowId: index + 1,
                    stockAffects: parseInt(child.stock_affects) || 0,
                    invoiceAffects: parseInt(child.invoice_affects) || 0
                });
            });
        }
    });
    
    const url = isEditMode ? 'purchase-edit.php' : 'purchase-add.php';
    const method = isEditMode ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(`../../../../server/api/purchase/purchase_invoice/${url}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        
        if (data.success) {
            window.lastInvoiceId = data.invoice_id;
            document.getElementById('successModal').style.display = 'flex';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error saving invoice: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
    }
}

function resetForm() {
    if (!confirm('Reset form? All data will be lost.')) return;
    performReset();
}

function performReset() {
    clearTable();
    document.getElementById('invoiceForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('supplierCodeSearch').value = '';
    document.getElementById('branchSearch').value = '';
    document.getElementById('previousBalance').value = '0.00';
    document.getElementById('totalBill').textContent = '0.00';
    document.getElementById('netAmount').textContent = '0.00';
    loadCurrencies();
    addRow();
}

function clearTable() {
    Array.from(itemsTable.rows).forEach(row => {
        row.cells[1].querySelector('.search-input').dropdownOptions?.remove();
    });
    itemsTable.innerHTML = '';
}

function fillRow(row, data) {
    row.cells[1].querySelector('.search-input').value = data.product_name;
    row.cells[1].querySelector('.item-code').value = data.product_id;
    row.cells[2].querySelector('select').value = data.uom_id;
    row.cells[3].querySelector('input').value = data.quantity;
    row.cells[7].querySelector('input').value = data.purchase_price;
    row.cells[8].querySelector('input').value = data.gross_amount;
    row.cells[9].querySelector('input').value = data.discount_percent;
    row.cells[10].querySelector('input').value = data.discount_amount;
    row.cells[11].querySelector('input').value = data.trade_offer_percent || 0;
    row.cells[12].querySelector('input').value = data.trade_offer_amount || 0;
    row.cells[13].querySelector('input').value = data.foc_quantity || 0;
    row.cells[14].querySelector('input').value = data.net_amount;
}
// Edit Mode
async function loadInvoiceData(invoiceId) {
    const data = await fetchAPI(`purchase-edit.php?id=${invoiceId}`);
    if (!data.success) {
        alert('Error loading invoice: ' + data.message);
        window.location.href = 'purchase-list.php';
        return;
    }
    
    const inv = data.invoice;
    document.getElementById('purchaseDate').value = inv.purchase_date;
    document.getElementById('supplierInvoiceNo').value = inv.supplier_invoice_no || '';
    document.getElementById('supplierInvoiceDate').value = inv.supplier_invoice_date || '';
    document.getElementById('biltyNo').value = inv.bilty_no || '';
    document.getElementById('transportName').value = inv.transport_name || '';
    document.getElementById('company').value = inv.company_id || '';
    document.getElementById('supplierCodeSearch').value = inv.supplier_name;
    document.getElementById('supplierCode').value = inv.supplier_id;
    document.getElementById('branchSearch').value = inv.parent_branch_name 
        ? `${inv.parent_branch_name} > ${inv.branch_code} - ${inv.branch_name} (${inv.branch_type})`
        : `${inv.branch_code} - ${inv.branch_name} (${inv.branch_type})`;
    document.getElementById('branch').value = inv.branch_id;
    document.getElementById('currency').value = inv.currency_id;
    document.getElementById('previousBalance').value = inv.previous_balance;
    document.getElementById('remarks').value = inv.remarks || '';
    
    if (inv.supplier_id) {
        await loadSubAccounts(inv.supplier_id);
        if (inv.sub_account_id) {
            document.getElementById('subAccount').value = inv.sub_account_id;
            document.getElementById('subAccountSearch').value = inv.sub_account_name || '';
        }
    }
    
    updateCurrencySymbols();
    
    data.items.filter(i => !i.parent_row_id).forEach(item => {
        addRow();
        fillRow(itemsTable.rows[itemsTable.rows.length - 1], item);
    });
    
    document.getElementById('totalDiscountPercent').value = inv.total_discount_percent;
    document.getElementById('totalDiscountAmount').value = inv.total_discount_amount;
    updateSummary();
    
    document.querySelector('.page-title').textContent = `Edit Purchase Invoice - ${inv.bill_no}`;
}

// Settings
function applySettings() {
    const settings = {
        pcs: localStorage.getItem('enablePcs') === 'true',
        ctn: localStorage.getItem('enableCtn') === 'true',
        dz: localStorage.getItem('enableDz') === 'true',
        discPct: localStorage.getItem('enableInlineCashDiscount') === 'true',
        discAmt: localStorage.getItem('enableInlineCashDiscountAmount') === 'true',
        toPct: localStorage.getItem('enableTradeOffer') === 'true',
        toAmt: localStorage.getItem('enableTradeOfferAmount') === 'true',
        tax: localStorage.getItem('enableSalesTax') === 'true',
        foc: localStorage.getItem('enableFOC') === 'true',
        invDiscPct: localStorage.getItem('enableInvoiceCashDiscount') === 'true',
        invDiscAmt: localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true',
        wht: localStorage.getItem('enableWHT') === 'true',
        shipping: localStorage.getItem('enableShippingFees') === 'true'
    };
    
    const table = document.getElementById('itemsTable');
    const cols = { pcs: 4, ctn: 5, dz: 6, discPct: 9, discAmt: 10, toPct: 11, toAmt: 12, tax: 13, taxAmt: 14, foc: 15 };
    
    // Headers
    Object.entries(cols).forEach(([key, col]) => {
        const display = key === 'taxAmt' ? settings.tax : settings[key];
        table.querySelector('thead tr').cells[col].style.display = display ? '' : 'none';
        table.querySelector('tfoot tr').cells[col].style.display = display ? '' : 'none';
    });
    
    // Summary
    const discPctItem = document.getElementById('totalDiscountPercent')?.closest('.summary-item');
    const discAmtItem = document.getElementById('totalDiscountAmount')?.closest('.summary-item');
    const salesTaxItem = document.getElementById('totalSalesTax')?.closest('.summary-item');
    const whtRateItem = document.getElementById('whtRate')?.closest('.summary-item');
    const whtAmtItem = document.getElementById('whtAmount')?.closest('.summary-item');
    const shippingItem = document.getElementById('shippingFees')?.closest('.summary-item');
    
    if (discPctItem) discPctItem.style.display = settings.invDiscPct ? '' : 'none';
    if (discAmtItem) discAmtItem.style.display = settings.invDiscAmt ? '' : 'none';
    if (salesTaxItem) salesTaxItem.style.display = settings.tax ? '' : 'none';
    if (whtRateItem) whtRateItem.style.display = settings.wht ? '' : 'none';
    if (whtAmtItem) whtAmtItem.style.display = settings.wht ? '' : 'none';
    if (shippingItem) shippingItem.style.display = settings.shipping ? '' : 'none';
}

function applyRowSettings(row) {
    const settings = {
        pcs: localStorage.getItem('enablePcs') === 'true',
        ctn: localStorage.getItem('enableCtn') === 'true',
        dz: localStorage.getItem('enableDz') === 'true',
        discPct: localStorage.getItem('enableInlineCashDiscount') === 'true',
        discAmt: localStorage.getItem('enableInlineCashDiscountAmount') === 'true',
        toPct: localStorage.getItem('enableTradeOffer') === 'true',
        toAmt: localStorage.getItem('enableTradeOfferAmount') === 'true',
        tax: localStorage.getItem('enableSalesTax') === 'true',
        foc: localStorage.getItem('enableFOC') === 'true'
    };
    
    const cols = { pcs: 4, ctn: 5, dz: 6, discPct: 9, discAmt: 10, toPct: 11, toAmt: 12, tax: 13, taxAmt: 14, foc: 15 };
    Object.entries(cols).forEach(([key, col]) => {
        const display = key === 'taxAmt' ? settings.tax : settings[key];
        row.cells[col].style.display = display ? '' : 'none';
    });
}

function openSettings() {
    document.getElementById('enablePcs').checked = localStorage.getItem('enablePcs') === 'true';
    document.getElementById('enableCtn').checked = localStorage.getItem('enableCtn') === 'true';
    document.getElementById('enableDz').checked = localStorage.getItem('enableDz') === 'true';
    document.getElementById('enableTradeOffer').checked = localStorage.getItem('enableTradeOffer') === 'true';
    document.getElementById('enableTradeOfferAmount').checked = localStorage.getItem('enableTradeOfferAmount') === 'true';
    document.getElementById('enableFOC').checked = localStorage.getItem('enableFOC') === 'true';
    document.getElementById('enableSalesTax').checked = localStorage.getItem('enableSalesTax') === 'true';
    document.getElementById('enableWHT').checked = localStorage.getItem('enableWHT') === 'true';
    document.getElementById('enableInlineCashDiscount').checked = localStorage.getItem('enableInlineCashDiscount') === 'true';
    document.getElementById('enableInlineCashDiscountAmount').checked = localStorage.getItem('enableInlineCashDiscountAmount') === 'true';
    document.getElementById('enableInvoiceCashDiscount').checked = localStorage.getItem('enableInvoiceCashDiscount') === 'true';
    document.getElementById('enableInvoiceCashDiscountAmount').checked = localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
    document.getElementById('enableShippingFees').checked = localStorage.getItem('enableShippingFees') === 'true';
    document.getElementById('settingsModal').style.display = 'flex';
}

async function updateWHTRate() {
    const enableWHT = localStorage.getItem('enableWHT') === 'true';
    if (!enableWHT) return;
    
    const supplierId = document.getElementById('supplierCode').value;
    if (!supplierId) return;
    
    const hasService = Array.from(itemsTable.rows).some(row => {
        return row.dataset.productType === 'service';
    });
    
    // For mixed invoices, use service rate (higher rate applies)
    const data = await fetchAPI(`get-wht-rate.php?supplier_id=${supplierId}&has_service=${hasService}&date=${document.getElementById('purchaseDate').value}`);
    if (data.success) {
        document.getElementById('whtRate').value = data.wht_rate;
        updateSummary();
    }
}

function saveSettings() {
    localStorage.setItem('enablePcs', document.getElementById('enablePcs').checked);
    localStorage.setItem('enableCtn', document.getElementById('enableCtn').checked);
    localStorage.setItem('enableDz', document.getElementById('enableDz').checked);
    localStorage.setItem('enableTradeOffer', document.getElementById('enableTradeOffer').checked);
    localStorage.setItem('enableTradeOfferAmount', document.getElementById('enableTradeOfferAmount').checked);
    localStorage.setItem('enableFOC', document.getElementById('enableFOC').checked);
    localStorage.setItem('enableSalesTax', document.getElementById('enableSalesTax').checked);
    localStorage.setItem('enableWHT', document.getElementById('enableWHT').checked);
    localStorage.setItem('enableInlineCashDiscount', document.getElementById('enableInlineCashDiscount').checked);
    localStorage.setItem('enableInlineCashDiscountAmount', document.getElementById('enableInlineCashDiscountAmount').checked);
    localStorage.setItem('enableInvoiceCashDiscount', document.getElementById('enableInvoiceCashDiscount').checked);
    localStorage.setItem('enableInvoiceCashDiscountAmount', document.getElementById('enableInvoiceCashDiscountAmount').checked);
    localStorage.setItem('enableShippingFees', document.getElementById('enableShippingFees').checked);
    document.getElementById('settingsModal').style.display = 'none';
    applySettings();
}

// Modals
function openModal(type) {
    const url = type === 'supplier' 
        ? '../../customer_supplier/suppliers/supplier-add.php'
        : '../../inventory/products/product-add.php';
    document.getElementById(`${type}Iframe`).src = url;
    document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}Modal`).style.display = 'flex';
}

function closeModal(type) {
    document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}Modal`).style.display = 'none';
    document.getElementById(`${type}Iframe`).src = '';
    if (type === 'supplier') loadSuppliers();
    else loadProducts();
}

function printInvoice() {
    document.getElementById('successModal').style.display = 'none';
    const invoiceId = isEditMode ? editId : window.lastInvoiceId;
    if (invoiceId) window.open(`invoice-print.php?id=${invoiceId}`, '_blank');
    performReset();
}

// Variants System
async function checkAndShowVariantsButton(row, productId) {
    const data = await fetchAPI(`get-child-products.php?parent_id=${productId}`);
    if (data.success && data.children.length > 0) {
        const variantsBtn = row.cells[17].querySelector('.btn-secondary');
        if (variantsBtn) variantsBtn.style.display = '';
    }
}

function openVariantsModal(parentRow) {
    const productId = parentRow.dataset.productId;
    if (!productId) return;
    
    fetchAPI(`get-child-products.php?parent_id=${productId}`).then(data => {
        if (data.success && data.children.length > 0) {
            showVariantsModal(parentRow, data.children);
        } else {
            alert('No variants found for this product.');
        }
    });
}

function showVariantsModal(parentRow, children) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const childrenHtml = children.map(child => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-default);">
            <input type="checkbox" class="variant-checkbox" data-id="${child.id}" data-name="${child.name}" data-code="${child.code}" data-unit="${child.default_unit_id}" data-stock-affects="${child.stock_affects}" data-invoice-affects="${child.invoice_affects}" style="width: auto;">
            <span style="flex: 1;">${child.code} - ${child.name}</span>
            <input type="number" class="variant-qty table-input" data-id="${child.id}" min="0" step="0.01" value="0" placeholder="Qty" style="width: 80px;" disabled>
            <input type="number" class="variant-price table-input" data-id="${child.id}" min="0" step="0.01" value="0" placeholder="Price" style="width: 100px;" disabled>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <h3 class="modal-title">Select Product Variants</h3>
            <div style="margin: 16px 0;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="selectAllVariants" style="width: auto;">
                    <strong>Select All</strong>
                </label>
                <div id="variantsContainer">${childrenHtml}</div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelVariantsBtn">Cancel</button>
                <button class="btn btn-primary" id="addVariantsBtn">Add Selected</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.variant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const qtyInput = modal.querySelector(`.variant-qty[data-id="${this.dataset.id}"]`);
            const priceInput = modal.querySelector(`.variant-price[data-id="${this.dataset.id}"]`);
            qtyInput.disabled = !this.checked;
            priceInput.disabled = !this.checked;
            if (this.checked && qtyInput.value == 0) qtyInput.value = 1;
        });
    });
    
    document.getElementById('selectAllVariants').addEventListener('change', function() {
        modal.querySelectorAll('.variant-checkbox').forEach(checkbox => {
            checkbox.checked = this.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });
    
    document.getElementById('cancelVariantsBtn').addEventListener('click', () => modal.remove());
    
    document.getElementById('addVariantsBtn').addEventListener('click', () => {
        const selected = [];
        modal.querySelectorAll('.variant-checkbox:checked').forEach(checkbox => {
            const qtyInput = modal.querySelector(`.variant-qty[data-id="${checkbox.dataset.id}"]`);
            const priceInput = modal.querySelector(`.variant-price[data-id="${checkbox.dataset.id}"]`);
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            if (qty > 0) {
                selected.push({
                    id: checkbox.dataset.id,
                    name: checkbox.dataset.name,
                    code: checkbox.dataset.code,
                    unitId: checkbox.dataset.unit,
                    qty: qty,
                    price: price,
                    stockAffects: checkbox.dataset.stockAffects,
                    invoiceAffects: checkbox.dataset.invoiceAffects
                });
            }
        });
        
        if (selected.length > 0) {
            addChildProducts(parentRow, selected);
            modal.remove();
        } else {
            alert('Please select at least one variant with quantity.');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function addChildProducts(parentRow, children) {
    const totalChildQty = children.reduce((sum, child) => sum + child.qty, 0);
    const parentQtyInput = parentRow.cells[3].querySelector('input');
    parentQtyInput.value = totalChildQty.toFixed(2);
    parentQtyInput.dispatchEvent(new Event('input'));
    
    const childProducts = children.map(child => ({
        product_id: child.id,
        product_name: child.name,
        product_code: child.code,
        uom_id: child.unitId,
        quantity: child.qty,
        purchase_price: child.price,
        stock_affects: child.stockAffects,
        invoice_affects: child.invoiceAffects
    }));
    parentRow.dataset.childProducts = JSON.stringify(childProducts);
}
