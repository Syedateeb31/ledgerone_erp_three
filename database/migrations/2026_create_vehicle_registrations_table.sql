-- Vehicle Registration Master Table
-- This table stores all vehicle registration applications and their details

CREATE TABLE IF NOT EXISTS `vehicle_registrations` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `tenant_id` bigint unsigned NOT NULL,
    
    -- Application Details
    `application_no` varchar(50) NOT NULL COMMENT 'Unique application number e.g., VR-0001',
    `application_date` date NOT NULL,
    `registration_no` varchar(50) NULL COMMENT 'Final registration number (filled after approval)',
    
    -- Registration Type & Location
    `registration_type` varchar(100) NOT NULL COMMENT 'New Registration / Transfer / Renewal',
    `registration_city` varchar(100) NOT NULL COMMENT 'City where registration is being done',
    `reg_status` varchar(50) NOT NULL DEFAULT 'Pending' COMMENT 'Pending, Submitted, In Process, Completed, Delivered, Cancelled',
    
    -- Customer Information
    `customer_id` bigint unsigned NULL COMMENT 'Foreign key to customers table',
    `customer_name` varchar(255) NOT NULL,
    `phone_number` varchar(20) NULL,
    `email` varchar(255) NULL,
    `address` text NULL,
    `cnic_no` varchar(50) NULL COMMENT 'Customer National ID Number',
    
    -- Invoice / Sale Details
    `invoice_id` bigint unsigned NULL COMMENT 'Link to original sale invoice',
    `invoice_number` varchar(50) NULL,
    `sale_date` date NULL,
    
    -- Product / Vehicle Information
    `product_name` varchar(255) NOT NULL COMMENT 'Vehicle model name e.g., Honda CD 70',
    `engine_cc` varchar(50) NULL COMMENT 'Engine capacity e.g., 70cc, 125cc',
    `chassis_no` varchar(100) NULL COMMENT 'Vehicle chassis number',
    `motor_no` varchar(100) NULL COMMENT 'Vehicle motor/engine number',
    `colour` varchar(50) NULL,
    `model_year` varchar(20) NULL COMMENT 'Manufacturing year',
    
    -- Fees Breakdown
    `registration_fee` decimal(10, 2) NOT NULL DEFAULT 0.00,
    `number_plate_fee` decimal(10, 2) NOT NULL DEFAULT 0.00,
    `smart_card_fee` decimal(10, 2) NOT NULL DEFAULT 0.00,
    `service_charges` decimal(10, 2) NOT NULL DEFAULT 0.00,
    `total_amount` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of all fees',
    
    -- Payment Information
    `payment_method` varchar(50) NULL COMMENT 'cash / bank_transfer / cheque / online',
    `bank_account_id` bigint unsigned NULL COMMENT 'Link to bank accounts table',
    `amount_paid` decimal(10, 2) NOT NULL DEFAULT 0.00,
    `remaining_balance` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total - Paid',
    
    -- Timeline & Tracking
    `expected_delivery_date` date NULL,
    `submitted_date` date NULL COMMENT 'Date submitted to excise/authority',
    `completed_date` date NULL COMMENT 'Date registration was completed',
    `remarks` text NULL COMMENT 'Status remarks/notes from authority',
    
    -- Delivery Information
    `delivery_date` date NULL,
    `delivered_to` varchar(255) NULL COMMENT 'Name of person who received',
    `delivered_by` varchar(255) NULL COMMENT 'Staff member who delivered',
    `delivery_notes` text NULL,
    
    -- Additional Notes
    `notes` text NULL COMMENT 'Internal notes',
    
    -- Metadata
    `created_by` bigint unsigned NULL COMMENT 'User who created the record',
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` bigint unsigned NULL COMMENT 'User who last updated the record',
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tenant_app_no` (`tenant_id`, `application_no`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_invoice_id` (`invoice_id`),
    INDEX `idx_reg_status` (`tenant_id`, `reg_status`),
    INDEX `idx_application_date` (`tenant_id`, `application_date`),
    INDEX `idx_chassis_no` (`chassis_no`),
    INDEX `idx_motor_no` (`motor_no`),
    INDEX `idx_customer_name` (`tenant_id`, `customer_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vehicle Registration Applications';

-- ──────────────────────────────────────────────────────────────────────────
-- Vehicle Documents Table
-- Store uploaded documents like photos, invoices, certificates, etc.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `vehicle_registration_documents` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `tenant_id` bigint unsigned NOT NULL,
    `vehicle_registration_id` bigint unsigned NOT NULL,
    
    `document_type` varchar(100) NOT NULL COMMENT 'Photo / Invoice / CNIC / License / Certificate / Other',
    `document_name` varchar(255) NOT NULL,
    `file_path` varchar(500) NOT NULL,
    `file_size` int unsigned NULL COMMENT 'Size in bytes',
    `mime_type` varchar(100) NULL,
    `uploaded_by` bigint unsigned NULL,
    `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    INDEX `idx_vehicle_registration_id` (`vehicle_registration_id`),
    INDEX `idx_tenant_id` (`tenant_id`),
    CONSTRAINT `fk_doc_vehicle_reg` FOREIGN KEY (`vehicle_registration_id`) REFERENCES `vehicle_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────────────
-- Vehicle Registration Status History
-- Track all status changes for audit trail
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `vehicle_registration_status_history` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `tenant_id` bigint unsigned NOT NULL,
    `vehicle_registration_id` bigint unsigned NOT NULL,
    
    `old_status` varchar(50) NULL,
    `new_status` varchar(50) NOT NULL,
    `changed_by` bigint unsigned NULL,
    `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `remarks` text NULL COMMENT 'Reason for status change',
    
    PRIMARY KEY (`id`),
    INDEX `idx_vehicle_registration_id` (`vehicle_registration_id`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_changed_at` (`changed_at`),
    CONSTRAINT `fk_hist_vehicle_reg` FOREIGN KEY (`vehicle_registration_id`) REFERENCES `vehicle_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────────────
-- Vehicle Registration Payments
-- Track all payments for vehicle registration
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `vehicle_registration_payments` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `tenant_id` bigint unsigned NOT NULL,
    `vehicle_registration_id` bigint unsigned NOT NULL,
    
    `payment_date` date NOT NULL,
    `payment_method` varchar(50) NOT NULL COMMENT 'cash / bank_transfer / cheque / online',
    `bank_account_id` bigint unsigned NULL,
    `amount` decimal(10, 2) NOT NULL,
    `reference_no` varchar(100) NULL COMMENT 'Cheque no, transaction ID, etc.',
    `notes` text NULL,
    
    `created_by` bigint unsigned NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    INDEX `idx_vehicle_registration_id` (`vehicle_registration_id`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_payment_date` (`payment_date`),
    CONSTRAINT `fk_payment_vehicle_reg` FOREIGN KEY (`vehicle_registration_id`) REFERENCES `vehicle_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────────────
-- Insert sample data for testing (optional)
-- ──────────────────────────────────────────────────────────────────────────

-- No sample data inserted - will be created through application

-- ──────────────────────────────────────────────────────────────────────────
-- Stored Procedures / Views (Optional enhancements)
-- ──────────────────────────────────────────────────────────────────────────

-- View for Vehicle Registration Summary
CREATE OR REPLACE VIEW v_vehicle_registration_summary AS
SELECT 
    vr.id,
    vr.application_no,
    vr.registration_no,
    vr.customer_name,
    vr.product_name,
    vr.reg_status,
    vr.total_amount,
    vr.amount_paid,
    vr.remaining_balance,
    vr.application_date,
    vr.completed_date,
    vr.delivery_date,
    c.id as customer_id,
    c.primary_phone,
    c.email
FROM vehicle_registrations vr
LEFT JOIN customers c ON vr.customer_id = c.id
ORDER BY vr.application_date DESC;

-- View for Pending Registrations
CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT 
    id,
    application_no,
    customer_name,
    product_name,
    total_amount,
    remaining_balance,
    application_date,
    reg_status
FROM vehicle_registrations
WHERE reg_status IN ('Pending', 'Submitted', 'In Process')
ORDER BY application_date ASC;

-- View for Financial Summary
CREATE OR REPLACE VIEW v_vehicle_registration_financial_summary AS
SELECT 
    reg_status,
    COUNT(*) as total_count,
    SUM(total_amount) as total_fees,
    SUM(amount_paid) as total_paid,
    SUM(remaining_balance) as total_pending
FROM vehicle_registrations
GROUP BY reg_status;
