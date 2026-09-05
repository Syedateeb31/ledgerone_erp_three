// Global variables for max unit columns
let maxUnitColumns = 0;
let allUnitHeaders = [];

// Get product UOM details with conversion factors
function getProductUOMDetails(product) {
    console.log('getProductUOMDetails called for product:', product.name);
    const details = {
        type: product.uom_type || 'unit',
        units: []
    };

    if (details.type === 'group' && product.group_units && product.group_units.length > 0) {
        // UOM Group - multiple units
        // Backend already provides correct conversion_factor from product_uom_conversions for per_product units
        details.units = product.group_units.map(unit => {
            console.log('Processing unit:', unit.uom_name, 'CF:', unit.conversion_factor, 'is_base:', unit.is_base_unit);
            return {
                id: unit.id,
                name: unit.uom_name,
                conversionFactor: unit.is_base_unit == 1 ? 1 : (parseFloat(unit.conversion_factor) || 1)
            };
        });
    } else if (product.default_unit_id) {
        // Single unit
        details.units = [{
            id: product.default_unit_id,
            name: product.default_unit_name || 'Unit',
            conversionFactor: product.is_base_unit == 1 ? 1 : (parseFloat(product.unit_conversion_factor) || 1)
        }];
    }

    console.log('Returning UOM details:', details);
    return details;
}

// Update table headers based on max units
function updateTableHeaders() {
    const headerRow = document.querySelector('#itemsTable thead tr');
    headerRow.querySelectorAll('.unit-header').forEach(h => h.remove());
    const bagHeader = headerRow.querySelector('.bag-cell');
    if (!bagHeader) return;
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.width = '8%';
        th.className = 'unit-header';
        th.textContent = 'Unit ' + (i + 1);
        bagHeader.insertAdjacentElement('beforebegin', th);
    }
}

// Update footer totals
function updateFooterTotals() {
    const footerRow = document.querySelector('#itemsTable tfoot tr');
    if (!footerRow) return; // Exit if footer doesn't exist
    
    const totalsLabel = footerRow.cells[0]; // "Totals" cell
    
    // Clear existing unit totals
    const existingTotals = footerRow.querySelectorAll('.unit-total');
    existingTotals.forEach(total => total.remove());

    // Calculate totals for each unit column
    const unitTotals = new Array(maxUnitColumns).fill(0);
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    
    for (let row of rows) {
        const unitCells = row.querySelectorAll('.unit-cell');
        unitCells.forEach((cell, index) => {
            const input = cell.querySelector('input');
            if (input && !input.readOnly) {
                unitTotals[index] += parseFloat(input.value) || 0;
            }
        });
    }

   // Insert unit totals before bag-cell in footer
    const footerBagCell = footerRow.querySelector('.bag-cell');
    const insertRef = footerBagCell || totalsLabel;
    const insertPos = footerBagCell ? 'beforebegin' : 'afterend';
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.className = 'unit-total';
        th.textContent = unitTotals[i].toFixed(2);
        insertRef.insertAdjacentElement(insertPos, th);
    }
    
    // Update other totals
    let totalPrice = 0, totalGross = 0, totalDisc = 0, totalTO = 0, totalGST = 0, totalFOC = 0, totalNet = 0;
    
    for (let row of rows) {
        const priceCell = row.querySelector('.price-cell');
        const grossCell = row.querySelector('.gross-cell');
        const discAmountCell = row.querySelector('.disc-amount-cell');
        const toAmountCell = row.querySelector('.to-amount-cell');
        const taxAmountCell = row.querySelector('.tax-amount-cell');
        const focCell = row.querySelector('.foc-cell');
        const netCell = row.querySelector('.net-cell');
        
        if (priceCell) totalPrice += parseFloat(priceCell.querySelector('input').value) || 0;
        if (grossCell) totalGross += parseFloat(grossCell.querySelector('input').value) || 0;
        if (discAmountCell) totalDisc += parseFloat(discAmountCell.querySelector('input').value) || 0;
        if (toAmountCell) totalTO += parseFloat(toAmountCell.querySelector('input').value) || 0;
        if (taxAmountCell) totalGST += parseFloat(taxAmountCell.querySelector('input').value) || 0;
        if (focCell) totalFOC += parseFloat(focCell.querySelector('input').value) || 0;
        if (netCell) totalNet += parseFloat(netCell.querySelector('input').value) || 0;
    }
    
    const totalPurchasePriceEl = document.getElementById('totalPurchasePrice');
    if (totalPurchasePriceEl) totalPurchasePriceEl.textContent = totalPrice.toFixed(2);
    
    const totalGrossAmountEl = document.getElementById('totalGrossAmount');
    if (totalGrossAmountEl) totalGrossAmountEl.textContent = totalGross.toFixed(2);
    
    const totalDiscountAmountItemsEl = document.getElementById('totalDiscountAmountItems');
    if (totalDiscountAmountItemsEl) totalDiscountAmountItemsEl.textContent = totalDisc.toFixed(2);
    
    const totalTradeOfferAmountItemsEl = document.getElementById('totalTradeOfferAmountItems');
    if (totalTradeOfferAmountItemsEl) totalTradeOfferAmountItemsEl.textContent = totalTO.toFixed(2);
    
    const totalGSTAmountItemsEl = document.getElementById('totalTaxAmountItems');
    if (totalGSTAmountItemsEl) totalGSTAmountItemsEl.textContent = totalGST.toFixed(2);
    
    const totalFOCQtyEl = document.getElementById('totalFOCQty');
    if (totalFOCQtyEl) totalFOCQtyEl.textContent = totalFOC.toFixed(2);
    
    const totalNetAmountItemsEl = document.getElementById('totalNetAmountItems');
    if (totalNetAmountItemsEl) totalNetAmountItemsEl.textContent = totalNet.toFixed(2);
}

