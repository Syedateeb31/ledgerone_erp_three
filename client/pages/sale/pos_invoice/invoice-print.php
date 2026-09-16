<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sale Invoice - Print</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }

        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }

        .company-info h1 { font-size: 24px; color: #333; margin-bottom: 5px; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { font-size: 20px; color: #666; margin-bottom: 10px; }

        .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }

        .supplier-info, .invoice-info, .customer-info {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }

        .supplier-info h3, .invoice-info h3, .customer-info h3 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        .items-table th { background-color: #f5f5f5; font-weight: bold; font-size: 11px; }
        .items-table td { font-size: 11px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        .totals-section { display: flex; justify-content: flex-end; margin-top: 20px; }

        /* Vertical layout */
        .totals-wrapper {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
        }
        .totals-left, .totals-right {
            padding: 0;
        }
        .totals-left { border-right: 1px solid #ddd; }
        .totals-panel-title {
            background: #f0f0f0;
            padding: 7px 12px;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 0.5px;
            color: #444;
            border-bottom: 1px solid #ddd;
            text-transform: uppercase;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 12px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 11px;
        }
        .totals-row:last-child { border-bottom: none; }
        .totals-row.subtotal {
            background: #fafafa;
            font-weight: bold;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
        }
        .totals-row.highlight-net {
            background: #eaf4ff;
            font-weight: bold;
            color: #1565c0;
            border-top: 2px solid #1565c0;
        }
        .totals-row.highlight-receivable {
            background: #e8f5e9;
            font-weight: bold;
            color: #2e7d32;
        }
        .totals-balance-cards {
            display: grid;
            grid-template-columns: 1fr;
            border-top: 1px solid #ddd;
        }
        .balance-card {
            padding: 10px 12px;
            text-align: center;
        }
        .balance-card .bc-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
        .balance-card .bc-value { font-size: 14px; font-weight: bold; }
        .balance-card.total-bal .bc-value { color: #1565c0; }
        .balance-card.total-bal { background: #f0f8ff; }

        .totals-horizontal-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%;
        }
        .totals-horizontal-3 {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; width: 100%;
        }
        .totals-horizontal-2 .totals-item,
        .totals-horizontal-3 .totals-item {
            display: flex; justify-content: space-between;
            padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;
        }
        .totals-horizontal-2 .totals-item.total-row,
        .totals-horizontal-3 .totals-item.total-row {
            background: #e8e8e8; font-weight: bold; border: 2px solid #333;
        }
        .totals-horizontal-2 .totals-item.totalBalance,
        .totals-horizontal-3 .totals-item.totalBalance {
            background: #f0f8ff; border: 1px solid #b3d9ff; color: #1f7bff; font-weight: bold;
        }
        .totals-horizontal-2 .totals-item.previousBalance,
        .totals-horizontal-3 .totals-item.previousBalance {
            background: #fff8f0; border: 1px solid #ffc9a3; color: #ff8c42; font-weight: bold;
        }

        .print-btn {
            background: #007bff; color: white; border: none;
            padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px;
        }
        .print-btn:hover { background: #0056b3; }
        .print-btn.active { background: #28a745; }

        @media print { @page { size: var(--page-size); } }

        body.a5-mode { font-size: 8px; line-height: 1.1; }
        .a5-mode .invoice-container { max-width: 550px; padding: 10px; }
        .a5-mode .invoice-header { margin-bottom: 10px; padding-bottom: 8px; }
        .a5-mode .company-info h1 { font-size: 14px; margin-bottom: 2px; }
        .a5-mode .company-info p { font-size: 8px; margin-bottom: 1px; }
        .a5-mode .company-logo { max-width: 60px !important; max-height: 40px !important; margin-bottom: 4px !important; }
        .a5-mode .invoice-details h2 { font-size: 12px; margin-bottom: 4px; }
        .a5-mode .invoice-details p { font-size: 8px; }
        .a5-mode .invoice-meta { gap: 10px; margin-bottom: 10px; }
        .a5-mode .supplier-info, .a5-mode .invoice-info, .a5-mode .customer-info { padding: 6px; }
        .a5-mode .supplier-info h3, .a5-mode .invoice-info h3, .a5-mode .customer-info h3 { font-size: 9px; margin-bottom: 3px; padding-bottom: 2px; }
        .a5-mode .supplier-info p, .a5-mode .invoice-info p, .a5-mode .customer-info p { font-size: 8px; line-height: 1.15; }
        .a5-mode .items-table { margin-bottom: 8px; }
        .a5-mode .items-table th, .a5-mode .items-table td { padding: 3px 2px; font-size: 7px; }
        .a5-mode .totals-section { margin-top: 8px; }
        .a5-mode .totals-row { padding: 3px 8px; font-size: 8px; }
        .a5-mode .totals-panel-title { padding: 4px 8px; font-size: 8px; }
        .a5-mode .balance-card { padding: 5px 8px; }
        .a5-mode .balance-card .bc-value { font-size: 10px; }
        .a5-mode .totals-horizontal-2 .totals-item, .a5-mode .totals-horizontal-3 .totals-item { padding: 4px 6px; font-size: 8px; }
    </style>
</head>

<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
        <button class="print-btn" onclick="setPaperSize('A3')" id="btnA3">A3</button>
        <button class="print-btn" onclick="setPaperSize('A4')" id="btnA4">A4</button>
        <button class="print-btn" onclick="setPaperSize('A5')" id="btnA5">A5</button>
    </div>

    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <h1 id="companyName">Loading...</h1>
                <p id="companyAddress">Loading...</p>
                <p id="companyCityState">Loading...</p>
                <p id="companyPhone">Loading...</p>
                <p id="companyEmail">Loading...</p>
            </div>
            <div class="invoice-details">
                <h2>SALE INVOICE</h2>
                <p><strong>Invoice #:</strong> <span id="invoiceNo">Loading...</span></p>
                <p><strong>Date:</strong> <span id="invoiceDate">Loading...</span></p>
            </div>
        </div>

        <div class="invoice-meta">
            <div class="customer-info">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> <span id="customerName">Loading...</span></p>
                <p><strong>Address:</strong> <span id="customerAddress">Loading...</span></p>
                <p><strong>Phone:</strong> <span id="customerPhone">-</span></p>
                <p><strong>Email:</strong> <span id="customerEmail">-</span></p>
                <p><strong>Identity Card No:</strong> <span id="customerIdentityCard">-</span></p>
            </div>
            <div class="invoice-info">
                <h3>Invoice Information</h3>
                <p><strong>Branch:</strong> <span id="branchName">Loading...</span></p>
                <p><strong>Currency:</strong> <span id="currency">Loading...</span></p>
                <p id="rateTypeRow"><strong>Rate Type:</strong> <span id="rateTypeDisplay">-</span></p>
                <p id="brokeryRateTypeRow"><strong>Brokery Rate Type:</strong> <span id="brokeryRateTypeDisplay">-</span></p>
                <p><strong>Bilty No:</strong> <span id="biltyNo">-</span></p>
                <p><strong>Transport:</strong> <span id="transportName">-</span></p>
                <p id="deliveredFromRow"><strong>Delivered From:</strong> <span id="deliveredFrom">-</span></p>
                <p id="rpoNoRow"><strong>RPO #:</strong> <span id="rpoNo">-</span></p>
                <p id="truckNoRow"><strong>Truck No:</strong> <span id="truckNo">-</span></p>
                <p id="paymentTermRow"><strong>Payment Cond.:</strong> <span id="paymentTermName">-</span></p>
                <p><strong>Remarks:</strong> <span id="remarks">-</span></p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr id="itemsTableHeader">
                    <!-- Headers populated dynamically -->
                </tr>
            </thead>
            <tbody id="itemsTableBody">
                <tr><td colspan="20" class="text-center">Loading items...</td></tr>
            </tbody>
            <tfoot>
                <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <!-- Totals row built dynamically -->
                </tr>
            </tfoot>
        </table>

        <div class="totals-section" id="totalsSection">
            <!-- vertical layout rendered here -->
            <div class="totals-wrapper" id="totalsTable">
                <div class="totals-left">
                    <div class="totals-panel-title">Charges Breakdown</div>
                    <div class="totals-row" id="totalBillRow"><span>Total Bill</span><span id="totalBill">0.00</span></div>
                    <div class="totals-row" id="discountPercentRow" style="display:none;"><span>Discount (%)</span><span id="discountPercent">0.00%</span></div>
                    <div class="totals-row" id="discountAmountRow" style="display:none;"><span id="discountAmountLabel">Discount Amount</span><span id="discountAmount">0.00</span></div>
                    <div class="totals-row" id="shippingFeesRow" style="display:none;"><span id="shippingFeesLabel">Shipping Fees</span><span id="shippingFees">0.00</span></div>
                    <div class="totals-row" id="wtChargesRow" style="display:none;"><span id="wtChargesLabel">Wt Charges</span><span id="wtChargesVal">0.00</span></div>
                    <div class="totals-row" id="freightRow" style="display:none;"><span id="freightLabel">Freight</span><span id="freightVal">0.00</span></div>
                    <div class="totals-row" id="mSukriRow" style="display:none;"><span id="mSukriLabel">M/Sukri</span><span id="mSukriVal">0.00</span></div>
                    <div class="totals-row" id="brokenAmountRow" style="display:none;"><span id="brokenAmountLabel">Broken Amount</span><span id="brokenAmountVal">0.00</span></div>
                    <div class="totals-row" id="brokeryAmountRow" style="display:none;"><span id="brokeryAmountLabel">Brokery</span><span id="brokeryAmountVal">0.00</span></div>
                    <div class="totals-row" id="brokeryTaxAmountRow" style="display:none;"><span>Brokery Tax Amount</span><span id="brokeryTaxAmountVal">0.00</span></div>
                    <div class="totals-row" id="bardanaRow" style="display:none;"><span id="bardanaLabel">Bardana</span><span id="bardanaVal">0.00</span></div>
                    <div class="totals-row" id="phoneChargesRow" style="display:none;"><span id="phoneChargesLabel">Phone Charges</span><span id="phoneChargesVal">0.00</span></div>
                    <div class="totals-row" id="fillingChargesRow" style="display:none;"><span id="fillingChargesLabel">Filling Charges</span><span id="fillingChargesVal">0.00</span></div>
                    <div class="totals-row subtotal" id="totalChargesRow" style="display:none;"><span>Total Charges</span><span id="totalChargesVal">0.00</span></div>
                </div>
                <div class="totals-right">
                    <div class="totals-panel-title">Payment Summary</div>
                    <div class="totals-row highlight-net" id="netAmountRow"><span>Net Amount</span><span id="netAmount">0.00</span></div>
                    <div class="totals-row highlight-receivable" id="netReceivableRow"><span>Net Receivable</span><span id="netReceivable">0.00</span></div>
                    <div class="totals-row" id="amountPaidRow"><span>Amount Paid</span><span id="amountPaid">0.00</span></div>
                    <div class="totals-row" id="paymentMethodRow"><span>Payment Method</span><span id="paymentMethod">-</span></div>
                    <div class="totals-row subtotal" id="remainingBalanceRow"><span>Remaining Balance</span><span id="remainingBalance">0.00</span></div>
                    <div class="totals-balance-cards">
                        <div class="balance-card total-bal">
                            <div class="bc-label">Total Balance</div>
                            <div class="bc-value" id="totalBalance">0.00</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top:20px; padding:15px; background-color:#f9f9f9; border-radius:5px;" id="amountInWordsSection">
            <p><strong>Amount in Words:</strong> <span id="amountInWords">Loading...</span></p>
        </div>

        <div style="margin-top:30px; display:grid; grid-template-columns:1fr 1fr; gap:50px;" id="signaturesSection">
            <div>
                <p style="margin-bottom:50px;"><strong>Customer Signature:</strong></p>
                <div style="border-bottom:1px solid #333; width:200px; margin-bottom:5px;"></div>
                <p style="font-size:11px; color:#666;" id="signatureDate1">Date: ___________</p>
            </div>
            <div>
                <p style="margin-bottom:50px;"><strong>Authorized Signature:</strong></p>
                <div style="border-bottom:1px solid #333; width:200px; margin-bottom:5px;"></div>
                <p style="font-size:11px; color:#666;" id="signatureDate2">Date: ___________</p>
            </div>
        </div>

        <div style="margin-top:30px; padding-top:20px; border-top:1px solid #ddd; font-size:11px; color:#666; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <p id="generatedBySection"><strong>Generated by:</strong> <span id="generatedBy">Loading...</span></p>
                <p id="generatedOnSection"><strong>Generated on:</strong> <span id="generatedOn"></span></p>
            </div>
            <div id="qrCodeSection" style="display:none;">
                <div id="qrCode" style="display:inline-block;"></div>
                <p style="font-size:10px; color:#999; margin-top:3px;">Scan to view and verify invoice</p>
            </div>
        </div>

        <div style="margin-top:20px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:10px;">
            <p><em>This is a System Generated Invoice</em></p>
            <div style="margin-top:10px;">
                <div>Software by: UNISEN SYSTEMS</div>
                <div>Contact: +92 346 8918711 | +92 335 3789981</div>
                <div>Email: support@unisensystems.com</div>
                <div>www.unisensystems.com</div>
            </div>
        </div>
    </div>

    <script>
        // Paper size
        function setPaperSize(size) {
            localStorage.setItem('invoicePaperSize', size);
            document.documentElement.style.setProperty('--page-size', size);
            document.body.classList.toggle('a5-mode', size === 'A5');
            document.querySelectorAll('.print-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('btn' + size).classList.add('active');
        }
        setPaperSize(localStorage.getItem('invoicePaperSize') || 'A4');

        // Rate type human-readable label
        const rateTypeLabels = {
            per_bag: 'Per Bag',
            per_kg: 'Per KG',
            '100_kg': '100 KG',
            mon: 'MON',
            ton: 'Ton'
        };

        // Column config
        const defaultColumns = [
            { id: 'serial',   label: '#',         width: '4%'  },
            { id: 'product',  label: 'Product',   width: '18%' },
            { id: 'bag',      label: 'Bag',        width: '5%'  },
            { id: 'total_kg', label: 'Total KG',  width: '6%'  },
            { id: 'cut_kg_pct', label: 'Cut KG %', width: '5%' },
            { id: 'cut_kg',   label: 'Cut KG',    width: '5%'  },
            { id: 'al_kg_pct', label: 'AL KG %',  width: '5%'  },
            { id: 'al_kg',    label: 'AL KG',     width: '5%'  },
            { id: 'net_kg',   label: 'Net KG',    width: '5%'  },
            { id: 'price',    label: 'Rate',       width: '7%'  },
            { id: 'al_rate_cut', label: 'AL Rate Cut', width: '6%' },
            { id: 'net_rate', label: 'Net Rate',  width: '6%'  },
            { id: 'disc_pct', label: 'Disc %',    width: '5%'  },
            { id: 'disc_amt', label: 'Disc Amt',  width: '7%'  },
            { id: 'tax_pct',  label: 'Tax %',     width: '5%'  },
            { id: 'tax_amt',  label: 'Tax Amt',   width: '7%'  },
            { id: 'net',      label: 'Net Amt',   width: '7%'  }
        ];

        const saved = localStorage.getItem('printColumnCustomization');
        const columnConfig = saved ? JSON.parse(saved) : defaultColumns;

        const enableCashDiscountPercent = localStorage.getItem('enableCashDiscountPercent') === 'true';
        const enableCashDiscountAmount  = localStorage.getItem('enableCashDiscountAmount')  === 'true';
        const enableTaxation            = localStorage.getItem('enableTaxation')            === 'true';
        const enableShippingFees        = localStorage.getItem('enableShippingFees')        === 'true';
        const totalsLayout              = localStorage.getItem('totalsLayout') || 'vertical';

        // Helper: is column visible?
        function colVisible(id) {
            const col = columnConfig.find(c => c.id === id);
            return !col || col.visible !== false;
        }

        // Apply totals layout
        function applyTotalsLayout() {
            const totalsSection = document.querySelector('.totals-section');
            const totalsWrapper = document.getElementById('totalsTable');
            if (totalsLayout === 'horizontal-2' || totalsLayout === 'horizontal-3') {
                totalsSection.style.justifyContent = 'stretch';
                totalsWrapper.style.display = 'none';
                const container = document.createElement('div');
                container.className = totalsLayout === 'horizontal-2' ? 'totals-horizontal-2' : 'totals-horizontal-3';
                container.id = 'totalsHorizontal';
                totalsSection.appendChild(container);
            }
        }
        applyTotalsLayout();

        const childDisplayMode = localStorage.getItem('childDisplayMode') || 'separate';

        // Build table header
        function buildTableHeader(maxUnitColumns, rateType) {
            const headerRow = document.getElementById('itemsTableHeader');
            headerRow.innerHTML = '';

            const addTh = (text, width, colId, extraStyle) => {
                const th = document.createElement('th');
                th.textContent = text;
                if (width) th.width = width;
                if (colId) th.dataset.colId = colId;
                if (extraStyle) th.style.cssText = extraStyle;
                headerRow.appendChild(th);
                return th;
            };

            if (colVisible('serial'))   addTh('#', '4%', 'serial', 'text-align:center;');
            if (colVisible('product'))  addTh('Product', '18%', 'product');

            // Chassis columns
            if (localStorage.getItem('enableChassisMotorColour') === 'true') {
                ['Chassis No','Motor No','Colour'].forEach(l => addTh(l, '8%', null, 'text-align:center;'));
            }

            // Dynamic unit columns (from UOM)
            for (let i = 0; i < maxUnitColumns; i++) {
                addTh(`Unit ${i+1}`, '7%', `unit_${i}`, 'text-align:right;');
            }

            // KG columns
            if (colVisible('bag'))        addTh('Bag', '5%', 'bag', 'text-align:right;');
            if (colVisible('total_kg'))   addTh('Total KG', '6%', 'total_kg', 'text-align:right;');
            if (colVisible('cut_kg_pct')) addTh('Cut KG %', '5%', 'cut_kg_pct', 'text-align:right;');
            if (colVisible('cut_kg'))     addTh('Cut KG', '5%', 'cut_kg', 'text-align:right;');
            if (colVisible('al_kg_pct'))  addTh('AL KG %', '5%', 'al_kg_pct', 'text-align:right;');
            if (colVisible('al_kg'))      addTh('AL KG', '5%', 'al_kg', 'text-align:right;');
            if (colVisible('net_kg'))     addTh('Net KG', '5%', 'net_kg', 'text-align:right;');

            // Rate column — label based on rateType
            if (colVisible('price')) {
                const priceLabel = rateTypeLabels[rateType] ? rateTypeLabels[rateType] + ' Rate' : 'Sale Price';
                addTh(priceLabel, '7%', 'price', 'text-align:right;');
            }

            if (colVisible('al_rate_cut')) addTh('AL Rate Cut', '6%', 'al_rate_cut', 'text-align:right;');
            if (colVisible('net_rate')) addTh('Net Rate', '6%', 'net_rate', 'text-align:right;');
            if (colVisible('disc_pct') && enableCashDiscountPercent) addTh('Disc %', '5%', 'disc_pct', 'text-align:right;');
            if (colVisible('disc_amt') && enableCashDiscountAmount)  addTh('Disc Amt', '7%', 'disc_amt', 'text-align:right;');
            if (colVisible('tax_pct')  && enableTaxation)            addTh('Tax %', '5%', 'tax_pct', 'text-align:right;');
            if (colVisible('tax_amt')  && enableTaxation)            addTh('Tax Amt', '7%', 'tax_amt', 'text-align:right;');
            if (colVisible('net'))      addTh(enableTaxation ? 'Value Incl. Tax' : 'Net Amt', '7%', 'net', 'text-align:right;');
        }

        // Build tfoot totals row
        function buildTotalsRow(maxUnitColumns) {
            const tr = document.querySelector('.items-table tfoot tr');
            tr.innerHTML = '';

            const addTh = (text, colId) => {
                const th = document.createElement('th');
                th.className = 'text-right';
                if (text) { th.id = colId; th.textContent = '0.00'; }
                if (!text && colId) th.textContent = colId === 'totals_label' ? 'Totals' : '';
                tr.appendChild(th);
                return th;
            };

            if (colVisible('serial'))  { const th = document.createElement('th'); tr.appendChild(th); }
            if (colVisible('product')) { const th = document.createElement('th'); th.textContent = 'Totals'; tr.appendChild(th); }

            if (localStorage.getItem('enableChassisMotorColour') === 'true') {
                for (let c = 0; c < 3; c++) { const th = document.createElement('th'); tr.appendChild(th); }
            }

            for (let i = 0; i < maxUnitColumns; i++) { const th = document.createElement('th'); tr.appendChild(th); }

            const cols = [
                { id: 'bag',         totalId: null },
                { id: 'total_kg',    totalId: 'totalTotalKG' },
                { id: 'cut_kg_pct',  totalId: null },
                { id: 'cut_kg',      totalId: 'totalCutKG' },
                { id: 'al_kg_pct',   totalId: null },
                { id: 'al_kg',       totalId: 'totalAlKG' },
                { id: 'net_kg',      totalId: 'totalNetKG' },
                { id: 'price',       totalId: 'totalUnitPrice' },
                { id: 'al_rate_cut', totalId: null },
                { id: 'net_rate',    totalId: null },
                { id: 'disc_pct',    totalId: null,   hide: !enableCashDiscountPercent },
                { id: 'disc_amt',    totalId: 'totalDiscountAmountItems', hide: !enableCashDiscountAmount },
                { id: 'tax_pct',     totalId: null,   hide: !enableTaxation },
                { id: 'tax_amt',     totalId: 'totalTaxAmountItems', hide: !enableTaxation },
                { id: 'net',         totalId: 'totalNetAmountItems' }
            ];

            cols.forEach(c => {
                if (!colVisible(c.id)) return;
                if (c.hide) return;
                const th = document.createElement('th');
                th.className = 'text-right';
                th.dataset.colId = c.id;
                if (c.totalId) { th.id = c.totalId; th.textContent = '0.00'; }
                tr.appendChild(th);
            });
        }

        // URL param
        const urlParams = new URLSearchParams(window.location.search);
        const invoiceId = urlParams.get('id');
        if (!invoiceId) { alert('Invoice ID is required'); window.close(); }

        async function fetchCustomerClosingBalance(customerId, companyId) {
            try {
                const params = new URLSearchParams({ customer_id: customerId, as_of_date: new Date().toISOString().split('T')[0] });
                if (companyId) params.append('company_id', companyId);
                const r = await fetch(`../../../../server/api/sale/pos_invoice/get-customer-closing-balance.php?${params}`);
                const d = await r.json();
                return d.success ? parseFloat(d.closing_balance) : 0;
            } catch { return 0; }
        }

        async function loadData() {
            try {
                const [userRes, invRes] = await Promise.all([
                    fetch('../../../../server/api/sale/pos_invoice/get-user.php'),
                    fetch(`../../../../server/api/sale/pos_invoice/pos-edit.php?id=${invoiceId}`)
                ]);
                const userData    = await userRes.json();
                const invoiceData = await invRes.json();

                if (userData.success) document.getElementById('generatedBy').textContent = userData.user.full_name;

                if (invoiceData.success) {
                    const compUrl = invoiceData.invoice.company_id
                        ? `../../../../server/api/sale/pos_invoice/get-company-by-id.php?id=${invoiceData.invoice.company_id}`
                        : '../../../../server/api/sale/pos_invoice/get-company.php';
                    const compData = await (await fetch(compUrl)).json();
                    if (compData.success) populateCompanyData(compData.company);

                    const closingBalance = await fetchCustomerClosingBalance(invoiceData.invoice.customer_id, invoiceData.invoice.company_id);
                    populateInvoiceData(invoiceData.invoice, invoiceData.items, closingBalance);
                } else {
                    alert('Error loading invoice: ' + invoiceData.message);
                }
            } catch (e) {
                alert('Error loading data: ' + e.message);
            }
            // Signals the PDF-generation headless browser that the page is fully rendered
            window.__pdfReady = true;
        }

        function populateCompanyData(company) {
            if (company.logo_url) {
                const img = document.createElement('img');
                img.src = `../../../assets/uploads/company_logo/${company.logo_url}`;
                img.alt = 'Company Logo';
                img.style.cssText = 'max-width:120px;max-height:80px;margin-bottom:10px;display:block;';
                const ci = document.querySelector('.company-info');
                ci.insertBefore(img, ci.firstChild);
            }
            document.getElementById('companyName').textContent    = company.company_name || company.legal_name || 'Company Name';
            document.getElementById('companyAddress').textContent = company.address || '';
            document.getElementById('companyCityState').textContent = `${company.city||''}, ${company.state||''} ${company.zipcode||''}`.trim();
            document.getElementById('companyPhone').textContent   = company.phone ? `Phone: ${company.phone}` : '';
            document.getElementById('companyEmail').textContent   = company.email ? `Email: ${company.email}` : '';
        }

        function populateInvoiceData(invoice, items, closingBalanceData) {
            document.getElementById('invoiceNo').textContent   = invoice.bill_no;
            document.getElementById('invoiceDate').textContent = new Date(invoice.sale_date).toLocaleDateString();
            document.getElementById('customerName').textContent = `${invoice.customer_code} - ${invoice.customer_name}`;

            // Customer fields
            const hideAddr  = localStorage.getItem('hidePrintCustomerAddress') === 'true';
            const hidePhone = localStorage.getItem('hidePrintCustomerPhone')   === 'true';
            const hideEmail = localStorage.getItem('hidePrintCustomerEmail')   === 'true';

            if (hideAddr)  document.getElementById('customerAddress').closest('p').style.display = 'none';
            else           document.getElementById('customerAddress').textContent = invoice.customer_address || '-';

            if (hidePhone) document.getElementById('customerPhone').closest('p').style.display = 'none';
            else           document.getElementById('customerPhone').textContent = invoice.customer_phone || '-';

            if (hideEmail) document.getElementById('customerEmail').closest('p').style.display = 'none';
            else           document.getElementById('customerEmail').textContent = invoice.customer_email || '-';

            document.getElementById('customerIdentityCard').textContent = invoice.customer_identity_card || '-';

            // Branch / Currency
            const branchText = invoice.parent_branch_name
                ? `${invoice.branch_name} (${invoice.branch_type}) - Parent: ${invoice.parent_branch_name}`
                : `${invoice.branch_name} (${invoice.branch_type})`;

            if (localStorage.getItem('hidePrintBranch') === 'true')
                document.getElementById('branchName').closest('p').style.display = 'none';
            else document.getElementById('branchName').textContent = branchText;

            if (localStorage.getItem('hidePrintCurrency') === 'true')
                document.getElementById('currency').closest('p').style.display = 'none';
            else document.getElementById('currency').textContent = invoice.currency_name;

            // Rate Type
            const rateType = invoice.rate_type || '';
            if (rateType) {
                document.getElementById('rateTypeDisplay').textContent = rateTypeLabels[rateType] || rateType;
            } else {
                document.getElementById('rateTypeRow').style.display = 'none';
            }

            // Brokery Rate Type
            const brokeryRateType = invoice.brokery_rate_type || '';
            if (brokeryRateType) {
                document.getElementById('brokeryRateTypeDisplay').textContent = rateTypeLabels[brokeryRateType] || brokeryRateType;
            } else {
                document.getElementById('brokeryRateTypeRow').style.display = 'none';
            }

            // Other info fields
            const fields = {
                biltyNo:       { val: invoice.bilty_no,             hide: 'hidePrintBiltyNo' },
                transportName: { val: invoice.transport_name,       hide: 'hidePrintTransport' },
                rpoNo:         { val: invoice.rpo_no,               hide: null },
                truckNo:       { val: invoice.truck_no,             hide: null },
                deliveredFrom: { val: invoice.delivered_from,       hide: null },
                paymentTermName: { val: invoice.payment_term_name,  hide: null },
                remarks:       { val: invoice.remarks,              hide: 'hidePrintRemarks' }
            };
            Object.entries(fields).forEach(([id, cfg]) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (cfg.hide && localStorage.getItem(cfg.hide) === 'true') {
                    el.closest('p').style.display = 'none';
                } else if (!cfg.val) {
                    const row = el.closest('[id$="Row"]');
                    if (row) row.style.display = 'none';
                    else el.textContent = '-';
                } else {
                    el.textContent = cfg.val;
                }
            });

            const sym = invoice.currency_symbol || '';

            // Group items
            const itemsByProduct = {};
            const childItems = [];
            items.forEach(item => {
                if (item.parent_row_id === null) {
                    if (!itemsByProduct[item.product_id]) {
                        itemsByProduct[item.product_id] = { baseItem: item, units: [] };
                    }
                    itemsByProduct[item.product_id].units.push({ uom_name: item.uom_name, quantity: item.quantity });
                } else {
                    childItems.push(item);
                }
            });

            let maxUnitColumns = 0;
            Object.values(itemsByProduct).forEach(g => { maxUnitColumns = Math.max(maxUnitColumns, g.units.length); });

            // Check which KG/price columns have any data > 0
            const autoHideCols = { bag: false, total_kg: false, cut_kg_pct: false, cut_kg: false, al_kg_pct: false, al_kg: false, net_kg: false, al_rate_cut: false, price: false, net_rate: false };
            items.forEach(item => {
                if (parseFloat(item.bag||0) > 0)             autoHideCols.bag = true;
                if (parseFloat(item.total_kg||0) > 0)        autoHideCols.total_kg = true;
                if (parseFloat(item.cut_kg_percent||0) > 0)  autoHideCols.cut_kg_pct = true;
                if (parseFloat(item.cut_kg||0) > 0)          autoHideCols.cut_kg = true;
                if (parseFloat(item.al_kg_percent||0) > 0)   autoHideCols.al_kg_pct = true;
                if (parseFloat(item.al_kg||0) > 0)           autoHideCols.al_kg = true;
                if (parseFloat(item.net_kg||0) > 0)          autoHideCols.net_kg = true;
                if (parseFloat(item.al_rate_cut||0) > 0)     autoHideCols.al_rate_cut = true;
                if (parseFloat(item.sale_price||0) > 0)      autoHideCols.price = true;
            });

            // Net Rate only makes sense alongside AL Rate Cut - hide it unless AL Rate Cut is present
            autoHideCols.net_rate = autoHideCols.al_rate_cut;

            buildTableHeader(maxUnitColumns, rateType);
            buildTotalsRow(maxUnitColumns);

            // Hide columns with no data
            function hideColByDataId(colId) {
                document.querySelectorAll(`[data-col-id="${colId}"]`).forEach(el => el.style.display = 'none');
            }
            Object.entries(autoHideCols).forEach(([colId, hasData]) => {
                if (!hasData) hideColByDataId(colId);
            });

            const tbody = document.getElementById('itemsTableBody');
            tbody.innerHTML = '';

            let totals = { totalKG: 0, cutKG: 0, alKG: 0, netKG: 0, unitPrice: 0, gross: 0, disc: 0, tax: 0, net: 0 };

            const enableChassis = localStorage.getItem('enableChassisMotorColour') === 'true';

            let serial = 0;
            Object.values(itemsByProduct).forEach(group => {
                serial++;
                const item = group.baseItem;
                const row  = tbody.insertRow();

                const addTd = (text, cls) => {
                    const td = row.insertCell();
                    td.className = cls || '';
                    td.textContent = text;
                    return td;
                };
                const addTdHtml = (html, cls) => {
                    const td = row.insertCell();
                    td.className = cls || '';
                    td.innerHTML = html;
                    return td;
                };

                if (colVisible('serial'))  addTd(serial, 'text-center');
                if (colVisible('product')) {
                    let pName = item.product_name;
                    if (childDisplayMode === 'inline') {
                        const ch = childItems.filter(c => c.parent_row_id === item.id);
                        if (ch.length) pName += '<br><span style="font-size:10px;color:#666;">(' + ch.map(c => `${c.product_name}: ${parseFloat(c.quantity).toFixed(2)}`).join(' | ') + ')</span>';
                    }
                    addTdHtml(pName);
                }

                if (enableChassis) {
                    [item.chassis_no||'-', item.motor_no||'-', item.colour||'-'].forEach(v => addTd(v, 'text-center'));
                }

                for (let i = 0; i < maxUnitColumns; i++) {
                    const td = row.insertCell();
                    td.className = 'text-right';
                    if (i < group.units.length) {
                        const u = group.units[i];
                        td.innerHTML = `<div style="font-size:10px;color:#666;">${u.uom_name}</div><div>${parseFloat(u.quantity).toFixed(2)}</div>`;
                    } else {
                        td.style.background = '#f8f9fa'; td.innerHTML = '<span style="opacity:0.3;">-</span>';
                    }
                }

                if (colVisible('bag'))        { const td = addTd(parseFloat(item.bag||0).toFixed(2), 'text-right'); if (!autoHideCols.bag) td.style.display='none'; }
                if (colVisible('total_kg'))   { const td = addTd(parseFloat(item.total_kg||0).toFixed(2), 'text-right'); if (!autoHideCols.total_kg) td.style.display='none'; }
                if (colVisible('cut_kg_pct')) { const td = addTd(parseFloat(item.cut_kg_percent||0).toFixed(2)+'%', 'text-right'); if (!autoHideCols.cut_kg_pct) td.style.display='none'; }
                if (colVisible('cut_kg'))     { const td = addTd(parseFloat(item.cut_kg||0).toFixed(2), 'text-right'); if (!autoHideCols.cut_kg) td.style.display='none'; }
                if (colVisible('al_kg_pct'))  { const td = addTd(parseFloat(item.al_kg_percent||0).toFixed(2)+'%', 'text-right'); if (!autoHideCols.al_kg_pct) td.style.display='none'; }
                if (colVisible('al_kg'))      { const td = addTd(parseFloat(item.al_kg||0).toFixed(2), 'text-right'); if (!autoHideCols.al_kg) td.style.display='none'; }
                if (colVisible('net_kg'))     { const td = addTd(parseFloat(item.net_kg||0).toFixed(2), 'text-right'); if (!autoHideCols.net_kg) td.style.display='none'; }
                if (colVisible('price'))      { const td = addTd(`${sym} ${parseFloat(item.sale_price).toFixed(4)}`, 'text-right'); if (!autoHideCols.price) td.style.display='none'; }
                if (colVisible('al_rate_cut')) { const td = addTd(parseFloat(item.al_rate_cut||0).toFixed(2), 'text-right'); if (!autoHideCols.al_rate_cut) td.style.display='none'; }
                if (colVisible('net_rate'))   { const td = addTd(`${sym} ${parseFloat(item.net_rate||0).toFixed(2)}`, 'text-right'); if (!autoHideCols.net_rate) td.style.display='none'; }
                if (colVisible('disc_pct') && enableCashDiscountPercent)
                    addTd(parseFloat(item.discount_percent||0).toFixed(2)+'%', 'text-right');
                if (colVisible('disc_amt') && enableCashDiscountAmount)
                    addTd(`${sym} ${parseFloat(item.discount_amount||0).toFixed(2)}`, 'text-right');
                if (colVisible('tax_pct') && enableTaxation)
                    addTd(parseFloat(item.tax_percent||0).toFixed(2)+'%', 'text-right');
                if (colVisible('tax_amt') && enableTaxation)
                    addTd(`${sym} ${parseFloat(item.tax_amount||0).toFixed(2)}`, 'text-right');
                if (colVisible('net'))        addTd(`${sym} ${parseFloat(item.net_amount).toFixed(2)}`, 'text-right');

                totals.totalKG  += parseFloat(item.total_kg||0);
                totals.cutKG    += parseFloat(item.cut_kg||0);
                totals.alKG     += parseFloat(item.al_kg||0);
                totals.netKG    += parseFloat(item.net_kg||0);
                totals.unitPrice += parseFloat(item.sale_price);
                totals.disc     += parseFloat(item.discount_amount||0);
                totals.tax      += parseFloat(item.tax_amount||0);
                totals.net      += parseFloat(item.net_amount);
            });

            // Child rows (separate mode)
            if (childDisplayMode !== 'inline') {
                childItems.forEach(item => {
                    const row = tbody.insertRow();
                    const addTd = (text, cls) => { const td = row.insertCell(); td.className = cls||''; td.textContent = text; };
                    if (colVisible('serial'))  addTd('', 'text-center');
                    if (colVisible('product')) { const td = row.insertCell(); td.innerHTML = `<span style="color:#666;margin-left:20px;">↳ ${item.product_name}</span>`; }
                    if (enableChassis) for (let c=0;c<3;c++) addTd('-', 'text-center');
                    for (let i=0;i<maxUnitColumns;i++) {
                        const td = row.insertCell(); td.className='text-right';
                        if (i===0) td.innerHTML = `<div style="font-size:10px;color:#666;">${item.uom_name||''}</div><div>${parseFloat(item.quantity).toFixed(2)}</div>`;
                        else { td.style.background='#f8f9fa'; td.innerHTML='<span style="opacity:0.3;">-</span>'; }
                    }
                    const dash = (colId) => { const td = addTd('-', 'text-right'); if (colId && !autoHideCols[colId]) td.style.display='none'; };
                    if (colVisible('bag')) dash('bag'); if (colVisible('total_kg')) dash('total_kg'); if (colVisible('cut_kg_pct')) dash('cut_kg_pct');
                    if (colVisible('cut_kg')) dash('cut_kg'); if (colVisible('al_kg_pct')) dash('al_kg_pct'); if (colVisible('al_kg')) dash('al_kg');
                    if (colVisible('net_kg')) dash('net_kg'); if (colVisible('price')) dash('price'); if (colVisible('al_rate_cut')) dash('al_rate_cut');
                    if (colVisible('net_rate')) dash('net_rate');
                    if (colVisible('disc_pct') && enableCashDiscountPercent) dash();
                    if (colVisible('disc_amt') && enableCashDiscountAmount) dash();
                    if (colVisible('tax_pct') && enableTaxation) dash();
                    if (colVisible('tax_amt') && enableTaxation) dash();
                    if (colVisible('net')) dash();
                });
            }

            // Update footer totals
            const setFoot = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setFoot('totalTotalKG',            totals.totalKG.toFixed(2));
            setFoot('totalCutKG',              totals.cutKG.toFixed(2));
            setFoot('totalAlKG',               totals.alKG.toFixed(2));
            setFoot('totalNetKG',              totals.netKG.toFixed(2));
            setFoot('totalUnitPrice',          `${sym} ${totals.unitPrice.toFixed(2)}`);
            setFoot('totalDiscountAmountItems',`${sym} ${totals.disc.toFixed(2)}`);
            setFoot('totalTaxAmountItems',     `${sym} ${totals.tax.toFixed(2)}`);
            setFoot('totalNetAmountItems',     `${sym} ${totals.net.toFixed(2)}`);

            // Charge helper
            const signedVal = (val, sign) => (sign === '-' ? -Math.abs(val) : Math.abs(val));
            const showCharge = (rowId, labelId, labelText, val, sign) => {
                if (parseFloat(val||0) !== 0) {
                    const row = document.getElementById(rowId);
                    if (row) {
                        row.style.display = '';
                        if (labelId) document.getElementById(labelId).textContent = labelText;
                        document.getElementById(rowId.replace('Row','Val')).textContent =
                            `${sym} ${signedVal(val, sign).toFixed(2)}`;
                    }
                }
            };

            showCharge('wtChargesRow',      'wtChargesLabel',      'Wt Charges',      invoice.wt_charges,      invoice.wt_charges_sign);
            showCharge('freightRow',        'freightLabel',        'Freight',          invoice.freight,         invoice.freight_sign);
            showCharge('mSukriRow',         'mSukriLabel',         'M/Sukri',          invoice.m_sukri,         invoice.m_sukri_sign);
            showCharge('brokenAmountRow',   'brokenAmountLabel',   'Broken Amount',    invoice.broken_amount,   invoice.broken_amount_sign);
            showCharge('brokeryAmountRow',  'brokeryAmountLabel',  'Brokery',          invoice.brokery_amount,  invoice.brokery_amount_sign);
            showCharge('brokeryTaxAmountRow', null,                null,               invoice.brokery_tax_amount, invoice.brokery_tax_amount_sign);
            if (parseFloat(invoice.brokery_tax_amount||0) !== 0) document.getElementById('brokeryTaxAmountRow').style.display = '';
            showCharge('bardanaRow',        'bardanaLabel',        'Bardana',          invoice.bardana,         invoice.bardana_sign);
            showCharge('phoneChargesRow',   'phoneChargesLabel',   'Phone Charges',    invoice.phone_charges,   invoice.phone_charges_sign);
            showCharge('fillingChargesRow', 'fillingChargesLabel', 'Filling Charges',  invoice.filling_charges, invoice.filling_charges_sign);

            if (parseFloat(invoice.total_charges||0) !== 0) {
                document.getElementById('totalChargesRow').style.display = '';
                document.getElementById('totalChargesVal').textContent = `${sym} ${parseFloat(invoice.total_charges).toFixed(2)}`;
            }

            // Summary totals
            const enableInvDiscPct = localStorage.getItem('enableInvoiceCashDiscountPercent') === 'true';
            const enableInvDiscAmt = localStorage.getItem('enableInvoiceCashDiscountAmount')  === 'true';

            const amountPaid      = parseFloat(invoice.amount_paid) || 0;
            const netAmount       = parseFloat(invoice.net_amount);
            const netReceivable   = parseFloat(invoice.net_receivable || invoice.net_amount);
            const remainingBal    = netAmount - amountPaid;
            const invoicePrevBal  = parseFloat(invoice.previous_balance) || 0;
            const prevBalSign     = invoicePrevBal >= 0 ? 'Dr' : 'Cr';
            const prevForCalc     = invoicePrevBal >= 0 ? invoicePrevBal : -Math.abs(invoicePrevBal);
            const totalBalVal     = prevForCalc + remainingBal;
            const totalBalSign    = totalBalVal >= 0 ? 'Dr' : 'Cr';

            const totalsData = [
                { id: 'totalBill',       label: localStorage.getItem('labelTotalBill') || 'Total Bill',
                  value: `${sym} ${parseFloat(invoice.total_bill).toFixed(2)}`,
                  show: localStorage.getItem('hidePrintTotalBill') !== 'true' },
                { id: 'discountPercent', label: 'Discount (%)',
                  value: parseFloat(invoice.total_discount_percent).toFixed(2) + '%', show: enableInvDiscPct },
                { id: 'discountAmount',  label: localStorage.getItem('labelDiscountAmount') || 'Discount Amount',
                  value: `${sym} ${parseFloat(invoice.total_discount_amount).toFixed(2)}`, show: enableInvDiscAmt },
                { id: 'shippingFees',    label: localStorage.getItem('labelShippingFees') || 'Shipping Fees',
                  value: `${sym} ${parseFloat(invoice.shipping_fees||0).toFixed(2)}`,
                  show: enableShippingFees && parseFloat(invoice.shipping_fees||0) > 0 },
                { id: 'netAmount',       label: localStorage.getItem('labelNetAmount') || 'Net Amount',
                  value: `${sym} ${netAmount.toFixed(2)}`,
                  show: localStorage.getItem('hidePrintNetAmount') !== 'true', isTotal: true },
                { id: 'netReceivable',   label: 'Net Receivable',
                  value: `${sym} ${netReceivable.toFixed(2)}`, show: true, isTotal: true },
                { id: 'amountPaid',      label: localStorage.getItem('labelAmountPaid') || 'Amount Paid',
                  value: `${sym} ${amountPaid.toFixed(2)}`,
                  show: localStorage.getItem('hidePrintAmountPaid') !== 'true' },
                { id: 'paymentMethod',   label: localStorage.getItem('labelPaymentMethod') || 'Payment Method',
                  value: invoice.payment_method || '-',
                  show: localStorage.getItem('hidePrintPaymentMethod') !== 'true' },
                { id: 'remainingBalance', label: localStorage.getItem('labelRemainingBalance') || 'Remaining Balance',
                  value: `${sym} ${remainingBal.toFixed(2)}`,
                  show: localStorage.getItem('hidePrintRemainingBalance') !== 'true' },
                { id: 'totalBalance',    label: 'Total Balance',
                  value: `${sym} ${Math.abs(totalBalVal).toFixed(2)} ${totalBalSign}`,
                  show: true, isSpecial: 'totalBalance' }
            ];

            if (totalsLayout === 'horizontal-2' || totalsLayout === 'horizontal-3') {
                const container = document.getElementById('totalsHorizontal');
                totalsData.filter(t => t.show).forEach(t => {
                    const div = document.createElement('div');
                    div.className = 'totals-item' + (t.isTotal ? ' total-row' : '') + (t.isSpecial ? ` ${t.isSpecial}` : '');
                    div.id = t.id;
                    div.innerHTML = `<span>${t.label}:</span><span>${t.value}</span>`;
                    container.appendChild(div);
                });
            } else {
                // vertical layout — populate existing rows
                document.getElementById('totalBill').textContent = `${sym} ${parseFloat(invoice.total_bill).toFixed(2)}`;

                if (enableInvDiscPct) {
                    document.getElementById('discountPercentRow').style.display = '';
                    document.getElementById('discountPercent').textContent = parseFloat(invoice.total_discount_percent).toFixed(2) + '%';
                }
                if (enableInvDiscAmt) {
                    document.getElementById('discountAmountRow').style.display = '';
                    document.getElementById('discountAmount').textContent = `${sym} ${parseFloat(invoice.total_discount_amount).toFixed(2)}`;
                }
                if (enableShippingFees && parseFloat(invoice.shipping_fees||0) > 0) {
                    document.getElementById('shippingFeesRow').style.display = '';
                    document.getElementById('shippingFeesLabel').textContent = localStorage.getItem('labelShippingFees') || 'Shipping Fees';
                    document.getElementById('shippingFees').textContent = `${sym} ${parseFloat(invoice.shipping_fees).toFixed(2)}`;
                }

                document.getElementById('netAmount').textContent      = `${sym} ${netAmount.toFixed(2)}`;
                document.getElementById('netReceivable').textContent  = `${sym} ${netReceivable.toFixed(2)}`;
                document.getElementById('amountPaid').textContent     = `${sym} ${amountPaid.toFixed(2)}`;
                document.getElementById('paymentMethod').textContent  = invoice.payment_method || '-';
                document.getElementById('remainingBalance').textContent = `${sym} ${remainingBal.toFixed(2)}`;
                document.getElementById('totalBalance').textContent   = `${sym} ${Math.abs(totalBalVal).toFixed(2)} ${totalBalSign}`;

                const hideRow = (id) => { const el = document.getElementById(id); if (el) el.closest('[id$="Row"]') && (el.closest('[id$="Row"]').style.display = 'none'); };
                if (localStorage.getItem('hidePrintAmountPaid')       === 'true') document.getElementById('amountPaidRow').style.display = 'none';
                if (localStorage.getItem('hidePrintPaymentMethod')    === 'true') document.getElementById('paymentMethodRow').style.display = 'none';
                if (localStorage.getItem('hidePrintRemainingBalance') === 'true') document.getElementById('remainingBalanceRow').style.display = 'none';
                if (localStorage.getItem('hidePrintNetAmount')        === 'true') document.getElementById('netAmountRow').style.display = 'none';
                if (localStorage.getItem('hidePrintTotalBill')        === 'true') document.getElementById('totalBillRow').style.display = 'none';
            }

            // Amount in words
            const words = numberToWords(Math.floor(netAmount));
            const cents = Math.round((netAmount % 1) * 100);
            document.getElementById('amountInWords').textContent = `${words}${cents > 0 ? ' and ' + numberToWords(cents) + ' Cents' : ''} Only`;

            if (localStorage.getItem('hidePrintAmountInWords') === 'true') document.getElementById('amountInWordsSection').style.display = 'none';
            if (localStorage.getItem('hidePrintSignatures')    === 'true') document.getElementById('signaturesSection').style.display = 'none';
            if (localStorage.getItem('hidePrintGeneratedBy')   === 'true') document.getElementById('generatedBySection').style.display = 'none';
            if (localStorage.getItem('hidePrintGeneratedOn')   === 'true') document.getElementById('generatedOnSection').style.display = 'none';

            // QR Code - libraries are loaded on demand (only when this setting is on)
            // so the PDF/headless renderer never blocks on an external CDN request
            // for the common case where no QR code is shown.
            if (localStorage.getItem('enablePrintQRCode') === 'true') {
                loadQrLibraries().then(() => {
                    const qrDiv = document.getElementById('qrCode');
                    if (qrDiv && !qrDiv.hasChildNodes()) {
                        document.getElementById('qrCodeSection').style.display = 'block';
                        const token = CryptoJS.MD5(invoice.bill_no + 'LEDGERONE_SECRET_KEY').toString().substring(0, 16);
                        const url   = `${window.location.origin}/ledgerone_erp/client/pages/sale/pos_invoice/verify-invoice.php?invoice=${invoice.bill_no}&token=${token}`;
                        new QRCode(qrDiv, { text: url, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.H });
                    }
                }).catch(() => {});
            }
        }

        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        function loadQrLibraries() {
            if (typeof QRCode !== 'undefined' && typeof CryptoJS !== 'undefined') return Promise.resolve();
            return Promise.all([
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js')
            ]);
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
