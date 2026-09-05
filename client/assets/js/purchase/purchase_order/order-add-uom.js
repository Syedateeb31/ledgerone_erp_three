// Global variables for max unit columns
let maxUnitColumns = 0;
let allUnitHeaders = [];

function getProductUOMDetails(product) {
    const details = { type: product.uom_type || 'unit', units: [] };
    if (details.type === 'group' && product.group_units && product.group_units.length > 0) {
        details.units = product.group_units.map(unit => ({
            id: unit.id,
            name: unit.uom_name,
            conversionFactor: getUnitConversionFactor(unit, product)
        }));
    } else if (product.default_unit_id) {
        details.units = [{
            id: product.default_unit_id,
            name: product.default_unit_name || 'Unit',
            conversionFactor: getUnitConversionFactor({
                unit_scope: product.unit_scope,
                is_base_unit: product.is_base_unit,
                conversion_factor: product.unit_conversion_factor
            }, product)
        }];
    }
    return details;
}

function getUnitConversionFactor(unit, product) {
    if (unit.is_base_unit == 1) return 1;
    if (unit.unit_scope === 'per_product') return parseFloat(unit.product_conversion_factor) || 1;
    if (unit.unit_scope === 'universal') return parseFloat(unit.conversion_factor) || 1;
    return 1;
}

function updateTableHeaders() {
    const headerRow = document.querySelector('#itemsTable thead tr');
    const productHeader = headerRow.cells[1];
    headerRow.querySelectorAll('.unit-header').forEach(h => h.remove());
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.width = '8%';
        th.className = 'unit-header';
        th.textContent = `Unit ${i + 1}`;
        productHeader.insertAdjacentElement('afterend', th);
    }
}

function updateFooterTotals() {
    const footerRow = document.querySelector('#itemsTable tfoot tr');
    const totalsLabel = footerRow.cells[0];
    footerRow.querySelectorAll('.unit-total').forEach(t => t.remove());

    const unitTotals = new Array(maxUnitColumns).fill(0);
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let row of rows) {
        row.querySelectorAll('.unit-cell').forEach((cell, index) => {
            const input = cell.querySelector('input');
            if (input && !input.readOnly) unitTotals[index] += parseFloat(input.value) || 0;
        });
    }
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.className = 'unit-total';
        th.textContent = unitTotals[i].toFixed(2);
        totalsLabel.insertAdjacentElement('afterend', th);
    }

    let totalPrice = 0, totalGross = 0, totalDisc = 0, totalNet = 0;
    for (let row of rows) {
        const priceCell = row.querySelector('.price-cell');
        const grossCell = row.querySelector('.gross-cell');
        const discAmountCell = row.querySelector('.disc-amount-cell');
        const netCell = row.querySelector('.net-cell');
        if (priceCell) totalPrice += parseFloat(priceCell.querySelector('input').value) || 0;
        if (grossCell) totalGross += parseFloat(grossCell.querySelector('input').value) || 0;
        if (discAmountCell) totalDisc += parseFloat(discAmountCell.querySelector('input').value) || 0;
        if (netCell) totalNet += parseFloat(netCell.querySelector('input').value) || 0;
    }

    document.getElementById('totalPurchasePrice').textContent = totalPrice.toFixed(2);
    document.getElementById('totalGrossAmount').textContent = totalGross.toFixed(2);
    document.getElementById('totalDiscountAmountItems').textContent = totalDisc.toFixed(2);
    document.getElementById('totalNetAmountItems').textContent = totalNet.toFixed(2);
}

function recalculateMaxColumns() {
    console.log('recalculateMaxColumns called');
    maxUnitColumns = 0;
    allUnitHeaders = [];
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let row of rows) {
        if (row.dataset.productUomData) {
            const uomDetails = JSON.parse(row.dataset.productUomData);
            console.log('Row has UOM data:', uomDetails);
            if (uomDetails.units.length > maxUnitColumns) maxUnitColumns = uomDetails.units.length;
            uomDetails.units.forEach((unit, index) => {
                if (!allUnitHeaders[index]) allUnitHeaders[index] = unit.name;
            });
        }
    }
    console.log('After recalculation - maxUnitColumns:', maxUnitColumns, 'allUnitHeaders:', allUnitHeaders);
    updateTableHeaders();
    updateAllRowUnitCells();
    updateFooterTotals();
}

