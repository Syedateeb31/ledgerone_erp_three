// UI helpers for POS page (initializers, small DOM helpers)
export function initBasicUI() {
    // Example: wire common close buttons for modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-close-modal');
            const el = document.getElementById(target);
            if (el) el.style.display = 'none';
        });
    });
}

export function updateCurrencySymbols() {
    // Update visible currency symbol placeholders if any
    const currencyEls = document.querySelectorAll('[data-currency-symbol]');
    const symbol = (window.selectedCurrency && window.selectedCurrency.symbol) || '';
    currencyEls.forEach(el => el.textContent = symbol);
}

// Render customer dropdown options and populate dataCache
export function renderCustomerOptions(customers, dataCache) {
    const codeOptions = document.getElementById('customerCodeOptions');
    if (!codeOptions) return;

    codeOptions.innerHTML = '';
    const fragment = document.createDocumentFragment();

    customers.forEach(customer => {
        if (dataCache && dataCache.customers) dataCache.customers.set(customer.id, customer);

        const codeOption = document.createElement('div');
        codeOption.className = 'dropdown-option';
        codeOption.setAttribute('data-value', customer.id);
        codeOption.setAttribute('data-balance', customer.current_balance);
        codeOption.setAttribute('data-address', customer.address || '');
        codeOption.setAttribute('data-discount', customer.default_discount_percentage || 0);
        codeOption.setAttribute('data-sales-officer', customer.associated_sales_officer_id || '');
        codeOption.setAttribute('data-supplier-man', customer.supplier_man_id || '');
        codeOption.setAttribute('data-credit-limit', customer.credit_limit || 0);
        codeOption.setAttribute('data-withholding-tax', customer.advance_income_tax_percentage || 0);
        codeOption.textContent = `${customer.customer_code} | ${customer.customer_name} | ${customer.address || 'N/A'}`;

        if (customer.id == 613) {
            console.log('Customer 613 loaded:', customer);
            console.log('supplier_man_id:', customer.supplier_man_id);
        }

        fragment.appendChild(codeOption);
    });

    codeOptions.appendChild(fragment);
}

// Cache products into provided dataCache map
export function cacheProducts(products, dataCache) {
    if (!products || !Array.isArray(products)) return;
    products.forEach(p => {
        if (dataCache && dataCache.products) dataCache.products.set(p.id, p);
    });
}

export default { initBasicUI, updateCurrencySymbols };
