(function() {
    const API_URL = '../../../../server/api/manufacturing/production_completion/index.php';

    let products = [];
    let branchId = null;
    let productionOrderId = null;

    async function loadNextCompletionNo() {
        const res = await fetch(API_URL + '?action=next_completion_no');
        const data = await res.json();
        if (data.success) {
            document.getElementById('completionNo').value = data.completion_no;
        }
    }

    async function loadProductionOrders() {
        const res = await fetch(API_URL + '?action=production_orders');
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById('productionOrderId');
            select.innerHTML = '<option value="">Select Production Order</option>';
            data.data.forEach(po => {
                const opt = document.createElement('option');
                opt.value = po.id;
                opt.textContent = `${po.order_no} - ${po.product_name} (${po.status})`;
                select.appendChild(opt);
            });
        }
    }

    async function loadProductionOrderDetails(poId) {
        try {
            const res = await fetch(API_URL + `?action=order_details&po_id=${poId}`);
            const data = await res.json();
            
            if (data.success && data.data) {
                const order = data.data;
                branchId = order.branch_id;
                productionOrderId = poId;
                
                document.getElementById('branchName').value = order.branch_name;
                document.getElementById('machineName').value = order.machine_name || '-';
                
                await loadProducts(poId);
            }
        } catch (err) {
            alert('Error loading order details');
        }
    }

    async function loadProducts(poId) {
        try {
            const res = await fetch(API_URL + `?action=products&po_id=${poId}`);
            const text = await res.text();
            console.log('Raw Response:', text);
            
            const data = JSON.parse(text);
            console.log('Parsed Data:', data);
            
            if (data.success) {
                products = data.data;
                renderProducts(products);
                calculateTotals();
            } else {
                alert('Error: ' + (data.message || 'Failed to load products'));
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error loading products: ' + err.message);
        }
    }

    function renderProducts(prods) {
        const tbody = document.getElementById('productsTable');
        if (!prods || prods.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:#6B7280;">No products found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        prods.forEach((prod, idx) => {
            const remaining = parseFloat(prod.order_qty) - parseFloat(prod.completed_qty || 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${prod.product_code} - ${prod.product_name}</strong></td>
                <td>${prod.order_qty}</td>
                <td>${remaining.toFixed(2)}</td>
                <td><input type="number" class="complete-qty" data-idx="${idx}" step="0.01" min="0" max="${remaining}" value="${remaining}" required></td>
                <td>${prod.uom_name || 'N/A'}</td>
                <td class="unit-cost-${idx}">${parseFloat(prod.unit_cost).toFixed(2)}</td>
                <td class="total-cost-${idx}">${(remaining * prod.unit_cost).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.complete-qty').forEach(input => {
            input.addEventListener('input', function() {
                const idx = this.getAttribute('data-idx');
                calculateRowTotal(idx);
                calculateTotals();
            });
        });
    }

    function calculateRowTotal(idx) {
        const input = document.querySelector(`.complete-qty[data-idx="${idx}"]`);
        const completeQty = parseFloat(input.value || 0);
        const unitCost = parseFloat(products[idx].unit_cost || 0);
        const totalCost = completeQty * unitCost;
        
        document.querySelector(`.total-cost-${idx}`).textContent = totalCost.toFixed(2);
    }

    function calculateTotals() {
        let totalProducts = 0;
        let totalQuantity = 0;
        let totalCost = 0;
        
        document.querySelectorAll('.complete-qty').forEach(input => {
            const qty = parseFloat(input.value || 0);
            if (qty > 0) {
                totalProducts++;
                totalQuantity += qty;
                const idx = input.getAttribute('data-idx');
                const unitCost = parseFloat(products[idx].unit_cost || 0);
                totalCost += qty * unitCost;
            }
        });
        
        document.getElementById('totalProducts').value = totalProducts;
        document.getElementById('totalQuantity').value = totalQuantity.toFixed(2);
        document.getElementById('totalCost').value = totalCost.toFixed(2);
    }

    async function completeProduction() {
        const poId = document.getElementById('productionOrderId').value;
        const completeDate = document.getElementById('completeDate').value;
        
        if (!poId) {
            alert('Please select a production order');
            return;
        }
        
        if (!completeDate) {
            alert('Please select complete date');
            return;
        }
        
        const completedProducts = [];
        document.querySelectorAll('.complete-qty').forEach(input => {
            const qty = parseFloat(input.value || 0);
            if (qty > 0) {
                const idx = input.getAttribute('data-idx');
                const prod = products[idx];
                completedProducts.push({
                    product_id: prod.product_id,
                    completed_qty: qty,
                    unit_cost: prod.unit_cost,
                    uom_id: prod.uom_id
                });
            }
        });
        
        if (completedProducts.length === 0) {
            alert('Please enter completed quantities');
            return;
        }
        
        const payload = {
            po_id: poId,
            branch_id: branchId,
            complete_date: completeDate,
            products: completedProducts
        };
        
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                alert('Production completed successfully!');
                window.location.href = 'list.php';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            alert('Error completing production');
        }
    }

    document.getElementById('productionOrderId').addEventListener('change', function() {
        const poId = this.value;
        if (poId) {
            loadProductionOrderDetails(poId);
        } else {
            document.getElementById('branchName').value = '';
            document.getElementById('machineName').value = '';
            document.getElementById('totalProducts').value = '';
            document.getElementById('totalQuantity').value = '';
            document.getElementById('totalCost').value = '';
            document.getElementById('productsTable').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:#6B7280;">Select a production order to load products</td></tr>';
        }
    });

    document.getElementById('completeBtn').addEventListener('click', completeProduction);
    document.getElementById('cancelBtn').addEventListener('click', () => window.location.href = 'list.php');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('completeDate').value = today;

    loadNextCompletionNo();
    loadProductionOrders();
})();
