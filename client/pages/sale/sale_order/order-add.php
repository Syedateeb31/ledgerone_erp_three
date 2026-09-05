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
    <title>LedgerOne ERP - Soda Book Seller</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/sale/sale_order/order-add.css">
</head>
<body class="light-theme">
    <div class="container">
        <div class="header">
            <h1 class="page-title">Soda Book Seller</h1>
        </div>

        <form id="invoiceForm">

            
            <div class="card">
                <h2 class="card-title">Order Details</h2>
                <div class="form-grid">
                    <div class="form-group" id="companyGroup">
                        <label for="company" class="required">Company</label>
                        <select id="company" required tabindex="-1">
                            <option value="">Select Company</option>
                        </select>
                    </div>
                    <div class="form-group" id="billNoGroup">
                        <label for="billNo" class="required">Bill No</label>
                        <input type="text" id="billNo" value="Automatically generated" readonly required tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="saleDate" class="required">Sale Date</label>
                        <input type="date" id="saleDate" required tabindex="-1">
                    </div>
                    <div class="form-group" id="previousBalanceGroup">
                        <label for="previousBalance">Customer's Previous Balance</label>
                        <input type="text" id="previousBalance" value="0.00" readonly tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="customerCode" class="required">Customer Code</label>
                        <div style="display: flex; gap: 8px; align-items: flex-start;">
                            <div class="searchable-dropdown" style="flex: 1;">
                                <input type="text" class="search-input" placeholder="Search customer code..." id="customerCodeSearch" autocomplete="off">
                                <div class="dropdown-options" id="customerCodeOptions">
                                    <!-- Options loaded dynamically -->
                                </div>
                                <input type="hidden" id="customerCode" required>
                            </div>
                            <button type="button" class="btn btn-secondary" style="height: 40px; padding: 0 12px;" onclick="openOverlay('../../customer_supplier/customers/customer-add.php')" title="Add New Customer">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="error-message" id="customerCodeError">Please select a customer code</div>
                    </div>
                    <div class="form-group" id="customerAddressGroup" style="display:none;">
                        <label>Customer Address</label>
                        <div id="customerAddress" style="padding: 10px; background: var(--surface-2); border-radius: var(--radius); min-height: 40px; color: var(--subtext);">Select a customer to view address</div>
                    </div>

                    <div class="form-group" id="branchGroup" style="display:none;">
                        <label for="branch" class="required">Branch</label>
                        <div class="searchable-dropdown">
                            <input type="text" class="search-input" placeholder="Search branch..." id="branchSearch" autocomplete="off">
                            <div class="dropdown-options" id="branchOptions">
                                <!-- Options loaded dynamically -->
                            </div>
                            <input type="hidden" id="branch" required>
                        </div>
                        <div class="error-message" id="branchError">Please select a branch</div>
                    </div>
                    <div class="form-group" id="currencyGroup" style="display:none;">
                        <label for="currency" class="required">Currency</label>
                        <select id="currency" required tabindex="-1">
                            <option value="">Select Currency</option>
                            <!-- Options loaded dynamically -->
                        </select>
                        <div class="error-message" id="currencyError">Please select a currency</div>
                    </div>

                    <div class="form-group">
                        <label for="paymentTerm">Payment Cond.</label>
                        <div style="display:flex; gap:8px;">
                            <select id="paymentTerm" tabindex="-1">
                                <option value="">Select Payment Term</option>
                            </select>
                            <button type="button" class="btn btn-secondary btn-sm" id="addPaymentTermBtn" title="Manage Payment Terms" style="flex-shrink:0;" tabindex="-1">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group" id="biltyNoGroup">
                        <label for="biltyNo">Bilty No</label>
                        <input type="text" id="biltyNo" placeholder="Enter bilty number" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="rpoNo">RPO #</label>
                        <input type="text" id="rpoNo" placeholder="Enter RPO number" tabindex="-1">
                    </div>
                    <div class="form-group" id="transportNameGroup">
                        <label for="transportName">Transport Name</label>
                        <input type="text" id="transportName" placeholder="Enter transport name" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="broker">Broker</label>
                        <input type="text" id="broker" placeholder="Enter broker name" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="deliveredDate">Delivered Date</label>
                        <input type="date" id="deliveredDate" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="millName">Mill Name</label>
                        <input type="text" id="millName" placeholder="Enter mill name" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="truckNo">Truck No</label>
                        <input type="text" id="truckNo" placeholder="Enter truck number" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="goods">Goods</label>
                        <input type="text" id="goods" placeholder="Enter goods description" tabindex="-1">
                    </div>
                    <div class="form-group">
                        <label for="mobileNo">Mobile No</label>
                        <input type="text" id="mobileNo" placeholder="Enter mobile number" tabindex="-1">
                    </div>
                    <div class="form-group full-width" id="remarksGroup">
                        <label for="remarks">Remarks</label>
                        <textarea id="remarks" placeholder="Enter any additional remarks" tabindex="-1"></textarea>
                    </div>

                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Items</h2>
                <div id="priceHistoryContainer" style="display: none; margin-bottom: 16px; padding: 12px; background: var(--surface-2); border-radius: var(--radius); border-left: 4px solid var(--primary);">
                    <strong style="color: var(--heading);">Last 3 Sale Prices:</strong>
                    <div id="priceHistoryContent" style="margin-top: 8px; font-size: 13px; color: var(--body);"></div>
                </div>
                <div class="actions" style="margin-bottom: 16px; justify-content: flex-start;">
                    <button type="button" class="btn btn-secondary" onclick="openOverlay('../../inventory/products/product-add.php')" tabindex="-1">
                        <i class="fas fa-plus"></i> Add New Product
                    </button>
                </div>
                <div class="table-container">
                    <table id="itemsTable">
                        <thead>
                            <tr>
                                <th width="3%">S#</th>
                                <th width="15%">Product Code / Name</th>
                                <th width="8%"><span id="salePriceLabel">Sale Price</span></th>
                                <th width="8%" class="gross-header"><span id="grossAmountLabel">Gross Amount</span></th>
                                <th width="5%" class="disc-percent-header">Disc %</th>
                                <th width="8%" class="disc-amount-header"><span id="discountAmountLabel">Disc Amt</span></th>
                                <th width="8%"><span id="netAmountLabel">Net Amount</span></th>
                                <th width="3%">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Rows will be added dynamically -->
                        </tbody>
                        <tfoot>
                            <tr class="totals-row">
                                <th colspan="2">Totals</th>
                                <th id="totalSalePrice">0.00</th>
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
                    <div class="summary-item" style="display:none;">
                        <span class="summary-label">Discount %</span>
                        <input type="number" id="totalDiscountPercent" class="table-input" min="0" max="100" step="0.01" value="0">
                    </div>
                    <div class="summary-item" style="display:none;">
                        <span class="summary-label" id="totalDiscountAmountLabel">Discount Amount</span>
                        <input type="number" id="totalDiscountAmount" class="table-input" min="0" step="0.01" value="0">
                    </div>
                    <div class="summary-item" style="display:none;">
                        <span class="summary-label" id="shippingFeesLabel">Shipping Fees</span>
                        <input type="number" id="shippingFees" class="table-input" min="0" step="0.01" value="0">
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Freight</span>
                        <input type="number" id="freight" class="table-input" min="0" step="0.01" value="0">
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
                <button type="button" class="btn btn-secondary" id="saveDraftBtn">
                    <i class="fas fa-file"></i> Save as Draft
                </button>
                <button type="button" class="btn btn-secondary" id="salesReturnBtn" tabindex="-1">
                    <i class="fas fa-undo"></i> Record Sales Return
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

    <!-- Print Options Modal -->
    <div class="modal" id="printOptionsModal">
        <div class="modal-content">
            <h3 class="modal-title">Select Print Format</h3>
            <p>Choose how you want to print the order:</p>
            <div class="modal-actions" style="flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" id="printFullBtn" style="width: 100%;">
                    <i class="fas fa-file-invoice"></i> Print Full Order
                </button>
                <button class="btn btn-secondary" id="printThermalBtn" style="width: 100%;">
                    <i class="fas fa-receipt"></i> Print Thermal Order
                </button>
                <label style="display: flex; align-items: center; gap: 8px; margin-top: 10px; cursor: pointer;">
                    <input type="checkbox" id="rememberPrintChoice" style="width: auto;">
                    <span>Remember my choice</span>
                </label>
            </div>
        </div>
    </div>



    <!-- Overlay Modal -->
    <div class="modal" id="overlayModal" style="display: none;">
        <div class="modal-content" style="width: 95%; max-width: 1200px; height: 90vh; padding: 0; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-default);">
                <h3 class="modal-title" style="margin: 0;">Add New</h3>
                <button class="btn btn-secondary btn-sm" onclick="closeOverlay()" style="padding: 8px 12px;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
            <iframe id="overlayIframe" style="width: 100%; height: calc(100% - 60px); border: none;"></iframe>
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

    <script src="../../../assets/js/sale/sale_order/order-add-uom.js"></script>
    <script src="../../../assets/js/sale/sale_order/order-add.js"></script>
</body>
</html>