<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
session_start();

// Database configuration
define('DB_HOST', $_ENV['DB_HOST'] ?? '31.97.123.46');
define('DB_USER', $_ENV['DB_USER'] ?? 'ledgerone_tenant');
define('DB_PASS', $_ENV['DB_PASS'] ?? '.,vU:N0<B{KU787x');
define('DB_PUBLIC', $_ENV['DB_PUBLIC'] ?? 'ledgerone_public');
define('DB_TENANT', $_ENV['DB_TENANT'] ?? 'ledgerone_tenant');

// Separate user for public database operations
define('DB_PUBLIC_USER', $_ENV['DB_PUBLIC_USER'] ?? 'ledgerone_admin');
define('DB_PUBLIC_PASS', $_ENV['DB_PUBLIC_PASS'] ?? 'd5VbDC_Kx!1M8~%O');

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

class RegistrationAPI
{
    private function getDbConnection($database)
    {
        try {
            // Use separate credentials for public database
            $user = ($database === DB_PUBLIC) ? DB_PUBLIC_USER : DB_USER;
            $pass = ($database === DB_PUBLIC) ? DB_PUBLIC_PASS : DB_PASS;
            
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . $database . ";charset=utf8mb4",
                $user,
                $pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            return $pdo;
        } catch (PDOException $e) {
            error_log('Database connection error for ' . $database . ': ' . $e->getMessage());
            return null;
        }
    }

    public function register($data)
    {
        // Validate required fields
        $required = ['companyName', 'firstName', 'lastName', 'email', 'password', 'phone', 'country', 'state', 'city', 'postalCode', 'address1'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return ['success' => false, 'message' => ucfirst($field) . ' is required'];
            }
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid email format'];
        }

        // Validate password length
        if (strlen($data['password']) < 8) {
            return ['success' => false, 'message' => 'Password must be at least 8 characters'];
        }

        try {
            $publicDb = $this->getDbConnection(DB_PUBLIC);
            $tenantDb = $this->getDbConnection(DB_TENANT);

            if (!$publicDb || !$tenantDb) {
                return ['success' => false, 'message' => 'Database connection failed'];
            }

            // Check if email already exists in tenant database
            $stmt = $tenantDb->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$data['email']]);
            if ($stmt->fetch()) {
                return ['success' => false, 'message' => 'Email already registered'];
            }

            // Use hardcoded subdomain
            $subdomain = 'ledgerone.unisensystems.com';

            // Create tenant in public database (no transaction for testing)
            $stmt = $publicDb->prepare("
                INSERT INTO tenants (business_name, subdomain, contact_email, contact_phone, 
                    country, state, city, postal_code, address_line1, address_line2, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
            ");
            $stmt->execute([
                $data['companyName'],
                $subdomain,
                $data['email'],
                $data['phone'],
                $data['country'],
                $data['state'],
                $data['city'],
                $data['postalCode'],
                $data['address1'],
                $data['address2'] ?? ''
            ]);
            $tenantId = $publicDb->lastInsertId();

            // Create Super Admin user in tenant database
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            $fullName = $data['firstName'] . ' ' . $data['lastName'];
            
            error_log('Registration - Email: ' . $data['email']);
            error_log('Registration - Password: ' . $data['password']);
            error_log('Registration - Hash: ' . $passwordHash);
            
            $stmt = $tenantDb->prepare("
                INSERT INTO users (tenant_id, email, password_hash, full_name, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([$tenantId, $data['email'], $passwordHash, $fullName]);
            $userId = $tenantDb->lastInsertId();

            // Assign Super Admin role (role_id = 1, tenant_id = 0)
            $stmt = $tenantDb->prepare("
                INSERT INTO user_roles (user_id, role_id, tenant_id, is_active, assigned_at)
                VALUES (?, 1, ?, 1, NOW())
            ");
            $stmt->execute([$userId, $tenantId]);

            // Close connections
            $publicDb = null;
            $tenantDb = null;

            // Store tenant_id in session
            $_SESSION['pending_checkout_tenant_id'] = $tenantId;
            $_SESSION['checkout_expires'] = time() + 3600;

            return [
                'success' => true,
                'message' => 'Registration successful',
                'tenant_id' => $tenantId,
                'subdomain' => $subdomain
            ];

        } catch (Exception $e) {
            error_log('Registration error: ' . $e->getMessage());
            error_log('Registration error trace: ' . $e->getTraceAsString());
            return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
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

    $api = new RegistrationAPI();
    $result = $api->register($input);
    echo json_encode($result, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}