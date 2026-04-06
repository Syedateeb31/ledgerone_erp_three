let currentReturn = { items: [], customer: null, branch: null, currency: null, salesOfficer: null, supplierMan: null, subAccount: null, company: null };
let productsData = [], customersData = [], branchesData = [], currenciesData = [], bankAccountsData = [], uomData = [], invoicesData = [], employeesData = [], subAccountsData = [], companiesData = [];

const defaultShortcuts = { product: 'F1', customer: 'F2', branch: 'F3', qty: 'F4', save: 'F10', clear: 'F12' };
let shortcuts = { ...defaultShortcuts };

document.addEventListener('DOMContentLoaded', async function() {
    await Promise.all([loadProducts(), loadCustomers(), loadBranches(), loadCurrencies(), loadBankAccounts(), loadUOM(), loadSaleInvoices(), loadEmployees(), loadCompanies()]);
    loadShortcuts();
    updateDate();
    await loadNextReturnNo();
    
    initDropdown('branchSearch', 'branchOptions', 'branch', branchesData, (b) => `${b.branch_code} - ${b.branch_name} (${b.branch_type})`, (id) => { currentReturn.branch = parseInt(id); localStorage.setItem('lastSelectedBranch', id); });
    initDropdown('customerSearch', 'customerOptions', 'customer', customersData, (c) => `${c.customer_code} - ${c.customer_name}`, (id) => { 
        currentReturn.customer = parseInt(id); 
        
        // Auto-populate Supplier Man
        const customer = customersData.find(cust => cust.id == id);
        if (customer && customer.supplier_man_id) {
            const supplierMan = employeesData.find(e => e.id == customer.supplier_man_id);
            if (supplierMan) {
                document.getElementById('supplierManSearch').value = `${supplierMan.employee_id} - ${supplierMan.full_name}`;
                document.getElementById('supplierMan').value = customer.supplier_man_id;
                currentReturn.supplierMan = parseInt(customer.supplier_man_id);
            }
        }
        
        filterInvoicesByCustomer(id); 
        loadSubAccounts(id); 
    });
    initDropdown('subAccountSearch', 'subAccountOptions', 'subAccount', subAccountsData, (s) => s.sub_account_name, (id) => currentReturn.subAccount = parseInt(id));
    initDropdown('invoiceSearch', 'invoiceOptions', 'saleInvoice', invoicesData, (i) => `${i.bill_no} - ${i.customer_name} (${i.sale_date})`, (id) => loadInvoiceData(id));
    initDropdown('salesOfficerSearch', 'salesOfficerOptions', 'salesOfficer', employeesData, (e) => `${e.employee_id} - ${e.full_name}`, (id) => currentReturn.salesOfficer = parseInt(id));
    initDropdown('supplierManSearch', 'supplierManOptions', 'supplierMan', employeesData, (e) => `${e.employee_id} - ${e.full_name}`, (id) => currentReturn.supplierMan = parseInt(id));
    
    const savedBranchId = localStorage.getItem('lastSelectedBranch');
    if (savedBranchId && branchesData.find(b => b.id == savedBranchId)) {
        const branch = branchesData.find(b => b.id == savedBranchId);
        document.getElementById('branchSearch').value = `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`;
        document.getElementById('branch').value = savedBranchId;
        currentReturn.branch = parseInt(savedBranchId);
    }
    
    const savedSalesOfficer = localStorage.getItem('lastSelectedSalesOfficer');
    if (savedSalesOfficer && employeesData.find(e => e.id == savedSalesOfficer)) {
        const officer = employeesData.find(e => e.id == savedSalesOfficer);
        document.getElementById('salesOfficerSearch').value = `${officer.employee_id} - ${officer.full_name}`;
        document.getElementById('salesOfficer').value = savedSalesOfficer;
        currentReturn.salesOfficer = parseInt(savedSalesOfficer);
    } else if (userEmployeeId) {
        const currentUser = employeesData.find(e => e.id == userEmployeeId);
        if (currentUser) {
            document.getElementById('salesOfficerSearch').value = `${currentUser.employee_id} - ${currentUser.full_name}`;
            document.getElementById('salesOfficer').value = currentUser.id;
            currentReturn.salesOfficer = currentUser.id;
        }
    }
    
    const baseCurrency = currenciesData.find(c => c.is_base_currency == 1);
    if (baseCurrency) currentReturn.currency = baseCurrency.currency_id;
    
    document.getElementById('company').addEventListener('change', function() {
        currentReturn.company = parseInt(this.value) || null;
    });
    
    document.getElementById('paymentMethod').addEventListener('change', function() {
        document.getElementById('bankAccountContainer').classList.toggle('hidden', this.value !== 'bank_transfer');
    });
    
    document.getElementById('quickProduct').addEventListener('input', handleProductSearch);
    document.getElementById('quickProduct').addEventListener('keydown', handleProductKeydown);
    document.getElementById('quickQty').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('quickAddBtn').click(); } });
    document.getElementById('quickAddBtn').addEventListener('click', addProductFromQuick);
    
    document.getElementById('amountRefunded').addEventListener('input', updateSummary);
    document.getElementById('returnDiscountPercent').addEventListener('input', updateReturnDiscount);
    document.getElementById('returnDiscountAmount').addEventListener('input', updateReturnDiscount);
    
    document.getElementById('saveReturnBtn').addEventListener('click', saveReturn);
    document.getElementById('clearBtn').addEventListener('click', clearReturn);
    
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('shortcutsModal').style.display === 'flex') return;
        
        let key = e.key;
        if (key.length === 1 && key.match(/[a-z]/i)) key = key.toUpperCase();
        let combo = '';
        if (e.ctrlKey) combo += 'Ctrl+';
        if (e.altKey) combo += 'Alt+';
        if (e.shiftKey && key.length > 1) combo += 'Shift+';
        combo += key;
        
        if (combo === shortcuts.save) { e.preventDefault(); saveReturn(); }
        else if (combo === shortcuts.customer) { e.preventDefault(); document.getElementById('customerSearch').focus(); }
        else if (combo === shortcuts.product) { e.preventDefault(); document.getElementById('quickProduct').focus(); }
        else if (combo === shortcuts.branch) { e.preventDefault(); document.getElementById('branchSearch').focus(); }
        else if (combo === shortcuts.qty) { e.preventDefault(); document.getElementById('quickQty').focus(); }
        else if (combo === shortcuts.clear) { e.preventDefault(); clearReturn(); }
    });
    
    ['shortcutProduct', 'shortcutCustomer', 'shortcutBranch', 'shortcutQty', 'shortcutSave', 'shortcutClear'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('keydown', function(e) {
            e.preventDefault();
            let key = e.key;
            if (key.length === 1) key = key.toUpperCase();
            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey && key.length > 1) parts.push('Shift');
            if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') parts.push(key);
            if (parts.length > 0) this.value = parts.join('+');
        });
    });
    
    document.getElementById('saveShortcutsBtn').addEventListener('click', saveShortcuts);
    document.getElementById('resetShortcutsBtn').addEventListener('click', resetShortcuts);
    
    document.getElementById('shortcutsBtn').addEventListener('click', () => {
        document.getElementById('shortcutsModal').style.display = 'flex';
    });
    
    document.getElementById('closeShortcutsBtn').addEventListener('click', () => {
        document.getElementById('shortcutsModal').style.display = 'none';
    });
    
    document.getElementById('shortcutsModal').addEventListener('click', (e) => {
        if (e.target.id === 'shortcutsModal') {
            document.getElementById('shortcutsModal').style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#branchSearch') && !e.target.closest('#branchOptions')) document.getElementById('branchOptions').style.display = 'none';
        if (!e.target.closest('#customerSearch') && !e.target.closest('#customerOptions')) document.getElementById('customerOptions').style.display = 'none';
        if (!e.target.closest('#subAccountSearch') && !e.target.closest('#subAccountOptions')) document.getElementById('subAccountOptions').style.display = 'none';
        if (!e.target.closest('#invoiceSearch') && !e.target.closest('#invoiceOptions')) document.getElementById('invoiceOptions').style.display = 'none';
        if (!e.target.closest('#salesOfficerSearch') && !e.target.closest('#salesOfficerOptions')) document.getElementById('salesOfficerOptions').style.display = 'none';
        if (!e.target.closest('#supplierManSearch') && !e.target.closest('#supplierManOptions')) document.getElementById('supplierManOptions').style.display = 'none';
        if (!e.target.closest('.quick-entry')) document.getElementById('productSuggestions').style.display = 'none';
    });
});

