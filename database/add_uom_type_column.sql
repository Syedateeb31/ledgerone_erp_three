-- Add uom_type column to products table
ALTER TABLE `products` 
ADD COLUMN `uom_type` ENUM('unit', 'group') DEFAULT 'unit' AFTER `default_unit_id`;

-- Update existing records to set uom_type based on existing data
UPDATE `products` 
SET `uom_type` = CASE 
    WHEN `uom_group_id` IS NOT NULL THEN 'group'
    ELSE 'unit'
END;
