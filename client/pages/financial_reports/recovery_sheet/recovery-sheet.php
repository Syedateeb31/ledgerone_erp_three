<?php
require_once '../../../../includes/dashboard.php';
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

// Get base currency symbol
require_once '../../../../includes/connection.php';
$stmt = $pdo->prepare("
    SELECT c.symbol 
    FROM tenant_currencies tc 
    JOIN ledgerone_public.currencies c ON tc.currency_id = c.id 
    WHERE tc.tenant_id = ? AND tc.is_base_currency = 1
");
$stmt->execute([$_SESSION['tenant_id']]);
$currency = $stmt->fetch();
$currency_symbol = $currency['symbol'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Recovery Sheet Report</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="../../../assets/css/financial_reports/recovery_sheet/recovery-sheet.css">
</head>
<body>
    <div class="app-container">
        <!-- Main Content -->
        <div class="main-content">
            <!-- Topbar -->
            <div class="topbar">
                <div class="page-title">Recovery Management</div>
                <div class="actions">
                    <button class="btn btn-secondary">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <button class="btn btn-primary">
                        <i class="fas fa-print"></i> Print Report
                    </button>
                </div>
            </div>

            <!-- Report Container -->
            <div class="report-container">
                <div class="report-header">
                    <div class="report-title">Recovery Sheet Report</div>
                    <div class="report-filters">
                        <div class="filter-item">
                            <label class="filter-label">Company</label>
                            <select class="filter-input" id="companyFilter">
                                <option value="">All Companies</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">Date Range</label>
                            <input type="date" class="filter-input" value="2023-10-01">
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">To</label>
                            <input type="date" class="filter-input" value="2023-10-31">
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">Recovery Agent</label>
                            <select class="filter-input" id="recoveryOfficer">
                                <option value="all">All Agents</option>
                                <?php
                                $stmt = $pdo->prepare("SELECT id, full_name FROM employees WHERE tenant_id = ? AND is_active = 1 ORDER BY full_name");
                                $stmt->execute([$_SESSION['tenant_id']]);
                                $employees = $stmt->fetchAll();
                                foreach ($employees as $employee) {
                                    echo '<option value="' . $employee['id'] . '">' . htmlspecialchars($employee['full_name']) . '</option>';
                                }
                                ?>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">Country</label>
                            <select class="filter-input" id="countryFilter">
                                <option value="all">All Countries</option>
                                <?php
                                $stmt = $pdo->prepare("SELECT id, country_name FROM countries WHERE tenant_id = ? ORDER BY country_name");
                                $stmt->execute([$_SESSION['tenant_id']]);
                                $countries = $stmt->fetchAll();
                                foreach ($countries as $country) {
                                    echo '<option value="' . $country['id'] . '">' . htmlspecialchars($country['country_name']) . '</option>';
                                }
                                ?>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">Region</label>
                            <select class="filter-input" id="regionFilter" disabled>
                                <option value="all">All Regions</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">City</label>
                            <select class="filter-input" id="cityFilter" disabled>
                                <option value="all">All Cities</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">City Zone</label>
                            <select class="filter-input" id="cityZoneFilter" disabled>
                                <option value="all">All Zones</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label class="filter-label">Area</label>
                            <select class="filter-input" id="areaFilter" disabled>
                                <option value="all">All Areas</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>S#</th>
                                <th>Bill No</th>
                                <th>Customer Name</th>
                                <th>Address</th>
                                <th>Primary Phone No</th>
                                <th>Balance</th>
                                <th>Received Amount</th>
                                <th>Sales Return</th>
                                <th>Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Row 1 -->
                            <tr>
                                <td>1</td>
                                <td>INV-2023-00123</td>
                                <td>ABC Manufacturing Co.</td>
                                <td>123 Industrial Ave, Cityville</td>
                                <td>(555) 123-4567</td>
                <td class="balance-positive"><?php echo $currency_symbol; ?>2,500.00</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 2 -->
                            <tr>
                                <td>2</td>
                                <td>INV-2023-00145</td>
                                <td>XYZ Retail Solutions</td>
                                <td>456 Commerce St, Townsville</td>
                                <td>(555) 987-6543</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>1,850.50</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 3 -->
                            <tr>
                                <td>3</td>
                                <td>INV-2023-00167</td>
                                <td>Global Logistics Inc.</td>
                                <td>789 Harbor Rd, Port City</td>
                                <td>(555) 456-7890</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>0.00</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 4 -->
                            <tr>
                                <td>4</td>
                                <td>INV-2023-00189</td>
                                <td>Prime Construction Ltd.</td>
                                <td>321 Builder's Blvd, Constructown</td>
                                <td>(555) 234-5678</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>5,750.25</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 5 -->
                            <tr>
                                <td>5</td>
                                <td>INV-2023-00201</td>
                                <td>Metro Food Services</td>
                                <td>654 Culinary Ct, Foodville</td>
                                <td>(555) 876-5432</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>980.00</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 6 -->
                            <tr>
                                <td>6</td>
                                <td>INV-2023-00234</td>
                                <td>Tech Innovations Corp.</td>
                                <td>987 Digital Dr, Tech City</td>
                                <td>(555) 345-6789</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>3,420.75</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 7 -->
                            <tr>
                                <td>7</td>
                                <td>INV-2023-00256</td>
                                <td>Green Energy Solutions</td>
                                <td>147 Solar St, Ecotown</td>
                                <td>(555) 654-3210</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>0.00</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                            <!-- Row 8 -->
                            <tr>
                                <td>8</td>
                                <td>INV-2023-00278</td>
                                <td>City Hospital Network</td>
                                <td>258 Medical Ave, Healthville</td>
                                <td>(555) 765-4321</td>
                                <td class="balance-positive"><?php echo $currency_symbol; ?>6,150.00</td>
                                <td></td>
                                <td></td>
                                <td><div class="signature-cell"></div></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-footer">
                    <div class="summary">
                        <div class="summary-item">
                            <div class="summary-label">Total Balance</div>
                            <div class="summary-value balance-positive"><?php echo $currency_symbol; ?>20,651.50</div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-ghost" id="resetFiltersBtn">
                            <i class="fas fa-redo"></i> Reset Filters
                        </button>
                        <button class="btn btn-ghost">
                            <i class="fas fa-file-export"></i> Export CSV
                        </button>
                        <button class="btn btn-primary">
                            <i class="fas fa-sync-alt"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const currencySymbol = '<?php echo $currency_symbol; ?>';
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="../../../assets/js/financial_reports/recovery_sheet/recovery-sheet.js"></script>
</body>
</html>