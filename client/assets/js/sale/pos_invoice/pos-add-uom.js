// Dynamic UOM System for POS Invoice
let maxUnitColumns = 0;
let allUnitHeaders = [];

// Get product UOM details
async function getProductUOMDetails(product) {
    const uomDetails = [];
    
    if (product.uom_type === 'single' || product.uom_type === 'unit') {
        const defaultUom = uomData.find(u => u.id == product.default_unit_id);
        if (defaultUom) {
            if (defaultUom.unit_scope === 'per_product') {
                const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-uom-conversions.php?product_id=${product.id}`);
                const data = await response.json();
                if (data.success && data.conversions.length > 0) {
                    const conversion = data.conversions.find(c => c.uom_id == defaultUom.id);
                    if (conversion) {
                        uomDetails.push({ id: defaultUom.id, name: defaultUom.uom_name, conversionFactor: parseFloat(conversion.conversion_factor) || 1, isBase: true });
                    }
                } else {
                    uomDetails.push({ id: defaultUom.id, name: defaultUom.uom_name, conversionFactor: 1, isBase: true });
                }
            } else {
                uomDetails.push({ id: defaultUom.id, name: defaultUom.uom_name, conversionFactor: parseFloat(defaultUom.conversion_factor) || 1, isBase: defaultUom.is_base_unit == 1 });
            }
        }
    } else if (product.uom_type === 'group' && product.uom_group_id) {
        const groupUnits = window.uomGroupUnits?.filter(gu => gu.uom_group_id == product.uom_group_id) || [];
        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-uom-conversions.php?product_id=${product.id}`);
        const data = await response.json();
        const productConversions = data.success ? data.conversions : [];
        groupUnits.forEach(gu => {
            const uom = uomData.find(u => u.id == gu.uom_id);
            if (uom) {
                const productConversion = productConversions.find(pc => pc.uom_id == uom.id);
                if (uom.unit_scope === 'per_product' && productConversion) {
                    uomDetails.push({ id: uom.id, name: uom.uom_name, conversionFactor: parseFloat(productConversion.conversion_factor) || 1, isBase: uom.is_base_unit == 1 });
                } else {
                    uomDetails.push({ id: uom.id, name: uom.uom_name, conversionFactor: parseFloat(uom.conversion_factor) || 1, isBase: uom.is_base_unit == 1 });
                }
            }
        });
    }
    
    return uomDetails;
}

// Recalculate max columns across all rows
function recalculateMaxColumns() {
    const tbody = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    let maxUnits = 0;
    for (let i = 0; i < tbody.rows.length; i++) {
        const uomDataStr = tbody.rows[i].dataset.productUomData;
        if (uomDataStr) {
            maxUnits = Math.max(maxUnits, JSON.parse(uomDataStr).length);
        }
    }
    maxUnitColumns = maxUnits;
    updateTableHeaders();
    updateAllRowUnitCells();
    updateFooterTotals();
}

// Update table headers — unit cols inserted after product col, before Bag cell
function updateTableHeaders() {
    const headerRow = document.querySelector('#itemsTable thead tr');
    const chassisEnabled = localStorage.getItem('enableChassisMotorColour') === 'true';

    // Remove existing dynamic headers (unit + chassis)
    headerRow.querySelectorAll('.unit-dyn-header, .chassis-dyn-header').forEach(el => el.remove());

    // Find bag-cell header — unit and chassis headers go before it
    const bagHeader = headerRow.querySelector('.bag-cell');
    if (!bagHeader) return;

    // Insert chassis headers right before bag-cell (in reverse for correct order)
    ['Colour', 'Motor No', 'Chassis No'].forEach(label => {
        const th = document.createElement('th');
        th.className = 'chassis-dyn-header';
        th.width = '9%';
        th.style.display = chassisEnabled ? '' : 'none';
        th.textContent = label;
        bagHeader.insertAdjacentElement('beforebegin', th);
    });

    // Insert unit headers before chassis headers (i.e., before bag-cell still)
    // We insert in reverse so they end up in correct left-to-right order
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.className = 'unit-dyn-header';
        th.width = '8%';
        th.style.fontWeight = '600';
        th.style.fontSize = '12px';
        th.innerHTML = `<span>Unit ${i + 1}</span>`;
        bagHeader.insertAdjacentElement('beforebegin', th);
    }

    // Now reorder: unit headers should come before chassis headers
    // Since we inserted chassis first (before bag), then units (also before bag),
    // units end up between chassis and bag. Fix: move chassis after units.
    const chassisHeaders = Array.from(headerRow.querySelectorAll('.chassis-dyn-header'));
    const lastUnitHeader = headerRow.querySelectorAll('.unit-dyn-header')[maxUnitColumns - 1];
    if (lastUnitHeader && chassisHeaders.length) {
        chassisHeaders.forEach(ch => lastUnitHeader.insertAdjacentElement('afterend', ch));
    }
}

