// Stock validation for POS Invoice
let rowStockErrors = {};
let stockCache = {};

async function getProductStock(productId, branchId) {
    const cacheKey = `${productId}_${branchId}`;
    if (stockCache[cacheKey]) return stockCache[cacheKey];
    
    try {
        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-stock.php?product_id=${productId}&branch_id=${branchId}`);
        const data = await response.json();
        const stock = parseFloat(data.stock) || 0;
        stockCache[cacheKey] = stock;
        return stock;
    } catch (error) {
        console.error('Error checking stock:', error);
        return 0;
    }
}

async function validateRowStockRealTime(row) {
    const productId = row.dataset.productId;
    const branchId = document.getElementById('branch')?.value;
    
    if (!productId || !branchId) return true;
    
    const unitInputs = row.querySelectorAll('.unit-input');
    let totalQty = 0;
    unitInputs.forEach(inp => {
        const qty = parseFloat(inp.value) || 0;
        const cf = parseFloat(inp.dataset.conversionFactor) || 1;
        totalQty += qty * cf;
    });
    
    if (totalQty === 0) {
        delete rowStockErrors[row.rowIndex];
        clearRowStockError(row);
        updateStockDisplay(null, null);
        return true;
    }
    
    const availableStock = await getProductStock(productId, branchId);
    
    if (totalQty > availableStock) {
        rowStockErrors[row.rowIndex] = { available: availableStock, requested: totalQty };
        showRowStockError(row, availableStock, totalQty);
        updateStockDisplay(availableStock, totalQty, true);
        return false;
    } else {
        delete rowStockErrors[row.rowIndex];
        clearRowStockError(row);
        updateStockDisplay(availableStock, totalQty, false);
        return true;
    }
}

function showRowStockError(row, available, requested) {
    row.style.backgroundColor = '#fff5f5';
    row.style.borderLeft = '4px solid #dc3545';
    row.dataset.stockError = 'true';
}

function clearRowStockError(row) {
    row.style.backgroundColor = '';
    row.style.borderLeft = '';
    delete row.dataset.stockError;
}

function updateStockDisplay(available, required, isError = false) {
    const stockContainer = document.getElementById('stockContainer');
    const stockContent = document.getElementById('stockContent');
    
    if (available === null || required === null) {
        stockContainer.style.display = 'none';
        return;
    }
    
    stockContainer.style.display = 'block';
    
    if (isError) {
        stockContainer.style.borderLeftColor = '#dc3545';
        stockContainer.style.backgroundColor = '#fff5f5';
        stockContent.innerHTML = `<span style="font-weight: 700; color: #333;">${available.toFixed(2)}</span><div style="margin-top: 6px;"><span style="font-weight: 600;">Required:</span> <span style="font-weight: 700; color: #dc3545;">${required.toFixed(2)}</span></div><div style="font-size: 13px; color: #dc3545; font-weight: 600; margin-top: 8px;">Stock Insufficient!</div>`;
    } else {
        stockContainer.style.borderLeftColor = '#28a745';
        stockContainer.style.backgroundColor = 'var(--surface-2)';
        stockContent.innerHTML = `<span style="font-weight: 700; color: #28a745;">${available.toFixed(2)}</span><div style="margin-top: 6px;"><span style="font-weight: 600;">Required:</span> <span style="font-weight: 700; color: #333;">${required.toFixed(2)}</span></div>`;
    }
}

async function validateAllRowsStock() {
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rows = tbody.rows;
    
    let allValid = true;
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i].classList.contains('child-row')) {
            const isValid = await validateRowStockRealTime(rows[i]);
            if (!isValid) allValid = false;
        }
    }
    
    return allValid;
}

function hasStockErrors() {
    return Object.keys(rowStockErrors).length > 0;
}

// Global event listener for unit input changes
document.addEventListener('input', async function(e) {
    if (e.target.classList.contains('unit-input')) {
        const row = e.target.closest('tr');
        if (row && !row.classList.contains('child-row')) {
            await validateRowStockRealTime(row);
        }
    }
});