// Recalculate max columns when products change
function recalculateMaxColumns() {
    console.log('recalculateMaxColumns called');
    maxUnitColumns = 0;
    allUnitHeaders = [];
    
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    console.log('Number of rows:', rows.length);
    
    for (let row of rows) {
        const productData = row.dataset.productUomData;
        if (productData) {
            const uomDetails = JSON.parse(productData);
            console.log('Row UOM details:', uomDetails);
            if (uomDetails.units.length > maxUnitColumns) {
                maxUnitColumns = uomDetails.units.length;
            }
            
            // Collect unique unit names
            uomDetails.units.forEach((unit, index) => {
                if (!allUnitHeaders[index]) {
                    allUnitHeaders[index] = unit.name;
                }
            });
        }
    }
    
    console.log('Max unit columns:', maxUnitColumns);
    updateTableHeaders();
    updateAllRowUnitCells();
    updateFooterTotals();
}

// Update unit cells for all rows
function updateAllRowUnitCells() {
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    
    for (let row of rows) {
        // Only update rows that have product selected
        if (row.dataset.productUomData) {
            updateRowUnitCells(row);
        }
    }
}

// Update unit cells for a specific row
function updateRowUnitCells(row) {
    console.log('updateRowUnitCells called');
    // Skip if no product selected
    if (!row.dataset.productUomData) {
        console.log('No product UOM data, skipping');
        return;
    }
    
    const productData = row.dataset.productUomData;
    const uomDetails = productData ? JSON.parse(productData) : { units: [] };
    console.log('UOM Details for row:', uomDetails);
    
    // Store existing values BEFORE removing cells
    const existingValues = {};
    const oldUnitInputs = row.querySelectorAll('.unit-input');
    oldUnitInputs.forEach(input => {
        const unitId = input.dataset.unitId;
        if (unitId) {
            existingValues[unitId] = input.value;
        }
    });
    
    // NOW remove existing unit cells
    const existingUnitCells = row.querySelectorAll('.unit-cell');
    existingUnitCells.forEach(cell => cell.remove());
    
   // Find insertion point: before bag-cell
    const bagCellRow = row.querySelector('.bag-cell');
    if (!bagCellRow) return;

    // Add unit cells
    for (let i = 0; i < maxUnitColumns; i++) {
        const insertIdx = Array.from(row.cells).indexOf(row.querySelector('.bag-cell'));
        const cell = row.insertCell(insertIdx);
        cell.className = 'unit-cell';        
        if (i < uomDetails.units.length) {
            const unit = uomDetails.units[i];
            
            // Create vertical compact display with label on top
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.gap = '2px';
            container.style.padding = '2px';
            
            const label = document.createElement('div');
            label.textContent = unit.name;
            label.style.color = 'var(--subtext)';
            label.style.fontSize = '9px';
            label.style.fontWeight = '500';
            label.style.whiteSpace = 'nowrap';
            label.style.textAlign = 'center';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input unit-input';
            input.min = '0';
            input.step = '0.01';
            // Restore existing value if available, otherwise set to 0
            input.value = existingValues[unit.id] || '0';
            input.placeholder = '0';
            input.dataset.unitId = unit.id;
            input.dataset.conversionFactor = unit.conversionFactor;
            
            console.log(`Setting up unit input - ID: ${unit.id}, Name: ${unit.name}, CF: ${unit.conversionFactor}`);
            
            input.addEventListener('input', function() {
                calculateTotalQuantity(row);
            });
            
            container.appendChild(label);
            container.appendChild(input);
            cell.appendChild(container);
        } else {
            // Readonly placeholder for missing units
            cell.textContent = '-';
            cell.style.textAlign = 'center';
            cell.style.color = 'var(--subtext)';
            cell.style.fontSize = '11px';
        }
    }
}

