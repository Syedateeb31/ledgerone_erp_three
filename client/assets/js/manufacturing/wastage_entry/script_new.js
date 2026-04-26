(function () {
    const API_URL = '../../../../server/api/manufacturing/wastage_entry/index.php';

    let orders = [];
    let loadedMaterials = [];

    async function init() {
        setDefaultDate();
        await generateWastageNo();
        await loadOrders();
        bindEvents();
    }

    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('wastageDate').value = today;
    }

    async function generateWastageNo() {
        const res = await fetch(`${API_URL}?action=next_wastage_no`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('wastageNo').value = data.wastage_no;
        }
    }

    async function loadOrders() {
        const res = await fetch(`${API_URL}?action=production_orders`);
        const data = await res.json();
        if (data.success) {
            orders = data.data;
            const datalist = document.getElementById('orderList');
            datalist.innerHTML = '';
            orders.forEach(o => {
                const opt = document.createElement('option');
                opt.value = `${o.order_no} — ${o.product_name}`;
                opt.dataset.id = o.id;
                datalist.appendChild(opt);
            });
        }
    }

    async function loadMaterials() {
        const orderValue = document.getElementById('productionOrderInput').value;
        const selectedOrder = orders.find(o => `${o.order_no} — ${o.product_name}` === orderValue);

        if (!selectedOrder) {
            alert('Please select a valid production order');
            return;
        }

        const res = await fetch(`${API_URL}?action=load_materials&po_id=${selectedOrder.id}`);
        const data = await res.json();

        if (!data.success) {
            alert('Error loading materials: ' + data.message);
            return;
        }

        loadedMaterials = data.data;
        renderMaterialsTable(loadedMaterials);
    }

    function renderMaterialsTable(materials) {
        const tbody = document.getElementById('materialsTable');
        const wastageType = document.getElementById('wastageType').value;

        if (materials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No materials found in this production order</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        materials.forEach((mat, idx) => {
            const tr = document.createElement('tr');
            tr.dataset.idx = idx;
            tr.innerHTML = `
                <td><strong>${mat.material_code} — ${mat.material_name}</strong></td>
                <td>${parseFloat(mat.ordered_qty).toFixed(2)}</td>
                <td>${mat.uom_name}</td>
                <td>
                    <input type="number" class="form-control wastage-input"
                        data-idx="${idx}"
                        data-ordered="${mat.ordered_qty}"
                        min="0" step="0.01"
                        placeholder="0.00"
                        style="width:120px;">
                </td>
                <td class="wastage-qty-display" id="wq_${idx}">0.00</td>
            `;
            tbody.appendChild(tr);
        });

        updateInputHeader();
        bindInputEvents();
    }

    function updateInputHeader() {
        const wastageType = document.getElementById('wastageType').value;
        document.getElementById('wastageInputHeader').textContent =
            wastageType === 'percentage' ? 'Wastage %' : 'Wastage Qty';
    }

    function recalculateRow(input) {
        const idx = input.dataset.idx;
        const orderedQty = parseFloat(input.dataset.ordered) || 0;
        const wastageType = document.getElementById('wastageType').value;
        const inputVal = parseFloat(input.value) || 0;

        let wastageQty = 0;
        if (wastageType === 'percentage') {
            if (inputVal > 100) {
                input.value = 100;
                wastageQty = orderedQty;
            } else {
                wastageQty = (inputVal / 100) * orderedQty;
            }
        } else {
            if (inputVal > orderedQty) {
                input.value = orderedQty;
                wastageQty = orderedQty;
            } else {
                wastageQty = inputVal;
            }
        }

        document.getElementById(`wq_${idx}`).textContent = wastageQty.toFixed(2);
    }

    function recalculateAll() {
        document.querySelectorAll('.wastage-input').forEach(input => recalculateRow(input));
        updateInputHeader();
    }

    function bindInputEvents() {
        document.querySelectorAll('.wastage-input').forEach(input => {
            input.addEventListener('input', () => recalculateRow(input));
        });
    }

    async function saveWastageEntry() {
        const wastageNo = document.getElementById('wastageNo').value;
        const orderValue = document.getElementById('productionOrderInput').value;
        const wastageDate = document.getElementById('wastageDate').value;
        const wastageType = document.getElementById('wastageType').value;
        const remarks = document.getElementById('remarks').value;

        const selectedOrder = orders.find(o => `${o.order_no} — ${o.product_name}` === orderValue);

        if (!selectedOrder) {
            alert('Please select a valid production order');
            return;
        }

        if (!wastageDate) {
            alert('Please enter a wastage date');
            return;
        }

        if (loadedMaterials.length === 0) {
            alert('Please load materials first');
            return;
        }

        const items = [];
        document.querySelectorAll('.wastage-input').forEach((input, i) => {
            const mat = loadedMaterials[i];
            const inputVal = parseFloat(input.value) || 0;
            if (inputVal <= 0) return;

            const orderedQty = parseFloat(input.dataset.ordered) || 0;
            let wastageQty = wastageType === 'percentage'
                ? (inputVal / 100) * orderedQty
                : inputVal;

            items.push({
                material_id: mat.material_id,
                uom_id: mat.uom_id,
                ordered_qty: orderedQty,
                wastage_input: inputVal,
                wastage_qty: parseFloat(wastageQty.toFixed(2))
            });
        });

        if (items.length === 0) {
            alert('Please enter wastage for at least one material');
            return;
        }

        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="las la-spinner la-spin"></i> Saving...';

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wastage_no: wastageNo,
                    production_order_id: selectedOrder.id,
                    wastage_date: wastageDate,
                    wastage_type: wastageType,
                    remarks: remarks || null,
                    items: items
                })
            });
            const data = await res.json();

            if (data.success) {
                window.location.href = 'list.php?success=1';
            } else {
                alert('Error: ' + data.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="las la-save"></i> Save Wastage Entry';
            }
        } catch (err) {
            alert('Error saving wastage entry');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="las la-save"></i> Save Wastage Entry';
        }
    }

    function bindEvents() {
        document.getElementById('loadMaterialsBtn').addEventListener('click', loadMaterials);
        document.getElementById('saveBtn').addEventListener('click', saveWastageEntry);
        document.getElementById('cancelBtn').addEventListener('click', () => {
            if (loadedMaterials.length === 0 || confirm('Discard changes?')) {
                window.location.href = 'list.php';
            }
        });
        document.getElementById('wastageType').addEventListener('change', recalculateAll);
    }

    init();
})();
