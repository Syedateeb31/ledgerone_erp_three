-- Add unit_id column to stock_opening table to preserve original unit information
ALTER TABLE stock_opening 
ADD COLUMN unit_id INT NULL AFTER opening_price,
ADD CONSTRAINT fk_stock_opening_unit 
    FOREIGN KEY (unit_id) REFERENCES uom(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_stock_opening_unit ON stock_opening(unit_id);