// Calculate total quantity from unit inputs
function calculateTotalQuantity(row) {
    const unitInputs = row.querySelectorAll('.unit-input');
    let totalQty = 0;
    
    unitInputs.forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const conversionFactor = parseFloat(input.dataset.conversionFactor) || 1;
        console.log(`Unit: ${input.dataset.unitId}, Qty: ${qty}, CF: ${conversionFactor}, Subtotal: ${qty * conversionFactor}`);
        totalQty += qty * conversionFactor;
    });
    
    console.log(`Total Quantity: ${totalQty}`);
    
    // Update price input (now at dynamic position)
    const priceCell = row.querySelector('.price-cell');
    if (priceCell) {
        const priceInput = priceCell.querySelector('input');
        const price = parseFloat(priceInput.value) || 0;
        console.log(`Price: ${price}, Gross: ${totalQty * price}`);
        calculateRowAmounts(row, totalQty, price);
    }
    
    updateFooterTotals();
}

// Calculate row amounts - Rate Type based (same as POS)
function calculateRowAmounts(row, qty, price) {
    const rateType = document.getElementById('rateType')?.value || '';
    const netKg     = parseFloat(row.querySelector('.net-kg-cell input')?.value) || 0;
    const alRateCut = parseFloat(row.querySelector('.al-rate-cut-cell input')?.value) || 0;
    const effectiveRate = price - alRateCut;
    const netRateInput = row.querySelector('.net-rate-cell input');
    if (netRateInput) netRateInput.value = effectiveRate.toFixed(2);
    let gross = 0;
    if (rateType === '100_kg')      gross = netKg / 100  * effectiveRate;
    else if (rateType === 'mon')    gross = netKg / 40   * effectiveRate;
    else if (rateType === 'ton')    gross = netKg / 1000 * effectiveRate;
    else if (rateType === 'per_kg') gross = netKg * effectiveRate;
    else if (rateType === 'per_bag') gross = (parseFloat(row.querySelector('.bag-cell input')?.value) || 0) * effectiveRate;
    else gross = qty * effectiveRate;
    const grossCell = row.querySelector('.gross-cell');
    const discPercentCell = row.querySelector('.disc-percent-cell');
    const discAmountCell  = row.querySelector('.disc-amount-cell');
    const toPercentCell   = row.querySelector('.to-percent-cell');
    const toAmountCell    = row.querySelector('.to-amount-cell');
    const taxPercentCell  = row.querySelector('.tax-percent-cell');
    const taxAmountCell   = row.querySelector('.tax-amount-cell');
    const netCell         = row.querySelector('.net-cell');
    if (!grossCell || !netCell) return;
    grossCell.querySelector('input').value = gross.toFixed(2);
    const discPercent = parseFloat(discPercentCell?.querySelector('input')?.value) || 0;
    const discAmount  = gross * (discPercent / 100);
    if (discAmountCell) discAmountCell.querySelector('input').value = discAmount.toFixed(2);
    const afterDiscount = gross - discAmount;
    const toPercent = parseFloat(toPercentCell?.querySelector('input')?.value) || 0;
    const toAmount  = afterDiscount * (toPercent / 100);
    if (toAmountCell) toAmountCell.querySelector('input').value = toAmount.toFixed(2);
    const afterTO = afterDiscount - toAmount;
    const taxPercent = parseFloat(taxPercentCell?.querySelector('input')?.value) || 0;
    const taxAmount  = afterTO * (taxPercent / 100);
    if (taxAmountCell) taxAmountCell.querySelector('input').value = taxAmount.toFixed(2);
    const net = afterTO + taxAmount;
    netCell.querySelector('input').value = net.toFixed(2);
    updateInvoiceSummaryDynamic();
}

