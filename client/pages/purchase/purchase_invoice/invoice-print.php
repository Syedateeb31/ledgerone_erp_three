<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Invoice - Print</title>
    <style>
        @media print { body { margin: 0; } .no-print { display: none; } @page { size: var(--page-size, A4); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; background: white; }
        .invoice-container { max-width: 900px; margin: 20px auto; padding: 20px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .company-info h1 { font-size: 20px; color: #333; margin-bottom: 4px; }
        .company-info p { font-size: 11px; color: #555; margin-bottom: 2px; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { font-size: 18px; color: #444; margin-bottom: 8px; }
        .invoice-details p { font-size: 11px; margin-bottom: 2px; }
        .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .info-box { padding: 10px 12px; border: 1px solid #ddd; border-radius: 5px; }
        .info-box h3 { font-size: 12px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px; font-weight: bold; }
        .info-box p { font-size: 11px; margin-bottom: 3px; color: #444; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 5px 4px; text-align: left; }
        .items-table th { background-color: #f0f0f0; font-weight: bold; font-size: 10px; text-align: center; }
        .items-table td { font-size: 10px; }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .totals-section { margin-top: 16px; }
        .totals-wrapper { width: 100%; display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
        .totals-left { border-right: 1px solid #ddd; }
        .totals-panel-title { background: #f0f0f0; padding: 6px 12px; font-weight: bold; font-size: 11px; color: #444; border-bottom: 1px solid #ddd; text-transform: uppercase; letter-spacing: 0.5px; }
        .totals-row { display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .totals-row:last-child { border-bottom: none; }
        .totals-row.subtotal { background: #fafafa; font-weight: bold; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
        .totals-row.highlight-net { background: #eaf4ff; font-weight: bold; color: #1565c0; border-top: 2px solid #1565c0; }
        .print-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-bottom: 12px; margin-right: 6px; }
        .print-btn:hover { background: #0056b3; }
        .print-btn.active { background: #28a745; }
        body.a5-mode { font-size: 8px; }
        .a5-mode .invoice-container { max-width: 550px; padding: 10px; }
        .a5-mode .items-table th, .a5-mode .items-table td { padding: 2px 2px; font-size: 7px; }
        .a5-mode .totals-row { padding: 3px 8px; font-size: 8px; }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
        <button class="print-btn" onclick="setPaperSize('A4')" id="btnA4">A4</button>
        <button class="print-btn" onclick="setPaperSize('A3')" id="btnA3">A3</button>
        <button class="print-btn" onclick="setPaperSize('A5')" id="btnA5">A5</button>
    </div>

    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <img id="companyLogo" src="" alt="" style="max-width:120px;max-height:70px;margin-bottom:8px;display:none;">
                <h1 id="companyName">Loading...</h1>
                <p id="companyAddress"></p>
                <p id="companyCityState"></p>
                <p id="companyPhone"></p>
                <p id="companyEmail"></p>
            </div>
            <div class="invoice-details">
                <h2>PURCHASE INVOICE</h2>
                <p><strong>Invoice #:</strong> <span id="invoiceNo">Loading...</span></p>
                <p><strong>Date:</strong> <span id="invoiceDate">Loading...</span></p>
            </div>
        </div>

        <div class="invoice-meta">
            <div class="info-box">
                <h3>Supplier Information</h3>
                <p><strong>Name:</strong> <span id="supplierName">Loading...</span></p>
                <p id="subAccountRow"><strong>Sub Account:</strong> <span id="subAccountName">-</span></p>
                <p id="supplierInvNoRow"><strong>Supplier Invoice No:</strong> <span id="supplierInvoiceNo">-</span></p>
                <p id="supplierInvDateRow"><strong>Supplier Invoice Date:</strong> <span id="supplierInvoiceDate">-</span></p>
                <p id="biltyNoRow"><strong>Bilty No:</strong> <span id="biltyNo">-</span></p>
                <p id="transportRow"><strong>Transport:</strong> <span id="transportName">-</span></p>
                <p id="rpoNoRow"><strong>RPO #:</strong> <span id="rpoNo">-</span></p>
                <p id="truckNoRow"><strong>Truck No:</strong> <span id="truckNo">-</span></p>
                <p id="deliveredAtRow"><strong>Delivered At:</strong> <span id="deliveredAt">-</span></p>
                <p id="paymentTermRow"><strong>Payment Cond.:</strong> <span id="paymentTermName">-</span></p>
            </div>
            <div class="info-box">
                <h3>Invoice Information</h3>
                <p id="branchRow"><strong>Branch:</strong> <span id="branchName">Loading...</span></p>
                <p id="currencyRow"><strong>Currency:</strong> <span id="currency">Loading...</span></p>
                <p id="rateTypeRow"><strong>Rate Type:</strong> <span id="rateTypeDisplay">-</span></p>
                <p id="brokeryRateTypeRow"><strong>Brokery Rate Type:</strong> <span id="brokeryRateTypeDisplay">-</span></p>
                <p id="remarksRow"><strong>Remarks:</strong> <span id="remarks">-</span></p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr id="itemsTableHeader"></tr>
            </thead>
            <tbody id="itemsTableBody">
                <tr><td colspan="20" class="text-center">Loading items...</td></tr>
            </tbody>
            <tfoot>
                <tr style="background:#f5f5f5;font-weight:bold;" id="itemsTableFooter"></tr>
            </tfoot>
        </table>

        <div class="totals-section">
            <div class="totals-wrapper">
                <div class="totals-left">
                    <div class="totals-panel-title">Charges Breakdown</div>
                    <div class="totals-row"><span>Total Bill</span><span id="totalBill">0.00</span></div>
                    <div class="totals-row" id="wtChargesRow" style="display:none;"><span>Wt Charges</span><span id="wtChargesVal">0.00</span></div>
                    <div class="totals-row" id="freightRow" style="display:none;"><span>Freight</span><span id="freightVal">0.00</span></div>
                    <div class="totals-row" id="mSukriRow" style="display:none;"><span>M/Sukri</span><span id="mSukriVal">0.00</span></div>
                    <div class="totals-row" id="brokenAmountRow" style="display:none;"><span>Broken Amount</span><span id="brokenAmountVal">0.00</span></div>
                    <div class="totals-row" id="brokeryAmountRow" style="display:none;"><span>Brokery</span><span id="brokeryAmountVal">0.00</span></div>
                    <div class="totals-row" id="brokeryTaxAmountRow" style="display:none;"><span>Brokery Tax Amount</span><span id="brokeryTaxAmountVal">0.00</span></div>
                    <div class="totals-row" id="bardanaRow" style="display:none;"><span>Bardana</span><span id="bardanaVal">0.00</span></div>
                    <div class="totals-row" id="phoneChargesRow" style="display:none;"><span>Phone Charges</span><span id="phoneChargesVal">0.00</span></div>
                    <div class="totals-row" id="fillingChargesRow" style="display:none;"><span>Filling Charges</span><span id="fillingChargesVal">0.00</span></div>
                    <div class="totals-row subtotal" id="totalChargesRow" style="display:none;"><span>Total Charges</span><span id="totalChargesVal">0.00</span></div>
                    <div class="totals-row" id="discountPercentRow" style="display:none;"><span>Discount (%)</span><span id="discountPercent">0.00%</span></div>
                    <div class="totals-row" id="discountAmountRow" style="display:none;"><span>Discount Amount</span><span id="discountAmount">0.00</span></div>
                    <div class="totals-row" id="shippingFeesRow" style="display:none;"><span id="shippingFeesLabel">Shipping Fees</span><span id="shippingFees">0.00</span></div>
                </div>
                <div class="totals-right">
                    <div class="totals-panel-title">Payment Summary</div>
                    <div class="totals-row highlight-net"><span>Net Amount</span><span id="netAmount">0.00</span></div>
                </div>
            </div>
        </div>

        <div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:5px;">
            <p><strong>Amount in Words:</strong> <span id="amountInWords">Loading...</span></p>
        </div>

        <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
            <div>
                <p style="margin-bottom:40px;"><strong>Supplier Signature:</strong></p>
                <div style="border-bottom:1px solid #333;width:180px;margin-bottom:4px;"></div>
                <p style="font-size:10px;color:#666;">Date: ___________</p>
            </div>
            <div>
                <p style="margin-bottom:40px;"><strong>Authorized Signature:</strong></p>
                <div style="border-bottom:1px solid #333;width:180px;margin-bottom:4px;"></div>
                <p style="font-size:10px;color:#666;">Date: ___________</p>
            </div>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#666;">
            <p><strong>Generated by:</strong> <span id="generatedBy">Loading...</span></p>
            <p><strong>Generated on:</strong> <span id="generatedOn"></span></p>
        </div>

        <div style="margin-top:16px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px;">
            <p><em>This is a System Generated Invoice</em></p>
            <div style="margin-top:8px;">
                <div>Software by: UNISEN SYSTEMS</div>
                <div>Contact: +92 346 8918711 | +92 335 3789981</div>
                <div>Email: support@unisensystems.com | www.unisensystems.com</div>
            </div>
        </div>
    </div>

    <script>
        function setPaperSize(size) {
            localStorage.setItem('purchasePaperSize', size);
            document.documentElement.style.setProperty('--page-size', size);
            document.body.classList.toggle('a5-mode', size === 'A5');
            document.querySelectorAll('.print-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn' + size).classList.add('active');
        }
        setPaperSize(localStorage.getItem('purchasePaperSize') || 'A4');

        const rateTypeLabels = { per_bag: 'Per Bag', per_kg: 'Per KG', '100_kg': '100 KG', mon: 'MON', ton: 'Ton' };

        const urlParams = new URLSearchParams(window.location.search);
        const invoiceId = urlParams.get('id');
        if (!invoiceId) { alert('Invoice ID is required'); window.close(); }

        const enableInlineCashDiscount       = localStorage.getItem('enableInlineCashDiscount') === 'true';
        const enableInlineCashDiscountAmount = localStorage.getItem('enableInlineCashDiscountAmount') === 'true';
        const enableTradeOffer               = localStorage.getItem('enableTradeOffer') === 'true';
        const enableTradeOfferAmount         = localStorage.getItem('enableTradeOfferAmount') === 'true';
        const enableTaxation                 = localStorage.getItem('enableTaxation') === 'true';
        const enableFOC                      = localStorage.getItem('enableFOC') === 'true';
        const enableInvoiceCashDiscount      = localStorage.getItem('enableInvoiceCashDiscount') === 'true';
        const enableInvoiceCashDiscountAmount= localStorage.getItem('enableInvoiceCashDiscountAmount') === 'true';
        const enableShippingFees             = localStorage.getItem('enableShippingFees') === 'true';

        // Columns that will be auto-hidden if all values are 0
        const autoHideCols = { bag: false, total_kg: false, cut_kg_pct: false, cut_kg: false, al_kg_pct: false, al_kg: false, net_kg: false, al_rate_cut: false, net_rate: false };

        function buildTableHeader(maxUnitColumns, rateType) {
            const tr = document.getElementById('itemsTableHeader');
            tr.innerHTML = '';
            const th = (text, w, colId) => {
                const el = document.createElement('th');
                el.textContent = text;
                if (w) el.width = w;
                el.style.textAlign = 'center';
                if (colId) el.dataset.colId = colId;
                tr.appendChild(el);
                return el;
            };

            th('#', '3%');
            th('Product', '16%', 'left');
            for (let i = 0; i < maxUnitColumns; i++) th(`Unit ${i+1}`, '7%');
            th('Bag', '4%', 'bag');
            th('Total KG', '5%', 'total_kg');
            th('Cut KG %', '5%', 'cut_kg_pct');
            th('Cut KG', '5%', 'cut_kg');
            th('AL KG %', '5%', 'al_kg_pct');
            th('AL KG', '5%', 'al_kg');
            th('Net KG', '5%', 'net_kg');
            th('AL Rate Cut', '5%', 'al_rate_cut');
            th(rateTypeLabels[rateType] ? rateTypeLabels[rateType] + ' Rate' : 'Trade Price', '6%');
            th('Net Rate', '5%', 'net_rate');
            if (enableInlineCashDiscount)       th('Disc %', '4%');
            if (enableInlineCashDiscountAmount)  th('Disc Amt', '6%');
            if (enableTradeOffer)                th('TO %', '4%');
            if (enableTradeOfferAmount)          th('TO Amt', '6%');
            if (enableTaxation)                  th('Tax %', '4%');
            if (enableTaxation)                  th('Tax Amt', '6%');
            if (enableFOC)                       th('FOC Qty', '4%');
            th('Net Amt', '7%');
        }

        function buildFooterRow(maxUnitColumns) {
            const tr = document.getElementById('itemsTableFooter');
            tr.innerHTML = '';
            const addTh = (id, text, colId) => {
                const el = document.createElement('th');
                el.className = 'text-right';
                el.textContent = text || '';
                if (id) el.id = id;
                if (colId) el.dataset.colId = colId;
                tr.appendChild(el);
                return el;
            };

            addTh(null, 'Totals');
            addTh(null, '');
            for (let i = 0; i < maxUnitColumns; i++) addTh(null, '');
            addTh(null, '', 'bag');
            addTh('ftTotalKG', '0.00', 'total_kg');
            addTh(null, '', 'cut_kg_pct');
            addTh('ftCutKG', '0.00', 'cut_kg');
            addTh(null, '', 'al_kg_pct');
            addTh('ftAlKG', '0.00', 'al_kg');
            addTh('ftNetKG', '0.00', 'net_kg');
            addTh(null, '', 'al_rate_cut');
            addTh('ftUnitPrice', '0.00');
            addTh(null, '', 'net_rate');
            if (enableInlineCashDiscount)       addTh(null, '');
            if (enableInlineCashDiscountAmount)  addTh('ftDiscAmt', '0.00');
            if (enableTradeOffer)                addTh(null, '');
            if (enableTradeOfferAmount)          addTh('ftTOAmt', '0.00');
            if (enableTaxation)                  addTh(null, '');
            if (enableTaxation)                  addTh('ftTaxAmt', '0.00');
            if (enableFOC)                       addTh('ftFOC', '0.00');
            addTh('ftNetAmt', '0.00');
        }

        async function loadData() {
            try {
                const [userRes, invRes] = await Promise.all([
                    fetch('../../../../server/api/purchase/purchase_invoice/get-user.php'),
                    fetch(`../../../../server/api/purchase/purchase_invoice/purchase-edit.php?id=${invoiceId}`)
                ]);
                const userData    = await userRes.json();
                const invoiceData = await invRes.json();

                if (userData.success) document.getElementById('generatedBy').textContent = userData.user.full_name;

                if (invoiceData.success) {
                    populateCompanyData(invoiceData.invoice);
                    populateInvoiceData(invoiceData.invoice, invoiceData.items);
                } else {
                    alert('Error loading invoice: ' + invoiceData.message);
                }
            } catch (e) {
                alert('Error loading data: ' + e.message);
            }
        }

        function populateCompanyData(invoice) {
            if (invoice.logo_url) {
                const logo = document.getElementById('companyLogo');
                logo.src = `../../../assets/uploads/company_logo/${invoice.logo_url}`;
                logo.style.display = 'block';
            }
            document.getElementById('companyName').textContent       = invoice.company_name || invoice.legal_name || 'Company';
            document.getElementById('companyAddress').textContent    = invoice.company_address || '';
            document.getElementById('companyCityState').textContent  = `${invoice.company_city||''} ${invoice.company_state||''} ${invoice.company_zipcode||''}`.trim();
            document.getElementById('companyPhone').textContent      = invoice.company_phone ? `Ph: ${invoice.company_phone}` : '';
            document.getElementById('companyEmail').textContent      = invoice.company_email ? `Email: ${invoice.company_email}` : '';
        }

        function populateInvoiceData(invoice, items) {
            const sym = invoice.currency_symbol || '';

            document.getElementById('invoiceNo').textContent        = invoice.bill_no;
            document.getElementById('invoiceDate').textContent      = new Date(invoice.purchase_date).toLocaleDateString();
            document.getElementById('supplierName').textContent     = `${invoice.supplier_code||''} - ${invoice.supplier_name||''}`;
            document.getElementById('subAccountName').textContent   = invoice.sub_account_name || '-';
            document.getElementById('supplierInvoiceNo').textContent= invoice.supplier_invoice_no || '-';
            document.getElementById('supplierInvoiceDate').textContent = invoice.supplier_invoice_date ? new Date(invoice.supplier_invoice_date).toLocaleDateString() : '-';
            document.getElementById('biltyNo').textContent          = invoice.bilty_no || '-';
            document.getElementById('transportName').textContent    = invoice.transport_name || '-';
            document.getElementById('rpoNo').textContent            = invoice.rpo_no || '-';
            document.getElementById('truckNo').textContent          = invoice.truck_no || '-';
            document.getElementById('deliveredAt').textContent      = invoice.delivered_at || '-';
            document.getElementById('paymentTermName').textContent  = invoice.payment_term_name || '-';

            const branchText = invoice.parent_branch_name
                ? `${invoice.branch_name} (${invoice.branch_type}) - ${invoice.parent_branch_name}`
                : `${invoice.branch_name} (${invoice.branch_type})`;
            document.getElementById('branchName').textContent  = branchText;
            document.getElementById('currency').textContent    = invoice.currency_name || '';
            document.getElementById('remarks').textContent     = invoice.remarks || '-';

            // Hide empty optional fields
            const hideIfEmpty = (rowId, val) => { if (!val || val === '-' || val === '' || val === 'null') document.getElementById(rowId).style.display = 'none'; };
            hideIfEmpty('subAccountRow',     invoice.sub_account_name);
            hideIfEmpty('supplierInvNoRow',  invoice.supplier_invoice_no);
            hideIfEmpty('supplierInvDateRow',invoice.supplier_invoice_date);
            hideIfEmpty('biltyNoRow',        invoice.bilty_no);
            hideIfEmpty('transportRow',      invoice.transport_name);
            hideIfEmpty('rpoNoRow',          invoice.rpo_no);
            hideIfEmpty('truckNoRow',        invoice.truck_no);
            hideIfEmpty('deliveredAtRow',    invoice.delivered_at);
            hideIfEmpty('paymentTermRow',    invoice.payment_term_name);
            hideIfEmpty('remarksRow',        invoice.remarks);
            if (!invoice.branch_name)   document.getElementById('branchRow').style.display = 'none';
            if (!invoice.currency_name) document.getElementById('currencyRow').style.display = 'none';

            const rateType = invoice.rate_type || '';
            if (rateType) document.getElementById('rateTypeDisplay').textContent = rateTypeLabels[rateType] || rateType;
            else document.getElementById('rateTypeRow').style.display = 'none';

            const brokeryRT = invoice.brokery_rate_type || '';
            if (brokeryRT) document.getElementById('brokeryRateTypeDisplay').textContent = rateTypeLabels[brokeryRT] || brokeryRT;
            else document.getElementById('brokeryRateTypeRow').style.display = 'none';

            // Group items by product
            const grouped = {};
            items.forEach(item => {
                if (!grouped[item.product_id]) {
                    grouped[item.product_id] = { base: item, units: [] };
                }
                grouped[item.product_id].units.push({ uom_name: item.uom_name, quantity: item.unit_entries ? null : item.quantity });
            });

            // Use unit_entries for proper unit display
            const groupedList = items.reduce((acc, item) => {
                const key = item.product_id + '_' + (item.unit_entries ? JSON.stringify(item.unit_entries.map(e=>e.uom_id)) : '');
                if (!acc.find(g => g.base.product_id === item.product_id)) {
                    acc.push({ base: item, units: item.unit_entries || [{ uom_name: item.uom_name, quantity: item.quantity }] });
                }
                return acc;
            }, []);

            let maxUnitColumns = 0;
            groupedList.forEach(g => { maxUnitColumns = Math.max(maxUnitColumns, g.units.length); });

            const tbody = document.getElementById('itemsTableBody');
            tbody.innerHTML = '';

            // Scan items to detect which columns have data
            items.forEach(item => {
                if (parseFloat(item.bag||0) > 0)             autoHideCols.bag = true;
                if (parseFloat(item.total_kg||0) > 0)        autoHideCols.total_kg = true;
                if (parseFloat(item.cut_kg_percent||0) > 0)  autoHideCols.cut_kg_pct = true;
                if (parseFloat(item.cut_kg||0) > 0)          autoHideCols.cut_kg = true;
                if (parseFloat(item.al_kg_percent||0) > 0)   autoHideCols.al_kg_pct = true;
                if (parseFloat(item.al_kg||0) > 0)           autoHideCols.al_kg = true;
                if (parseFloat(item.net_kg||0) > 0)          autoHideCols.net_kg = true;
                if (parseFloat(item.al_rate_cut||0) > 0)     autoHideCols.al_rate_cut = true;
            });

            // Net Rate only makes sense alongside AL Rate Cut - hide it unless AL Rate Cut is present
            autoHideCols.net_rate = autoHideCols.al_rate_cut;

            buildTableHeader(maxUnitColumns, rateType);
            buildFooterRow(maxUnitColumns);

            // Hide columns with no data
            Object.entries(autoHideCols).forEach(([colId, hasData]) => {
                if (!hasData) document.querySelectorAll(`[data-col-id="${colId}"]`).forEach(el => el.style.display = 'none');
            });

            let totals = { totalKG: 0, cutKG: 0, alKG: 0, netKG: 0, unitPrice: 0, discAmt: 0, toAmt: 0, taxAmt: 0, foc: 0, net: 0 };

            groupedList.forEach((group, idx) => {
                const item = group.base;
                const tr   = tbody.insertRow();

                const td = (text, cls) => {
                    const el = tr.insertCell();
                    el.className = cls || '';
                    el.textContent = text;
                    return el;
                };
                const tdHtml = (html, cls) => {
                    const el = tr.insertCell();
                    el.className = cls || '';
                    el.innerHTML = html;
                    return el;
                };

                td(idx + 1, 'text-center');
                td(item.product_name);

                // Unit columns
                for (let i = 0; i < maxUnitColumns; i++) {
                    const el = tr.insertCell();
                    el.className = 'text-right';
                    if (i < group.units.length) {
                        const u = group.units[i];
                        el.innerHTML = `<div style="font-size:9px;color:#666;">${u.uom_name||''}</div><div>${parseFloat(u.quantity||0).toFixed(2)}</div>`;
                    } else {
                        el.style.background = '#f8f9fa';
                        el.innerHTML = '<span style="opacity:0.3;">-</span>';
                    }
                }

                const addAutoTd = (text, colId) => { const el = td(text, 'text-right'); if (colId) el.dataset.colId = colId; if (colId && !autoHideCols[colId]) el.style.display = 'none'; return el; };

                addAutoTd(parseFloat(item.bag||0).toFixed(2), 'bag');
                addAutoTd(parseFloat(item.total_kg||0).toFixed(2), 'total_kg');
                addAutoTd(parseFloat(item.cut_kg_percent||0).toFixed(2)+'%', 'cut_kg_pct');
                addAutoTd(parseFloat(item.cut_kg||0).toFixed(2), 'cut_kg');
                addAutoTd(parseFloat(item.al_kg_percent||0).toFixed(2)+'%', 'al_kg_pct');
                addAutoTd(parseFloat(item.al_kg||0).toFixed(2), 'al_kg');
                addAutoTd(parseFloat(item.net_kg||0).toFixed(2), 'net_kg');
                addAutoTd(parseFloat(item.al_rate_cut||0).toFixed(2), 'al_rate_cut');
                td(`${sym} ${parseFloat(item.purchase_price||0).toFixed(4)}`, 'text-right');
                addAutoTd(`${sym} ${parseFloat(item.net_rate||0).toFixed(2)}`, 'net_rate');

                if (enableInlineCashDiscount)        td(parseFloat(item.discount_percent||0).toFixed(2)+'%', 'text-right');
                if (enableInlineCashDiscountAmount)  td(`${sym} ${parseFloat(item.discount_amount||0).toFixed(2)}`, 'text-right');
                if (enableTradeOffer)                td(parseFloat(item.trade_offer_percent||0).toFixed(2)+'%', 'text-right');
                if (enableTradeOfferAmount)          td(`${sym} ${parseFloat(item.trade_offer_amount||0).toFixed(2)}`, 'text-right');
                if (enableTaxation)                  td(parseFloat(item.tax_percent||0).toFixed(2)+'%', 'text-right');
                if (enableTaxation)                  td(`${sym} ${parseFloat(item.tax_amount||0).toFixed(2)}`, 'text-right');
                if (enableFOC)                       td(parseFloat(item.foc_quantity||0).toFixed(2), 'text-right');
                td(`${sym} ${parseFloat(item.net_amount||0).toFixed(2)}`, 'text-right');

                totals.totalKG   += parseFloat(item.total_kg||0);
                totals.cutKG     += parseFloat(item.cut_kg||0);
                totals.alKG      += parseFloat(item.al_kg||0);
                totals.netKG     += parseFloat(item.net_kg||0);
                totals.unitPrice += parseFloat(item.purchase_price||0);
                totals.discAmt   += parseFloat(item.discount_amount||0);
                totals.toAmt     += parseFloat(item.trade_offer_amount||0);
                totals.taxAmt    += parseFloat(item.tax_amount||0);
                totals.foc       += parseFloat(item.foc_quantity||0);
                totals.net       += parseFloat(item.net_amount||0);
            });

            const setFt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setFt('ftTotalKG',   totals.totalKG.toFixed(2));
            setFt('ftCutKG',     totals.cutKG.toFixed(2));
            setFt('ftAlKG',      totals.alKG.toFixed(2));
            setFt('ftNetKG',     totals.netKG.toFixed(2));
            setFt('ftUnitPrice', `${sym} ${totals.unitPrice.toFixed(2)}`);
            setFt('ftDiscAmt',   `${sym} ${totals.discAmt.toFixed(2)}`);
            setFt('ftTOAmt',     `${sym} ${totals.toAmt.toFixed(2)}`);
            setFt('ftTaxAmt',    `${sym} ${totals.taxAmt.toFixed(2)}`);
            setFt('ftFOC',       totals.foc.toFixed(2));
            setFt('ftNetAmt',    `${sym} ${totals.net.toFixed(2)}`);

            // Totals summary
            document.getElementById('totalBill').textContent  = `${sym} ${parseFloat(invoice.total_bill||0).toFixed(2)}`;
            document.getElementById('netAmount').textContent  = `${sym} ${parseFloat(invoice.net_amount||0).toFixed(2)}`;

            // Charges
            const showCharge = (rowId, valId, val, sign) => {
                if (parseFloat(val||0) !== 0) {
                    document.getElementById(rowId).style.display = '';
                    const v = sign === '-' ? -Math.abs(parseFloat(val)) : Math.abs(parseFloat(val));
                    document.getElementById(valId).textContent = `${sym} ${v.toFixed(2)}`;
                }
            };
            showCharge('wtChargesRow',        'wtChargesVal',        invoice.wt_charges,        invoice.wt_charges_sign);
            showCharge('freightRow',           'freightVal',          invoice.freight,           invoice.freight_sign);
            showCharge('mSukriRow',            'mSukriVal',           invoice.m_sukri,           invoice.m_sukri_sign);
            showCharge('brokenAmountRow',      'brokenAmountVal',     invoice.broken_amount,     invoice.broken_amount_sign);
            showCharge('brokeryAmountRow',     'brokeryAmountVal',    invoice.brokery_amount,    invoice.brokery_amount_sign);
            showCharge('brokeryTaxAmountRow',  'brokeryTaxAmountVal', invoice.brokery_tax_amount,invoice.brokery_tax_amount_sign);
            showCharge('bardanaRow',           'bardanaVal',          invoice.bardana,           invoice.bardana_sign);
            showCharge('phoneChargesRow',      'phoneChargesVal',     invoice.phone_charges,     invoice.phone_charges_sign);
            showCharge('fillingChargesRow',    'fillingChargesVal',   invoice.filling_charges,   invoice.filling_charges_sign);
            if (parseFloat(invoice.total_charges||0) !== 0) {
                document.getElementById('totalChargesRow').style.display = '';
                document.getElementById('totalChargesVal').textContent = `${sym} ${parseFloat(invoice.total_charges).toFixed(2)}`;
            }

            if (enableInvoiceCashDiscount && parseFloat(invoice.total_discount_percent||0) > 0) {
                document.getElementById('discountPercentRow').style.display = '';
                document.getElementById('discountPercent').textContent = parseFloat(invoice.total_discount_percent).toFixed(2) + '%';
            }
            if (enableInvoiceCashDiscountAmount && parseFloat(invoice.total_discount_amount||0) > 0) {
                document.getElementById('discountAmountRow').style.display = '';
                document.getElementById('discountAmount').textContent = `${sym} ${parseFloat(invoice.total_discount_amount).toFixed(2)}`;
            }
            if (enableShippingFees && parseFloat(invoice.shipping_fees||0) > 0) {
                document.getElementById('shippingFeesRow').style.display = '';
                const sfSign = invoice.shipping_fees_type === 'subtract' ? '(-)' : '(+)';
                document.getElementById('shippingFeesLabel').textContent = `Shipping Fees ${sfSign}`;
                document.getElementById('shippingFees').textContent = `${sym} ${parseFloat(invoice.shipping_fees).toFixed(2)}`;
            }

            // Amount in words
            const netAmt = parseFloat(invoice.net_amount||0);
            const words  = numberToWords(Math.floor(netAmt));
            const cents  = Math.round((netAmt % 1) * 100);
            document.getElementById('amountInWords').textContent = `${words}${cents > 0 ? ' and ' + numberToWords(cents) + ' Cents' : ''} Only`;
        }

        document.getElementById('generatedOn').textContent = new Date().toLocaleString();
        loadData();

        function numberToWords(num) {
            const ones  = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
            const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
            const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
            const thous = ['','Thousand','Million','Billion'];
            if (num === 0) return 'Zero';
            function cvt(n) {
                let r = '';
                if (n >= 100) { r += ones[Math.floor(n/100)] + ' Hundred '; n %= 100; }
                if (n >= 20)  { r += tens[Math.floor(n/10)] + ' '; n %= 10; }
                else if (n >= 10) { r += teens[n-10] + ' '; n = 0; }
                if (n > 0) r += ones[n] + ' ';
                return r;
            }
            let result = '', ti = 0;
            while (num > 0) {
                if (num % 1000 !== 0) result = cvt(num % 1000) + thous[ti] + ' ' + result;
                num = Math.floor(num / 1000); ti++;
            }
            return result.trim();
        }
    </script>
</body>
</html>
