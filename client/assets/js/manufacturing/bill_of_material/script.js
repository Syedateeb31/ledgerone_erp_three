(function() {
    const API_URL = '../../../../server/api/manufacturing/bill_of_material/index.php';
    let finishedGoods = [];
    let rawMaterials = [];
    let units = {};

    const materialListEl = document.getElementById('materialList');
    const addBtn = document.getElementById('addMaterialBtn');
    const finishedGoodInput = document.getElementById('finishedGood');
    const saveBtn = document.querySelector('#saveBtn');
    const cancelBtn = document.querySelector('#cancelBtn');

    async function loadFinishedGoods() {
        const res = await fetch(`${API_URL}?action=finished_goods`);
        const data = await res.json();
        if (data.success) {
            finishedGoods = data.data;
            const datalist = document.getElementById('productList');
            datalist.innerHTML = '';
            finishedGoods.forEach(p => {
                const opt = document.createElement('option');
                opt.value = `${p.code} - ${p.name}`;
                opt.dataset.id = p.id;
                datalist.appendChild(opt);
            });
        }
    }

    async function loadRawMaterials() {
        const res = await fetch(`${API_URL}?action=raw_materials`);
        const data = await res.json();
        if (data.success) {
            rawMaterials = data.data;
        }
    }

    async function getUnit(unitId) {
        if (units[unitId]) return units[unitId];
        const res = await fetch(`${API_URL}?action=unit&unit_id=${unitId}`);
        const data = await res.json();
        if (data.success && data.data) {
            units[unitId] = data.data;
            return data.data;
        }
        return null;
    }

    function createMaterialRow() {
        const uid = Date.now() + Math.floor(Math.random() * 1000);
        const rowDiv = document.createElement('div');
        rowDiv.className = 'material-row';

        const rawGroup = document.createElement('div');
        rawGroup.className = 'field-group';
        const rawLabel = document.createElement('label');
        rawLabel.className = 'form-label';
        rawLabel.textContent = 'Raw material';
        rawLabel.htmlFor = `rawMat_${uid}`;
        const rawInput = document.createElement('input');
        rawInput.type = 'text';
        rawInput.id = `rawMat_${uid}`;
        rawInput.className = 'form-control';
        rawInput.setAttribute('list', `rawMatList_${uid}`);
        rawInput.placeholder = 'Search material';
        rawInput.required = true;
        const rawDatalist = document.createElement('datalist');
        rawDatalist.id = `rawMatList_${uid}`;
        rawMaterials.forEach(mat => {
            const opt = document.createElement('option');
            opt.value = `${mat.code} - ${mat.name}`;
            opt.dataset.id = mat.id;
            opt.dataset.unitId = mat.default_unit_id;
            rawDatalist.appendChild(opt);
        });
        rawGroup.appendChild(rawLabel);
        rawGroup.appendChild(rawInput);
        rawGroup.appendChild(rawDatalist);

        rawInput.addEventListener('change', async function() {
            const selected = rawMaterials.find(m => `${m.code} - ${m.name}` === this.value);
            if (selected && selected.default_unit_id) {
                const unit = await getUnit(selected.default_unit_id);
                if (unit) {
                    const unitSelect = rowDiv.querySelector('select');
                    let opt = unitSelect.querySelector(`option[value="${unit.id}"]`);
                    if (!opt) {
                        opt = document.createElement('option');
                        opt.value = unit.id;
                        opt.textContent = unit.uom_name;
                        unitSelect.appendChild(opt);
                    }
                    unitSelect.value = unit.id;
                }
            }
        });

        const qtyGroup = document.createElement('div');
        qtyGroup.className = 'field-group';
        const qtyLabel = document.createElement('label');
        qtyLabel.className = 'form-label';
        qtyLabel.textContent = 'Quantity';
        qtyLabel.htmlFor = `qty_${uid}`;
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.id = `qty_${uid}`;
        qtyInput.className = 'form-control';
        qtyInput.placeholder = '0.0';
        qtyInput.step = 'any';
        qtyInput.required = true;
        qtyGroup.appendChild(qtyLabel);
        qtyGroup.appendChild(qtyInput);

        const unitGroup = document.createElement('div');
        unitGroup.className = 'field-group unit-field';
        const unitLabel = document.createElement('label');
        unitLabel.className = 'form-label';
        unitLabel.textContent = 'Unit';
        unitLabel.htmlFor = `unit_${uid}`;
        const unitSelect = document.createElement('select');
        unitSelect.id = `unit_${uid}`;
        unitSelect.className = 'form-control';
        unitSelect.required = true;
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Auto';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        unitSelect.appendChild(placeholderOption);
        unitGroup.appendChild(unitLabel);
        unitGroup.appendChild(unitSelect);

        const actionGroup = document.createElement('div');
        actionGroup.className = 'action-group';
        const addBtnIcon = document.createElement('button');
        addBtnIcon.type = 'button';
        addBtnIcon.className = 'btn btn-icon';
        addBtnIcon.innerHTML = '<i class="las la-plus"></i>';
        addBtnIcon.addEventListener('click', (e) => {
            e.preventDefault();
            materialListEl.appendChild(createMaterialRow());
        });

        const removeBtnIcon = document.createElement('button');
        removeBtnIcon.type = 'button';
        removeBtnIcon.className = 'btn btn-icon danger';
        removeBtnIcon.innerHTML = '<i class="las la-minus"></i>';
        removeBtnIcon.addEventListener('click', (e) => {
            e.preventDefault();
            if (materialListEl.children.length > 1) {
                rowDiv.remove();
            }
        });

        actionGroup.appendChild(addBtnIcon);
        actionGroup.appendChild(removeBtnIcon);

        rowDiv.appendChild(rawGroup);
        rowDiv.appendChild(qtyGroup);
        rowDiv.appendChild(unitGroup);
        rowDiv.appendChild(actionGroup);

        return rowDiv;
    }

    function initRows() {
        materialListEl.innerHTML = '';
        materialListEl.appendChild(createMaterialRow());
    }

    async function saveBOM() {
        const finishedGoodValue = finishedGoodInput.value;
        const selectedFG = finishedGoods.find(p => `${p.code} - ${p.name}` === finishedGoodValue);
        
        if (!selectedFG) {
            alert('Please select a valid finished good');
            return;
        }

        const materials = [];
        const rows = materialListEl.querySelectorAll('.material-row');
        
        for (const row of rows) {
            const rawInput = row.querySelector('input[list]');
            const qtyInput = row.querySelector('input[type="number"]');
            const unitSelect = row.querySelector('select');
            
            const rawValue = rawInput.value;
            const selectedRM = rawMaterials.find(m => `${m.code} - ${m.name}` === rawValue);
            
            if (!selectedRM || !qtyInput.value || !unitSelect.value) {
                alert('Please fill all material fields');
                return;
            }
            
            materials.push({
                raw_material_id: selectedRM.id,
                quantity: parseFloat(qtyInput.value),
                unit_id: parseInt(unitSelect.value)
            });
        }

        const payload = {
            bom_code: document.getElementById('bomCode').value,
            finished_good_id: selectedFG.id,
            version: document.getElementById('version').value,
            is_active: document.getElementById('active').checked ? 1 : 0,
            remarks: document.getElementById('remarks').value,
            materials
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
            alert('Error saving BOM: ' + err.message);
        }
    }

    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        materialListEl.appendChild(createMaterialRow());
    });

    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveBOM();
    });

    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Discard changes?')) location.reload();
    });

    async function init() {
        await loadFinishedGoods();
        await loadRawMaterials();
        await generateBOMCode();
        initRows();
    }

    async function generateBOMCode() {
        try {
            const res = await fetch(`${API_URL}?action=next_code`);
            const data = await res.json();
            if (data.success) {
                document.getElementById('bomCode').value = data.code;
            }
        } catch (err) {
            console.error('Error generating BOM code:', err);
        }
    }

    init();
})();