// Recalculate Cut KG, AL KG, Net KG
function recalcKgFields(row) {
    const totalKg  = parseFloat(row.querySelector('.total-kg-cell input')?.value) || 0;
    const cutPct   = parseFloat(row.querySelector('.cut-kg-percent-cell input')?.value) || 0;
    const alKgPct  = parseFloat(row.querySelector('.al-kg-percent-cell input')?.value) || 0;
    const rateType = document.getElementById('rateType')?.value || '';
    if (!rateType) return;
    let divisor = 1;
    if (rateType === 'mon') divisor = 40;
    else if (rateType === 'ton') divisor = 1000;
    else if (rateType === '100_kg') divisor = 100;
    const cutKg = totalKg / divisor * cutPct;
    const alKg  = totalKg / divisor * alKgPct;
    const netKg = totalKg - Math.floor(cutKg) - Math.floor(alKg);
    const cutInput = row.querySelector('.cut-kg-cell input');
    const alInput  = row.querySelector('.al-kg-cell input');
    const netInput = row.querySelector('.net-kg-cell input');
    if (cutInput) cutInput.value = cutKg.toFixed(2);
    if (alInput)  alInput.value  = alKg.toFixed(2);
    if (netInput) netInput.value = netKg.toFixed(2);
    updateKgFooterTotals();
    let totalQty = 0;
    row.querySelectorAll('.unit-input').forEach(inp => { totalQty += (parseFloat(inp.value) || 0) * (parseFloat(inp.dataset.conversionFactor) || 1); });
    calculateRowAmounts(row, totalQty, parseFloat(row.querySelector('.price-cell input')?.value) || 0);
}

// Recalculate Net KG from Total KG and the current Cut KG / AL KG values as-is
// (used when Cut KG or AL KG is edited directly, instead of via their % fields)
function recalcNetKgFromManualCutAl(row) {
    const totalKg = parseFloat(row.querySelector('.total-kg-cell input')?.value) || 0;
    const cutKg   = parseFloat(row.querySelector('.cut-kg-cell input')?.value)   || 0;
    const alKg    = parseFloat(row.querySelector('.al-kg-cell input')?.value)    || 0;
    const netKg   = totalKg - Math.floor(cutKg) - Math.floor(alKg);

    const netInput = row.querySelector('.net-kg-cell input');
    if (netInput) netInput.value = netKg.toFixed(2);
    updateKgFooterTotals();
    let totalQty = 0;
    row.querySelectorAll('.unit-input').forEach(inp => { totalQty += (parseFloat(inp.value) || 0) * (parseFloat(inp.dataset.conversionFactor) || 1); });
    calculateRowAmounts(row, totalQty, parseFloat(row.querySelector('.price-cell input')?.value) || 0);
}

