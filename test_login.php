<?php
// Quick password verification test
$email = 'support@unisensystems.com'; // CHANGE THIS to your actual email
$password = 'admin'; // CHANGE THIS to your actual password

$pdo = new PDO("mysql:host=localhost;dbname=ledgerone_tenant", "admin", "root");
$stmt = $pdo->prepare("SELECT id, email, password_hash, is_active FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== LOGIN DEBUG TEST ===\n\n";

if (!$user) {
    echo "❌ User NOT found in database\n";
    echo "Email searched: $email\n";
    exit;
}

echo "✅ User found in database\n";
echo "User ID: " . $user['id'] . "\n";
echo "Email: " . $user['email'] . "\n";
echo "Is Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n";
echo "Password Hash: " . substr($user['password_hash'], 0, 30) . "...\n\n";

if (!$user['is_active']) {
    echo "❌ Account is INACTIVE\n";
    exit;
}

echo "Testing password verification...\n";
$verify = password_verify($password, $user['password_hash']);

if ($verify) {
    echo "✅ PASSWORD MATCHES! Login should work.\n";
} else {
    echo "❌ PASSWORD DOES NOT MATCH!\n";
    echo "This is why login fails.\n\n";
    echo "Possible fixes:\n";
    echo "1. Make sure you're using the correct password\n";
    echo "2. Reset password in database with this query:\n";
    echo "   UPDATE users SET password_hash = '" . password_hash($password, PASSWORD_DEFAULT) . "' WHERE email = '$email';\n";
}
