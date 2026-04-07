// Data layer helpers for POS (fetch wrappers)
export async function loadCustomers() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-customers.php');
    return res.json();
}

export async function loadProducts(query = '') {
    const res = await fetch(`../../../../server/api/sale/pos_invoice/get-products.php?q=${encodeURIComponent(query)}`);
    return res.json();
}

export async function loadBranches() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-branches.php');
    return res.json();
}

export async function loadCompanies() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-companies.php');
    return res.json();
}

export async function loadCurrencies() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-currencies.php');
    return res.json();
}

export async function loadBankAccounts() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-bank-accounts.php');
    return res.json();
}

export async function loadEmployees() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-employees.php');
    return res.json();
}

export async function loadSaleOrders() {
    const res = await fetch('../../../../server/api/sale/pos_invoice/get-sale-orders.php');
    return res.json();
}

export async function fetchCustomerBalance(customerId) {
    const res = await fetch(`../../../../server/api/sale/pos_invoice/get-customer-balance.php?id=${customerId}`);
    return res.json();
}

export async function loadProductStock(productId) {
    const res = await fetch(`../../../../server/api/sale/pos_invoice/get-product-stock.php?id=${productId}`);
    return res.json();
}

// Export a small default object for convenience
export default {
    loadCustomers,
    loadProducts,
    loadBranches,
    loadCompanies,
    loadCurrencies,
    loadBankAccounts,
    loadEmployees,
    loadSaleOrders,
    fetchCustomerBalance,
    loadProductStock
};
