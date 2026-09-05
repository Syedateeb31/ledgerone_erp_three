-- Migration: Add Booking invoice type support
-- This migration adds 'Booking' as a valid invoice type option
-- Booking invoices do NOT deduct stock until they are converted to Cash or Credit

-- Update the sale_invoice table to include 'Booking' in the invoice_type enum
-- Note: The invoice_type column should already exist. This ensures it has the Booking option.

-- If the column doesn't have the enum constraint, you can add it with:
-- ALTER TABLE sale_invoice MODIFY COLUMN invoice_type ENUM('Cash', 'Credit', 'Booking') DEFAULT 'Cash';

-- Or if you want to be safe and just add the column if it doesn't exist:
-- ALTER TABLE sale_invoice ADD COLUMN invoice_type ENUM('Cash', 'Credit', 'Booking') DEFAULT 'Cash' AFTER status;

-- Verify the column exists and has the correct enum values:
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'sale_invoice' AND COLUMN_NAME = 'invoice_type';
