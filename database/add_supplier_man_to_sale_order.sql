-- Add supplier_man_id column to sale_order table
ALTER TABLE `sale_order` 
ADD COLUMN `supplier_man_id` INT(11) NULL DEFAULT NULL AFTER `sale_officer_id`,
ADD KEY `fk_sale_order_supplier_man` (`supplier_man_id`),
ADD CONSTRAINT `fk_sale_order_supplier_man` FOREIGN KEY (`supplier_man_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
