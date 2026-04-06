-- UOM Groups table
CREATE TABLE IF NOT EXISTS `uom_groups` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) NOT NULL,
  `group_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UOM Group Units mapping table
CREATE TABLE IF NOT EXISTS `uom_group_units` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uom_group_id` INT(11) NOT NULL,
  `uom_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uom_group_id` (`uom_group_id`),
  KEY `uom_id` (`uom_id`),
  FOREIGN KEY (`uom_group_id`) REFERENCES `uom_groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uom_id`) REFERENCES `uom`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add uom_group_id to products table
ALTER TABLE `products` 
ADD COLUMN `uom_group_id` INT(11) NULL DEFAULT NULL AFTER `default_unit_id`,
ADD KEY `uom_group_id` (`uom_group_id`);