// Update unit cells for all rows
function updateAllRowUnitCells() {
    const tbody = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    for (let i = 0; i < tbody.rows.length; i++) {
        if (tbody.rows[i].dataset.productUomData) {
            updateRowUnitCells(tbody.rows[i]);
        }
    }
}

// Update unit cells for a specific row — original logic preserved
function updateRowUnitCells(row) {
    if (!row.dataset.productUomData) return;

    const uomDetails = JSON.parse(row.dataset.productUomData);
    const chassisEnabled = localStorage.getItem('enableChassisMotorColour') === 'true';

    // Save existing unit values
    const existingValues = {};
    row.querySelectorAll('.unit-input').forEach(input => {
        if (input.dataset.unitId) existingValues[input.dataset.unitId] = input.value;
    });

    // Save existing kg/cut values
    const existingTotalKg   = row.querySelector('.total-kg-cell input')?.value     || '0';
    const existingCutKgPct  = row.querySelector('.cut-kg-percent-cell input')?.value || '0';
    const existingCutKg     = row.querySelector('.cut-kg-cell input')?.value       || '0';
    const existingAlKgPct   = row.querySelector('.al-kg-percent-cell input')?.value || '0';
    const existingAlKg      = row.querySelector('.al-kg-cell input')?.value        || '0';

    // Save existing chassis values before removing cells
    const existingChassis = row.querySelector('.row-chassis-cell [data-vehicle-field]')?.value || '';
    const existingMotor   = row.querySelector('.row-motor-cell [data-vehicle-field]')?.value   || '';
    const existingColour  = row.querySelector('.row-colour-cell [data-vehicle-field]')?.value  || '';

    // Remove existing dynamic cells (unit + chassis)
    row.querySelectorAll('.unit-dyn-cell, .chassis-dyn-cell').forEach(el => el.remove());

    // Find insertion point: before Bag cell
    const bagCell = row.querySelector('.bag-cell');
    if (!bagCell) return;

    // Insert chassis cells right before bag-cell (in reverse for correct order)
    const chassisClasses = ['row-chassis-cell', 'row-motor-cell', 'row-colour-cell'];
    for (let c = chassisClasses.length - 1; c >= 0; c--) {
        const td = document.createElement('td');
        td.className = `chassis-dyn-cell ${chassisClasses[c]}`;
        td.style.display = chassisEnabled ? '' : 'none';
        row.insertBefore(td, bagCell);
    }

    // Insert unit cells before chassis cells (i.e., before bag-cell)
    for (let i = 0; i < maxUnitColumns; i++) {
        const insertBeforeIndex = Array.from(row.cells).indexOf(bagCell);
        const cell = row.insertCell(insertBeforeIndex);
        cell.className = 'unit-dyn-cell';

        if (i < uomDetails.length) {
            const uomDetail = uomDetails[i];
            const container = document.createElement('div');
            container.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px;';

            const label = document.createElement('div');
            label.className = 'unit-label';
            label.textContent = uomDetail.name;
            label.style.cssText = 'font-size:10px;font-weight:500;color:var(--text-secondary,#6c757d);opacity:0.8;';

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input unit-input';
            input.min = '0';
            input.step = '0.01';
            input.value = existingValues[uomDetail.id] || '0';
            input.dataset.unitId = uomDetail.id;
            input.dataset.conversionFactor = uomDetail.conversionFactor;
            input.dataset.isBase = uomDetail.isBase;
            input.title = `${uomDetail.name} (×${uomDetail.conversionFactor})`;

            input.addEventListener('input', function() {
                let totalQty = 0;
                row.querySelectorAll('.unit-input').forEach(inp => {
                    totalQty += (parseFloat(inp.value) || 0) * (parseFloat(inp.dataset.conversionFactor) || 1);
                });
                const price = parseFloat(row.querySelector('.price-cell input')?.value) || 0;
                if (typeof validateStockForRow === 'function') validateStockForRow(row);
                if (typeof SCHEME_TYPES !== 'undefined') {
                    const scheme = row.querySelector('.scheme-select')?.value;
                    if (scheme === SCHEME_TYPES.LESS && typeof calculateLessSchemeAmounts === 'function') { calculateLessSchemeAmounts(row, {}); return; }
                    if (scheme === SCHEME_TYPES.LESS_SPECIAL && typeof calculateLessSpecialSchemeAmounts === 'function') { calculateLessSpecialSchemeAmounts(row, {}); return; }
                    if (scheme === SCHEME_TYPES.GIVEN && typeof calculateGivenSchemeAmounts === 'function') { calculateGivenSchemeAmounts(row, {}); return; }
                }
                calculateRowAmounts(row, totalQty, price);
            });

            container.appendChild(label);
            container.appendChild(input);
            cell.appendChild(container);
        } else {
            cell.style.cssText = 'text-align:center;color:#dee2e6;background:#f8f9fa;font-size:11px;';
            cell.innerHTML = '<span style="opacity:0.3;">-</span>';
        }
    }

    // Reorder: move chassis cells after unit cells (they were inserted before bag, units also before bag)
    const chassisDynCells = Array.from(row.querySelectorAll('.chassis-dyn-cell'));
    const unitDynCells = row.querySelectorAll('.unit-dyn-cell');
    const lastUnitCell = unitDynCells[unitDynCells.length - 1];
    if (lastUnitCell && chassisDynCells.length) {
        chassisDynCells.forEach(ch => lastUnitCell.insertAdjacentElement('afterend', ch));
    }

    // Restore Total KG / Cut KG % / Cut KG / AL KG values
    const totalKgInput    = row.querySelector('.total-kg-cell input');
    const cutKgPctInput   = row.querySelector('.cut-kg-percent-cell input');
    const cutKgInput      = row.querySelector('.cut-kg-cell input');
    const alKgInput       = row.querySelector('.al-kg-cell input');
    if (totalKgInput)   totalKgInput.value  = existingTotalKg;
    if (cutKgPctInput)  cutKgPctInput.value = existingCutKgPct;
    if (cutKgInput)     cutKgInput.value    = existingCutKg;
    const alKgPctInput = row.querySelector('.al-kg-percent-cell input');
    if (alKgPctInput)   alKgPctInput.value  = existingAlKgPct;
    if (alKgInput)      alKgInput.value     = existingAlKg;

    // Load vehicle dropdowns (always, so inputs exist for saving)
    if (row.dataset.productId && typeof loadVehicleDetailsForRow === 'function') {
        // Collect values to restore: prefer pending (from DB load) over existing (from prior DOM)
        const restoreChassis = row.dataset.pendingChassis || existingChassis;
        const restoreMotor   = row.dataset.pendingMotor   || existingMotor;
        const restoreColour  = row.dataset.pendingColour  || existingColour;
        const restoreInvoiceId = row.dataset.pendingInvoiceId || null;

        loadVehicleDetailsForRow(row, row.dataset.productId, restoreInvoiceId).then(() => {
            if (restoreChassis) { const el = row.querySelector('.row-chassis-cell [data-vehicle-field]'); if (el) el.value = restoreChassis; }
            if (restoreMotor)   { const el = row.querySelector('.row-motor-cell [data-vehicle-field]');   if (el) el.value = restoreMotor; }
            if (restoreColour)  { const el = row.querySelector('.row-colour-cell [data-vehicle-field]');  if (el) el.value = restoreColour; }
            // Clear pending flags after applying
            delete row.dataset.pendingChassis;
            delete row.dataset.pendingMotor;
            delete row.dataset.pendingColour;
            delete row.dataset.pendingInvoiceId;
        });
    } else if (typeof populateVehicleDropdowns === 'function') {
        populateVehicleDropdowns(row, []);
    }
    
    // Load stock info for this product
    if (row.dataset.productId && typeof loadProductStock === 'function') {
        loadProductStock(row.dataset.productId);
    }
}

