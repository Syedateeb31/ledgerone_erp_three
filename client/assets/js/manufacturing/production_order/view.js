(function() {
    const API_URL = '../../../../server/api/manufacturing/production_order/list.php';

    async function loadOrder() {
        try {
            const res = await fetch(`${API_URL}?action=view&id=${ORDER_ID}`);
            const data = await res.json();
            
            console.log('API Response:', data);
            
            if (data.success && data.data) {
                console.log('Materials:', data.data.materials);
                renderOrder(data.data);
            } else {
                document.getElementById('orderDetails').innerHTML = '<div style="text-align:center; padding:32px; color:#B12B2B;">Order not found</div>';
            }
        } catch (err) {
            console.error('Error:', err);
            document.getElementById('orderDetails').innerHTML = '<div style="text-align:center; padding:32px; color:#B12B2B;">Error loading order</div>';
        }
    }

    function renderOrder(order) {
        const statusClass = order.status.toLowerCase().replace(' ', '-');
        
        let html = `
            <div class="detail-section">
                <div class="section-title">Order Information</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Order No</div>
                        <div class="detail-value">${order.order_no}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Product</div>
                        <div class="detail-value">${order.product_code} - ${order.product_name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">BOM</div>
                        <div class="detail-value">${order.bom_code} v${order.bom_version}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Branch</div>
                        <div class="detail-value">${order.branch_name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Machine</div>
                        <div class="detail-value">${order.machine_name ? order.machine_code + ' - ' + order.machine_name : '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Order Quantity</div>
                        <div class="detail-value">${order.order_qty}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value"><span class="badge ${statusClass}">${order.status}</span></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Start Date</div>
                        <div class="detail-value">${order.start_date || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">End Date</div>
                        <div class="detail-value">${order.end_date || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="section-title">Material Requirements</div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Required Qty</th>
                                <th>UOM</th>
                                <th>Issued Qty</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (order.materials && order.materials.length > 0) {
            order.materials.forEach(mat => {
                const unitName = mat.unit_name ? mat.unit_name : (mat.uom_name ? mat.uom_name : 'N/A');
                const issuedQty = mat.issued_qty ? mat.issued_qty : 0;
                const status = mat.status ? mat.status : 'Pending';
                html += `
                    <tr>
                        <td><strong>${mat.material_code} - ${mat.material_name}</strong></td>
                        <td>${mat.required_qty}</td>
                        <td>${unitName}</td>
                        <td>${issuedQty}</td>
                        <td><span class="badge ${status.toLowerCase()}">${status}</span></td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="5" style="text-align:center;">No materials found</td></tr>';
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('orderDetails').innerHTML = html;
    }

    loadOrder();
})();
