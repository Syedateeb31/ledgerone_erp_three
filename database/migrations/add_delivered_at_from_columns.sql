-- Adds:
--   purchase_invoice.delivered_at   (new "Delivered At" input field on Purchase Invoice)
--   sale_invoice.delivered_from     (new "Delivered From" input field on Sale/POS Invoice)
-- Safe to re-run: skips ALTER if the column already exists.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_invoice' AND COLUMN_NAME = 'delivered_at') = 0,
    'ALTER TABLE purchase_invoice ADD COLUMN delivered_at VARCHAR(255) NULL AFTER truck_no',
    'SELECT ''purchase_invoice.delivered_at already exists, skipping'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_invoice' AND COLUMN_NAME = 'delivered_from') = 0,
    'ALTER TABLE sale_invoice ADD COLUMN delivered_from VARCHAR(255) NULL AFTER truck_no',
    'SELECT ''sale_invoice.delivered_from already exists, skipping'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