// Apply chassis column visibility
function applyChassisColumnVisibility() {
    const enabled = localStorage.getItem('enableChassisMotorColour') === 'true';
    document.querySelectorAll('#itemsTable .chassis-dyn-header').forEach(el => el.style.display = enabled ? '' : 'none');
    document.querySelectorAll('#itemsTable .chassis-dyn-cell').forEach(el => el.style.display = enabled ? '' : 'none');
    if (enabled && typeof loadVehicleDetailsForRow === 'function') {
        document.querySelectorAll('#itemsTable tbody tr').forEach(row => {
            if (row.dataset.productId) loadVehicleDetailsForRow(row, row.dataset.productId);
        });
    }
}
window.applyChassisColumnVisibility = applyChassisColumnVisibility;

// Calculate row amounts
function calculateRowAmounts(row, totalQty, price) {
    totalQty = Number(totalQty) || 0;
    price    = Number(price)    || 0;

    const discountPercent = parseFloat(row.querySelector('.disc-percent-cell input')?.value) || 0;
    const taxPercent = parseFloat(row.querySelector('.tax-percent-cell input')?.value) || 0;
    const enableTaxation = localStorage.getItem('enableTaxation') === 'true';

    // Rate Type based gross calculation
    const rateType = document.getElementById('rateType')?.value || '';
    const netKg = parseFloat(row.querySelector('.net-kg-cell input')?.value) || 0;
    const alRateCut = parseFloat(row.querySelector('.al-rate-cut-cell input')?.value) || 0;
    const effectiveRate = price - alRateCut;
    let gross = 0;
    if (rateType === '100_kg') {
        gross = netKg / 100 * effectiveRate;
    } else if (rateType === 'mon') {
        gross = netKg / 40 * effectiveRate;
    } else if (rateType === 'ton') {
        gross = netKg / 1000 * effectiveRate;
    } else if (rateType === 'per_kg') {
        gross = netKg * effectiveRate;
    } else if (rateType === 'per_bag') {
        const bagQty = parseFloat(row.querySelector('.bag-cell input')?.value) || 0;
        gross = bagQty * effectiveRate;
    } else {
        gross = totalQty * effectiveRate;
    }
    const grossInput = row.querySelector('.gross-cell input');
    if (grossInput) grossInput.value = gross.toFixed(2);

    const discountAmt = gross * (discountPercent / 100);
    const discAmtInput = row.querySelector('.disc-amount-cell input');
    if (discAmtInput) discAmtInput.value = discountAmt.toFixed(2);

    const afterDiscount = gross - discountAmt;

    const taxAmt = enableTaxation ? afterDiscount * (taxPercent / 100) : 0;
    const taxAmtInput = row.querySelector('.tax-amount-cell input');
    if (taxAmtInput) taxAmtInput.value = taxAmt.toFixed(2);

    const net = afterDiscount + taxAmt;
    const netInput = row.querySelector('.net-cell input');
    if (netInput) netInput.value = net.toFixed(2);

    updateInvoiceSummaryDynamic();
}

