document.addEventListener('DOMContentLoaded', function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('chartDate').value = today;

    const slabsBody = document.getElementById('slabsBody');

    function addSlab(from = '', to = '', rate = '') {
        const rowCount = slabsBody.rows.length;
        const tr = slabsBody.insertRow();
        tr.innerHTML = `
            <td>${rowCount + 1}</td>
            <td><input type="number" class="table-input slab-from" placeholder="0.00" step="0.01" min="0" value="${from}"></td>
            <td><input type="number" class="table-input slab-to" placeholder="0.00" step="0.01" min="0" value="${to}"></td>
            <td><input type="number" class="table-input slab-rate" placeholder="0.00" step="0.01" min="0" value="${rate}"></td>
            <td><button type="button" class="btn-danger btn-sm" onclick="deleteSlab(this)"><i class="fas fa-trash"></i></button></td>
        `;
    }

    window.deleteSlab = function (btn) {
        if (slabsBody.rows.length > 1) {
            btn.closest('tr').remove();
            updateSerials();
        } else {
            alert('At least one slab is required.');
        }
    };

    function updateSerials() {
        Array.from(slabsBody.rows).forEach((r, i) => { r.cells[0].textContent = i + 1; });
    }

    document.getElementById('addSlabBtn').addEventListener('click', () => addSlab());

    document.getElementById('resetBtn').addEventListener('click', function () {
        if (confirm('Reset form? Unsaved changes will be lost.')) {
            loadChart();
        }
    });

    document.getElementById('brokenAllowanceForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const chartName = document.getElementById('chartName').value.trim();
        const chartDate = document.getElementById('chartDate').value;

        const slabs = [];
        let valid = true;

        Array.from(slabsBody.rows).forEach(row => {
            const from = row.querySelector('.slab-from').value;
            const to   = row.querySelector('.slab-to').value;
            const rate = row.querySelector('.slab-rate').value;
            if (from === '' || to === '' || rate === '') { valid = false; return; }
            slabs.push({ from: parseFloat(from), to: parseFloat(to), rate: parseFloat(rate) });
        });

        if (!chartName)              { alert('Chart name is required.'); return; }
        if (!valid || !slabs.length) { alert('Please fill all slab fields.'); return; }

        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        fetch('../../../../server/api/purchase/broken_allowance/broken-allowance-add.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chartName, chartDate, slabs })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('Chart saved successfully!');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(err => alert('Error: ' + err.message))
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Chart';
        });
    });

    function loadChart() {
        fetch('../../../../server/api/purchase/broken_allowance/broken-allowance-list.php')
        .then(r => r.json())
        .then(data => {
            slabsBody.innerHTML = '';
            if (data.success && data.chart) {
                const chart = data.chart;
                document.getElementById('chartName').value = chart.chart_name;
                document.getElementById('chartDate').value = chart.chart_date;
                chart.slabs.forEach(s => addSlab(s.from, s.to, s.rate));
            } else {
                // No existing chart — start fresh with one empty slab
                document.getElementById('chartName').value = '';
                document.getElementById('chartDate').value = today;
                addSlab();
            }
        })
        .catch(() => {
            slabsBody.innerHTML = '';
            addSlab();
        });
    }

    loadChart();
});
