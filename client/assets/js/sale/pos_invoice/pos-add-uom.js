// Dynamic UOM System for POS Invoice
let maxUnitColumns = 0;
let allUnitHeaders = [];

// Get product UOM details
async function getProductUOMDetails(product) {
    const uomDetails = [];
    
    if (product.uom_type === 'single' || product.uom_type === 'unit') {
        // Single UOM - just the default unit
        const defaultUom = uomData.find(u => u.id == product.default_unit_id);
        if (defaultUom) {
            // Check if it's a per-product unit
            if (defaultUom.unit_scope === 'per_product') {
                // Fetch from product_uom_conversions table
                const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-uom-conversions.php?product_id=${product.id}`);
                const data = await response.json();
                if (data.success && data.conversions.length > 0) {
                    const conversion = data.conversions.find(c => c.uom_id == defaultUom.id);
                    if (conversion) {
                        uomDetails.push({
                            id: defaultUom.id,
                            name: defaultUom.uom_name,
                            conversionFactor: parseFloat(conversion.conversion_factor) || 1,
                            isBase: true
                        });
                    }
                } else {
                    // Fallback to default
                    uomDetails.push({
                        id: defaultUom.id,
                        name: defaultUom.uom_name,
                        conversionFactor: 1,
                        isBase: true
                    });
                }
            } else {
                uomDetails.push({
                    id: defaultUom.id,
                    name: defaultUom.uom_name,
                    conversionFactor: parseFloat(defaultUom.conversion_factor) || 1,
                    isBase: defaultUom.is_base_unit == 1
                });
            }
        }
    } else if (product.uom_type === 'group' && product.uom_group_id) {
        // Group UOM - get all units from group
        const groupUnits = window.uomGroupUnits?.filter(gu => gu.uom_group_id == product.uom_group_id) || [];
        
        // Fetch product-specific conversions
        const response = await fetch(`../../../../server/api/sale/pos_invoice/get-product-uom-conversions.php?product_id=${product.id}`);
        const data = await response.json();
        const productConversions = data.success ? data.conversions : [];
        
        groupUnits.forEach(gu => {
            const uom = uomData.find(u => u.id == gu.uom_id);
            if (uom) {
                // Check if per-product conversion exists
                const productConversion = productConversions.find(pc => pc.uom_id == uom.id);
                if (uom.unit_scope === 'per_product' && productConversion) {
                    uomDetails.push({
                        id: uom.id,
                        name: uom.uom_name,
                        conversionFactor: parseFloat(productConversion.conversion_factor) || 1,
                        isBase: uom.is_base_unit == 1
                    });
                } else {
                    uomDetails.push({
                        id: uom.id,
                        name: uom.uom_name,
                        conversionFactor: parseFloat(uom.conversion_factor) || 1,
                        isBase: uom.is_base_unit == 1
                    });
                }
            }
        });
    }
    
    return uomDetails;
}

// Recalculate max columns across all rows
function recalculateMaxColumns() {
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rows = tbody.rows;
    
    // Find the maximum number of units any product has
    let maxUnits = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const uomDataStr = row.dataset.productUomData;
        if (uomDataStr) {
            const uomDetails = JSON.parse(uomDataStr);
            maxUnits = Math.max(maxUnits, uomDetails.length);
        }
    }
    
    maxUnitColumns = maxUnits;
    
    updateTableHeaders();
    
    for (let i = 0; i < rows.length; i++) {
        updateRowUnitCells(rows[i]);
    }
    
    updateFooterTotals();
}

// Update table headers
function updateTableHeaders() {
    const itemsTable = document.getElementById('itemsTable');
    const thead = itemsTable.getElementsByTagName('thead')[0];
    const headerRow = thead.rows[0];
    
    let safetyCounter = 0;
    while (headerRow.cells.length > 2 && safetyCounter < 20) {
        const cell = headerRow.cells[2];
        const cellText = cell.textContent.trim();
        // Stop if we reach Price or any of the fixed columns
        if (cellText.includes('Sale Price') || cellText.includes('Gross Amount') || 
            cellText.includes('Disc') || cellText.includes('T.O') || 
            cellText.includes('GST') || cellText.includes('FOC') || 
            cellText.includes('Net Amount') || cellText.includes('Actions')) {
            break;
        }
        headerRow.deleteCell(2);
        safetyCounter++;
    }
    
    // Insert generic unit headers (Unit 1, Unit 2, Unit 3, etc.)
    for (let i = 0; i < maxUnitColumns; i++) {
        const th = headerRow.insertCell(2 + i);
        th.width = '8%';
        th.style.fontWeight = '600';
        th.style.fontSize = '12px';
        th.style.color = 'var(--heading, #212529)';
        th.innerHTML = `<span class="unit-header">Unit ${i + 1}</span>`;
    }
}

// Update row unit cells
function updateRowUnitCells(row) {
    const uomDataStr = row.dataset.productUomData;
    const productUomDetails = uomDataStr ? JSON.parse(uomDataStr) : [];
    
    // PRESERVE existing values before removing cells
    const existingValues = {};
    const existingUnitInputs = row.querySelectorAll('.unit-input');
    existingUnitInputs.forEach(input => {
        const unitId = input.dataset.unitId;
        if (unitId) {
            existingValues[unitId] = input.value;
        }
    });
    
    // Remove old unit cells (between Product and Price)
    while (row.cells.length > 2 && !row.cells[2].classList.contains('price-cell')) {
        row.deleteCell(2);
    }
    
    // Insert unit cells based on maxUnitColumns
    for (let i = 0; i < maxUnitColumns; i++) {
        const cell = row.insertCell(2 + i);
        
        // Check if this product has a unit at this position
        if (i < productUomDetails.length) {
            const uomDetail = productUomDetails[i];
            
            // Create a container for label + input
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '2px';
            container.style.padding = '4px';
            
            // Add unit label
            const label = document.createElement('div');
            label.className = 'unit-label';
            label.textContent = uomDetail.name;
            label.style.fontSize = '10px';
            label.style.fontWeight = '500';
            label.style.color = 'var(--text-secondary, #6c757d)';
            label.style.textAlign = 'left';
            label.style.marginBottom = '2px';
            label.style.opacity = '0.8';
            container.appendChild(label);
            
            // Add input
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input unit-input';
            input.min = '0';
            input.step = '0.01';
            // RESTORE the existing value if it exists, otherwise default to '0'
            input.value = existingValues[uomDetail.id] || '0';
            input.dataset.unitId = uomDetail.id;
            input.dataset.conversionFactor = uomDetail.conversionFactor;
            input.dataset.isBase = uomDetail.isBase;
            input.title = `${uomDetail.name} (×${uomDetail.conversionFactor})`;
            
            input.addEventListener('input', function() {
                const unitInputs = row.querySelectorAll('.unit-input');
                let totalQty = Number(0);
                unitInputs.forEach(inp => {
                    const qty = Number(inp.value) || 0;
                    const cf = Number(inp.dataset.conversionFactor) || 1;
                    totalQty = Number(totalQty) + Number(qty * cf);
                });
                
                const priceInput = row.querySelector('.price-cell input');
                const price = priceInput ? (Number(priceInput.value) || 0) : 0;
                calculateRowAmounts(row, Number(totalQty), Number(price));
            });
            
            container.appendChild(input);
            cell.appendChild(container);
        } else {
            // Product doesn't have a unit at this position - show disabled indicator
            cell.style.textAlign = 'center';
            cell.style.color = '#dee2e6';
            cell.style.background = '#f8f9fa';
            cell.style.fontSize = '11px';
            cell.innerHTML = '<span style="opacity: 0.3;">-</span>';
            cell.title = 'Not applicable for this product';
        }
    }
}

// Calculate row amounts
function calculateRowAmounts(row, totalQty, price) {
    totalQty = Number(totalQty) || 0;
    price = Number(price) || 0;
    
    const discountPercent = parseFloat(row.querySelector('.disc-percent-cell input')?.value) || 0;
    const tradeOfferPercent = parseFloat(row.querySelector('.to-percent-cell input')?.value) || 0;
    const gstPercent = parseFloat(row.querySelector('.gst-percent-cell input')?.value) || 0;
    
    const gross = Number(totalQty) * Number(price);
    const grossInput = row.querySelector('.gross-cell input');
    if (grossInput) {
        grossInput.value = gross.toFixed(2);
    }
    
    // Discount amount
    const discountAmt = gross * (discountPercent / 100);
    row.querySelector('.disc-amount-cell input').value = discountAmt.toFixed(2);
    
    // After discount
    const afterDiscount = gross - discountAmt;
    
    // Trade offer amount
    const tradeOfferAmt = afterDiscount * (tradeOfferPercent / 100);
    row.querySelector('.to-amount-cell input').value = tradeOfferAmt.toFixed(2);
    
    // After trade offer
    const afterTradeOffer = afterDiscount - tradeOfferAmt;
    
    // GST amount
    const gstAmt = afterTradeOffer * (gstPercent / 100);
    row.querySelector('.gst-amount-cell input').value = gstAmt.toFixed(2);
    
    // Net amount
    const net = afterTradeOffer + gstAmt;
    row.querySelector('.net-cell input').value = net.toFixed(2);
    
    // Update summary
    updateInvoiceSummaryDynamic();
}

// Update footer totals
function updateFooterTotals() {
    const itemsTable = document.getElementById('itemsTable');
    const tfoot = itemsTable.getElementsByTagName('tfoot')[0];
    if (!tfoot || !tfoot.rows[0]) return;
    
    const footerRow = tfoot.rows[0];
    
    // The first cell should be "Totals" with colspan
    // We need to update its colspan to account for S# + Product + dynamic units
    const totalsCell = footerRow.cells[0];
    if (totalsCell) {
        totalsCell.colSpan = 2 + maxUnitColumns; // S# + Product + all unit columns
    }
    
    // Remove old unit total cells (they would be after the Totals cell)
    // Since Totals has colspan, the next cells are the fixed columns
    // We need to remove any cells between index 1 and the first known fixed column
    let safetyCounter = 0;
    const knownIds = ['totalSalePrice', 'totalGrossAmount', 'totalDiscountAmountItems', 
                      'totalTradeOfferAmount', 'totalGstAmount', 'totalFocQty', 'totalNetAmountItems'];
    
    while (footerRow.cells.length > 1 && safetyCounter < 20) {
        if (footerRow.cells.length <= 1) break;
        const cell = footerRow.cells[1];
        // Stop if we reach a cell with a known fixed id
        if (cell && cell.id && knownIds.includes(cell.id)) {
            break;
        }
        footerRow.deleteCell(1);
        safetyCounter++;
    }
}

// Update invoice summary
function updateInvoiceSummaryDynamic() {
    const itemsTable = document.getElementById('itemsTable');
    const tbody = itemsTable.getElementsByTagName('tbody')[0];
    const rows = tbody.rows;
    
    let totalBill = 0;
    let totalPurchasePrice = 0;
    let totalGrossAmount = 0;
    let totalDiscountAmountItems = 0;
    let totalTradeOfferAmountItems = 0;
    let totalGSTAmountItems = 0;
    let totalFOCQty = 0;
    let totalNetAmountItems = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const priceInput = row.querySelector('.price-cell input');
        const grossInput = row.querySelector('.gross-cell input');
        const discAmtInput = row.querySelector('.disc-amount-cell input');
        const toAmtInput = row.querySelector('.to-amount-cell input');
        const gstAmtInput = row.querySelector('.gst-amount-cell input');
        const focInput = row.querySelector('.foc-cell input');
        const netInput = row.querySelector('.net-cell input');
        
        if (netInput) {
            totalPurchasePrice += parseFloat(priceInput?.value) || 0;
            totalGrossAmount += parseFloat(grossInput?.value) || 0;
            totalDiscountAmountItems += parseFloat(discAmtInput?.value) || 0;
            totalTradeOfferAmountItems += parseFloat(toAmtInput?.value) || 0;
            totalGSTAmountItems += parseFloat(gstAmtInput?.value) || 0;
            totalFOCQty += parseFloat(focInput?.value) || 0;
            totalNetAmountItems += parseFloat(netInput?.value) || 0;
            totalBill += parseFloat(netInput?.value) || 0;
        }
    }
    
    // Update totals
    const totalSalePriceEl = document.getElementById('totalSalePrice');
    const totalGrossAmountEl = document.getElementById('totalGrossAmount');
    const totalDiscountAmountItemsEl = document.getElementById('totalDiscountAmountItems');
    const totalTradeOfferAmountEl = document.getElementById('totalTradeOfferAmount');
    const totalGstAmountEl = document.getElementById('totalGstAmount');
    const totalFocQtyEl = document.getElementById('totalFocQty');
    const totalNetAmountItemsEl = document.getElementById('totalNetAmountItems');
    
    if (totalSalePriceEl) totalSalePriceEl.textContent = totalPurchasePrice.toFixed(2);
    if (totalGrossAmountEl) totalGrossAmountEl.textContent = totalGrossAmount.toFixed(2);
    if (totalDiscountAmountItemsEl) totalDiscountAmountItemsEl.textContent = totalDiscountAmountItems.toFixed(2);
    if (totalTradeOfferAmountEl) totalTradeOfferAmountEl.textContent = totalTradeOfferAmountItems.toFixed(2);
    if (totalGstAmountEl) totalGstAmountEl.textContent = totalGSTAmountItems.toFixed(2);
    if (totalFocQtyEl) totalFocQtyEl.textContent = totalFOCQty.toFixed(2);
    if (totalNetAmountItemsEl) totalNetAmountItemsEl.textContent = totalNetAmountItems.toFixed(2);
    
    const totalBillEl = document.getElementById('totalBill');
    if (totalBillEl) totalBillEl.textContent = totalBill.toFixed(2);
    
    // Calculate invoice-level discount
    const discountPercentEl = document.getElementById('totalDiscountPercent');
    const discountPercent = parseFloat(discountPercentEl?.value) || 0;
    const discountAmount = totalBill * (discountPercent / 100);
    const afterDiscount = totalBill - discountAmount;
    
    const shippingFeesEl = document.getElementById('shippingFees');
    const shippingFees = parseFloat(shippingFeesEl?.value) || 0;
    const netAmount = afterDiscount + shippingFees;
    
    const totalDiscountAmountEl = document.getElementById('totalDiscountAmount');
    const netAmountEl = document.getElementById('netAmount');
    
    if (totalDiscountAmountEl) totalDiscountAmountEl.value = discountAmount.toFixed(2);
    if (netAmountEl) netAmountEl.textContent = netAmount.toFixed(2);
    
    // Calculate withholding tax
    const withholdingTaxPercentEl = document.getElementById('withholdingTaxPercent');
    const withholdingTaxPercent = parseFloat(withholdingTaxPercentEl?.value) || 0;
    const withholdingTaxAmount = netAmount * (withholdingTaxPercent / 100);
    const netReceivable = netAmount - withholdingTaxAmount;
    
    const withholdingTaxAmountEl = document.getElementById('withholdingTaxAmount');
    const netReceivableEl = document.getElementById('netReceivable');
    
    if (withholdingTaxAmountEl) {
        withholdingTaxAmountEl.textContent = withholdingTaxAmount.toFixed(2);
    }
    if (netReceivableEl) {
        netReceivableEl.textContent = netReceivable.toFixed(2);
    }
    
    // Update remaining balance
    const amountPaidEl = document.getElementById('amountPaid');
    const amountPaid = parseFloat(amountPaidEl?.value) || 0;
    const remainingBalance = netReceivable - amountPaid;
    
    const remainingBalanceEl = document.getElementById('remainingBalance');
    if (remainingBalanceEl) {
        remainingBalanceEl.value = remainingBalance.toFixed(2);
    }
}

// Load UOM group units
async function loadUOMGroupUnits() {
    try {
        const response = await fetch('../../../../server/api/sale/pos_invoice/get-uom-group-units.php');
        const data = await response.json();
        if (data.success) {
            window.uomGroupUnits = data.groupUnits;
        }
    } catch (error) {
        console.error('Error loading UOM group units:', error);
    }
}