// Update footer totals
function updateFooterTotals() {
    const footerRow = document.querySelector('#itemsTable tfoot tr');
    if (!footerRow) return;

    // Remove old dynamic footer cells
    footerRow.querySelectorAll('.unit-dyn-footer, .chassis-dyn-footer').forEach(el => el.remove());

    const chassisEnabled = localStorage.getItem('enableChassisMotorColour') === 'true';
    const bagFooter = footerRow.querySelector('.bag-cell');
    if (!bagFooter) return;

    // Insert chassis footer cells before bag-cell
    for (let c = 0; c < 3; c++) {
        const th = document.createElement('th');
        th.className = 'chassis-dyn-footer';
        th.style.display = chassisEnabled ? '' : 'none';
        bagFooter.insertAdjacentElement('beforebegin', th);
    }

    // Insert unit footer cells before chassis cells (i.e., before bag-cell)
    for (let i = maxUnitColumns - 1; i >= 0; i--) {
        const th = document.createElement('th');
        th.className = 'unit-dyn-footer';
        th.style.cssText = 'text-align:center;padding:8px 4px;';
        bagFooter.insertAdjacentElement('beforebegin', th);
    }

    // Reorder: move chassis footers after unit footers
    const chassisFooters = Array.from(footerRow.querySelectorAll('.chassis-dyn-footer'));
    const unitFooters = footerRow.querySelectorAll('.unit-dyn-footer');
    const lastUnitFooter = unitFooters[unitFooters.length - 1];
    if (lastUnitFooter && chassisFooters.length) {
        chassisFooters.forEach(ch => lastUnitFooter.insertAdjacentElement('afterend', ch));
    }

    // Update tax amount footer total
    const taxAmountFooter = footerRow.querySelector('.tax-amount-cell');
    if (taxAmountFooter) {
        const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
        taxAmountFooter.style.display = enableTaxation ? '' : 'none';
    }
    const taxPercentFooter = footerRow.querySelector('.tax-percent-cell');
    if (taxPercentFooter) {
        const enableTaxation = localStorage.getItem('enableTaxation') === 'true';
        taxPercentFooter.style.display = enableTaxation ? '' : 'none';
    }
}

