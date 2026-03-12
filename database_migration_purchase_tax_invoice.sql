-- Add new columns to purchase_invoice table
ALTER TABLE purchase_invoice 
ADD COLUMN supplier_invoice_date DATE AFTER supplier_invoice_no,
ADD COLUMN rp_total DECIMAL(15,2) DEFAULT 0.00 AFTER remarks,
ADD COLUMN tp_total DECIMAL(15,2) DEFAULT 0.00 AFTER rp_total,
ADD COLUMN discount_total DECIMAL(15,2) DEFAULT 0.00 AFTER tp_total,
ADD COLUMN sales_tax_total DECIMAL(15,2) DEFAULT 0.00 AFTER discount_total,
ADD COLUMN advance_tax_percent DECIMAL(5,2) DEFAULT 0.00 AFTER sales_tax_total,
ADD COLUMN advance_tax DECIMAL(15,2) DEFAULT 0.00 AFTER advance_tax_percent,
ADD COLUMN is_tax TINYINT(1) DEFAULT 1 AFTER net_amount;

-- Add is_tax column to purchase_invoice_items table
ALTER TABLE purchase_invoice_items 
ADD COLUMN is_tax TINYINT(1) DEFAULT 1 AFTER net_amount;

-- Update existing records to set is_tax = 1
UPDATE purchase_invoice SET is_tax = 1 WHERE is_tax IS NULL;
UPDATE purchase_invoice_items SET is_tax = 1 WHERE is_tax IS NULL;