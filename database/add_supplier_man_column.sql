-- Add supplier_man_id column to customers table
ALTER TABLE `customers` 
ADD COLUMN `supplier_man_id` INT(11) NULL DEFAULT NULL AFTER `associated_sales_officer_id`,
ADD KEY `fk_customers_supplier_man` (`supplier_man_id`),
ADD CONSTRAINT `fk_customers_supplier_man` FOREIGN KEY (`supplier_man_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