// Update invoice summary
function updateInvoiceSummaryDynamic() {
    const tbody = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    let totalBill = 0, totalPrice = 0, totalGross = 0, totalDisc = 0, totalTax = 0, totalNet = 0, totalNetKG = 0;

    for (let i = 0; i < tbody.rows.length; i++) {
        const row = tbody.rows[i];
        totalPrice  += parseFloat(row.querySelector('.price-cell input')?.value)       || 0;
        totalGross  += parseFloat(row.querySelector('.gross-cell input')?.value)       || 0;
        totalDisc   += parseFloat(row.querySelector('.disc-amount-cell input')?.value) || 0;
        totalTax    += parseFloat(row.querySelector('.tax-amount-cell input')?.value)  || 0;
        const net    = parseFloat(row.querySelector('.net-cell input')?.value)         || 0;
        totalNet    += net;
        totalBill   += net;
        totalNetKG  += parseFloat(row.querySelector('.net-kg-cell input')?.value)      || 0;
    }

    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toFixed(2); };
    const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value       = val.toFixed(2); };

    set('totalSalePrice', totalPrice);
    set('totalGrossAmount', totalGross);
    set('totalDiscountAmountItems', totalDisc);
    set('totalTaxAmountItems', totalTax);
    set('totalNetAmountItems', totalNet);
    set('totalBill', totalBill);
    set('totalNetKG', totalNetKG);

    const discPct  = parseFloat(document.getElementById('totalDiscountPercent')?.value) || 0;
    const discAmt  = totalBill * (discPct / 100);
    const shipping = parseFloat(document.getElementById('shippingFees')?.value) || 0;
    const totalChargesVal = parseFloat(document.getElementById('totalCharges')?.textContent) || 0;
    const netAmount = totalBill - discAmt + shipping + totalChargesVal;

    setV('totalDiscountAmount', discAmt);
    set('netAmount', netAmount);

    const withholdingPct = parseFloat(document.getElementById('withholdingTaxPercent')?.value) || 0;
    const withholdingAmt = netAmount * (withholdingPct / 100);
    const netReceivable  = netAmount - withholdingAmt;

    const wtEl = document.getElementById('withholdingTaxAmount');
    if (wtEl) wtEl.textContent = withholdingAmt.toFixed(2);
    const nrEl = document.getElementById('netReceivable');
    if (nrEl) nrEl.textContent = netReceivable.toFixed(2);

    const amountPaidEl  = document.getElementById('amountPaid');
    const invoiceTypeEl = document.getElementById('invoiceType');
    if (amountPaidEl && invoiceTypeEl?.value === 'Cash') amountPaidEl.value = netReceivable.toFixed(2);

    const amountPaid  = parseFloat(amountPaidEl?.value) || 0;
    const remainingEl = document.getElementById('remainingBalance');
    if (remainingEl) remainingEl.value = (netReceivable - amountPaid).toFixed(2);

    if (typeof calculateBrokeryAmount === 'function') calculateBrokeryAmount();
    if (typeof updateTotalCharges === 'function') updateTotalCharges();
}

// Load UOM group units
async function loadUOMGroupUnits() {
    try {
        const response = await fetch('../../../../server/api/sale/pos_invoice/get-uom-group-units.php');
        const data = await response.json();
        if (data.success) window.uomGroupUnits = data.groupUnits;
    } catch (error) {
        console.error('Error loading UOM group units:', error);
    }
}
