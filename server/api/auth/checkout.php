<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
session_start();

define('DB_HOST', '31.97.123.46');
define('DB_PUBLIC_USER', 'ledgerone_admin');
define('DB_PUBLIC_PASS', 'd5VbDC_Kx!1M8~%O');

// KuickPay configuration
define('KUICKPAY_MERCHANT_ID', $_ENV['KUICKPAY_MERCHANT_ID'] ?? 'YOUR_MERCHANT_ID');
define('KUICKPAY_SECRET_KEY', $_ENV['KUICKPAY_SECRET_KEY'] ?? 'YOUR_SECRET_KEY');
define('KUICKPAY_API_URL', 'https://api.kuickpay.com/v1/checkout');

// 2Checkout configuration
define('TWOCHECKOUT_MERCHANT_CODE', $_ENV['TWOCHECKOUT_MERCHANT_CODE'] ?? '255895431952');
define('TWOCHECKOUT_SECRET_KEY', $_ENV['TWOCHECKOUT_SECRET_KEY'] ?? 'Q^VRwdrF30S6ky_EH4(&');
define('TWOCHECKOUT_API_URL', 'https://api.2checkout.com/rest/6.0/orders/');

header('Content-Type: application/json');
$allowedOrigins = ['http://localhost', 'http://127.0.0.1', 'https://ledgerone.innova-tech.link'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class CheckoutAPI
{
    private function getDbConnection()
    {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=ledgerone_public;charset=utf8mb4",
                DB_PUBLIC_USER,
                DB_PUBLIC_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            return $pdo;
        } catch (PDOException $e) {
            error_log('Database connection error: ' . $e->getMessage());
            return null;
        }
    }

    private function create2CheckoutOrder($data)
    {
        // Check if 2Checkout is configured
        if (TWOCHECKOUT_MERCHANT_CODE === 'YOUR_ACTUAL_MERCHANT_CODE' || TWOCHECKOUT_SECRET_KEY === 'YOUR_ACTUAL_SECRET_KEY') {
            return ['success' => false, 'message' => '2Checkout payment is not configured. Please use Pakistan Payment or Bank Transfer.'];
        }
        
        $orderId = 'SUB-' . $data['tenant_id'] . '-' . time();
        
        $payload = [
            'Country' => 'PK',
            'Currency' => 'PKR',
            'CustomerIP' => $_SERVER['REMOTE_ADDR'],
            'ExternalReference' => $orderId,
            'Language' => 'en',
            'Source' => 'ledgerone.unisensystems.com',
            'BillingDetails' => [
                'Email' => $data['customer_email'] ?? '',
                'Phone' => $data['customer_phone'] ?? ''
            ],
            'Items' => [[
                'Name' => 'LedgerOne ERP Subscription - ' . ucfirst($data['plan']),
                'Description' => 'Subscription Plan',
                'Quantity' => 1,
                'Price' => $data['amount'],
                'PriceOptions' => [[
                    'Name' => 'Monthly',
                    'Options' => [[
                        'Name' => 'Subscription',
                        'Value' => 'Yes'
                    ]]
                ]]
            ]],
            'PaymentDetails' => [
                'Type' => 'CC',
                'Currency' => 'PKR',
                'PaymentMethod' => [
                    'ReturnURL' => 'http://localhost/ledgerone_erp/client/pages/auth/payment-success.html?tenant_id=' . $data['tenant_id'],
                    'CancelURL' => 'http://localhost/ledgerone_erp/client/pages/auth/checkout.html?tenant_id=' . $data['tenant_id']
                ]
            ]
        ];

        $ch = curl_init(TWOCHECKOUT_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Avangate-Authentication: code="' . TWOCHECKOUT_MERCHANT_CODE . '" date="' . gmdate('Y-m-d H:i:s') . '" hash="' . $this->generate2CheckoutHash($payload) . '"'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        error_log('2Checkout Response Code: ' . $httpCode);
        error_log('2Checkout Response: ' . $response);
        if ($curlError) {
            error_log('2Checkout cURL Error: ' . $curlError);
        }

        if ($httpCode === 200 || $httpCode === 201) {
            $result = json_decode($response, true);
            return [
                'success' => true,
                'payment_url' => $result['PaymentURL'] ?? '',
                'order_id' => $orderId
            ];
        }

        return ['success' => false, 'message' => '2Checkout API error. Please use Pakistan Payment or Bank Transfer.'];
    }

    private function generate2CheckoutHash($payload)
    {
        $string = strlen(TWOCHECKOUT_MERCHANT_CODE) . TWOCHECKOUT_MERCHANT_CODE;
        $string .= strlen(gmdate('Y-m-d H:i:s')) . gmdate('Y-m-d H:i:s');
        $string .= strlen(json_encode($payload)) . json_encode($payload);
        return hash_hmac('sha256', $string, TWOCHECKOUT_SECRET_KEY);
    }

    private function createKuickPayCheckout($data)
    {
        $orderId = 'SUB-' . $data['tenant_id'] . '-' . time();
        
        $payload = [
            'merchant_id' => KUICKPAY_MERCHANT_ID,
            'order_id' => $orderId,
            'amount' => $data['amount'],
            'currency' => 'PKR',
            'description' => 'LedgerOne ERP Subscription - ' . ucfirst($data['plan']),
            'customer_email' => $data['customer_email'] ?? '',
            'customer_phone' => $data['customer_phone'] ?? '',
            'return_url' => 'http://localhost/ledgerone_erp/client/pages/auth/payment-success.html?tenant_id=' . $data['tenant_id'],
            'cancel_url' => 'http://localhost/ledgerone_erp/client/pages/auth/checkout.html?tenant_id=' . $data['tenant_id'],
            'webhook_url' => 'http://localhost/ledgerone_erp/server/api/auth/kuickpay-webhook.php'
        ];

        // Generate signature
        $signature = hash_hmac('sha256', json_encode($payload), KUICKPAY_SECRET_KEY);
        $payload['signature'] = $signature;

        // Make API request to KuickPay
        $ch = curl_init(KUICKPAY_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . KUICKPAY_SECRET_KEY
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $result = json_decode($response, true);
            return [
                'success' => true,
                'payment_url' => $result['checkout_url'] ?? '',
                'order_id' => $orderId
            ];
        }

        return ['success' => false, 'message' => 'KuickPay API error'];
    }

    public function processCheckout($data)
    {
        // Validate required fields
        $required = ['tenant_id', 'plan', 'billing_cycle', 'user_count', 'payment_method', 'amount'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return ['success' => false, 'message' => ucfirst($field) . ' is required'];
            }
        }

        // Validate session - allow both new registrations and renewals
        $isNewRegistration = isset($_SESSION['pending_checkout_tenant_id']) && $_SESSION['pending_checkout_tenant_id'] == $data['tenant_id'];
        $isRenewal = isset($_SESSION['tenant_id']) && $_SESSION['tenant_id'] == $data['tenant_id'];
        
        if (!$isNewRegistration && !$isRenewal) {
            return ['success' => false, 'message' => 'Unauthorized access'];
        }

        if ($isNewRegistration && (!isset($_SESSION['checkout_expires']) || $_SESSION['checkout_expires'] < time())) {
            return ['success' => false, 'message' => 'Session expired'];
        }

        try {
            $publicDb = $this->getDbConnection();
            if (!$publicDb) {
                return ['success' => false, 'message' => 'Database connection failed'];
            }

            // Start transaction
            $publicDb->beginTransaction();

            $planIds = [
                'starter' => 1,
                'business' => 2,
                'professional' => 3,
                'enterprise' => 4
            ];

            if ($data['payment_method'] === 'kuickpay') {
                // Update subscription
                $monthlyPrice = $data['billing_cycle'] === 'monthly' ? $data['amount'] : 0;
                $annualPrice = $data['billing_cycle'] === 'annual' ? $data['amount'] : 0;
                
                $stmt = $publicDb->prepare("
                    UPDATE subscriptions 
                    SET plan_id = ?, 
                        billing_cycle = ?,
                        monthly_price = ?,
                        annual_price = ?,
                        status = 'active',
                        start_date = NOW(),
                        end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                        next_billing_date = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                        updated_at = NOW()
                    WHERE tenant_id = ?
                ");
                
                $stmt->execute([
                    $planIds[$data['plan']] ?? 1,
                    $data['billing_cycle'],
                    $monthlyPrice,
                    $annualPrice,
                    $data['tenant_id']
                ]);
                
                // Create billing log
                $stmt = $publicDb->prepare("
                    INSERT INTO billing_logs (tenant_id, plan_id, billing_cycle_start, billing_cycle_end, 
                        amount_paid, currency, payment_method, payment_gateway, transaction_id, 
                        payment_status, invoice_number, created_at)
                    VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, 'PKR', 'kuickpay', 
                        'kuickpay', ?, 'success', ?, NOW())
                ");
                
                $transactionId = 'TXN-' . $data['tenant_id'] . '-' . time();
                $invoiceNumber = 'INV-' . $data['tenant_id'] . '-' . time();
                
                $stmt->execute([
                    $data['tenant_id'],
                    $planIds[$data['plan']] ?? 1,
                    $data['amount'],
                    $transactionId,
                    $invoiceNumber
                ]);

                $publicDb->commit();
                
                // Update session
                $_SESSION['subscription_status'] = 'active';

                return [
                    'success' => true,
                    'payment_url' => '/ledgerone_erp/client/pages/dashboard/dashboard.php',
                    'message' => 'Subscription activated successfully'
                ];

            } else if ($data['payment_method'] === '2checkout') {
                // Update subscription
                $monthlyPrice = $data['billing_cycle'] === 'monthly' ? $data['amount'] : 0;
                $annualPrice = $data['billing_cycle'] === 'annual' ? $data['amount'] : 0;
                
                $stmt = $publicDb->prepare("
                    UPDATE subscriptions 
                    SET plan_id = ?, 
                        billing_cycle = ?,
                        monthly_price = ?,
                        annual_price = ?,
                        status = 'active',
                        start_date = NOW(),
                        end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                        next_billing_date = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                        updated_at = NOW()
                    WHERE tenant_id = ?
                ");
                
                $stmt->execute([
                    $planIds[$data['plan']] ?? 1,
                    $data['billing_cycle'],
                    $monthlyPrice,
                    $annualPrice,
                    $data['tenant_id']
                ]);
                
                // Create billing log
                $stmt = $publicDb->prepare("
                    INSERT INTO billing_logs (tenant_id, plan_id, billing_cycle_start, billing_cycle_end, 
                        amount_paid, currency, payment_method, payment_gateway, transaction_id, 
                        payment_status, invoice_number, created_at)
                    VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, 'PKR', '2checkout', 
                        '2checkout', ?, 'success', ?, NOW())
                ");
                
                $transactionId = 'TXN-' . $data['tenant_id'] . '-' . time();
                $invoiceNumber = 'INV-' . $data['tenant_id'] . '-' . time();
                
                $stmt->execute([
                    $data['tenant_id'],
                    $planIds[$data['plan']] ?? 1,
                    $data['amount'],
                    $transactionId,
                    $invoiceNumber
                ]);

                $publicDb->commit();
                
                // Update session
                $_SESSION['subscription_status'] = 'active';

                return [
                    'success' => true,
                    'payment_url' => '/ledgerone_erp/client/pages/dashboard/dashboard.php',
                    'message' => 'Subscription activated successfully'
                ];

            } else if ($data['payment_method'] === 'bank') {
                // Update subscription to pending
                $monthlyPrice = $data['billing_cycle'] === 'monthly' ? $data['amount'] : 0;
                $annualPrice = $data['billing_cycle'] === 'annual' ? $data['amount'] : 0;
                
                $stmt = $publicDb->prepare("
                    UPDATE subscriptions 
                    SET plan_id = ?, 
                        billing_cycle = ?,
                        monthly_price = ?,
                        annual_price = ?,
                        updated_at = NOW()
                    WHERE tenant_id = ?
                ");
                
                $stmt->execute([
                    $planIds[$data['plan']] ?? 1,
                    $data['billing_cycle'],
                    $monthlyPrice,
                    $annualPrice,
                    $data['tenant_id']
                ]);
                
                // Create pending billing log
                $stmt = $publicDb->prepare("
                    INSERT INTO billing_logs (tenant_id, plan_id, billing_cycle_start, billing_cycle_end, 
                        amount_paid, currency, payment_method, payment_gateway, transaction_id, 
                        payment_status, invoice_number, created_at)
                    VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, 'PKR', 'bank_transfer', 
                        'manual', ?, 'pending', ?, NOW())
                ");
                
                $transactionId = 'PENDING-' . $data['tenant_id'] . '-' . time();
                $invoiceNumber = 'INV-' . $data['tenant_id'] . '-' . time();
                
                $stmt->execute([
                    $data['tenant_id'],
                    $planIds[$data['plan']] ?? 1,
                    $data['amount'],
                    $transactionId,
                    $invoiceNumber
                ]);

                $publicDb->commit();

                return [
                    'success' => true,
                    'message' => 'Subscription created. Share payment receipt within 24 hours via email or WhatsApp.'
                ];
            }

        } catch (Exception $e) {
            if (isset($publicDb)) $publicDb->rollBack();
            error_log('Checkout error: ' . $e->getMessage());
            error_log('Checkout error trace: ' . $e->getTraceAsString());
            return ['success' => false, 'message' => 'Checkout processing failed: ' . $e->getMessage()];
        }
    }
}

// Handle requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
        exit;
    }

    $api = new CheckoutAPI();
    $result = $api->processCheckout($input);
    echo json_encode($result, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}