function updateKgFooterTotals() {
    const tbody = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    let totKg=0, totCut=0, totAl=0, totNet=0;
    for (let i=0;i<tbody.rows.length;i++) {
        totKg  += parseFloat(tbody.rows[i].querySelector('.total-kg-cell input')?.value) || 0;
        totCut += parseFloat(tbody.rows[i].querySelector('.cut-kg-cell input')?.value)   || 0;
        totAl  += parseFloat(tbody.rows[i].querySelector('.al-kg-cell input')?.value)    || 0;
        totNet += parseFloat(tbody.rows[i].querySelector('.net-kg-cell input')?.value)   || 0;
    }
    const e1=document.getElementById('totalTotalKG'); if(e1) e1.textContent=totKg.toFixed(2);
    const e2=document.getElementById('totalCutKG');   if(e2) e2.textContent=totCut.toFixed(2);
    const e3=document.getElementById('totalAlKG');    if(e3) e3.textContent=totAl.toFixed(2);
    const e4=document.getElementById('totalNetKG');   if(e4) e4.textContent=totNet.toFixed(2);
}
// Update invoice summary
function updateInvoiceSummaryDynamic() {
    let totalBill = 0;
    const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
    
    for (let row of rows) {
        const netCell = row.querySelector('.net-cell');
        if (netCell) {
            totalBill += parseFloat(netCell.querySelector('input').value) || 0;
        }
    }
    
    const totalBillElement = document.getElementById('totalBill');
    if (totalBillElement) totalBillElement.textContent = totalBill.toFixed(2);
    
    const discountPercentElement = document.getElementById('totalDiscountPercent');
    const discountPercent = discountPercentElement ? parseFloat(discountPercentElement.value) || 0 : 0;
    const discountAmount = totalBill * (discountPercent / 100);
    const afterDiscount = totalBill - discountAmount;
    
    const shippingFeesElement = document.getElementById('shippingFees');
    const shippingFees = shippingFeesElement ? parseFloat(shippingFeesElement.value) || 0 : 0;
    const shippingFeesType = document.querySelector('input[name="shippingFeesType"]:checked')?.value || 'add';
    const shippingVal = shippingFeesType === 'subtract' ? -shippingFees : shippingFees;

    const _cf = ['wtCharges','freight','mSukri','brokenAmount','brokeryAmount','brokeryTaxAmount','bardana','phoneCharges','fillingCharges'];
    let totalChargesVal = 0;
    _cf.forEach(function(id) {
        const cel = document.getElementById(id);
        if (!cel) return;
        const cval = cel.tagName === 'INPUT' ? parseFloat(cel.value) : parseFloat(cel.textContent);
        const csign = document.querySelector('input[name="' + id + 'Sign"][value="-"]')?.checked ? -1 : 1;
        totalChargesVal += (cval || 0) * csign;
    });
    const tcEl = document.getElementById('totalCharges');
    if (tcEl) tcEl.textContent = totalChargesVal.toFixed(2);

    const netAmount = afterDiscount + shippingVal + totalChargesVal;

        const discountAmountElement = document.getElementById('totalDiscountAmount');
    if (discountAmountElement) discountAmountElement.value = discountAmount.toFixed(2);
    
    const netAmountElement = document.getElementById('netAmount');
    if (netAmountElement) netAmountElement.textContent = netAmount.toFixed(2);
    
    updateFooterTotals();
    
    // Trigger invoice-level tax calculation
    if (window.calculateInvoiceLevelTaxes) {
        setTimeout(() => window.calculateInvoiceLevelTaxes(), 5);
    }
}

