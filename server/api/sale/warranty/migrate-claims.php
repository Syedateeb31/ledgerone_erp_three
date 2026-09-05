<?php
// Run this once: http://localhost/ledgerone_erp_two/server/api/sale/warranty/migrate-claims.php
require_once '../../../../includes/connection.php';

$sqls = [

"CREATE TABLE IF NOT EXISTS `warranty_claims` (
  `id`                    INT(11)       NOT NULL AUTO_INCREMENT,
  `tenant_id`             INT(11)       NOT NULL,
  `claim_no`              VARCHAR(20)   NOT NULL,
  `claim_date`            DATE          NOT NULL,
  `claim_status`          ENUM('Pending','Under Inspection','Approved','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  `claim_priority`        ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `warranty_id`           INT(11)       DEFAULT NULL,
  `warranty_no`           VARCHAR(20)   DEFAULT NULL,
  `warranty_type`         VARCHAR(50)   DEFAULT NULL,
  `warranty_start_date`   DATE          DEFAULT NULL,
  `warranty_expiry_date`  DATE          DEFAULT NULL,
  `customer_id`           INT(11)       DEFAULT NULL,
  `customer_name`         VARCHAR(150)  NOT NULL,
  `phone_number`          VARCHAR(30)   DEFAULT NULL,
  `email`                 VARCHAR(100)  DEFAULT NULL,
  `address`               TEXT          DEFAULT NULL,
  `product_name`          VARCHAR(255)  NOT NULL,
  `chassis_no`            VARCHAR(100)  DEFAULT NULL,
  `motor_no`              VARCHAR(100)  DEFAULT NULL,
  `colour`                VARCHAR(50)   DEFAULT NULL,
  `sale_date`             DATE          DEFAULT NULL,
  `invoice_no`            VARCHAR(50)   DEFAULT NULL,
  `claim_type`            ENUM('Repair','Replacement','Inspection') NOT NULL,
  `fault_category`        VARCHAR(100)  NOT NULL,
  `problem_description`   TEXT          NOT NULL,
  `customer_complaint`    TEXT          DEFAULT NULL,
  `inspection_date`       DATE          DEFAULT NULL,
  `inspected_by`          VARCHAR(100)  DEFAULT NULL,
  `inspection_findings`   TEXT          DEFAULT NULL,
  `resolution_date`       DATE          DEFAULT NULL,
  `resolved_by`           VARCHAR(100)  DEFAULT NULL,
  `resolution_details`    TEXT          DEFAULT NULL,
  `notes`                 TEXT          DEFAULT NULL,
  `created_by`            INT(11)       DEFAULT NULL,
  `updated_by`            INT(11)       DEFAULT NULL,
  `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant`      (`tenant_id`),
  KEY `idx_claim_no`    (`claim_no`),
  KEY `idx_warranty_id` (`warranty_id`),
  KEY `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

"CREATE TABLE IF NOT EXISTS `warranty_claim_items` (
  `id`                INT(11)      NOT NULL AUTO_INCREMENT,
  `tenant_id`         INT(11)      NOT NULL,
  `claim_id`          INT(11)      NOT NULL,
  `component_name`    VARCHAR(150) NOT NULL,
  `serial_no`         VARCHAR(100) DEFAULT NULL,
  `warranty_status`   ENUM('Valid','Expired','Unknown') DEFAULT 'Unknown',
  `issue_description` TEXT         DEFAULT NULL,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_claim_id` (`claim_id`),
  KEY `idx_tenant`   (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"

];

$results = [];
foreach ($sqls as $sql) {
    try {
        $pdo->exec($sql);
        preg_match('/CREATE TABLE IF NOT EXISTS `(\w+)`/', $sql, $m);
        $results[] = "✅ Table `{$m[1]}` created / already exists.";
    } catch (Exception $e) {
        $results[] = "❌ Error: " . $e->getMessage();
    }
}

echo "<pre style='font-family:monospace;font-size:14px;padding:20px;'>";
echo "<b>Warranty Claims Migration</b>\n\n";
foreach ($results as $r) echo $r . "\n";
echo "\n<b>Done.</b> You can close this page.";
echo "</pre>";