function initDropdown(searchId, optionsId, hiddenId, data, textFn, onSelect) {
    const search = document.getElementById(searchId);
    const options = document.getElementById(optionsId);
    const hidden = document.getElementById(hiddenId);
    let selectedIndex = -1;
    let currentData = data;
    
    // Store reference for external filtering
    search.updateData = (newData) => {
        currentData = newData;
        selectedIndex = -1;
        renderOptions(currentData, options, textFn, (id, text) => { search.value = text; hidden.value = id; onSelect(id); options.style.display = 'none'; });
    };
    
    search.addEventListener('focus', () => { 
        selectedIndex = -1;
        renderOptions(currentData, options, textFn, (id, text) => { 
            search.value = text; 
            hidden.value = id; 
            onSelect(id); 
            options.style.display = 'none';
            if (searchId === 'salesOfficerSearch') localStorage.setItem('lastSelectedSalesOfficer', id);
        }); 
        options.style.display = 'block'; 
    });
    
    search.addEventListener('input', () => {
        const term = search.value.toLowerCase();
        const filtered = currentData.filter(d => textFn(d).toLowerCase().includes(term));
        selectedIndex = -1;
        renderOptions(filtered, options, textFn, (id, text) => { 
            search.value = text; 
            hidden.value = id; 
            onSelect(id); 
            options.style.display = 'none';
            if (searchId === 'salesOfficerSearch') localStorage.setItem('lastSelectedSalesOfficer', id);
        });
        options.style.display = filtered.length > 0 ? 'block' : 'none';
    });
    
    search.addEventListener('keydown', (e) => {
        const items = options.querySelectorAll('.dropdown-option');
        if (items.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectedIndex >= 0) items[selectedIndex].style.background = '';
            selectedIndex = (selectedIndex + 1) % items.length;
            items[selectedIndex].style.background = 'var(--surface-1)';
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedIndex >= 0) items[selectedIndex].style.background = '';
            selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
            items[selectedIndex].style.background = 'var(--surface-1)';
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            items[selectedIndex].click();
        }
    });
}

