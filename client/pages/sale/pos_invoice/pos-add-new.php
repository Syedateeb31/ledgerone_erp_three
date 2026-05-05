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
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LedgerOne ERP - Sale Invoice</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/sale/pos_invoice/pos-add.css">
</head>
<body class="light-theme">
    <div class="container">
        <form id="invoiceForm">
            <!-- Form content here - keeping all the existing HTML -->
            <!-- [All the existing form HTML remains the same] -->
        </form>
    </div>

    <script src="../../../assets/js/sale/pos_invoice/pos-add-uom.js?v=<?php echo time(); ?>&debug=1"></script>
    <script src="../../../assets/js/sale/pos_invoice/pos-add-scheme.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/invoice-level-taxes-dynamic.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/pos-tax-calculation.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/withholding-tax.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/collect-taxes.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/fix-taxes-save.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/pos-add.js?v=<?php echo time(); ?>"></script>
    <script src="../../../assets/js/sale/pos_invoice/tax-integration.js?v=<?php echo time(); ?>"></script>
</body>
</html>
