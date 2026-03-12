<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
session_start();

// Database configuration
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_USER', $_ENV['DB_USER'] ?? 'ateeb');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'root');
define('DB_PUBLIC', $_ENV['DB_PUBLIC'] ?? 'ledgerone_public');
define('DB_TENANT', $_ENV['DB_TENANT'] ?? 'ledgerone_tenant');
define('SESSION_EXPIRY', $_ENV['SESSION_EXPIRY'] ?? 3600);

header('Content-Type: application/json');
$allowedOrigins = ['http://localhost', 'http://127.0.0.1', 'https://ledgerone.innova-tech.link', 'https://ledgerone.unisensystems.com', 'https://www.ledgerone.unisensystems.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class MultiTenantAuthAPI
{
    private function getDbConnection($database)
    {
        try {
            error_log("Attempting connection to: host=" . DB_HOST . ", db=" . $database . ", user=" . DB_USER);
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . $database . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            error_log("Database connection successful for: " . $database);
            return $pdo;
        } catch (PDOException $e) {
            error_log('Database connection error for ' . $database . ': ' . $e->getMessage());
            return null;
        }
    }

    private function isRateLimited($key, $maxAttempts, $timeWindow)
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9]/', '', $key);
        $file = sys_get_temp_dir() . '/rate_limit_' . hash('sha256', $safeKey);
        if (!file_exists($file))
            return false;

        $data = json_decode(file_get_contents($file), true);
        if (!$data)
            return false;

        if (time() - $data['time'] > $timeWindow) {
            unlink($file);
            return false;
        }

        return $data['count'] >= $maxAttempts;
    }

    private function incrementRateLimit($key)
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9]/', '', $key);
        $file = sys_get_temp_dir() . '/rate_limit_' . hash('sha256', $safeKey);
        $data = ['count' => 1, 'time' => time()];

        if (file_exists($file)) {
            $existing = json_decode(file_get_contents($file), true);
            if ($existing && time() - $existing['time'] <= 900) {
                $data['count'] = $existing['count'] + 1;
                $data['time'] = $existing['time'];
            }
        }

        file_put_contents($file, json_encode($data));
    }

    private function createSession($userId, $tenantId, $email, $tenantDb)
    {
        $sessionToken = bin2hex(random_bytes(32));
        
        // Store in PHP session instead of database for now
        $_SESSION['session_token'] = $sessionToken;
        $_SESSION['user_id'] = $userId;
        $_SESSION['tenant_id'] = $tenantId;
        $_SESSION['email'] = $email;
        $_SESSION['expires_at'] = time() + SESSION_EXPIRY;
        
        return $sessionToken;
    }

    public function login($email, $password)
    {
        if (!$email || !$password) {
            return ['success' => false, 'message' => 'Email and password required'];
        }

        $ipAddress = $this->getClientIP();

        try {
            // Rate limiting
            if ($this->isRateLimited($ipAddress, 10, 300)) {
                return ['success' => false, 'message' => 'Too many attempts. Please try again later.'];
            }

            if ($this->isRateLimited($email, 5, 900)) {
                return ['success' => false, 'message' => 'Account temporarily locked'];
            }

            // Get user from tenant database
            $tenantDb = $this->getDbConnection(DB_TENANT);
            if (!$tenantDb) {
                return ['success' => false, 'message' => 'Database connection failed'];
            }

            $stmt = $tenantDb->prepare("SELECT id, tenant_id, email, password_hash, full_name, language_code, timezone, is_active FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            error_log('Login attempt for: ' . $email);
            error_log('User found: ' . ($user ? 'yes' : 'no'));
            if ($user) {
                error_log('Password hash from DB: ' . substr($user['password_hash'], 0, 20) . '...');
                error_log('Password verify result: ' . (password_verify($password, $user['password_hash']) ? 'true' : 'false'));
            }

            if (!$user || !password_verify($password, $user['password_hash'])) {
                $this->incrementRateLimit($ipAddress);
                $this->incrementRateLimit($email);
                $this->logAttempt($email, $ipAddress, 'failed', $user['id'] ?? null, $user['tenant_id'] ?? null);
                return ['success' => false, 'message' => 'Invalid credentials'];
            }

            if (!$user['is_active']) {
                return ['success' => false, 'message' => 'Account suspended'];
            }

            // Validate tenant and subscription from public database
            $publicDb = $this->getDbConnection(DB_PUBLIC);
            if (!$publicDb) {
                return ['success' => false, 'message' => 'Database connection failed'];
            }

            $stmt = $publicDb->prepare("SELECT id, business_name, subdomain, base_currency, status FROM tenants WHERE id = ?");
            $stmt->execute([$user['tenant_id']]);
            $tenant = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tenant || $tenant['status'] !== 'active') {
                return ['success' => false, 'message' => 'Account suspended'];
            }

            // Check subscription status
            $stmt = $publicDb->prepare("
                SELECT status, end_date, trial_ends_at 
                FROM subscriptions 
                WHERE tenant_id = ?
                ORDER BY created_at DESC LIMIT 1
            ");
            $stmt->execute([$user['tenant_id']]);
            $subscription = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$subscription) {
                // No subscription record at all - redirect to checkout
                $_SESSION['pending_checkout_tenant_id'] = $user['tenant_id'];
                $_SESSION['checkout_expires'] = time() + 3600;
                return [
                    'success' => false,
                    'redirect' => 'checkout',
                    'tenant_id' => $user['tenant_id'],
                    'message' => 'Please complete your subscription'
                ];
            }

            // Check subscription expiry status
            $today = date('Y-m-d');
            $subscriptionStatus = $subscription['status'];
            
            if ($subscription['status'] === 'trialing' && $subscription['trial_ends_at'] && $subscription['trial_ends_at'] < $today) {
                $subscriptionStatus = 'trial_expired';
            } elseif (($subscription['status'] === 'active' || $subscription['status'] === 'expired') && $subscription['end_date'] && $subscription['end_date'] < $today) {
                $subscriptionStatus = 'expired';
            }

            error_log('Subscription check - DB status: ' . $subscription['status'] . ', end_date: ' . ($subscription['end_date'] ?? 'null') . ', today: ' . $today . ', final status: ' . $subscriptionStatus);

            // Update last login
            $stmt = $tenantDb->prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$user['id']]);

            // Get user permissions and companies
            $permissions = $this->getUserPermissions($user['id'], $tenantDb);
            $companies = $this->getUserCompanies($user['id'], $tenantDb);

            // Log success
            $this->logAttempt($email, $ipAddress, 'success', $user['id'], $user['tenant_id']);

            // Create database session
            $sessionToken = $this->createSession($user['id'], $user['tenant_id'], $user['email'], $tenantDb);

            if (!$sessionToken) {
                return ['success' => false, 'message' => 'Session creation failed'];
            }

            // Store in PHP session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['tenant_id'] = $user['tenant_id'];
            $_SESSION['subscription_status'] = $subscriptionStatus;
            $_SESSION['subscription_end_date'] = $subscription['end_date'] ?? $subscription['trial_ends_at'];

            return [
                'success' => true,
                'session_token' => $sessionToken,
                'user' => [
                    'id' => $user['id'],
                    'tenant_id' => $user['tenant_id'],
                    'email' => $user['email'],
                    'full_name' => $user['full_name'],
                    'language_code' => $user['language_code'],
                    'timezone' => $user['timezone']
                ],
                'tenant' => [
                    'id' => $tenant['id'],
                    'business_name' => $tenant['business_name'],
                    'subdomain' => $tenant['subdomain'],
                    'base_currency' => $tenant['base_currency']
                ],
                'subscription' => [
                    'status' => $subscriptionStatus,
                    'end_date' => $subscription['end_date'] ?? $subscription['trial_ends_at'],
                    'is_expired' => in_array($subscriptionStatus, ['expired', 'trial_expired'])
                ],
                'permissions' => $permissions,
                'companies' => $companies
            ];
        } catch (Exception $e) {
            error_log('Login error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Authentication failed'];
        }
    }

    private function getClientIP()
    {
        $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = trim(explode(',', $_SERVER[$header])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '127.0.0.1';
    }

    private function logAttempt($email, $ipAddress, $status, $userId = null, $tenantId = null)
    {
        try {
            $tenantDb = $this->getDbConnection(DB_TENANT);
            if ($tenantDb) {
                $stmt = $tenantDb->prepare("
                    INSERT INTO login_attempts (tenant_id, user_id, email, ip_address, attempt_status, attempted_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                ");
                $stmt->execute([$tenantId, $userId, $email, $ipAddress, $status]);
            }
        } catch (Exception $e) {
            error_log('Login attempt log error: ' . $e->getMessage());
        }
    }

    private function getUserPermissions($userId, $tenantDb)
    {
        try {
            $stmt = $tenantDb->prepare("
                SELECT p.name, p.resource, p.action 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log('Permission fetch error: ' . $e->getMessage());
            return [];
        }
    }

    private function getUserCompanies($userId, $tenantDb)
    {
        try {
            $stmt = $tenantDb->prepare("
                SELECT c.id, c.name, c.code
                FROM companies c
                JOIN user_companies uc ON c.id = uc.company_id
                WHERE uc.user_id = ?
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log('Company fetch error: ' . $e->getMessage());
            return [];
        }
    }

    public function validateSession($sessionToken)
    {
        try {
            // Check PHP session instead of database
            if (isset($_SESSION['session_token']) && 
                $_SESSION['session_token'] === $sessionToken &&
                isset($_SESSION['expires_at']) &&
                $_SESSION['expires_at'] > time()) {
                
                // Extend session
                $_SESSION['expires_at'] = time() + SESSION_EXPIRY;
                
                return [
                    'user_id' => $_SESSION['user_id'],
                    'tenant_id' => $_SESSION['tenant_id'],
                    'email' => $_SESSION['email'],
                    'is_active' => true
                ];
            }
            
            return null;
        } catch (Exception $e) {
            error_log('Session validation error: ' . $e->getMessage());
            return null;
        }
    }

    public function logout($sessionToken)
    {
        try {
            // Clear PHP session
            session_destroy();
            return ['success' => true, 'message' => 'Logged out successfully'];
        } catch (Exception $e) {
            error_log('Logout error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Logout failed'];
        }
    }
}


// Handle requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to read input']);
        exit;
    }

    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }

    if (!is_array($input)) {
        echo json_encode(['success' => false, 'message' => 'Invalid input format']);
        exit;
    }

    $api = new MultiTenantAuthAPI();
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'login':
            $result = $api->login($input['email'] ?? '', $input['password'] ?? '');
            break;
        case 'logout':
            $result = $api->logout($input['session_token'] ?? '');
            break;
        case 'validate_session':
            $session = $api->validateSession($input['session_token'] ?? '');
            $result = $session ? ['success' => true, 'session' => $session] : ['success' => false, 'message' => 'Invalid session'];
            break;
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }

    echo json_encode($result, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
