<?php
require_once '../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) { session_start(); }
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LedgerOne ERP - Broken Allowance Chart</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/purchase/broken_allowance/broken-allowance.css">
</head>
<body class="light-theme">
    <div class="container">
        <div class="header">
            <h1 class="page-title">Broken Allowance Chart</h1>
        </div>

        <form id="brokenAllowanceForm">
            <div class="card">
                <h2 class="card-title">Chart Details</h2>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="chartName" class="required">Chart Name</label>
                        <input type="text" id="chartName" placeholder="Enter chart name" required>
                    </div>
                    <div class="form-group">
                        <label for="chartDate" class="required">Date</label>
                        <input type="date" id="chartDate" required>
                    </div>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="card-title" style="margin-bottom: 0;">Allowance Slabs</h2>
                </div>
                <div class="table-container">
                    <table id="slabsTable">
                        <thead>
                            <tr>
                                <th width="5%">S#</th>
                                <th width="30%">From</th>
                                <th width="30%">To</th>
                                <th width="30%">Rate / Percent</th>
                                <th width="5%">Action</th>
                            </tr>
                        </thead>
                        <tbody id="slabsBody">
                        </tbody>
                    </table>
                </div>
                <div class="actions">
                    <button type="button" class="btn btn-secondary" id="addSlabBtn">
                        <i class="fas fa-plus"></i> Add Slab
                    </button>
                </div>
            </div>

            <div class="actions">
                <button type="button" class="btn btn-secondary" id="resetBtn">
                    <i class="fas fa-redo"></i> Reset
                </button>
                <button type="submit" class="btn btn-primary" id="saveBtn">
                    <i class="fas fa-save"></i> Save Chart
                </button>
            </div>
        </form>

    <script src="../../../assets/js/purchase/broken_allowance/broken-allowance.js"></script>
</body>
</html>
