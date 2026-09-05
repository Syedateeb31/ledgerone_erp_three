// FOC Qty Unit ID Fix - Patch for saveInvoice
// This ensures FOC quantities are recorded with the base unit ID

(function() {
    const originalSaveInvoice = window.saveInvoice;
    
    window.saveInvoice = function(status = 'Posted') {
        const saveBtn = document.getElementById('saveBtn');
        const saveDraftBtn = document.getElementById('saveDraftBtn');

        if (saveBtn) saveBtn.disabled = true;
        if (saveDraftBtn) saveDraftBtn.disabled = true;

        if (status === 'Draft' && saveDraftBtn) {
            saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        } else if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('variants_')) {
                localStorage.removeItem(key);
            }
        });

        const formData = {
            saleDate: document.getElementById('saleDate').value,
            customerId: document.getElementById('customerCode').value,
            subAccountId: document.getElementById('subAccount').value || null,
            companyId: document.getElementById('company').value || null,
            branchId: document.getElementById('branch').value,
            currencyId: document.getElementById('currency').value,
            saleOrderId: document.getElementById('saleOrder').value || null,
            previousBalance: document.getElementById('previousBalance')?.value || '0.00',
            salesOfficerId: document.getElementById('salesOfficer')?.value || null,
            supplierManId: document.getElementById('supplierMan')?.value || null,
            biltyNo: document.getElementById('biltyNo')?.value || null,
            transportName: document.getElementById('transportName')?.value || null,
            totalBill: parseFloat(document.getElementById('totalBill').textContent),
            totalDiscountPercent: parseFloat(document.getElementById('totalDiscountPercent')?.value) || 0,
            totalDiscountAmount: parseFloat(document.getElementById('totalDiscountAmount')?.value),
            netAmount: parseFloat(document.getElementById('netAmount').textContent),
            paymentMethod: document.getElementById('paymentMethod')?.value,
            bankAccountId: document.getElementById('bankAccount')?.value || null,
            amountPaid: parseFloat(document.getElementById('amountPaid')?.value) || 0,
            amountPaidAutoFill: document.querySelector('input[name="autoFillAmountPaid"]:checked')?.value || 'yes',
            remainingBalance: parseFloat(document.getElementById('remainingBalance')?.value) || 0,
            remarks: document.getElementById('remarks')?.value,
            status: status,
            items: []
        };

        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        const isEditMode = editId !== null;

        if (isEditMode) {
            formData.invoice_id = editId;
        }

        const rows = document.getElementById('itemsTable').getElementsByTagName('tbody')[0].rows;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            if (row.classList.contains('child-row')) {
                const item = {
                    productId: row.dataset.productId,
                    uomId: row.cells[2].querySelector('select').value,
                    quantity: parseFloat(row.cells[3].querySelector('input').value),
                    salePrice: 0,
                    grossAmount: 0,
                    discountPercent: 0,
                    discountAmount: 0,
                    tradeOfferAmount: 0,
                    gstPercent: 0,
                    gstAmount: 0,
                    focQty: 0,
                    netAmount: 0,
                    parentRowId: row.dataset.parentRowIndex !== undefined ? parseInt(row.dataset.parentRowIndex) + 1 : null,
                    stockAffects: parseInt(row.dataset.stockAffects) || 0,
                    invoiceAffects: parseInt(row.dataset.invoiceAffects) || 0,
                    scheme: 'sale_on_tp'
                };
                formData.items.push(item);
                continue;
            }

            const productId = row.cells[1].querySelector('.item-code').value;
            
            const unitInputs = row.querySelectorAll('.unit-input');
            const unitsWithQty = [];
            unitInputs.forEach(input => {
                const qty = parseFloat(input.value) || 0;
                if (qty > 0) {
                    unitsWithQty.push({
                        uom_id: input.dataset.unitId,
                        quantity: qty
                    });
                }
            });
            
            const priceInput = row.querySelector('.price-cell input');
            const grossInput = row.querySelector('.gross-cell input');
            const discPercentInput = row.querySelector('.disc-percent-cell input');
            const discAmountInput = row.querySelector('.disc-amount-cell input');
            const toAmountInput = row.querySelector('.to-amount-cell input');
            const gstPercentInput = row.querySelector('.gst-percent-cell input');
            const gstAmountInput = row.querySelector('.gst-amount-cell input');
            const focInput = row.querySelector('.foc-cell input');
            const netInput = row.querySelector('.net-cell input');
            const schemeSelect = row.querySelector('.scheme-select');
            
            const salePrice = parseFloat(priceInput.value);
            const grossAmount = parseFloat(grossInput.value);
            const discountPercent = parseFloat(discPercentInput.value) || 0;
            const discountAmount = parseFloat(discAmountInput.value);
            const tradeOfferAmount = parseFloat(toAmountInput.value) || 0;
            const gstPercent = parseFloat(gstPercentInput.value) || 0;
            const gstAmount = parseFloat(gstAmountInput.value) || 0;
            const focQty = parseFloat(focInput.value) || 0;
            const netAmount = parseFloat(netInput.value);
            const scheme = schemeSelect ? schemeSelect.value : 'sale_on_tp';
            
            // GET FOC UNIT ID FROM DATASET
            const focUnitId = focInput.dataset.baseUnitId || '';
            
            unitsWithQty.forEach((unit, index) => {
                const isFirstUnit = index === 0;
                const item = {
                    productId: productId,
                    uomId: unit.uom_id,
                    quantity: unit.quantity,
                    piece: 0,
                    carton: 0,
                    dozen: 0,
                    salePrice: salePrice,
                    grossAmount: isFirstUnit ? grossAmount : 0,
                    discountPeAmount: isFirstUnit ? tradeOfferAmount : 0,
                    gstPercent: gstPercent,
                    gstAmount: isFirstUnit ? gstAmount : 0,
                    focQty: isFirstUnit ? focQty : 0,
                    focUnitId: isFirstUnit && focQty > 0 ? focUnitId : '',
                    netAmount: isFirstUnit ? netAmount : 0,
                    parentRowId: null,
                    stockAffects: parseInt(row.dataset.stockAffects) || 1,
                    invoiceAffects: parseInt(row.dataset.invoiceAffects) || 1,
                    scheme: scheme
                };
                formData.items.push(item);
            });

            if (row.dataset.childProducts) {
                const children = JSON.parse(row.dataset.childProducts);
                children.forEach(child => {
                    formData.items.push({
                        productId: child.product_id,
                        uomId: child.uom_id,
                        quantity: parseFloat(child.quantity),
                        piece: 0,
                        carton: 0,
                        dozen: 0,
                        salePrice: 0,
                        grossAmount: 0,
                        discountPercent: 0,
                        discountAmount: 0,
                        tradeOfferAmount: 0,
                        gstPercent: 0,
                        gstAmount: 0,
                        focQty: 0,
                        netAmount: 0,
                        parentRowId: formData.items.length,
                        stockAffects: parseInt(child.stock_affects) || 0,
                        invoiceAffects: parseInt(child.invoice_affects) || 0,
                        scheme: 'sale_on_tp'
                    });
                });
            }
        }

        const apiUrl = isEditMode ?
            '../../../../server/api/sale/pos_invoice/pos-edit.php' :
            '../../../../server/api/sale/pos_invoice/pos-add.php';
        const method = isEditMode ? 'PUT' : 'POST';

        fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (status === 'Draft') {
                        alert('Invoice saved as draft successfully!');
                        window.location.href = 'pos-add.php';
                    } else {
                        window.lastInvoiceId = data.invoice_id;
                        document.getElementById('successModal').style.display = 'flex';
                    }
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                alert('Error saving invoice: ' + error.message);
            })
            .finally(() => {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
                }
                if (saveDraftBtn) {
                    saveDraftBtn.disabled = false;
                    saveDraftBtn.innerHTML = '<i class="fas fa-file"></i> Save as Draft';
                }
            });
    };
})();
