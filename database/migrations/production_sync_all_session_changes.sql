-- =====================================================================
-- Production sync: everything the local DB needed for this session's work
-- (Brokery Net/Total KG toggle, Customer<->Supplier linking, and the
-- ported "Customer + Supplier (Both)" feature).
--
-- SAFE TO RUN MULTIPLE TIMES: every column/table add below is guarded by
-- an INFORMATION_SCHEMA check, so if something already exists on
-- production it is silently skipped instead of erroring.
--
-- Run this against the TENANT database (ledgerone_tenant or your
-- production tenant DB name) — NOT the public database.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Brokery Net KG / Total KG toggle
-- ---------------------------------------------------------------------
SET @dbname = DATABASE();

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'sale_invoice' AND COLUMN_NAME = 'brokery_kg_basis') > 0,
  'SELECT ''sale_invoice.brokery_kg_basis already exists, skipped'' AS status',
  'ALTER TABLE `sale_invoice` ADD COLUMN `brokery_kg_basis` VARCHAR(5) NOT NULL DEFAULT ''net'' AFTER `brokery_rate_type`'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'purchase_invoice' AND COLUMN_NAME = 'brokery_kg_basis') > 0,
  'SELECT ''purchase_invoice.brokery_kg_basis already exists, skipped'' AS status',
  'ALTER TABLE `purchase_invoice` ADD COLUMN `brokery_kg_basis` VARCHAR(5) NOT NULL DEFAULT ''net'' AFTER `brokery_rate_type`'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 2. Customer <-> Supplier linking (used by both the "Linked Supplier/
--    Customer" checkbox on customer-add/edit & supplier-add/edit, AND
--    the "Customer + Supplier (Both)" feature — both share these columns)
-- ---------------------------------------------------------------------
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'is_both') > 0,
  'SELECT ''customers.is_both already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `is_both` TINYINT(1) NOT NULL DEFAULT 0'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'linked_supplier_id') > 0,
  'SELECT ''customers.linked_supplier_id already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `linked_supplier_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'is_both') > 0,
  'SELECT ''suppliers.is_both already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `is_both` TINYINT(1) NOT NULL DEFAULT 0'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'linked_customer_id') > 0,
  'SELECT ''suppliers.linked_customer_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `linked_customer_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 3. "Customer + Supplier (Both)" — extra fields customer-supplier-add.php
--    needs on `customers` (Project, Shop Name, P.O. Box, License #)
-- ---------------------------------------------------------------------
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'project_id') > 0,
  'SELECT ''customers.project_id already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `project_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'shop_name') > 0,
  'SELECT ''customers.shop_name already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `shop_name` VARCHAR(255) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'po_box_no') > 0,
  'SELECT ''customers.po_box_no already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `po_box_no` VARCHAR(50) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'license_no') > 0,
  'SELECT ''customers.license_no already exists, skipped'' AS status',
  'ALTER TABLE `customers` ADD COLUMN `license_no` VARCHAR(100) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 4. "Customer + Supplier (Both)" — extra fields on `suppliers`
--    (Salesman, Project, Brand Name, Credit Days, Party Type, and the
--    full Country/Region/City/City Zone/Area territory used by the new
--    "Supplier Territory" section)
-- ---------------------------------------------------------------------
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'salesman_id') > 0,
  'SELECT ''suppliers.salesman_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `salesman_id` VARCHAR(255) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'project_id') > 0,
  'SELECT ''suppliers.project_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `project_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'brand_name') > 0,
  'SELECT ''suppliers.brand_name already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `brand_name` VARCHAR(255) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'credit_days') > 0,
  'SELECT ''suppliers.credit_days already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `credit_days` INT(11) DEFAULT 0'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'party_type') > 0,
  'SELECT ''suppliers.party_type already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `party_type` ENUM(''registered_company'',''unregistered'') DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'country_id') > 0,
  'SELECT ''suppliers.country_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `country_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'region_id') > 0,
  'SELECT ''suppliers.region_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `region_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'city_id') > 0,
  'SELECT ''suppliers.city_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `city_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'city_zone_id') > 0,
  'SELECT ''suppliers.city_zone_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `city_zone_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'area_id') > 0,
  'SELECT ''suppliers.area_id already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `area_id` INT(11) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- (Older reference builds also have a plain `city` VARCHAR column on
-- suppliers, separate from city_id. The current code no longer writes to
-- it, but it's included here only if some other part of your production
-- app already relies on it — safe to skip if not.)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'city') > 0,
  'SELECT ''suppliers.city already exists, skipped'' AS status',
  'ALTER TABLE `suppliers` ADD COLUMN `city` VARCHAR(255) DEFAULT NULL'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 5. Supplier Categories (new table — Access Management -> Supplier
--    Category dropdown/manage-modal on the "Both" form)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `supplier_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL DEFAULT 0,
  `category_name` varchar(100) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- Done. Verify with:
--   SHOW COLUMNS FROM sale_invoice LIKE 'brokery_kg_basis';
--   SHOW COLUMNS FROM purchase_invoice LIKE 'brokery_kg_basis';
--   SHOW COLUMNS FROM customers LIKE 'is_both';
--   SHOW COLUMNS FROM suppliers LIKE 'is_both';
--   SHOW TABLES LIKE 'supplier_categories';
--
-- IMPORTANT — Access Management: after this runs, go to Admin Panel ->
-- Access Management and enable, for every role that should use it:
--   "New Customer + Supplier (Both)"   (category: Customer / Supplier)
--   "Both (Customer + Supplier) Ledger" (category: Financial Reports)
-- Without this, those two pages will 403 for everyone (this bit them
-- during testing on the local/dev tenant too — it isn't optional).
-- =====================================================================
