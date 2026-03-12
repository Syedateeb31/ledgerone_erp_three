(function() {
    const API_URL = '../../../../server/api/manufacturing/bill_of_material/list.php';
    const API_BASE = '../../../../server/api/manufacturing/bill_of_material/index.php';
    
    let allBoms = [];
    let rawMaterials = [];
    let units = {};

    async function loadBOMs() {
        try {
            const res = await fetch(`${API_URL}?action=list`);
            const data = await res.json();
            if (data.success) {
                allBoms = data.data;
                populateFGFilter();
                filterData();
            }
        } catch (err) {
            console.error('Error loading BOMs:', err);
        }
    }

    async function loadRawMaterials() {
        const res = await fetch(`${API_BASE}?action=raw_materials`);
        const data = await res.json();
        if (data.success) {
            rawMaterials = data.data;
        }
    }

    async function getUnit(unitId) {
        if (units[unitId]) return units[unitId];
        const res = await fetch(`${API_BASE}?action=unit&unit_id=${unitId}`);
        const data = await res.json();
        if (data.success && data.data) {
            units[unitId] = data.data;
            return data.data;
        }
        return null;
    }

    function populateFGFilter() {
        const fgFilter = document.getElementById('fgFilter');
        const uniqueFGs = [...new Set(allBoms.map(b => `${b.fg_code} - ${b.fg_name}`))];
        
        fgFilter.innerHTML = '<option value="all">All finished goods</option>';
        uniqueFGs.forEach(fg => {
            const opt = document.createElement('option');
            opt.value = fg;
            opt.textContent = fg;
            fgFilter.appendChild(opt);
        });
    }

    async function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:#6B7280;">No BOM entries found</td></tr>';
            return;
        }

        for (const bom of data) {
            const tr = document.createElement('tr');
            
            // Fetch materials for this BOM
            let materialsHtml = `<span style="color:#6B7280;">${bom.material_count} materials</span>`;
            try {
                const res = await fetch(`${API_URL}?action=view&id=${bom.id}`);
                const result = await res.json();
                if (result.success && result.data.materials) {
                    const materials = result.data.materials.slice(0, 3);
                    materialsHtml = '<div class="raw-summary">';
                    materials.forEach(mat => {
                        materialsHtml += `<span class="raw-tag">${mat.material_code} - ${mat.material_name} (${mat.quantity} ${mat.unit_name})</span>`;
                    });
                    if (result.data.materials.length > 3) {
                        materialsHtml += `<span class="raw-tag">+${result.data.materials.length - 3} more</span>`;
                    }
                    materialsHtml += '</div>';
                }
            } catch (err) {
                console.error('Error loading materials:', err);
            }
            
            tr.innerHTML = `
                <td><strong>${bom.bom_code}</strong></td>
                <td><strong>${bom.fg_code} - ${bom.fg_name}</strong></td>
                <td><span class="version-pill">v${bom.version}</span></td>
                <td><span class="badge ${bom.is_active == 1 ? 'active' : 'inactive'}">${bom.is_active == 1 ? 'Active' : 'Inactive'}</span></td>
                <td>${materialsHtml}</td>
                <td>${new Date(bom.updated_at).toLocaleDateString()}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="viewBOM(${bom.id})" title="View"><i class="las la-eye"></i></button>
                    <button class="btn-icon" onclick="editBOM(${bom.id})" title="Edit"><i class="las la-pencil-alt"></i></button>
                    <button class="btn-icon" onclick="deleteBOM(${bom.id})" title="Delete"><i class="las la-trash"></i></button>
                </td>
            `;
            
            tbody.appendChild(tr);
        }
    }

    function filterData() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const status = document.getElementById('statusFilter').value;
        const fg = document.getElementById('fgFilter').value;

        const filtered = allBoms.filter(bom => {
            const fgName = `${bom.fg_code} - ${bom.fg_name}`.toLowerCase();
            const matchesSearch = searchTerm === '' || fgName.includes(searchTerm) || bom.version.includes(searchTerm);
            
            let matchesStatus = true;
            if (status === '1') matchesStatus = bom.is_active == 1;
            else if (status === '0') matchesStatus = bom.is_active == 0;
            
            let matchesFg = true;
            if (fg !== 'all') {
                matchesFg = `${bom.fg_code} - ${bom.fg_name}` === fg;
            }
            
            return matchesSearch && matchesStatus && matchesFg;
        });
        
        renderTable(filtered);
    }

    window.viewBOM = async function(id) {
        try {
            const res = await fetch(`${API_URL}?action=view&id=${id}`);
            const data = await res.json();
            
            if (data.success && data.data) {
                const bom = data.data;
                let html = `
                    <div class="detail-row">
                        <div class="detail-label">BOM Code:</div>
                        <div class="detail-value"><strong>${bom.bom_code}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Finished Good:</div>
                        <div class="detail-value"><strong>${bom.fg_code} - ${bom.fg_name}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Version:</div>
                        <div class="detail-value">${bom.version}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value"><span class="badge ${bom.is_active == 1 ? 'active' : 'inactive'}">${bom.is_active == 1 ? 'Active' : 'Inactive'}</span></div>
                    </div>
                    ${bom.remarks ? `<div class="detail-row">
                        <div class="detail-label">Remarks:</div>
                        <div class="detail-value">${bom.remarks}</div>
                    </div>` : ''}
                    <div class="raw-title">Raw Materials</div>
                `;
                
                bom.materials.forEach(mat => {
                    html += `
                        <div class="detail-row">
                            <div class="detail-label">${mat.material_code} - ${mat.material_name}</div>
                            <div class="detail-value">${mat.quantity} ${mat.unit_name}</div>
                        </div>
                    `;
                });
                
                document.getElementById('viewModalBody').innerHTML = html;
                document.getElementById('viewModal').style.display = 'block';
            }
        } catch (err) {
            alert('Error loading BOM details');
        }
    };

    window.closeViewModal = function() {
        document.getElementById('viewModal').style.display = 'none';
    };

    window.editBOM = async function(id) {
        try {
            const res = await fetch(`${API_URL}?action=view&id=${id}`);
            const data = await res.json();
            
            console.log('Edit BOM data:', data);
            
            if (data.success && data.data) {
                const bom = data.data;
                
                document.getElementById('editBomId').value = bom.id;
                document.getElementById('editBomCode').value = bom.bom_code;
                document.getElementById('editFinishedGood').value = `${bom.fg_code} - ${bom.fg_name}`;
                document.getElementById('editVersion').value = bom.version;
                document.getElementById('editActive').checked = bom.is_active == 1;
                document.getElementById('editRemarks').value = bom.remarks || '';
                
                const editMaterialList = document.getElementById('editMaterialList');
                editMaterialList.innerHTML = '';
                
                if (bom.materials && bom.materials.length > 0) {
                    for (const mat of bom.materials) {
                        console.log('Creating row for material:', mat);
                        const row = await createEditMaterialRow(mat);
                        editMaterialList.appendChild(row);
                    }
                } else {
                    console.log('No materials found, adding empty row');
                    const row = await createEditMaterialRow();
                    editMaterialList.appendChild(row);
                }
                
                document.getElementById('editModal').style.display = 'block';
            }
        } catch (err) {
            console.error('Error loading BOM for edit:', err);
            alert('Error loading BOM for edit');
        }
    };

    async function createEditMaterialRow(material = null) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'material-row';

        const rawGroup = document.createElement('div');
        rawGroup.className = 'field-group';
        const rawSelect = document.createElement('select');
        rawSelect.className = 'form-control';
        rawSelect.required = true;
        
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select material';
        rawSelect.appendChild(placeholder);
        
        rawMaterials.forEach(mat => {
            const opt = document.createElement('option');
            opt.value = mat.id;
            opt.textContent = `${mat.code} - ${mat.name}`;
            opt.dataset.unitId = mat.default_unit_id;
            if (material && mat.id == material.raw_material_id) {
                opt.selected = true;
            }
            rawSelect.appendChild(opt);
        });
        
        rawGroup.appendChild(rawSelect);

        const qtyGroup = document.createElement('div');
        qtyGroup.className = 'field-group';
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'form-control';
        qtyInput.placeholder = 'Quantity';
        qtyInput.step = 'any';
        qtyInput.required = true;
        if (material) qtyInput.value = material.quantity;
        qtyGroup.appendChild(qtyInput);

        const unitGroup = document.createElement('div');
        unitGroup.className = 'field-group';
        const unitSelect = document.createElement('select');
        unitSelect.className = 'form-control';
        unitSelect.required = true;
        
        const unitPlaceholder = document.createElement('option');
        unitPlaceholder.value = '';
        unitPlaceholder.textContent = 'Select unit';
        unitSelect.appendChild(unitPlaceholder);
        
        if (material && material.unit_id) {
            const unit = await getUnit(material.unit_id);
            if (unit) {
                const opt = document.createElement('option');
                opt.value = unit.id;
                opt.textContent = unit.uom_name;
                opt.selected = true;
                unitSelect.appendChild(opt);
            }
        }
        
        unitGroup.appendChild(unitSelect);

        rawSelect.addEventListener('change', async function() {
            const selected = this.options[this.selectedIndex];
            if (selected && selected.dataset.unitId) {
                const unit = await getUnit(selected.dataset.unitId);
                if (unit) {
                    unitSelect.innerHTML = '';
                    const opt = document.createElement('option');
                    opt.value = unit.id;
                    opt.textContent = unit.uom_name;
                    opt.selected = true;
                    unitSelect.appendChild(opt);
                }
            }
        });

        const actionGroup = document.createElement('div');
        actionGroup.className = 'action-group';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-icon';
        removeBtn.innerHTML = '<i class="las la-minus"></i>';
        removeBtn.addEventListener('click', () => rowDiv.remove());
        
        actionGroup.appendChild(removeBtn);

        rowDiv.appendChild(rawGroup);
        rowDiv.appendChild(qtyGroup);
        rowDiv.appendChild(unitGroup);
        rowDiv.appendChild(actionGroup);

        return rowDiv;
    }

    document.getElementById('editAddMaterialBtn').addEventListener('click', async () => {
        const row = await createEditMaterialRow();
        document.getElementById('editMaterialList').appendChild(row);
    });

    window.closeEditModal = function() {
        document.getElementById('editModal').style.display = 'none';
    };

    window.updateBOM = async function() {
        const bomId = document.getElementById('editBomId').value;
        const version = document.getElementById('editVersion').value;
        const isActive = document.getElementById('editActive').checked ? 1 : 0;
        const remarks = document.getElementById('editRemarks').value;
        
        const materials = [];
        const rows = document.querySelectorAll('#editMaterialList .material-row');
        
        for (const row of rows) {
            const selects = row.querySelectorAll('select');
            const rawSelect = selects[0];
            const unitSelect = selects[1];
            const qtyInput = row.querySelector('input[type="number"]');
            
            console.log('Raw Material ID:', rawSelect.value);
            console.log('Quantity:', qtyInput.value);
            console.log('Unit ID:', unitSelect.value);
            
            if (!rawSelect.value || !qtyInput.value || !unitSelect.value) {
                alert('Please fill all material fields');
                return;
            }
            
            materials.push({
                raw_material_id: parseInt(rawSelect.value),
                quantity: parseFloat(qtyInput.value),
                unit_id: parseInt(unitSelect.value)
            });
        }
        
        console.log('Materials to update:', materials);
        
        try {
            const res = await fetch(API_URL, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    id: bomId,
                    version,
                    is_active: isActive,
                    remarks,
                    materials
                })
            });
            
            const data = await res.json();
            console.log('Update response:', data);
            
            if (data.success) {
                window.location.href = 'list.php?success=2';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            console.error('Update error:', err);
            alert('Error updating BOM');
        }
    };

    window.deleteBOM = async function(id) {
        if (!confirm('Are you sure you want to delete this BOM?')) return;
        
        try {
            const res = await fetch(`${API_URL}?id=${id}`, {
                method: 'DELETE'
            });
            
            const data = await res.json();
            
            if (data.success) {
                window.location.href = 'list.php?success=3';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error deleting BOM');
        }
    };

    document.getElementById('searchInput').addEventListener('input', filterData);
    document.getElementById('statusFilter').addEventListener('change', filterData);
    document.getElementById('fgFilter').addEventListener('change', filterData);
    
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('fgFilter').value = 'all';
        filterData();
    });

    window.onclick = function(event) {
        if (event.target.id === 'viewModal') {
            closeViewModal();
        }
        if (event.target.id === 'editModal') {
            closeEditModal();
        }
    };

    async function init() {
        await loadRawMaterials();
        await loadBOMs();
        
        // Check for success message
        const urlParams = new URLSearchParams(window.location.search);
        const successType = urlParams.get('success');
        if (successType) {
            const successMsg = document.getElementById('successMessage');
            const msgText = successMsg.querySelector('span');
            if (successType === '1') {
                msgText.textContent = 'BOM saved successfully!';
            } else if (successType === '2') {
                msgText.textContent = 'BOM updated successfully!';
            } else if (successType === '3') {
                msgText.textContent = 'BOM deleted successfully!';
            }
            successMsg.style.display = 'flex';
            setTimeout(() => {
                successMsg.style.display = 'none';
                window.history.replaceState({}, '', 'list.php');
            }, 3000);
        }
    }

    init();
})();
