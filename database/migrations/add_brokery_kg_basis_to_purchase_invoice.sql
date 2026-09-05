-- Adds the Net KG / Total KG basis toggle for Brokery calculation on purchase invoices.
-- Default 'net' preserves existing behavior for all current invoices.
ALTER TABLE `purchase_invoice`
    ADD COLUMN `brokery_kg_basis` VARCHAR(5) NOT NULL DEFAULT 'net' AFTER `brokery_rate_type`;
