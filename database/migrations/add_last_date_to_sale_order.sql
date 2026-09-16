-- Adds sale_order.last_date - mirrors the existing purchase_order.last_date field/counter
-- feature (Soda Book Buyer) onto Soda Book Seller (Sale Order).
-- Safe to re-run: skips ALTER if the column already exists.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_order' AND COLUMN_NAME = 'last_date') = 0,
    'ALTER TABLE sale_order ADD COLUMN last_date DATE NULL AFTER sale_date',
    'SELECT ''sale_order.last_date already exists, skipping'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