// Helper function to attach price change listener (called from purchase-add.js)
function attachPriceChangeListener(row) {
    const priceCell = row.querySelector('.price-cell');
    if (priceCell) {
        const priceInput = priceCell.querySelector('input');
        if (priceInput) {
            priceInput.addEventListener('input', function() {
                calculateTotalQuantity(row);
            });
        }
    }
}

// Wire KG input listeners for a row (called after row is built in purchase-add.js)
function wireKgListeners(row) {
    const kgInputs = ['.total-kg-cell input', '.cut-kg-percent-cell input', '.al-kg-percent-cell input'];
    kgInputs.forEach(sel => {
        const el = row.querySelector(sel);
        if (el) el.addEventListener('input', function() { recalcKgFields(row); });
    });

    // Cut KG and AL KG manual edit → update Net KG and recalculate
    ['.cut-kg-cell input', '.al-kg-cell input'].forEach(sel => {
        const el = row.querySelector(sel);
        if (el) el.addEventListener('input', function() {
            const totalKg = parseFloat(row.querySelector('.total-kg-cell input')?.value) || 0;
            const cutKg   = parseFloat(row.querySelector('.cut-kg-cell input')?.value)   || 0;
            const alKg    = parseFloat(row.querySelector('.al-kg-cell input')?.value)    || 0;
            const netInput = row.querySelector('.net-kg-cell input');
            if (netInput) netInput.value = (totalKg - cutKg - alKg).toFixed(2);
            updateKgFooterTotals();
            let totalQty = 0;
            row.querySelectorAll('.unit-input').forEach(inp => { totalQty += (parseFloat(inp.value)||0)*(parseFloat(inp.dataset.conversionFactor)||1); });
            calculateRowAmounts(row, totalQty, parseFloat(row.querySelector('.price-cell input')?.value)||0);
        });
    });

    // AL Rate Cut → recalculate net rate and amounts
    const alRateCutInput = row.querySelector('.al-rate-cut-cell input');
    if (alRateCutInput) alRateCutInput.addEventListener('input', function() {
        let totalQty = 0;
        row.querySelectorAll('.unit-input').forEach(inp => { totalQty += (parseFloat(inp.value)||0)*(parseFloat(inp.dataset.conversionFactor)||1); });
        calculateRowAmounts(row, totalQty, parseFloat(row.querySelector('.price-cell input')?.value)||0);
    });

    // Bag input → recalculate if per_bag rate type
    const bagInput = row.querySelector('.bag-cell input');
    if (bagInput) bagInput.addEventListener('input', function() {
        let totalQty = 0;
        row.querySelectorAll('.unit-input').forEach(inp => { totalQty += (parseFloat(inp.value)||0)*(parseFloat(inp.dataset.conversionFactor)||1); });
        calculateRowAmounts(row, totalQty, parseFloat(row.querySelector('.price-cell input')?.value)||0);
    });
}

// Rate Type change → update label + recalculate all rows
document.addEventListener('DOMContentLoaded', function() {
    const rateTypeEl = document.getElementById('rateType');
    if (rateTypeEl) rateTypeEl.addEventListener('change', function() {
        const labels = { per_bag: 'Per Bag Rate', per_kg: 'Per KG Rate', '100_kg': '100 KG Rate', mon: 'MON Rate', ton: 'Ton Rate' };
        const labelEl = document.getElementById('purchasePriceLabel');
        if (labelEl) labelEl.textContent = labels[this.value] || 'Trade Price (TP)';
        const tbody = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
        if (!tbody) return;
        for (let i = 0; i < tbody.rows.length; i++) {
            recalcKgFields(tbody.rows[i]);
        }
    });
});

// ===================== CHARGE FUNCTIONS =====================

const chargeFields = ['wtCharges','freight','mSukri','brokenAmount','brokeryAmount','brokeryTaxAmount','bardana','phoneCharges','fillingCharges'];

