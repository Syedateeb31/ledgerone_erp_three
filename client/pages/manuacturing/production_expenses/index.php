<?php
require_once '../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    header('Location: ../../auth/login.html');
    exit();
}

$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$base_url = $protocol . '://' . $host . '/ledgerone_erp';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production Expenses</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="../../../assets/css/manufacturing/production_expenses/styles.css">
</head>
<body>
    <div class="main-content">
        <div class="expense-container">
            <div class="card">
                <div class="card-header">
                    <h2>Add Production Expense</h2>
                </div>

                <div class="form-section">
                    <div class="header-fields">
                        <div class="field-group">
                            <label class="form-label">Expense #</label>
                            <input type="text" class="form-control" id="expenseNumber" readonly>
                        </div>

                        <div class="field-group">
                            <label class="form-label">Production Order <span style="color:#E34F4F;">*</span></label>
                            <select class="form-control" id="productionOrderId" required>
                                <option value="">Select Production Order</option>
                            </select>
                        </div>

                        <div class="field-group">
                            <label class="form-label">Production Order Total Cost</label>
                            <input type="text" class="form-control" id="productionOrderTotalCost" readonly>
                        </div>

                        <div class="field-group">
                            <label class="form-label">Expense Type</label>
                            <select class="form-control" id="expenseType">
                                <option value="Direct">Direct</option>
                                <option value="Indirect">Indirect</option>
                            </select>
                        </div>

                        <div class="field-group">
                            <label class="form-label">Reference Table</label>
                            <input type="text" class="form-control" id="referenceTable" placeholder="e.g., materials, labor">
                        </div>

                        <div class="field-group">
                            <label class="form-label">Reference ID</label>
                            <input type="text" class="form-control" id="referenceId">
                        </div>

                        <div class="field-group full-width">
                            <label class="form-label">Notes</label>
                            <textarea class="form-control" id="notes" rows="3"></textarea>
                        </div>
                    </div>

                    <div class="expenses-table-section">
                        <div class="table-header">
                            <h3>Expense Accounts</h3>
                            <button type="button" class="btn btn-sm btn-primary" id="addExpenseRow">
                                <i class="las la-plus"></i> Add Item
                            </button>
                        </div>
                        <table class="expenses-table">
                            <thead>
                                <tr>
                                    <th>Expense Account <span style="color:#E34F4F;">*</span></th>
                                    <th>Amount <span style="color:#E34F4F;">*</span></th>
                                    <th width="50"></th>
                                </tr>
                            </thead>
                            <tbody id="expenseItemsBody">
                                <tr class="expense-row">
                                    <td>
                                        <select class="form-control expense-account" required>
                                            <option value="">Select Expense Account</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="number" class="form-control expense-amount" step="0.01" required>
                                    </td>
                                    <td>
                                        <button type="button" class="btn-icon btn-delete remove-row" title="Remove">
                                            <i class="las la-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style="text-align:right; font-weight:600;">Total:</td>
                                    <td><strong id="totalAmount">0.00</strong></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-primary" id="saveBtn">Save Expense</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script>
        const BASE_URL = '<?php echo $base_url; ?>';
    </script>
    <script src="../../../assets/js/manufacturing/production_expenses/script.js"></script>
</body>
</html>
