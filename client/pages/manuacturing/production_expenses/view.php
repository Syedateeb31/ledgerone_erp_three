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
$expense_id = $_GET['id'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Production Expense</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css">
    <link rel="stylesheet" href="../../../assets/css/manufacturing/production_expenses/view.css">
</head>
<body>
    <div class="main-content">
        <div class="view-container">
            <div class="card">
                <div class="card-header">
                    <h2>Production Expense Details</h2>
                    <button class="btn btn-secondary" onclick="window.location.href='list.php'">
                        <i class="las la-arrow-left"></i> Back to List
                    </button>
                </div>

                <div class="expense-details" id="expenseDetails">
                    <div style="text-align:center; padding:32px; color:#6B7280;">Loading...</div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        const BASE_URL = '<?php echo $base_url; ?>';
        const EXPENSE_ID = <?php echo $expense_id ?? 'null'; ?>;
    </script>
    <script src="../../../assets/js/manufacturing/production_expenses/view.js"></script>
</body>
</html>
