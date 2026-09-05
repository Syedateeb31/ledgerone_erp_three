-- Add status column to purchase_invoice table
ALTER TABLE `purchase_invoice` 
ADD COLUMN IF NOT EXISTS `status` ENUM('pending', 'confirmed') DEFAULT 'pending' AFTER `sub_account_id`;

-- Add index for status field for better query performance
ALTER TABLE `purchase_invoice` 
ADD INDEX IF NOT EXISTS `idx_status` (`status`);

-- Add composite index for tenant_id and status
ALTER TABLE `purchase_invoice` 
ADD INDEX IF NOT EXISTS `idx_tenant_status` (`tenant_id`, `status`);