function renderOptions(data, container, textFn, onClick) {
    container.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-option';
        div.textContent = textFn(item);
        div.onclick = () => onClick(item.id, textFn(item));
        container.appendChild(div);
    });
}

function handleProductSearch(e) {
    const term = e.target.value.trim().toLowerCase();
    const suggestions = document.getElementById('productSuggestions');
    
    if (term.length < 2) { suggestions.style.display = 'none'; return; }
    
    const matches = productsData.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase() === term) || (p.qr_code && p.qr_code.toLowerCase() === term));
    
    if (matches.length === 0) { suggestions.style.display = 'none'; }
    else if (matches.length === 1 && ((matches[0].barcode && matches[0].barcode.toLowerCase() === term) || (matches[0].qr_code && matches[0].qr_code.toLowerCase() === term))) {
        e.target.value = matches[0].name;
        suggestions.style.display = 'none';
        setTimeout(() => { document.getElementById('quickQty').focus(); document.getElementById('quickQty').select(); }, 100);
    } else {
        suggestions.innerHTML = '';
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<strong>${p.name}</strong><br><small style="color: var(--subtext);">${p.code} - ${p.trade_price}</small>`;
            div.onclick = () => { e.target.value = p.name; suggestions.style.display = 'none'; document.getElementById('quickQty').focus(); };
            div.addEventListener('mouseenter', function() {
                suggestions.querySelectorAll('.suggestion-item').forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
            });
            suggestions.appendChild(div);
        });
        suggestions.style.display = 'block';
    }
}

function handleProductKeydown(e) {
    const suggestions = document.getElementById('productSuggestions');
    if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions.style.display === 'block') {
            const selected = suggestions.querySelector('.suggestion-item.selected') || suggestions.querySelector('.suggestion-item');
            if (selected) selected.click();
        } else {
            const term = this.value.trim().toLowerCase();
            const product = productsData.find(p => (p.barcode && p.barcode.toLowerCase() === term) || (p.qr_code && p.qr_code.toLowerCase() === term));
            if (product) { this.value = product.name; document.getElementById('quickQty').focus(); }
        }
        return;
    }
    
    if (suggestions.style.display !== 'block') return;
    const items = suggestions.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    let selected = suggestions.querySelector('.suggestion-item.selected');
    let currentIndex = selected ? Array.from(items).indexOf(selected) : -1;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selected) { selected.classList.remove('selected'); selected.style.background = 'white'; }
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].classList.add('selected');
        items[currentIndex].style.background = 'var(--surface-1)';
        items[currentIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selected) { selected.classList.remove('selected'); selected.style.background = 'white'; }
        currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[currentIndex].classList.add('selected');
        items[currentIndex].style.background = 'var(--surface-1)';
        items[currentIndex].scrollIntoView({ block: 'nearest' });
    }
}

function addProductFromQuick() {
    const productInput = document.getElementById('quickProduct').value.trim();
    if (!productInput) return;
    
    const product = productsData.find(p => p.name.toLowerCase().includes(productInput.toLowerCase()) || p.code.toLowerCase().includes(productInput.toLowerCase()) || (p.barcode && p.barcode.toLowerCase() === productInput.toLowerCase()) || (p.qr_code && p.qr_code.toLowerCase() === productInput.toLowerCase()));
    
    if (product) {
        const priceType = document.querySelector('input[name="priceType"]:checked')?.value || 'tp';
        const uom = uomData.find(u => u.id == product.default_unit_id);
        const item = {
            id: Date.now(),
            product: product.name,
            productId: product.id,
            unit: uom ? uom.uom_name : 'PCS',
            uomId: product.default_unit_id || 9,
            qty: parseFloat(document.getElementById('quickQty').value) || 1,
            price: parseFloat(priceType === 'mrp' ? product.sale_price : product.trade_price),
            discountPercent: 0,
            gstPercent: parseFloat(product.sales_tax || 0),
            status: 'sellable'
        };
        
        item.gross = item.qty * item.price;
        item.discountAmount = item.gross * (item.discountPercent / 100);
        item.gstAmount = (item.gross - item.discountAmount) * (item.gstPercent / 100);
        item.net = item.gross - item.discountAmount + item.gstAmount;
        
        currentReturn.items.push(item);
        renderItems();
        updateSummary();
        
        document.getElementById('quickProduct').value = '';
        document.getElementById('quickQty').value = 1;
        document.getElementById('productSuggestions').style.display = 'none';
        document.getElementById('quickProduct').focus();
    }
}

function renderItems() {
    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '';
    
    currentReturn.items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="text-center">${index + 1}</div>
            <div>${item.product}</div>
            <div>${item.unit}</div>
            <input type="number" value="${item.qty}" min="1" class="text-right" onchange="updateItemQty(${item.id}, this.value)">
            <input type="number" value="${item.price.toFixed(2)}" step="0.01" class="text-right" onchange="updateItemPrice(${item.id}, this.value)">
            <div class="readonly">${formatCurrency(item.gross)}</div>
            <input type="number" value="${item.discountPercent}" step="0.1" class="text-right" onchange="updateItemDiscount(${item.id}, this.value)">
            <input type="number" value="${item.gstPercent}" step="0.1" class="text-right" onchange="updateItemGst(${item.id}, this.value)">
            <select onchange="updateItemStatus(${item.id}, this.value)">
                <option value="sellable" ${item.status === 'sellable' ? 'selected' : ''}>Sellable</option>
                <option value="damaged" ${item.status === 'damaged' ? 'selected' : ''}>Damaged</option>
            </select>
            <div class="readonly">${formatCurrency(item.net)}</div>
            <div class="text-center">
                <button class="btn btn-danger btn-micro" onclick="removeItem(${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

window.updateItemQty = function(itemId, newQty) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) { item.qty = parseFloat(newQty) || 1; recalculateItem(item); renderItems(); updateSummary(); }
};

window.updateItemPrice = function(itemId, newPrice) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) { item.price = parseFloat(newPrice) || 0; recalculateItem(item); renderItems(); updateSummary(); }
};

window.updateItemDiscount = function(itemId, newPercent) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) { item.discountPercent = parseFloat(newPercent) || 0; recalculateItem(item); renderItems(); updateSummary(); }
};

window.updateItemGst = function(itemId, newPercent) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) { item.gstPercent = parseFloat(newPercent) || 0; recalculateItem(item); renderItems(); updateSummary(); }
};

window.updateItemStatus = function(itemId, newStatus) {
    const item = currentReturn.items.find(i => i.id === itemId);
    if (item) item.status = newStatus;
};

window.removeItem = function(itemId) {
    currentReturn.items = currentReturn.items.filter(i => i.id !== itemId);
    renderItems();
    updateSummary();
};

function recalculateItem(item) {
    item.gross = item.qty * item.price;
    item.discountAmount = item.gross * (item.discountPercent / 100);
    item.gstAmount = (item.gross - item.discountAmount) * (item.gstPercent / 100);
    item.net = item.gross - item.discountAmount + item.gstAmount;
}

function updateSummary() {
    const totalBill = currentReturn.items.reduce((sum, item) => sum + item.gross, 0);
    const totalDiscount = currentReturn.items.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalGst = currentReturn.items.reduce((sum, item) => sum + item.gstAmount, 0);
    const returnDiscountAmount = parseFloat(document.getElementById('returnDiscountAmount').value) || 0;
    const netAmount = currentReturn.items.reduce((sum, item) => sum + item.net, 0) - returnDiscountAmount;
    const amountRefunded = parseFloat(document.getElementById('amountRefunded').value) || 0;
    const balance = netAmount - amountRefunded;
    
    const totalQty = currentReturn.items.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('totalQty').textContent = totalQty.toFixed(2);
    document.getElementById('totalGross').textContent = formatCurrency(totalBill);
    document.getElementById('totalNet').textContent = formatCurrency(currentReturn.items.reduce((sum, item) => sum + item.net, 0));
    
    document.getElementById('totalBill').textContent = formatCurrency(totalBill);
    document.getElementById('totalDiscount').textContent = formatCurrency(totalDiscount + returnDiscountAmount);
    document.getElementById('totalGst').textContent = formatCurrency(totalGst);
    document.getElementById('netAmount').textContent = formatCurrency(netAmount);
    document.getElementById('summaryRefunded').textContent = formatCurrency(amountRefunded);
    document.getElementById('balanceAmount').textContent = formatCurrency(balance);
    document.getElementById('itemCount').textContent = currentReturn.items.length;
    
    document.getElementById('balanceAmount').style.color = balance >= 0 ? 'var(--error)' : 'var(--success)';
}

function updateReturnDiscount() {
    const percentInput = document.getElementById('returnDiscountPercent');
    const amountInput = document.getElementById('returnDiscountAmount');
    const totalNet = currentReturn.items.reduce((sum, item) => sum + item.net, 0);
    
    if (document.activeElement === percentInput) {
        const percent = parseFloat(percentInput.value) || 0;
        amountInput.value = (totalNet * percent / 100).toFixed(2);
    } else if (document.activeElement === amountInput) {
        const amount = parseFloat(amountInput.value) || 0;
        percentInput.value = totalNet > 0 ? ((amount / totalNet) * 100).toFixed(1) : 0;
    }
    updateSummary();
}

async function saveReturn() {
    if (currentReturn.items.length === 0) { alert('Add at least one item!'); return; }
    if (!currentReturn.company) { alert('Please select company!'); return; }
    if (!currentReturn.customer || !currentReturn.branch || !currentReturn.currency) { alert('Please select customer and branch!'); return; }
    if (!currentReturn.salesOfficer) { alert('Please select sales officer!'); return; }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod === 'bank_transfer' && !document.getElementById('bankAccount').value) { alert('Please select a bank account!'); return; }
    
    const supplierManId = parseInt(document.getElementById('supplierMan').value) || currentReturn.supplierMan || null;
    
    const returnData = {
        saleDate: document.getElementById('currentDate').value,
        companyId: currentReturn.company,
        customerId: currentReturn.customer,
        branchId: currentReturn.branch,
        currencyId: currentReturn.currency,
        salesOfficerId: currentReturn.salesOfficer,
        supplierManId: supplierManId,
        subAccountId: currentReturn.subAccount,
        saleInvoiceId: document.getElementById('saleInvoice').value || null,
        paymentMethod: paymentMethod,
        bankAccountId: paymentMethod === 'bank_transfer' ? document.getElementById('bankAccount').value : null,
        totalBill: currentReturn.items.reduce((sum, item) => sum + item.gross, 0),
        totalDiscountPercent: parseFloat(document.getElementById('returnDiscountPercent').value) || 0,
        totalDiscountAmount: parseFloat(document.getElementById('returnDiscountAmount').value) || 0,
        netAmount: currentReturn.items.reduce((sum, item) => sum + item.net, 0) - (parseFloat(document.getElementById('returnDiscountAmount').value) || 0),
        amountPaid: parseFloat(document.getElementById('amountRefunded').value) || 0,
        items: currentReturn.items.map(item => ({
            productId: item.productId,
            uomId: item.uomId,
            quantity: item.qty,
            salePrice: item.price,
            grossAmount: item.gross,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            gstPercent: item.gstPercent,
            gstAmount: item.gstAmount,
            netAmount: item.net,
            stockStatus: item.status
        })),
        status: 'Posted'
    };
    
    try {
        const response = await fetch('../../../../server/api/sale/sale_return/return-add.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Return saved successfully!');
            window.open(`thermal-print.php?id=${data.invoice_id}`, '_blank');
            setTimeout(() => {
                currentReturn.items = [];
                renderItems();
                updateSummary();
                loadNextReturnNo();
                document.getElementById('returnDiscountPercent').value = 0;
                document.getElementById('returnDiscountAmount').value = 0;
                document.getElementById('amountRefunded').value = 0;
                document.getElementById('invoiceSearch').value = '';
                document.getElementById('saleInvoice').value = '';
            }, 500);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error saving return: ' + error.message);
    }
}

function clearReturn() {
    if (confirm('Clear current return?')) {
        currentReturn.items = [];
        currentReturn.customer = null;
        currentReturn.company = null;
        renderItems();
        updateSummary();
        document.getElementById('customerSearch').value = '';
        document.getElementById('customer').value = '';
        document.getElementById('company').value = '';
        document.getElementById('returnDiscountPercent').value = 0;
        document.getElementById('returnDiscountAmount').value = 0;
        document.getElementById('amountRefunded').value = 0;
        document.getElementById('invoiceSearch').value = '';
        document.getElementById('saleInvoice').value = '';
    }
}

async function loadInvoiceData(invoiceId) {
    try {
        const response = await fetch(`../../../../server/api/sale/pos_invoice/pos-edit.php?id=${invoiceId}`);
        const data = await response.json();
        
        if (data.success) {
            const invoice = data.invoice;
            const priceType = document.querySelector('input[name="priceType"]:checked')?.value || 'tp';
            
            document.getElementById('customerSearch').value = `${invoice.customer_code} - ${invoice.customer_name}`;
            document.getElementById('customer').value = invoice.customer_id;
            currentReturn.customer = invoice.customer_id;
            
            // Auto-populate company
            if (invoice.company_id) {
                document.getElementById('company').value = invoice.company_id;
                currentReturn.company = invoice.company_id;
            }
            
            // Auto-populate branch
            const branch = branchesData.find(b => b.id == invoice.branch_id);
            if (branch) {
                document.getElementById('branchSearch').value = `${branch.branch_code} - ${branch.branch_name} (${branch.branch_type})`;
                document.getElementById('branch').value = invoice.branch_id;
                currentReturn.branch = invoice.branch_id;
            }
            
            // Auto-populate sales officer
            if (invoice.sale_officer_id) {
                const officer = employeesData.find(e => e.id == invoice.sale_officer_id);
                if (officer) {
                    document.getElementById('salesOfficerSearch').value = `${officer.employee_id} - ${officer.full_name}`;
                    document.getElementById('salesOfficer').value = invoice.sale_officer_id;
                    currentReturn.salesOfficer = invoice.sale_officer_id;
                }
            }
            
            // Auto-populate supplier man
            if (invoice.supplier_man_id) {
                const supplierMan = employeesData.find(e => e.id == invoice.supplier_man_id);
                if (supplierMan) {
                    document.getElementById('supplierManSearch').value = `${supplierMan.employee_id} - ${supplierMan.full_name}`;
                    document.getElementById('supplierMan').value = invoice.supplier_man_id;
                    currentReturn.supplierMan = invoice.supplier_man_id;
                }
            }
            
            currentReturn.items = [];
            data.items.forEach(item => {
                if (!item.parent_row_id) {
                    const uom = uomData.find(u => u.id == item.uom_id);
                    const returnItem = {
                        id: Date.now() + Math.random(),
                        product: item.product_name,
                        productId: item.product_id,
                        unit: uom ? uom.uom_name : 'PCS',
                        uomId: item.uom_id,
                        qty: parseFloat(item.quantity),
                        price: parseFloat(item.sale_price),
                        discountPercent: parseFloat(item.discount_percent || 0),
                        gstPercent: parseFloat(item.gst_percent || 0),
                        status: 'sellable'
                    };
                    recalculateItem(returnItem);
                    currentReturn.items.push(returnItem);
                }
            });
            
            renderItems();
            updateSummary();
            showNotification('Invoice loaded successfully!');
        }
    } catch (error) {
        alert('Error loading invoice: ' + error.message);
    }
}

async function loadProducts() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-products.php');
    const data = await response.json();
    if (data.success) productsData = data.products;
}

async function loadCustomers() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-customers.php');
    const data = await response.json();
    if (data.success) customersData = data.customers;
}

async function loadBranches() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-branches.php');
    const data = await response.json();
    if (data.success) branchesData = data.branches;
}

async function loadCurrencies() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-currencies.php');
    const data = await response.json();
    if (data.success) currenciesData = data.currencies;
}

async function loadBankAccounts() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-bank-accounts.php');
    const data = await response.json();
    if (data.success) {
        bankAccountsData = data.accounts;
        const select = document.getElementById('bankAccount');
        select.innerHTML = '<option value="">Select Bank Account</option>';
        data.accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.account_title} - ${acc.account_number}`;
            select.appendChild(option);
        });
    }
}

