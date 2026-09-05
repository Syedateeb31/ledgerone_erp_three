<?php
// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Get user_id from session
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    // Redirect to login if no user_id in session
    header('Location: ../../auth/login.html');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LedgerOne ERP - Soda Book Buyer</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/purchase/purchase_order/order-add.css">
</head>
<body class="light-theme">
    <div class="container">
        <div class="header">
            <h1 class="page-title">Soda Book Buyer</h1>

        </div>

        <form id="invoiceForm">
            <div class="card">
                <h2 class="card-title">Order Details</h2>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="billNo" class="required">Order No</label>
                        <input type="text" id="billNo" value="Automatically generated" readonly required tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="company" class="required">Company</label>
                        <select id="company" required>
                            <option value="">Select Company</option>
                        </select>
                        <div class="error-message" id="companyError">Please select a company</div>
                    </div>
                    <div class="form-group">
                        <label for="purchaseDate" class="required">Order Date</label>
                        <input type="date" id="purchaseDate" required tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="lastDate">Last Date</label>
                        <input type="date" id="lastDate">
                    </div>
                    <div class="form-group" style="display:none;">
                        <label for="branch" class="required">Branch</label>
                        <div class="searchable-dropdown">
                            <input type="text" autocomplete="off" class="search-input" placeholder="Search branch..." id="branchSearch">
                            <div class="dropdown-options" id="branchOptions">
                            </div>
                            <input type="hidden" id="branch" required>
                        </div>
                        <div class="error-message" id="branchError">Please select a branch</div>
                    </div>
                    <div class="form-group" style="display:none;">
                        <label for="currency" class="required">Currency</label>
                        <select id="currency" required tabindex="-1">
                            <option value="">Select Currency</option>
                        </select>
                        <div class="error-message" id="currencyError">Please select a currency</div>
                    </div>
                    <div class="form-group">
                        <label for="previousBalance">Supplier's Previous Balance</label>
                        <input type="text" id="previousBalance" value="0.00" readonly tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="supplierCode" class="required">Supplier Code</label>
                        <div style="display: flex; gap: 8px;">
                            <div class="searchable-dropdown" style="flex: 1;">
                                <input type="text" class="search-input" autocomplete="off" placeholder="Search supplier code..." id="supplierCodeSearch">
                                <div class="dropdown-options" id="supplierCodeOptions">
                                </div>
                                <input type="hidden" id="supplierCode" required>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" id="addSupplierBtn" title="Add New Supplier">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="error-message" id="supplierCodeError">Please select a supplier code</div>
                    </div>
                    <div class="form-group">
                        <label for="rpoNo">RPO #</label>
                        <input type="text" id="rpoNo" placeholder="Enter RPO number">
                    </div>
                    <div class="form-group">
                        <label for="broker">Broker</label>
                        <input type="text" id="broker" placeholder="Enter broker name">
                    </div>
                    <div class="form-group">
                        <label for="millName">Mill Name</label>
                        <input type="text" id="millName" placeholder="Enter mill name">
                    </div>
                    <div class="form-group" style="display:none;">
                        <label for="supplierInvoiceNo">Supplier Invoice No</label>
                        <input type="text" id="supplierInvoiceNo" placeholder="Enter supplier invoice number">
                    </div>
                    <div class="form-group" style="display:none;">
                        <label for="supplierInvoiceDate">Supplier Invoice Date</label>
                        <input type="date" id="supplierInvoiceDate">
                    </div>
                    <div class="form-group">
                        <label for="paymentTerm">Payment Cond.</label>
                        <div style="display:flex; gap:8px;">
                            <select id="paymentTerm">
                                <option value="">Select Payment Term</option>
                            </select>
                            <button type="button" class="btn btn-secondary btn-sm" id="addPaymentTermBtn" title="Manage Payment Terms" style="flex-shrink:0;">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="biltyNo">Bilty No</label>
                        <input type="text" id="biltyNo" placeholder="Enter bilty/LR number">
                    </div>
                    <div class="form-group">
                        <label for="transportName">Transport Name</label>
                        <input type="text" id="transportName" placeholder="Enter transport company name">
                    </div>
                    <div class="form-group">
                        <label for="truckNo">Truck No</label>
                        <input type="text" id="truckNo" placeholder="Enter truck number">
                    </div>
                    <div class="form-group full-width">
                        <label for="remarks">Remarks</label>
                        <textarea id="remarks" placeholder="Enter any additional remarks" tabindex="-1"></textarea>
                    </div>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="card-title" style="margin-bottom: 0;">Items</h2>
                    <button type="button" class="btn btn-secondary btn-sm" id="addProductBtn" title="Add New Product">
                        <i class="fas fa-plus"></i> Add New Product
                    </button>
                </div>
                <div class="table-container">
                    <table id="itemsTable">
                        <thead>
                            <tr>
                                <th width="4%">S#</th>
                                <th width="20%">Product Code / Name</th>
                                <!-- Dynamic unit columns will be inserted here -->
                                <th width="8%"><span id="purchasePriceLabel">Purchase Price</span></th>
                                <th width="8%" class="gross-header"><span id="grossAmountLabel">Gross Amount</span></th>
                                <th width="5%" class="disc-percent-header">Disc %</th>
                                <th width="8%" class="disc-amount-header"><span id="discountAmountLabel">Disc Amt</span></th>
                                <th width="8%"><span id="netAmountLabel">Net Amount</span></th>
                                <th width="4%">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Rows will be added dynamically -->
                        </tbody>
                        <tfoot>
                            <tr class="totals-row">
                                <th colspan="2">Totals</th>
                                <!-- Dynamic unit totals will be inserted here -->
                                <th id="totalPurchasePrice">0.00</th>
                                <th id="totalGrossAmount" class="gross-header">0.00</th>
                                <th class="disc-percent-header"></th>
                                <th id="totalDiscountAmountItems" class="disc-amount-header">0.00</th>
                                <th id="totalNetAmountItems">0.00</th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="actions">
                    <button type="button" class="btn btn-secondary" id="addRowBtn">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Order Summary</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label" id="totalBillLabel">Total Bill</span>
                        <span class="summary-value" id="totalBill">0.00</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Discount %</span>
                        <input type="number" id="totalDiscountPercent" class="table-input" min="0" max="100" step="0.01" value="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label" id="totalDiscountAmountLabel">Discount Amount</span>
                        <input type="number" id="totalDiscountAmount" class="table-input" min="0" step="0.01" value="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label" id="shippingFeesLabel">Shipping Fees</span>
                        <input type="number" id="shippingFees" class="table-input" min="0" step="0.01" value="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Moist</span>
                        <input type="text" id="moist" class="table-input" placeholder="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Damage</span>
                        <input type="text" id="damage" class="table-input" placeholder="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Under Mill</span>
                        <input type="text" id="underMill" class="table-input" placeholder="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Broken</span>
                        <input type="number" id="broken" class="table-input" placeholder="0" step="0.01" min="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Chakki</span>
                        <input type="number" id="chakki" class="table-input" placeholder="0" step="0.01" min="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label" id="netAmountSummaryLabel">Net Amount</span>
                        <span class="summary-value" id="netAmount">0.00</span>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button type="button" class="btn btn-secondary" id="resetBtn" tabindex="-1">
                    <i class="fas fa-redo"></i> Reset Order
                </button>
                <button type="submit" class="btn btn-primary" id="saveBtn">
                    <i class="fas fa-save"></i> Save Order
                </button>
            </div>
        </form>
    </div>

    <!-- Success Modal -->
    <div class="modal" id="successModal">
        <div class="modal-content">
            <h3 class="modal-title">Order Saved Successfully!</h3>
            <p>What would you like to do next?</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="printLaterBtn">
                    Print Later
                </button>
                <button class="btn btn-primary" id="printInvoiceBtn">
                    <i class="fas fa-print"></i> Print Order
                </button>
            </div>
        </div>
    </div>



    <!-- Add Supplier Modal -->
    <div class="modal" id="addSupplierModal">
        <div class="modal-content" style="width: 90%; max-width: 1200px; height: 90vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 class="modal-title">Add New Supplier</h3>
                <button class="btn btn-secondary btn-sm" id="closeSupplierModalBtn">Close</button>
            </div>
            <iframe id="supplierIframe" style="width: 100%; height: calc(100% - 60px); border: none; border-radius: 8px;"></iframe>
        </div>
    </div>

    <!-- Add Product Modal -->
    <div class="modal" id="addProductModal">
        <div class="modal-content" style="width: 90%; max-width: 1200px; height: 90vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 class="modal-title">Add New Product</h3>
                <button class="btn btn-secondary btn-sm" id="closeProductModalBtn">Close</button>
            </div>
            <iframe id="productIframe" style="width: 100%; height: calc(100% - 60px); border: none; border-radius: 8px;"></iframe>
        </div>
    </div>

    <!-- Payment Terms Modal -->
    <div class="modal" id="paymentTermsModal">
        <div class="modal-content" style="width:480px; max-width:95%; max-height:90vh; overflow-y:auto;">
            <h3 class="modal-title">Payment Terms</h3>

            <div style="display:flex; gap:8px; margin-bottom:16px;">
                <input type="hidden" id="ptEditId">
                <input type="text" id="ptTermName" placeholder="Term name (e.g. Net 30)" style="flex:1;">
                <input type="number" id="ptDays" placeholder="Days" min="0" style="width:80px;">
                <button type="button" class="btn btn-primary btn-sm" id="ptSaveBtn"><i class="fas fa-save"></i> Save</button>
                <button type="button" class="btn btn-secondary btn-sm" id="ptCancelEditBtn" style="display:none;"><i class="fas fa-times"></i></button>
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr>
                        <th style="padding:8px 6px; background:var(--surface-2); border-bottom:1px solid var(--border-default); text-align:left;">Term Name</th>
                        <th style="padding:8px 6px; background:var(--surface-2); border-bottom:1px solid var(--border-default); text-align:center;">Days</th>
                        <th style="padding:8px 6px; background:var(--surface-2); border-bottom:1px solid var(--border-default); text-align:center;">Actions</th>
                    </tr>
                </thead>
                <tbody id="ptTableBody">
                    <tr><td colspan="3" style="text-align:center; padding:16px; color:var(--subtext);">Loading...</td></tr>
                </tbody>
            </table>

            <div class="modal-actions">
                <button class="btn btn-secondary" id="closePaymentTermsBtn">Close</button>
            </div>
        </div>
    </div>

    <script src="../../../assets/js/purchase/purchase_order/order-add-uom.js"></script>
    <script src="../../../assets/js/purchase/purchase_order/order-add.js"></script>
</body>
</html>