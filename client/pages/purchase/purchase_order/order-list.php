<?php
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LedgerOne ERP - Soda Book Buyer</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/purchase/purchase_order/order-list.css">
</head>
<body class="light-theme">
    <div class="container">
        <div class="header">
            <h1 class="page-title">Soda Book Buyer</h1>
        </div>

        <div class="card">
            <h2 class="card-title">Filters & Search</h2>
            <div class="filters">
                <div class="form-group">
                    <label for="dateFrom">Date From</label>
                    <input type="date" id="dateFrom">
                </div>
                <div class="form-group">
                    <label for="dateTo">Date To</label>
                    <input type="date" id="dateTo">
                </div>
                <div class="form-group">
                    <label for="companyFilter">Company</label>
                    <select id="companyFilter">
                        <option value="">All Companies</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="supplierFilterSearch">Supplier</label>
                    <div class="searchable-dropdown">
                        <input type="text" class="search-input" autocomplete="off" placeholder="All Suppliers" id="supplierFilterSearch">
                        <div class="dropdown-options" id="supplierFilterOptions">
                            <!-- Options loaded dynamically -->
                        </div>
                        <input type="hidden" id="supplierFilter">
                    </div>
                </div>
                <div class="form-group">
                    <label for="statusFilter">Status</label>
                    <select id="statusFilter">
                        <option value="pending" selected>Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="partially fulfilled">Partially Fulfilled</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="all">All Status</option>
                    </select>
                </div>
            </div>
            
            <div class="actions">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchInput" placeholder="Search by invoice number, supplier...">
                </div>
                <button class="btn btn-secondary" id="applyFilterBtn" type="button">
                    <i class="fas fa-filter"></i> Filter
                </button>
                <button class="btn btn-primary" id="newInvoiceBtn">
                    <i class="fas fa-plus"></i> New Order
                </button>
            </div>
            
            <div class="table-container">
                <table id="invoicesTable">
                    <thead>
                        <tr>
                            <th width="10%">Order No</th>
                            <th width="10%">Date</th>
                            <th width="13%">Last Date</th>
                            <th width="20%">Supplier</th>
                            <th width="6%">Items</th>
                            <th width="13%">Total Amount</th>
                            <th width="10%">Status</th>
                            <th width="18%">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Data will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <div class="pagination">
                <div class="pagination-info" id="paginationInfo">
                    Showing 0 to 0 of 0 entries
                </div>
                <div class="pagination-controls" id="paginationControls">
                    <!-- Dynamic pagination buttons will be generated here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal" id="deleteModal">
        <div class="modal-content">
            <h3 class="modal-title">Confirm Delete</h3>
            <p>Are you sure you want to delete this purchase order? This action cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelDeleteBtn">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
        </div>
    </div>

    <!-- Order Fulfillment Modal -->
    <div class="modal" id="fulfillmentModal">
        <div class="modal-content" style="width: 800px; max-width: 95%;">
            <h3 class="modal-title">Order Fulfillment Status</h3>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="padding: 8px; border-bottom: 1px solid var(--border-default);">Product</th>
                            <th style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">Ordered</th>
                            <th style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">Served</th>
                            <th style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">Remaining</th>
                            <th style="padding: 8px; border-bottom: 1px solid var(--border-default); text-align: right;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="fulfillmentTableBody">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 20px;">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="closeFulfillmentBtn">Close</button>
            </div>
        </div>
    </div>

    <script src="../../../assets/js/purchase/purchase_order/order-list.js?v=<?php echo @filemtime(__DIR__ . '/../../../assets/js/purchase/purchase_order/order-list.js') ?: time(); ?>"></script>
</body>
</html>