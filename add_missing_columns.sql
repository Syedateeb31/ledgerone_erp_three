-- Add missing columns to purchase_invoice_items table
ALTER TABLE purchase_invoice_items 
ADD COLUMN rp_unit_price DECIMAL(15,2) DEFAULT 0.00 AFTER purchase_price,
ADD COLUMN tp_unit_price DECIMAL(15,2) DEFAULT 0.00 AFTER rp_unit_price,
ADD COLUMN rp_total_value DECIMAL(15,2) DEFAULT 0.00 AFTER tp_unit_price,
ADD COLUMN tp_total_value DECIMAL(15,2) DEFAULT 0.00 AFTER rp_total_value,
ADD COLUMN sales_tax DECIMAL(15,2) DEFAULT 0.00 AFTER discount_amount,
ADD COLUMN tp_amount DECIMAL(15,2) DEFAULT 0.00 AFTER sales_tax;