function updateAllRowUnitCells() {
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let row of rows) {
        if (row.dataset.productUomData) updateRowUnitCells(row);
    }
}

function updateRowUnitCells(row) {
    if (!row.dataset.productUomData) return;
    const uomDetails = JSON.parse(row.dataset.productUomData);

    const existingValues = {};
    row.querySelectorAll('.unit-input').forEach(input => {
        if (input.dataset.unitId) existingValues[input.dataset.unitId] = input.value;
    });

    row.querySelectorAll('.unit-cell').forEach(cell => cell.remove());

    const priceCell = row.querySelector('.price-cell');
    if (!priceCell) return;
    const priceCellIndex = Array.from(row.cells).indexOf(priceCell);

    for (let i = 0; i < maxUnitColumns; i++) {
        const cell = row.insertCell(priceCellIndex + i);
        cell.className = 'unit-cell';

        if (i < uomDetails.units.length) {
            const unit = uomDetails.units[i];
            const container = document.createElement('div');
            container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px';

            const label = document.createElement('div');
            label.textContent = unit.name;
            label.style.cssText = 'color:var(--subtext);font-size:9px;font-weight:500;white-space:nowrap;text-align:center';

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input unit-input';
            input.min = '0';
            input.step = '0.01';
            input.value = existingValues[unit.id] || '0';
            input.dataset.unitId = unit.id;
            input.dataset.conversionFactor = unit.conversionFactor;
            input.addEventListener('input', function () { calculateTotalQuantity(row); });

            container.appendChild(label);
            container.appendChild(input);
            cell.appendChild(container);
        } else {
            cell.textContent = '-';
            cell.style.cssText = 'text-align:center;color:var(--subtext);font-size:11px';
        }
    }
}

function calculateTotalQuantity(row) {
    let totalQty = 0;
    row.querySelectorAll('.unit-input').forEach(input => {
        totalQty += (parseFloat(input.value) || 0) * (parseFloat(input.dataset.conversionFactor) || 1);
    });
    const priceCell = row.querySelector('.price-cell');
    if (priceCell) {
        calculateRowAmounts(row, totalQty, parseFloat(priceCell.querySelector('input').value) || 0);
    }
    updateFooterTotals();
}

function calculateRowAmounts(row, qty, price) {
    const grossCell = row.querySelector('.gross-cell');
    const discPercentCell = row.querySelector('.disc-percent-cell');
    const discAmountCell = row.querySelector('.disc-amount-cell');
    const netCell = row.querySelector('.net-cell');

    const gross = qty * price;
    grossCell.querySelector('input').value = gross.toFixed(2);

    const discPercent = parseFloat(discPercentCell.querySelector('input').value) || 0;
    const discAmount = gross * (discPercent / 100);
    discAmountCell.querySelector('input').value = discAmount.toFixed(2);

    const net = gross - discAmount;
    netCell.querySelector('input').value = net.toFixed(2);

    updateInvoiceSummaryDynamic();
}

function updateInvoiceSummaryDynamic() {
    let totalBill = 0;
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    for (let row of rows) {
        const netCell = row.querySelector('.net-cell');
        if (netCell) totalBill += parseFloat(netCell.querySelector('input').value) || 0;
    }

    document.getElementById('totalBill').textContent = totalBill.toFixed(2);

    const discountPercent = parseFloat(document.getElementById('totalDiscountPercent').value) || 0;
    const discountAmount = totalBill * (discountPercent / 100);
    const afterDiscount = totalBill - discountAmount;
    const shippingFees = parseFloat(document.getElementById('shippingFees').value) || 0;
    const netAmount = afterDiscount + shippingFees;

    document.getElementById('totalDiscountAmount').value = discountAmount.toFixed(2);
    document.getElementById('netAmount').textContent = netAmount.toFixed(2);

    updateFooterTotals();
}
