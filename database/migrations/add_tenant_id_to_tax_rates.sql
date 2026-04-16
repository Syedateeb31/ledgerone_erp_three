-- Add tenant_id column to tax_rates table with default value 0 (system records)
ALTER TABLE tax_rates ADD COLUMN tenant_id BIGINT UNSIGNED DEFAULT 0 AFTER id;

-- Add index for tenant_id for better query performance
ALTER TABLE tax_rates ADD INDEX idx_tenant_tax_rates (tenant_id);

-- Update all existing records to have tenant_id = 0 (system records)
UPDATE tax_rates SET tenant_id = 0 WHERE tenant_id IS NULL;

-- Add foreign key constraint (optional, if tenants table exists)
-- ALTER TABLE tax_rates ADD CONSTRAINT fk_tax_rates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Verify the changes
SELECT COUNT(*) as total_records, COUNT(DISTINCT tenant_id) as distinct_tenants FROM tax_rates;
