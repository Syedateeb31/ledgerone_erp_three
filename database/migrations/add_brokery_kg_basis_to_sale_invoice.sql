-- Adds the Net KG / Total KG basis toggle for Brokery calculation on POS/sale invoices.
-- Default 'net' preserves existing behavior for all current invoices.
ALTER TABLE `sale_invoice`
    ADD COLUMN `brokery_kg_basis` VARCHAR(5) NOT NULL DEFAULT 'net' AFTER `brokery_rate_type`;
