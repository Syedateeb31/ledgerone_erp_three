<?php
require_once '../../../includes/dashboard.php';

if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../auth/login.html'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Soda Book List</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #1f7bff;
            --surface-0: #ffffff;
            --surface-1: #f7f9fc;
            --surface-2: #eff2f7;
            --heading: #0e1a2b;
            --body: #2f3b4c;
            --subtext: #6b7280;
            --border-default: #e1e6ee;
            --border-strong: #c9cfda;
            --shadow: 0 2px 6px rgba(0,0,0,0.06);
            --radius: 8px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; }

        body {
            background: var(--surface-1);
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .soda-header {
            display: flex;
            align-items: center;
            padding: 0 24px;
            background: var(--surface-0);
            border-bottom: 1.5px solid var(--border-default);
            height: 52px;
            flex-shrink: 0;
            box-shadow: var(--shadow);
        }
        .soda-header h1 {
            font-size: 20px;
            font-weight: 700;
            color: var(--heading);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .soda-header h1 i { color: var(--primary); }

        .panel-labels {
            display: grid;
            grid-template-columns: 1fr 1fr;
            flex-shrink: 0;
        }
        .panel-label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            padding: 10px 0;
            background: var(--surface-0);
            border-bottom: 2.5px solid transparent;
            letter-spacing: 0.02em;
        }
        .panel-label.buyer {
            color: #1976d2;
            border-bottom-color: #1976d2;
            border-right: 1.5px solid var(--border-default);
        }
        .panel-label.seller {
            color: #2e7d32;
            border-bottom-color: #2e7d32;
        }
        .panel-label i { font-size: 13px; }

        .panels-container {
            display: flex;
            flex: 1;
        }
        .panel {
            flex: 1;
            min-width: 0;
        }
        .panel:first-child {
            border-right: 1.5px solid var(--border-strong);
        }
        .panel iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
    </style>
</head>
<body>
    <div class="soda-header">
        <h1><i class="fas fa-book"></i> Soda Book List</h1>
    </div>

    <div class="panel-labels">
        <div class="panel-label buyer">
            <i class="fas fa-shopping-cart"></i> Soda Book Buyer
        </div>
        <div class="panel-label seller">
            <i class="fas fa-store"></i> Soda Book Seller
        </div>
    </div>

    <div class="panels-container">
        <div class="panel">
            <iframe src="../purchase/purchase_order/order-list.php" id="buyerFrame" title="Soda Book Buyer"></iframe>
        </div>
        <div class="panel">
            <iframe src="../sale/sale_order/order-list.php" id="sellerFrame" title="Soda Book Seller"></iframe>
        </div>
    </div>

    <script>
        function autoResizeIframe(iframe) {
            try {
                var doc = iframe.contentWindow.document;
                var h = Math.max(doc.body.scrollHeight, doc.body.offsetHeight, doc.documentElement.scrollHeight);
                iframe.style.height = h + 'px';
            } catch(e) {}
        }

        function hidePrintButtons(iframe) {
            try {
                var doc = iframe.contentWindow.document;
                doc.querySelectorAll('button.btn-success.btn-sm').forEach(function(btn) {
                    if (btn.querySelector('.fa-print')) btn.style.display = 'none';
                });
            } catch(e) {}
        }

        ['buyerFrame', 'sellerFrame'].forEach(function(id) {
            var iframe = document.getElementById(id);
            iframe.addEventListener('load', function() {
                autoResizeIframe(iframe);
                hidePrintButtons(iframe);
                setTimeout(function() { autoResizeIframe(iframe); hidePrintButtons(iframe); }, 500);
                setTimeout(function() { autoResizeIframe(iframe); hidePrintButtons(iframe); }, 1500);
                setTimeout(function() { autoResizeIframe(iframe); hidePrintButtons(iframe); }, 3000);
                try {
                    var observer = new MutationObserver(function() { autoResizeIframe(iframe); hidePrintButtons(iframe); });
                    observer.observe(iframe.contentWindow.document.body, { childList: true, subtree: true, attributes: true });
                } catch(e) {}
            });
        });
    </script>
</body>
</html>