function getChargeSign(fieldId) {
    const checked = document.querySelector('input[name="' + fieldId + 'Sign"][value="-"]');
    return checked && checked.checked ? -1 : 1;
}

function saveChargeSign(fieldId, sign) {
    localStorage.setItem('purchaseChargeSign_' + fieldId, sign);
}

function loadChargeSigns() {
    chargeFields.forEach(function(id) {
        const saved = localStorage.getItem('purchaseChargeSign_' + id) || '+';
        const radio = document.querySelector('input[name="' + id + 'Sign"][value="' + saved + '"]');
        if (radio) radio.checked = true;
    });
}

function updateTotalCharges() {
    let total = 0;
    chargeFields.forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const val = el.tagName === 'INPUT' ? parseFloat(el.value) : parseFloat(el.textContent);
        const sign = getChargeSign(id);
        total += (val || 0) * sign;
    });
    const el = document.getElementById('totalCharges');
    if (el) el.textContent = total.toFixed(2);
    updateInvoiceSummaryDynamic();
}

function calculateBrokeryAmount() {
    const brokeryRateType = document.getElementById('brokeryRateType')?.value || '';
    const brokeryRate     = parseFloat(document.getElementById('brokeryRate')?.value) || 0;
    const isPctMode       = document.getElementById('brokeryPctToggle')?.dataset.mode === 'pct';
    const labelEl         = document.getElementById('brokeryRateLabel');

    if (isPctMode) {
        if (labelEl) labelEl.textContent = 'Brokery %';
        const netAmount  = parseFloat(document.getElementById('netAmount')?.textContent) || 0;
        const brokeryAmt = netAmount * brokeryRate / 100;
        const amtEl      = document.getElementById('brokeryAmount');
        if (amtEl) amtEl.textContent = brokeryAmt.toFixed(2);
        const btp        = parseFloat(document.getElementById('brokeryTaxPercent')?.value) || 0;
        const taxAmtEl   = document.getElementById('brokeryTaxAmount');
        if (taxAmtEl) taxAmtEl.textContent = (brokeryAmt * btp / 100).toFixed(2);
        updateTotalCharges();
        return;
    }

    const labels = { per_bag: 'Per Bag Brokery', per_kg: 'Per KG Brokery', '100_kg': '100 KG Brokery', mon: 'MON Brokery', ton: 'Ton Brokery' };
    if (labelEl) labelEl.textContent = labels[brokeryRateType] || 'Brokery';

    const tbody = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
    let totalNetKg = 0, totalTotalKg = 0, totalBag = 0;
    if (tbody) {
        for (let i = 0; i < tbody.rows.length; i++) {
            totalNetKg   += parseFloat(tbody.rows[i].querySelector('.net-kg-cell input')?.value)   || 0;
            totalTotalKg += parseFloat(tbody.rows[i].querySelector('.total-kg-cell input')?.value) || 0;
            totalBag     += parseFloat(tbody.rows[i].querySelector('.bag-cell input')?.value)      || 0;
        }
    }
    const kgBasis    = document.querySelector('input[name="brokeryKgBasis"]:checked')?.value || 'net';
    const brokeryKg  = kgBasis === 'total' ? totalTotalKg : totalNetKg;

    let brokeryAmt = 0;
    if      (brokeryRateType === '100_kg')  brokeryAmt = brokeryKg / 100  * brokeryRate;
    else if (brokeryRateType === 'mon')     brokeryAmt = brokeryKg / 40   * brokeryRate;
    else if (brokeryRateType === 'ton')     brokeryAmt = brokeryKg / 1000 * brokeryRate;
    else if (brokeryRateType === 'per_kg')  brokeryAmt = brokeryKg        * brokeryRate;
    else if (brokeryRateType === 'per_bag') brokeryAmt = totalBag         * brokeryRate;

    const amtEl = document.getElementById('brokeryAmount');
    if (amtEl) amtEl.textContent = brokeryAmt.toFixed(2);

    const brokeryTaxPct = parseFloat(document.getElementById('brokeryTaxPercent')?.value) || 0;
    const brokeryTaxAmt = brokeryAmt * brokeryTaxPct / 100;
    const taxAmtEl      = document.getElementById('brokeryTaxAmount');
    if (taxAmtEl) taxAmtEl.textContent = brokeryTaxAmt.toFixed(2);

    updateTotalCharges();
}

