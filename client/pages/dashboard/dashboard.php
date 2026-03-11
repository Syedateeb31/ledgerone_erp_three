<?php
require_once '../../../includes/dashboard.php';
require_once '../../../includes/connection.php';
require_once '../../../includes/permissions.php';
// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Get user_id and tenant_id from session
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    // Redirect to login if no user_id or tenant_id in session
    header('Location: ../auth/login.html');
    exit();
}

// Get role_id from user_roles table
$stmt = $pdo->prepare("SELECT role_id FROM user_roles WHERE user_id = ? AND tenant_id = ? AND is_active = 1 LIMIT 1");
$stmt->execute([$user_id, $tenant_id]);
$role_id = $stmt->fetchColumn();

// Check Dashboard permission
$hasPermission = hasPermission($pdo, $role_id, 'Dashboard', 'dashboard');

// Get date filters
$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;
$hasDateFilter = $dateFrom && $dateTo;
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LedgerOne ERP - Dashboard</title>
    <link rel="stylesheet" href="../../assets/css/dashboard/dashboard.css">
    <style>
        @media (max-width: 768px) {
            .dashboard-header {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .dashboard-actions {
                flex-direction: column;
                gap: 0.75rem;
                width: 100%;
            }

            .dashboard-actions input,
            .dashboard-actions button {
                width: 100%;
                padding: 0.75rem 1rem;
                border-radius: 0.5rem;
                font-size: 1rem;
            }

            .dashboard-actions input {
                border: 1px solid #d1d5db;
            }

            .kpi-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }

            .grid {
                grid-template-columns: 1fr !important;
                gap: 1rem;
            }

            .card.mobile-full {
                width: 100%;
            }

            .table-container {
                overflow-x: auto;
            }

            .table-container table {
                min-width: 300px;
                font-size: 0.875rem;
            }

            .chart-container {
                height: 200px;
                width: 100%;
            }

            .form-actions {
                flex-direction: column;
                gap: 0.75rem;
            }

            .form-actions button {
                width: 100%;
                padding: 0.875rem 1rem;
                font-size: 1rem;
                border-radius: 0.5rem;
            }

            .actions-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 480px) {
            .container {
                padding: 1rem;
            }

            .kpi-card {
                padding: 1rem;
            }

            .card {
                padding: 1rem;
            }

            .table-container table th,
            .table-container table td {
                padding: 0.5rem 0.25rem;
                font-size: 0.75rem;
            }

            .actions-grid {
                grid-template-columns: 1fr;
            }
        }

        .quick-actions {
            margin: 2rem 0;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--dark);
            margin-bottom: 1.5rem;
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 1.5rem 1rem;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 0.75rem;
            text-decoration: none;
            color: var(--dark);
            transition: all 0.3s ease;
            text-align: center;
        }

        .action-btn:hover {
            border-color: var(--accent);
            background: #f0f9ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .action-btn i {
            font-size: 1.75rem;
            color: var(--accent);
        }

        .action-btn span {
            font-size: 0.875rem;
            font-weight: 500;
        }
    </style>
</head>

