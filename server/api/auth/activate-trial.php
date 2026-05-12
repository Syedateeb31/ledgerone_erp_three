<?php
session_start();
require_once '../../../includes/connection.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$tenantId = $data['tenant_id'] ?? null;

if (!$tenantId) {
    echo json_encode(['success' => false, 'message' => 'Tenant ID required']);
    exit;
}

try {
    $publicDb = new PDO(
        "mysql:host=$servername;dbname=ledgerone_public;charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Check tenant exists and trial hasn't been used
    $stmt = $publicDb->prepare("SELECT trial_used FROM tenants WHERE id = ?");
    $stmt->execute([$tenantId]);
    $tenant = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tenant) {
        echo json_encode(['success' => false, 'message' => 'Tenant not found']);
        exit;
    }

    if ($tenant['trial_used']) {
        echo json_encode(['success' => false, 'message' => 'Free trial has already been used for this account']);
        exit;
    }

    // Check for existing active/trialing subscription
    $stmt = $publicDb->prepare("
        SELECT id FROM subscriptions
        WHERE tenant_id = ? AND status IN ('active', 'trialing', 'lifetime')
        LIMIT 1
    ");
    $stmt->execute([$tenantId]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'An active subscription already exists']);
        exit;
    }

    // Resolve trial plan ID (created by migration)
    $stmt = $publicDb->prepare("SELECT id FROM plans WHERE name = 'Trial' LIMIT 1");
    $stmt->execute();
    $trialPlan = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trialPlan) {
        // Auto-create trial plan if migration hasn't run yet
        $stmt = $publicDb->prepare("
            INSERT INTO plans (name, description, plan_type, monthly_price, trial_days, is_active, is_public,
                               max_users, max_companies, max_storage_mb, max_monthly_transactions)
            VALUES ('Trial', '14-day free trial with full access', 'subscription', 0.00, 14, 1, 0, 100, 5, 5000, 10000)
        ");
        $stmt->execute();
        $trialPlanId = (int) $publicDb->lastInsertId();
    } else {
        $trialPlanId = (int) $trialPlan['id'];
    }

    $trialEndDate = date('Y-m-d', strtotime('+14 days'));

    // Insert trial subscription
    $stmt = $publicDb->prepare("
        INSERT INTO subscriptions (
            tenant_id, plan_id, billing_type, status,
            start_date, end_date, trial_ends_at, created_at
        ) VALUES (?, ?, 'recurring', 'trialing', CURDATE(), ?, ?, NOW())
    ");
    $stmt->execute([$tenantId, $trialPlanId, $trialEndDate, $trialEndDate]);

    // Mark trial as used and set tenant trial_ends_at
    $stmt = $publicDb->prepare("
        UPDATE tenants SET trial_used = 1, trial_ends_at = ?, status = 'active' WHERE id = ?
    ");
    $stmt->execute([$trialEndDate, $tenantId]);

    echo json_encode([
        'success' => true,
        'message' => 'Trial activated successfully',
        'trial_ends_at' => $trialEndDate,
        'days_remaining' => 14
    ]);
} catch (Exception $e) {
    error_log('Trial activation error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Trial activation failed. Please try again.']);
}