let purchaseBrokenDebounce;
function calculateBrokenAmount() {
    clearTimeout(purchaseBrokenDebounce);
    purchaseBrokenDebounce = setTimeout(async () => {
        const brokenPct  = parseFloat(document.getElementById('brokenPercent')?.value) || 0;
        const tbody      = document.getElementById('itemsTable')?.getElementsByTagName('tbody')[0];
        let totalNetKG   = 0;
        if (tbody) for (let i = 0; i < tbody.rows.length; i++) totalNetKG += parseFloat(tbody.rows[i].querySelector('.net-kg-cell input')?.value) || 0;

        const el = document.getElementById('brokenAmount');
        if (brokenPct <= 0 || totalNetKG <= 0) {
            if (el) el.textContent = '0.00';
            updateTotalCharges();
            return;
        }
        try {
            const res  = await fetch('../../../../server/api/sale/pos_invoice/get-broken-allowance.php?broken_pct=' + brokenPct);
            const data = await res.json();
            if (!data.success) return;
            const brokenAmt = (totalNetKG / 100) * data.cumulative_rate;
            if (el) el.textContent = brokenAmt.toFixed(2);
            updateTotalCharges();
        } catch(e) { console.error('Broken allowance error:', e); }
    }, 300);
}

document.addEventListener('DOMContentLoaded', function() {
    // Brokery listeners
    const brt = document.getElementById('brokeryRateType');
    const br  = document.getElementById('brokeryRate');
    const btp = document.getElementById('brokeryTaxPercent');
    if (brt) brt.addEventListener('change', calculateBrokeryAmount);
    if (br)  br.addEventListener('input',  calculateBrokeryAmount);
    if (btp) btp.addEventListener('input', calculateBrokeryAmount);
    document.querySelectorAll('input[name="brokeryKgBasis"]').forEach(function(radio) {
        radio.addEventListener('change', calculateBrokeryAmount);
    });

    // Broken % listener
    const brokenPctInput = document.getElementById('brokenPercent');
    if (brokenPctInput) brokenPctInput.addEventListener('input', calculateBrokenAmount);

    // All charge input + sign listeners
    chargeFields.forEach(function(id) {
        const el = document.getElementById(id);
        if (el && el.tagName === 'INPUT') el.addEventListener('input', updateTotalCharges);
        ['+', '-'].forEach(function(val) {
            const radio = document.querySelector('input[name="' + id + 'Sign"][value="' + val + '"]');
            if (radio) radio.addEventListener('change', function() {
                saveChargeSign(id, this.value);
                updateTotalCharges();
            });
        });
    });

    // Brokery % toggle
    const pctToggle = document.getElementById('brokeryPctToggle');
    if (pctToggle) {
        pctToggle.dataset.mode = 'rate';
        pctToggle.addEventListener('click', function() {
            const isNowPct = this.dataset.mode !== 'pct';
            this.dataset.mode = isNowPct ? 'pct' : 'rate';
            this.textContent  = isNowPct ? '% Mode' : 'Rate Mode';
            this.style.background = isNowPct ? 'var(--primary)' : '';
            this.style.color      = isNowPct ? 'white' : '';
            const brtEl = document.getElementById('brokeryRateType');
            if (brtEl) brtEl.disabled = isNowPct;
            calculateBrokeryAmount();
        });
    }

    loadChargeSigns();
    updateTotalCharges();
});