async function loadUOM() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-uom.php');
    const data = await response.json();
    if (data.success) uomData = data.uoms;
}

async function loadSaleInvoices() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-sale-invoices.php');
    const data = await response.json();
    if (data.success) {
        invoicesData = data.invoices.map(inv => ({
            ...inv,
            customer_id: inv.customer_id || extractCustomerIdFromName(inv.customer_name)
        }));
    }
}

function extractCustomerIdFromName(customerName) {
    const customer = customersData.find(c => c.customer_name === customerName);
    return customer ? customer.id : null;
}

async function loadEmployees() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-employees.php');
    const data = await response.json();
    if (data.success) employeesData = data.employees;
}

async function loadCompanies() {
    const response = await fetch('../../../../server/api/sale/sale_return/get-companies.php');
    const data = await response.json();
    if (data.success) {
        companiesData = data.companies;
        const select = document.getElementById('company');
        select.innerHTML = '<option value="">Select Company</option>';
        data.companies.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.company_code} - ${c.company_name}`;
            select.appendChild(option);
        });
        
        // Auto-select if only one company
        if (data.companies.length === 1) {
            select.value = data.companies[0].id;
            currentReturn.company = data.companies[0].id;
        }
    }
}

async function loadSubAccounts(customerId) {
    const response = await fetch(`../../../../server/api/sale/sale_return/get-sub-accounts.php?customer_id=${customerId}`);
    const data = await response.json();
    if (data.success) {
        subAccountsData = data.sub_accounts;
        const subAccountSearch = document.getElementById('subAccountSearch');
        subAccountSearch.value = '';
        document.getElementById('subAccount').value = '';
        currentReturn.subAccount = null;
        subAccountSearch.updateData(subAccountsData);
    }
}

function updateDate() {
    document.getElementById('currentDate').value = new Date().toISOString().split('T')[0];
}

async function loadNextReturnNo() {
    try {
        const response = await fetch('../../../../server/api/sale/sale_return/get-next-invoice-number.php');
        const data = await response.json();
        if (data.success) document.getElementById('returnNo').textContent = data.nextNumber;
    } catch (error) {
        console.error('Error loading return number:', error);
    }
}

function formatCurrency(amount) {
    const currency = currenciesData.find(c => c.is_base_currency == 1);
    const symbol = currency ? currency.symbol : '$';
    return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success); color: white; padding: 8px 16px; border-radius: 4px; z-index: 10000; font-weight: 500; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function loadShortcuts() {
    const saved = localStorage.getItem('return_shortcuts');
    if (saved) shortcuts = JSON.parse(saved);
    document.getElementById('shortcutProduct').value = shortcuts.product;
    document.getElementById('shortcutCustomer').value = shortcuts.customer;
    document.getElementById('shortcutBranch').value = shortcuts.branch;
    document.getElementById('shortcutQty').value = shortcuts.qty;
    document.getElementById('shortcutSave').value = shortcuts.save;
    document.getElementById('shortcutClear').value = shortcuts.clear;
}

function saveShortcuts() {
    shortcuts = {
        product: document.getElementById('shortcutProduct').value || defaultShortcuts.product,
        customer: document.getElementById('shortcutCustomer').value || defaultShortcuts.customer,
        branch: document.getElementById('shortcutBranch').value || defaultShortcuts.branch,
        qty: document.getElementById('shortcutQty').value || defaultShortcuts.qty,
        save: document.getElementById('shortcutSave').value || defaultShortcuts.save,
        clear: document.getElementById('shortcutClear').value || defaultShortcuts.clear
    };
    localStorage.setItem('return_shortcuts', JSON.stringify(shortcuts));
    document.getElementById('shortcutsModal').style.display = 'none';
    showNotification('Shortcuts saved successfully!');
}

function resetShortcuts() {
    shortcuts = { ...defaultShortcuts };
    document.getElementById('shortcutProduct').value = shortcuts.product;
    document.getElementById('shortcutCustomer').value = shortcuts.customer;
    document.getElementById('shortcutBranch').value = shortcuts.branch;
    document.getElementById('shortcutQty').value = shortcuts.qty;
    document.getElementById('shortcutSave').value = shortcuts.save;
    document.getElementById('shortcutClear').value = shortcuts.clear;
}

function filterInvoicesByCustomer(customerId) {
    const invoiceSearch = document.getElementById('invoiceSearch');
    const filteredInvoices = invoicesData.filter(inv => inv.customer_id == customerId);
    
    invoiceSearch.value = '';
    document.getElementById('saleInvoice').value = '';
    
    // Update dropdown data
    invoiceSearch.updateData(filteredInvoices);
}
