(function() {
    const API_URL = '../../../../server/api/manufacturing/production_order/index.php';
    let materialRequirements = [];
    let products = [];
    let boms = [];

    async function loadProducts() {
        const res = await fetch(`${API_URL}?action=products`);
        const data = await res.json();
        if (data.success) {
            products = data.data;
            const datalist = document.getElementById('productList');
            datalist.innerHTML = '';
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = `${p.code} - ${p.name}`;
                opt.dataset.id = p.id;
                datalist.appendChild(opt);
            });
        }
    }

    async function loadBOMs(productId) {
        if (!productId) {
            document.getElementById('bomList').innerHTML = '';
            return;
        }
        const res = await fetch(`${API_URL}?action=boms&product_id=${productId}`);
        const data = await res.json();
        if (data.success) {
            boms = data.data;
            const datalist = document.getElementById('bomList');
            datalist.innerHTML = '';
            boms.forEach(b => {
                const opt = document.createElement('option');
                opt.value = `${b.bom_code} - v${b.version}`;
                opt.dataset.id = b.id;
                opt.dataset.version = b.version;
                datalist.appendChild(opt);
            });
        }
    }

    async function loadBranches() {
        const res = await fetch(`${API_URL}?action=branches`);
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById('branchId');
            select.innerHTML = '<option value="">Select Branch</option>';
            data.data.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.branch_name;
                select.appendChild(opt);
            });
        }
    }

    async function loadMachines(branchId) {
        if (!branchId) {
            document.getElementById('machineId').innerHTML = '<option value="">Select Machine</option>';
            return;
        }
        const res = await fetch(`${API_URL}?action=machines&branch_id=${branchId}`);
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById('machineId');
            select.innerHTML = '<option value="">Select Machine</option>';
            data.data.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.code} - ${m.machine_name}`;
                select.appendChild(opt);
            });
        }
    }

    async function generateOrderNo() {
        const res = await fetch(`${API_URL}?action=next_order_no`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('orderNo').value = data.order_no;
        }
    }

    async function loadMaterials() {
        const productValue = document.getElementById('productId').value;
        const bomValue = document.getElementById('bomId').value;
        const orderQty = document.getElementById('orderQty').value;
        const branchId = document.getElementById('branchId').value;

        const selectedProduct = products.find(p => `${p.code} - ${p.name}` === productValue);
        const selectedBOM = boms.find(b => `${b.bom_code} - v${b.version}` === bomValue);

        if (!selectedBOM || !orderQty || !branchId) {
            alert('Please select BOM, enter quantity, and select branch');
            return;
        }

        if (orderQty <= 0) {
            alert('Order quantity must be greater than 0');
            return;
        }

        try {
            const res = await fetch(`${API_URL}?action=calculate_materials&bom_id=${selectedBOM.id}&order_qty=${orderQty}&branch_id=${branchId}`);
            const data = await res.json();

            if (data.success) {
                materialRequirements = data.data;
                renderMaterialsTable(data.data);
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error loading materials');
        }
    }

    function renderMaterialsTable(materials) {
        const tbody = document.getElementById('materialsTable');
        tbody.innerHTML = '';

        if (materials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:#6B7280;">No materials found in BOM</td></tr>';
            return;
        }

        materials.forEach(mat => {
            const tr = document.createElement('tr');
            const status = mat.available_stock >= mat.required_qty ? 'available' : 'short';
            const statusText = mat.available_stock >= mat.required_qty ? 'Available' : 'Short';

            tr.innerHTML = `
                <td><strong>${mat.material_code} - ${mat.material_name}</strong></td>
                <td>${mat.required_qty}</td>
                <td>${mat.uom_name}</td>
                <td>${mat.available_stock}</td>
                <td><span class="badge ${status}">${statusText}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    async function saveProductionOrder() {
        const orderNo = document.getElementById('orderNo').value;
        const productValue = document.getElementById('productId').value;
        const bomValue = document.getElementById('bomId').value;
        const branchId = document.getElementById('branchId').value;
        const machineId = document.getElementById('machineId').value;
        const orderQty = document.getElementById('orderQty').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const selectedProduct = products.find(p => `${p.code} - ${p.name}` === productValue);
        const selectedBOM = boms.find(b => `${b.bom_code} - v${b.version}` === bomValue);

        if (!selectedProduct || !selectedBOM || !branchId || !orderQty) {
            alert('Please fill all required fields');
            return;
        }

        if (orderQty <= 0) {
            alert('Order quantity must be greater than 0');
            return;
        }

        if (materialRequirements.length === 0) {
            alert('Please load materials first');
            return;
        }

        const payload = {
            order_no: orderNo,
            product_id: selectedProduct.id,
            bom_id: selectedBOM.id,
            bom_version: selectedBOM.version,
            branch_id: branchId,
            machine_id: machineId || null,
            order_qty: orderQty,
            start_date: startDate,
            end_date: endDate,
            materials: materialRequirements
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                window.location.href = 'list.php?success=1';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error saving production order');
        }
    }

    document.getElementById('productId').addEventListener('change', function() {
        const selectedProduct = products.find(p => `${p.code} - ${p.name}` === this.value);
        if (selectedProduct) {
            loadBOMs(selectedProduct.id);
        }
    });

    document.getElementById('branchId').addEventListener('change', function() {
        loadMachines(this.value);
    });

    document.getElementById('loadMaterialsBtn').addEventListener('click', loadMaterials);
    document.getElementById('saveBtn').addEventListener('click', saveProductionOrder);
    document.getElementById('cancelBtn').addEventListener('click', () => {
        if (confirm('Discard changes?')) location.reload();
    });

    async function init() {
        await generateOrderNo();
        await loadProducts();
        await loadBranches();
    }

    init();
})();