<body>
    <?php if (!$hasPermission): ?>
        <div class="container"
            style="display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center;">
            <div>
                <h1 style="color: var(--danger); font-size: 3rem; margin-bottom: 1rem;">⚠️</h1>
                <h2 style="color: var(--dark); margin-bottom: 0.5rem;">Not Authorized</h2>
                <p style="color: #64748b;">You don't have permission to access the Dashboard.</p>
            </div>
        </div>
    <?php else: ?>
        <div class="container">
            <!-- Dashboard Header -->
            <div class="dashboard-header">
                <div>
                    <h1>LedgerOne Dashboard</h1>
                    <p>Welcome back! Here's your business overview.</p>
                </div>
                <div class="dashboard-actions">
                    <input type="date" id="dateFrom" value="<?= $dateFrom ?? date('Y-m-d') ?>" class="btn btn-secondary">
                    <input type="date" id="dateTo" value="<?= $dateTo ?? date('Y-m-d') ?>" class="btn btn-secondary">
                    <button class="btn btn-primary" onclick="filterDashboard()">Filter</button>
                    <button class="btn btn-secondary" onclick="clearFilters()">Clear</button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-units-sold">Loading...</div>
                    <div class="kpi-label">Products Sold <?= $hasDateFilter ? 'Selected Period' : 'All Time' ?></div>
                    <div class="kpi-change" id="kpi-units-change">
                        <span>Calculating...</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-revenue">Loading...</div>
                    <div class="kpi-label">Revenue <?= $hasDateFilter ? 'Selected Period' : 'All Time' ?></div>
                    <div class="kpi-change" id="kpi-revenue-change">
                        <span>Calculating...</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-purchases">Loading...</div>
                    <div class="kpi-label">Purchases <?= $hasDateFilter ? 'Selected Period' : 'All Time' ?></div>
                    <div class="kpi-change" id="kpi-purchases-change">
                        <span>Calculating...</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-stock-value">Loading...</div>
                    <div class="kpi-label">Stock Valuation</div>
                    <div class="kpi-change" id="kpi-stock-change">
                        <span>Calculating...</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-receivables">Loading...</div>
                    <div class="kpi-label">Accounts Receivable</div>
                    <div class="kpi-change">
                        <span>Total outstanding from customers</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="kpi-payables">Loading...</div>
                    <div class="kpi-label">Accounts Payable</div>
                    <div class="kpi-change">
                        <span>Total outstanding to suppliers</span>
                    </div>
                </div>
            </div>

            <!-- Quick Actions Section -->
            <div class="quick-actions">
                <h2 class="section-title">Quick Actions</h2>
                <div class="actions-grid">
                    <a href="../sale/pos_invoice/counter-invoice.php" class="action-btn">
                        <i class="fas fa-cash-register"></i>
                        <span>New POS Invoice</span>
                    </a>
                    <a href="../purchase/purchase_invoice/purchase-add.php" class="action-btn">
                        <i class="fas fa-shopping-cart"></i>
                        <span>New Purchase</span>
                    </a>
                    <a href="../vouchers/receive_voucher/receive-add.php" class="action-btn">
                        <i class="fas fa-money-check-alt"></i>
                        <span>New Receive Voucher</span>
                    </a>
                    <a href="../vouchers/expense_voucher/expense-add.php" class="action-btn">
                        <i class="fas fa-receipt"></i>
                        <span>Record Expenses</span>
                    </a>
                    <a href="../financial_reports/cash_flow/cash-flow.php" class="action-btn">
                        <i class="fas fa-exchange-alt"></i>
                        <span>Cash Flow Report</span>
                    </a>
                </div>
            </div>

            <!-- Charts and Data Section -->
            <div class="grid" style="grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <!-- Sales Chart -->
                <div class="card">
                    <h3 class="card-title">Sales Trend</h3>
                    <div id="fuelSalesChart"></div>
                </div>

                <!-- Receivables vs Payables Chart -->
                <div class="card">
                    <h3 class="card-title">Receivables vs Payables</h3>
                    <div id="accountsChart"></div>
                </div>

                <!-- Revenue vs Expenses Chart -->
                <div class="card">
                    <h3 class="card-title">Revenue vs Expenses</h3>
                    <div id="revenueExpenseChart"></div>
                </div>

                <!-- Cash Flow Chart -->
                <div class="card">
                    <h3 class="card-title">Cash Flow (Last 7 Days)</h3>
                    <div id="cashFlowChart"></div>
                </div>

                <!-- Product-wise Sales -->
                <div class="card">
                    <h3 class="card-title">Top Products</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                if ($hasDateFilter) {
                                    $stmt = $pdo->prepare("
                                    SELECT p.name, 
                                           COALESCE(SUM(sii.quantity), 0) as total_qty,
                                           COALESCE(SUM(sii.net_amount), 0) as total_revenue
                                    FROM products p
                                    LEFT JOIN sale_invoice_items sii ON p.id = sii.product_id
                                    LEFT JOIN sale_invoice si ON sii.sale_invoice_id = si.id AND si.tenant_id = ? AND DATE(si.sale_date) BETWEEN ? AND ?
                                    WHERE p.tenant_id = ? AND p.parent_product_id IS NULL
                                    GROUP BY p.id, p.name
                                    HAVING total_qty > 0
                                    ORDER BY total_revenue DESC
                                    LIMIT 5
                                ");
                                    $stmt->execute([$tenant_id, $dateFrom, $dateTo, $tenant_id]);
                                } else {
                                    $stmt = $pdo->prepare("
                                    SELECT p.name, 
                                           COALESCE(SUM(sii.quantity), 0) as total_qty,
                                           COALESCE(SUM(sii.net_amount), 0) as total_revenue
                                    FROM products p
                                    LEFT JOIN sale_invoice_items sii ON p.id = sii.product_id
                                    LEFT JOIN sale_invoice si ON sii.sale_invoice_id = si.id AND si.tenant_id = ?
                                    WHERE p.tenant_id = ? AND p.parent_product_id IS NULL
                                    GROUP BY p.id, p.name
                                    HAVING total_qty > 0
                                    ORDER BY total_revenue DESC
                                    LIMIT 5
                                ");
                                    $stmt->execute([$tenant_id, $tenant_id]);
                                }
                                $productSales = $stmt->fetchAll(PDO::FETCH_ASSOC);

                                foreach ($productSales as $product):
                                    ?>
                                    <tr>
                                        <td><?= htmlspecialchars($product['name']) ?></td>
                                        <td><?= number_format($product['total_qty'], 0) ?></td>
                                        <td>Rs <?= number_format($product['total_revenue'], 0) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Top Customers -->
                <div class="card">
                    <h3 class="card-title">Top Customers</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Sales</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $sql = "SELECT c.customer_name, COUNT(si.id) as order_count, COALESCE(SUM(si.net_amount), 0) as total_sales
                                    FROM customers c
                                    LEFT JOIN sale_invoice si ON c.id = si.customer_id AND si.tenant_id = ?";
                                $params = [$tenant_id];
                                if ($hasDateFilter) {
                                    $sql .= " AND DATE(si.sale_date) BETWEEN ? AND ?";
                                    $params[] = $dateFrom;
                                    $params[] = $dateTo;
                                }
                                $sql .= " WHERE c.tenant_id = ? GROUP BY c.id, c.customer_name HAVING total_sales > 0 ORDER BY total_sales DESC LIMIT 5";
                                $params[] = $tenant_id;
                                $stmt = $pdo->prepare($sql);
                                $stmt->execute($params);
                                $topCustomers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                                foreach ($topCustomers as $customer): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($customer['customer_name']) ?></td>
                                        <td><?= $customer['order_count'] ?></td>
                                        <td>Rs <?= number_format($customer['total_sales'], 0) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Branch-wise Sales -->
                <div class="card">
                    <h3 class="card-title">Branch Sales</h3>
                    <div id="branchSalesChart"></div>
                </div>

                <!-- Territory-wise Sales -->
                <div class="card">
                    <h3 class="card-title">Territory Sales</h3>
                    <div id="territorySalesChart"></div>
                </div>

                <!-- Product Inventory -->
                <div class="card">
                    <h3 class="card-title">Inventory Status</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $stmt = $pdo->prepare("
                                SELECT p.name, 
                                       COALESCE(SUM(sl.qty_in - sl.qty_out), 0) as current_stock,
                                       COALESCE(p.min_stock_level, 0) as min_stock
                                FROM products p
                                LEFT JOIN stock_ledger sl ON p.id = sl.product_id
                                WHERE p.tenant_id = ? AND p.parent_product_id IS NULL
                                GROUP BY p.id, p.name, p.min_stock_level
                                ORDER BY current_stock ASC
                                LIMIT 5
                            ");
                                $stmt->execute([$tenant_id]);
                                $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);

                                foreach ($inventory as $item):
                                    $stock = (float) $item['current_stock'];
                                    $minStock = (float) $item['min_stock'];

                                    if ($stock <= 0) {
                                        $status = 'Out';
                                        $color = 'var(--danger)';
                                    } elseif ($minStock > 0 && $stock <= $minStock) {
                                        $status = 'Low';
                                        $color = 'var(--warning)';
                                    } else {
                                        $status = 'OK';
                                        $color = 'var(--success)';
                                    }
                                    ?>
                                    <tr>
                                        <td><?= htmlspecialchars($item['name']) ?></td>
                                        <td><?= number_format($stock, 0) ?></td>
                                        <td style="color: <?= $color ?>;"><?= $status ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Mini Balance Sheet -->
                <div class="card">
                    <h3 class="card-title">Balance Sheet</h3>
                    <div class="table-container">
                        <table id="balanceSheetTable">
                            <thead>
                                <tr>
                                    <th>Assets</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody id="assetsBody">
                                <tr>
                                    <td colspan="2" style="text-align: center; color: #64748b;">Loading...</td>
                                </tr>
                            </tbody>
                            <thead>
                                <tr>
                                    <th>Liabilities & Equity</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody id="liabilitiesBody">
                                <tr>
                                    <td colspan="2" style="text-align: center; color: #64748b;">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <?php if ($hasPermission): ?>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <script>
            const dateFrom = '<?= $dateFrom ?? '' ?>';
            const dateTo = '<?= $dateTo ?? '' ?>';
            const hasDateFilter = <?= $hasDateFilter ? 'true' : 'false' ?>;

            // Load KPI data from APIs
            async function loadKPIs() {
                try {
                    // Stock Valuation from stock-position API
                    const stockRes = await fetch('../../../server/api/inventory/stock_position/stock-position.php?action=position');
                    const stockData = await stockRes.json();
                    if (stockData.success && Array.isArray(stockData.data)) {
                        const totalValue = stockData.data.reduce((sum, item) => sum + parseFloat(item.stock_value || 0), 0);
                        document.getElementById('kpi-stock-value').textContent = 'Rs ' + totalValue.toLocaleString('en-PK', {maximumFractionDigits: 0});
                    }

                    // Units Sold and Revenue from sale-reports API
                    let saleUrl = '../../../server/api/sale/sales_report/sales-report.php';
                    if (hasDateFilter) {
                        saleUrl += `?date_from=${dateFrom}&date_to=${dateTo}`;
                    }
                    const saleRes = await fetch(saleUrl);
                    const saleData = await saleRes.json();
                    if (saleData.success && saleData.data && saleData.data.product_sales) {
                        const totalUnits = saleData.data.product_sales.reduce((sum, item) => sum + parseFloat(item.quantity_sold || 0), 0);
                        const totalRevenue = saleData.data.product_sales.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
                        document.getElementById('kpi-units-sold').textContent = totalUnits.toLocaleString('en-PK', {maximumFractionDigits: 0}) + ' Units';
                        document.getElementById('kpi-revenue').textContent = 'Rs ' + totalRevenue.toLocaleString('en-PK', {maximumFractionDigits: 0});
                    }

                    // Purchases from purchase-reports API
                    let purchaseUrl = '../../../server/api/purchase/purchase_reports/purchase-reports.php?type=invoice';
                    if (hasDateFilter) {
                        purchaseUrl += `&date_range=${dateFrom}_${dateTo}`;
                    }
                    const purchaseRes = await fetch(purchaseUrl);
                    const purchaseData = await purchaseRes.json();
                    if (purchaseData.success && purchaseData.summary && purchaseData.summary.invoice) {
                        const totalPurchases = parseFloat(purchaseData.summary.invoice.total_invoice_value || 0);
                        document.getElementById('kpi-purchases').textContent = 'Rs ' + totalPurchases.toLocaleString('en-PK', {maximumFractionDigits: 0});
                    }

                    // Accounts Receivable from customer-ledger API
                    const customerRes = await fetch('../../../server/api/financial_reports/customer_ledger/customer-ledger.php?type=summary');
                    const customerData = await customerRes.json();
                    if (customerData.success && Array.isArray(customerData.data)) {
                        const totalReceivables = customerData.data.reduce((sum, item) => sum + parseFloat(item.closing_balance || 0), 0);
                        document.getElementById('kpi-receivables').textContent = 'Rs ' + totalReceivables.toLocaleString('en-PK', {maximumFractionDigits: 0});
                    }

                    // Accounts Payable from supplier-ledger API
                    const supplierRes = await fetch('../../../server/api/financial_reports/supplier_ledger/supplier-ledger.php?type=summary');
                    const supplierData = await supplierRes.json();
                    if (supplierData.success && Array.isArray(supplierData.data)) {
                        const totalPayables = supplierData.data.reduce((sum, item) => sum + parseFloat(item.closing_balance || 0), 0);
                        document.getElementById('kpi-payables').textContent = 'Rs ' + Math.abs(totalPayables).toLocaleString('en-PK', {maximumFractionDigits: 0});
                    }
                } catch (error) {
                    console.error('Error loading KPIs:', error);
                }
            }

            // Load KPIs on page load
            loadKPIs();

            // Sales Trend Chart
            <?php
            $chartData = [];
            $chartLabels = [];
            if ($hasDateFilter) {
                $startDate = new DateTime($dateFrom);
                $endDate = new DateTime($dateTo);
                while ($startDate <= $endDate) {
                    $date = $startDate->format('Y-m-d');
                    $chartLabels[] = $startDate->format('M j');
                    $stmt = $pdo->prepare("SELECT COALESCE(SUM(sii.quantity), 0) FROM sale_invoice si JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id WHERE si.tenant_id = ? AND DATE(si.sale_date) = ? AND sii.parent_row_id IS NULL");
                    $stmt->execute([$tenant_id, $date]);
                    $chartData[] = (float) $stmt->fetchColumn();
                    $startDate->add(new DateInterval('P1D'));
                }
            } else {
                for ($i = 6; $i >= 0; $i--) {
                    $date = date('Y-m-d', strtotime("-$i days"));
                    $chartLabels[] = date('M j', strtotime("-$i days"));
                    $stmt = $pdo->prepare("SELECT COALESCE(SUM(sii.quantity), 0) FROM sale_invoice si JOIN sale_invoice_items sii ON si.id = sii.sale_invoice_id WHERE si.tenant_id = ? AND DATE(si.sale_date) = ? AND sii.parent_row_id IS NULL");
                    $stmt->execute([$tenant_id, $date]);
                    $chartData[] = (float) $stmt->fetchColumn();
                }
            }
            ?>
            new ApexCharts(document.querySelector('#fuelSalesChart'), {
                chart: { type: 'area', height: 200, toolbar: { show: false } },
                series: [{ name: 'Sales', data: <?= json_encode($chartData) ?> }],
                xaxis: { categories: <?= json_encode($chartLabels) ?> },
                colors: ['#3b82f6'],
                stroke: { curve: 'smooth', width: 2 },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } }
            }).render();

            // Receivables vs Payables
            <?php
            $stmt = $pdo->prepare("SELECT id, opening_debit_amount, opening_credit_amount FROM customers WHERE tenant_id = ? AND status = 'ACTIVE'");
            $stmt->execute([$tenant_id]);
            $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $accountsReceivable = 0;
            foreach ($customers as $customer) {
                $opening = $customer['opening_debit_amount'] - $customer['opening_credit_amount'];
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount), 0) FROM sale_invoice WHERE tenant_id = ? AND customer_id = ?");
                $stmt->execute([$tenant_id, $customer['id']]);
                $invoices = $stmt->fetchColumn();
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM receive_voucher WHERE tenant_id = ? AND customer_id = ?");
                $stmt->execute([$tenant_id, $customer['id']]);
                $payments = $stmt->fetchColumn();
                $accountsReceivable += $opening + $invoices - $payments;
            }

            $stmt = $pdo->prepare("SELECT id, opening_debit_amount, opening_credit_amount FROM suppliers WHERE tenant_id = ? AND status = 'ACTIVE'");
            $stmt->execute([$tenant_id]);
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $accountsPayable = 0;
            foreach ($suppliers as $supplier) {
                $opening = $supplier['opening_debit_amount'] - $supplier['opening_credit_amount'];
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount), 0) FROM purchase_invoice WHERE tenant_id = ? AND supplier_id = ?");
                $stmt->execute([$tenant_id, $supplier['id']]);
                $invoices = $stmt->fetchColumn();
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payment_voucher WHERE tenant_id = ? AND supplier_id = ?");
                $stmt->execute([$tenant_id, $supplier['id']]);
                $payments = $stmt->fetchColumn();
                $accountsPayable += $opening - $invoices + $payments;
            }
            ?>
            new ApexCharts(document.querySelector('#accountsChart'), {
                chart: { type: 'donut', height: 200 },
                series: [<?= $accountsReceivable ?>, <?= abs($accountsPayable) ?>],
                labels: ['Receivable', 'Payable'],
                colors: ['#22c55e', '#ef4444'],
                legend: { position: 'bottom' }
            }).render();

            // Revenue vs Expenses
            <?php
            $revenueData = [];
            $expenseData = [];
            $revenueExpenseLabels = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $revenueExpenseLabels[] = date('M j', strtotime("-$i days"));
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_bill), 0) FROM sale_invoice WHERE tenant_id = ? AND DATE(sale_date) = ?");
                $stmt->execute([$tenant_id, $date]);
                $revenueData[] = (float) $stmt->fetchColumn();
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_amount), 0) FROM purchase_invoice WHERE tenant_id = ? AND DATE(purchase_date) = ?");
                $stmt->execute([$tenant_id, $date]);
                $expenseData[] = (float) $stmt->fetchColumn();
            }
            ?>
            new ApexCharts(document.querySelector('#revenueExpenseChart'), {
                chart: { type: 'bar', height: 200, toolbar: { show: false } },
                series: [{ name: 'Revenue', data: <?= json_encode($revenueData) ?> }, { name: 'Expenses', data: <?= json_encode($expenseData) ?> }],
                xaxis: { categories: <?= json_encode($revenueExpenseLabels) ?> },
                colors: ['#22c55e', '#ef4444'],
                dataLabels: { enabled: false },
                plotOptions: { bar: { columnWidth: '60%' } }
            }).render();

            // Cash Flow
            <?php
            $cashInData = [];
            $cashOutData = [];
            $cashFlowLabels = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $cashFlowLabels[] = date('M j', strtotime("-$i days"));
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM receive_voucher WHERE tenant_id = ? AND DATE(voucher_date) = ?");
                $stmt->execute([$tenant_id, $date]);
                $cashInData[] = (float) $stmt->fetchColumn();
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payment_voucher WHERE tenant_id = ? AND DATE(voucher_date) = ?");
                $stmt->execute([$tenant_id, $date]);
                $cashOutData[] = (float) $stmt->fetchColumn();
            }
            ?>
            new ApexCharts(document.querySelector('#cashFlowChart'), {
                chart: { type: 'line', height: 200, toolbar: { show: false } },
                series: [{ name: 'Cash In', data: <?= json_encode($cashInData) ?> }, { name: 'Cash Out', data: <?= json_encode($cashOutData) ?> }],
                xaxis: { categories: <?= json_encode($cashFlowLabels) ?> },
                colors: ['#22c55e', '#ef4444'],
                stroke: { curve: 'smooth', width: 2 }
            }).render();

            function filterDashboard() {
                const dateFrom = document.getElementById('dateFrom').value;
                const dateTo = document.getElementById('dateTo').value;

                if (dateFrom && dateTo) {
                    window.location.href = `dashboard.php?date_from=${dateFrom}&date_to=${dateTo}`;
                }
            }

            function clearFilters() {
                window.location.href = 'dashboard.php';
            }

            // Load Balance Sheet
            fetch('../../../server/api/financial_reports/balance_sheet/balance-sheet.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const bs = data.data;
                        let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

                        let assetsHTML = '';
                        if (bs[1]) {
                            Object.values(bs[1]).forEach(sub => {
                                sub.accounts.forEach(acc => {
                                    assetsHTML += `<tr><td>${acc.name}</td><td>Rs ${acc.balance.toLocaleString()}</td></tr>`;
                                    totalAssets += acc.balance;
                                });
                            });
                        }
                        assetsHTML += `<tr style="font-weight: 600; background: #f0f9ff;"><td>Total Assets</td><td>Rs ${totalAssets.toLocaleString()}</td></tr>`;

                        let liabilitiesHTML = '';
                        if (bs[2]) {
                            Object.values(bs[2]).forEach(sub => {
                                sub.accounts.forEach(acc => {
                                    liabilitiesHTML += `<tr><td>${acc.name}</td><td>Rs ${acc.balance.toLocaleString()}</td></tr>`;
                                    totalLiabilities += acc.balance;
                                });
                            });
                        }
                        liabilitiesHTML += `<tr style="font-weight: 600; background: #fef2f2;"><td>Total Liabilities</td><td>Rs ${totalLiabilities.toLocaleString()}</td></tr>`;

                        if (bs[3]) {
                            Object.values(bs[3]).forEach(sub => {
                                sub.accounts.forEach(acc => {
                                    liabilitiesHTML += `<tr><td>${acc.name}</td><td>Rs ${acc.balance.toLocaleString()}</td></tr>`;
                                    totalEquity += acc.balance;
                                });
                            });
                        }
                        liabilitiesHTML += `<tr style="font-weight: 600; background: #f0fdf4;"><td>Total Equity</td><td>Rs ${totalEquity.toLocaleString()}</td></tr>`;

                        document.getElementById('assetsBody').innerHTML = assetsHTML;
                        document.getElementById('liabilitiesBody').innerHTML = liabilitiesHTML;
                    }
                })
                .catch(error => console.error('Balance sheet error:', error));

            // Branch-wise Sales Chart
            <?php
            $stmt = $pdo->prepare("
            SELECT 
                COALESCE(pb.branch_name, b.branch_name) as branch_name,
                COALESCE(SUM(si.net_amount), 0) as total_sales 
            FROM branches b 
            LEFT JOIN branches pb ON b.parent_branch_id = pb.id
            LEFT JOIN sale_invoice si ON b.id = si.branch_id AND si.tenant_id = ?
            WHERE b.tenant_id = ?
            GROUP BY COALESCE(b.parent_branch_id, b.id), COALESCE(pb.branch_name, b.branch_name)
            ORDER BY total_sales DESC 
            LIMIT 10
        ");
            $stmt->execute([$tenant_id, $tenant_id]);
            $branchSales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $branchLabels = array_column($branchSales, 'branch_name');
            $branchData = array_column($branchSales, 'total_sales');
            ?>
            new ApexCharts(document.querySelector('#branchSalesChart'), {
                chart: { type: 'bar', height: 200, toolbar: { show: false } },
                series: [{ name: 'Sales', data: <?= json_encode($branchData) ?> }],
                xaxis: { categories: <?= json_encode($branchLabels) ?> },
                colors: ['#3b82f6'],
                plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
                dataLabels: { enabled: false }
            }).render();

            // Territory-wise Sales Chart
            <?php
            $stmt = $pdo->prepare("
            SELECT 
                COALESCE(r.region_name, 'Unknown') as territory,
                COALESCE(SUM(si.net_amount), 0) as total_sales 
            FROM sale_invoice si
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE si.tenant_id = ?
            GROUP BY r.id, r.region_name
            ORDER BY total_sales DESC 
            LIMIT 10
        ");
            $stmt->execute([$tenant_id]);
            $territorySales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $territoryLabels = array_column($territorySales, 'territory');
            $territoryData = array_column($territorySales, 'total_sales');
            ?>
            new ApexCharts(document.querySelector('#territorySalesChart'), {
                chart: { type: 'bar', height: 200, toolbar: { show: false } },
                series: [{ name: 'Sales', data: <?= json_encode($territoryData) ?> }],
                xaxis: { categories: <?= json_encode($territoryLabels) ?> },
                colors: ['#22c55e'],
                plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
                dataLabels: { enabled: false }
            }).render();
        </script>
        <script src="../../assets/js/dashboard/dashboard-main.js"></script>
    <?php endif; ?>
</body>

</html>