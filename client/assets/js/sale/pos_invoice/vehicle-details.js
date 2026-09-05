// Vehicle Details (Chassis No / Motor No / Colour) for Sale Invoice
// Fetches available vehicles from purchase records and shows linked dropdowns per row

const vehicleCache = {}; // productId -> [{chassis_no, motor_no, colour}]

/**
 * Load vehicle options for a product and attach dropdowns to the row.
 * Called when a product is selected in a row.
 * @param {HTMLElement} row - The table row element
 * @param {number} productId - The product ID
 * @param {number} invoiceId - Optional invoice ID for edit mode (to exclude only other invoices' sold items)
 */
async function loadVehicleDetailsForRow(row, productId, invoiceId = null) {
    if (!productId) return;

    // Always re-fetch when invoiceId is provided (edit mode needs filtered results)
    const cacheKey = invoiceId ? `${productId}_${invoiceId}` : productId;
    if (!vehicleCache[cacheKey]) {
        try {
            let url = `../../../../server/api/sale/pos_invoice/get-vehicle-details.php?product_id=${productId}`;
            if (invoiceId) {
                url += `&invoice_id=${invoiceId}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            vehicleCache[cacheKey] = data.success ? data.vehicles : [];
        } catch (e) {
            vehicleCache[cacheKey] = [];
        }
    }

    populateVehicleDropdowns(row, vehicleCache[cacheKey]);
}

/**
 * Build the three linked inputs/selects in the row's chassis/motor/colour cells.
 */
function populateVehicleDropdowns(row, vehicles) {
    const chassisCell = row.querySelector('.row-chassis-cell');
    const motorCell   = row.querySelector('.row-motor-cell');
    const colourCell  = row.querySelector('.row-colour-cell');

    if (!chassisCell || !motorCell || !colourCell) return;

    chassisCell.innerHTML = '';
    motorCell.innerHTML   = '';
    colourCell.innerHTML  = '';

    if (vehicles && vehicles.length > 0) {
        // Build linked dropdowns from purchase data
        const chassisOptions = [...new Set(vehicles.map(v => v.chassis_no).filter(Boolean))];
        const chassisSel = buildSelect('chassis', chassisOptions, 'Chassis No');
        const motorSel   = buildSelect('motor',   [], 'Motor No');
        const colourSel  = buildSelect('colour',  [], 'Colour');

        chassisCell.appendChild(chassisSel);
        motorCell.appendChild(motorSel);
        colourCell.appendChild(colourSel);

        populateSelect(motorSel,  [...new Set(vehicles.map(v => v.motor_no).filter(Boolean))],  'Motor No');
        populateSelect(colourSel, [...new Set(vehicles.map(v => v.colour).filter(Boolean))],    'Colour');

        // When chassis changes → auto-fill motor & colour
        chassisSel.addEventListener('change', function () {
            const selected = vehicles.find(v => v.chassis_no === this.value);
            if (selected) {
                setSelectValue(motorSel,  selected.motor_no,  vehicles.filter(v => v.chassis_no === this.value).map(v => v.motor_no));
                setSelectValue(colourSel, selected.colour,    vehicles.filter(v => v.chassis_no === this.value).map(v => v.colour));
            } else {
                resetSelect(motorSel,  'Motor No');
                resetSelect(colourSel, 'Colour');
            }
        });
        motorSel.addEventListener('change', function () {
            const selected = vehicles.find(v => v.motor_no === this.value);
            if (selected) {
                setSelectValue(chassisSel, selected.chassis_no, vehicles.filter(v => v.motor_no === this.value).map(v => v.chassis_no));
                setSelectValue(colourSel,  selected.colour,     vehicles.filter(v => v.motor_no === this.value).map(v => v.colour));
            }
        });
        colourSel.addEventListener('change', function () {
            const selected = vehicles.find(v => v.colour === this.value);
            if (selected) {
                setSelectValue(chassisSel, selected.chassis_no, vehicles.filter(v => v.colour === this.value).map(v => v.chassis_no));
                setSelectValue(motorSel,   selected.motor_no,   vehicles.filter(v => v.colour === this.value).map(v => v.motor_no));
            }
        });
    } else {
        // No purchase data — show plain text inputs for manual entry
        chassisCell.appendChild(buildTextInput('chassis', 'Chassis No'));
        motorCell.appendChild(buildTextInput('motor',   'Motor No'));
        colourCell.appendChild(buildTextInput('colour',  'Colour'));
    }
}

function buildTextInput(name, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'vehicle-select';
    input.dataset.vehicleField = name;
    input.placeholder = placeholder;
    return input;
}

function buildSelect(name, options, placeholder) {
    const sel = document.createElement('select');
    sel.className = 'vehicle-select';
    sel.dataset.vehicleField = name;
    populateSelect(sel, options, placeholder);
    return sel;
}

function populateSelect(sel, options, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
    });
}

function setSelectValue(sel, value, options) {
    populateSelect(sel, [...new Set(options.filter(Boolean))], sel.querySelector('option').textContent);
    sel.value = value || '';
}

function resetSelect(sel, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
}

/**
 * Get vehicle values from a row for saving.
 */
function getRowVehicleValues(row) {
    return {
        chassisNo: row.querySelector('[data-vehicle-field="chassis"]')?.value || null,
        motorNo:   row.querySelector('[data-vehicle-field="motor"]')?.value   || null,
        colour:    row.querySelector('[data-vehicle-field="colour"]')?.value  || null,
    };
}

/**
 * Apply show/hide of chassis columns based on setting.
 * Called on page load and when settings change.
 * PRESERVES existing and pending vehicle values after reloading dropdowns.
 */
function applyChassisColumnVisibility() {
    const enabled = localStorage.getItem('enableChassisMotorColour') === 'true';
    const display = enabled ? '' : 'none';

    // Dynamic headers inserted by pos-add-uom.js
    document.querySelectorAll('#itemsTable .chassis-dyn-header').forEach(el => el.style.display = display);
    // Dynamic footer cells
    document.querySelectorAll('#itemsTable .chassis-dyn-footer').forEach(el => el.style.display = display);
    // Dynamic row cells
    document.querySelectorAll('#itemsTable .chassis-dyn-cell').forEach(el => el.style.display = display);

    if (enabled) {
        // Ensure every row that has a product has inputs in chassis cells
        document.querySelectorAll('#itemsTable tbody tr').forEach(row => {
            const chassisCell = row.querySelector('.row-chassis-cell');
            const motorCell   = row.querySelector('.row-motor-cell');
            const colourCell  = row.querySelector('.row-colour-cell');
            if (!chassisCell || !motorCell || !colourCell) return;

            // Save existing values before potentially reloading
            const existingChassis = row.querySelector('.row-chassis-cell [data-vehicle-field]')?.value || '';
            const existingMotor   = row.querySelector('.row-motor-cell [data-vehicle-field]')?.value   || '';
            const existingColour  = row.querySelector('.row-colour-cell [data-vehicle-field]')?.value  || '';

            // If cells are empty or need loading, populate them
            if (!chassisCell.querySelector('[data-vehicle-field]')) {
                if (row.dataset.productId && typeof loadVehicleDetailsForRow === 'function') {
                    const restoreChassis = row.dataset.pendingChassis || existingChassis;
                    const restoreMotor   = row.dataset.pendingMotor   || existingMotor;
                    const restoreColour  = row.dataset.pendingColour  || existingColour;
                    const restoreInvoiceId = row.dataset.pendingInvoiceId || null;

                    loadVehicleDetailsForRow(row, row.dataset.productId, restoreInvoiceId).then(() => {
                        // Apply saved values after vehicle details are loaded
                        if (restoreChassis) { const el = row.querySelector('.row-chassis-cell [data-vehicle-field]'); if (el) el.value = restoreChassis; }
                        if (restoreMotor)   { const el = row.querySelector('.row-motor-cell [data-vehicle-field]');   if (el) el.value = restoreMotor; }
                        if (restoreColour)  { const el = row.querySelector('.row-colour-cell [data-vehicle-field]');  if (el) el.value = restoreColour; }
                        // Clear pending flags after applying
                        delete row.dataset.pendingChassis;
                        delete row.dataset.pendingMotor;
                        delete row.dataset.pendingColour;
                        delete row.dataset.pendingInvoiceId;
                    });
                } else {
                    chassisCell.innerHTML = '';
                    motorCell.innerHTML   = '';
                    colourCell.innerHTML  = '';
                    chassisCell.appendChild(buildTextInput('chassis', 'Chassis No'));
                    motorCell.appendChild(buildTextInput('motor',   'Motor No'));
                    colourCell.appendChild(buildTextInput('colour',  'Colour'));
                    // Set existing values if available
                    if (existingChassis) chassisCell.querySelector('[data-vehicle-field]').value = existingChassis;
                    if (existingMotor)   motorCell.querySelector('[data-vehicle-field]').value   = existingMotor;
                    if (existingColour)  colourCell.querySelector('[data-vehicle-field]').value  = existingColour;
                }
            } else if (row.dataset.pendingChassis || row.dataset.pendingMotor || row.dataset.pendingColour) {
                // If we already have vehicle inputs but have pending values to apply
                const restoreChassis = row.dataset.pendingChassis || existingChassis;
                const restoreMotor   = row.dataset.pendingMotor   || existingMotor;
                const restoreColour  = row.dataset.pendingColour  || existingColour;

                if (restoreChassis) { const el = row.querySelector('.row-chassis-cell [data-vehicle-field]'); if (el) el.value = restoreChassis; }
                if (restoreMotor)   { const el = row.querySelector('.row-motor-cell [data-vehicle-field]');   if (el) el.value = restoreMotor; }
                if (restoreColour)  { const el = row.querySelector('.row-colour-cell [data-vehicle-field]');  if (el) el.value = restoreColour; }
                
                delete row.dataset.pendingChassis;
                delete row.dataset.pendingMotor;
                delete row.dataset.pendingColour;
                delete row.dataset.pendingInvoiceId;
            }
        });
    }
}

window.loadVehicleDetailsForRow   = loadVehicleDetailsForRow;
window.getRowVehicleValues        = getRowVehicleValues;
window.applyChassisColumnVisibility = applyChassisColumnVisibility;
