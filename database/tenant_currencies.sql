-- FuelingSys ERP - Tenant Currency Mapping Table
-- Maps tenants to currencies from master currencies table and sets base currency

-- Create the tenant_currencies mapping table
DROP TABLE tenant_currencies;
CREATE TABLE tenant_currencies (
    -- Primary Key
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    
    -- Tenant ID for multi-tenant architecture
    tenant_id INT NOT NULL,
    
    -- Reference to master currency
    currency_id INT NOT NULL,
    
    -- Tenant-specific currency settings
    is_base_currency TINYINT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    -- Constraints
    UNIQUE KEY uk_tenant_currency (tenant_id, currency_id),
    
    -- Foreign Key Relationships
    CONSTRAINT fk_tenant_currencies_tenant 
        FOREIGN KEY (tenant_id) 
        REFERENCES fuelingsys_public.tenants(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
        
    CONSTRAINT fk_tenant_currencies_currency 
        FOREIGN KEY (currency_id) 
        REFERENCES fuelingsys_public.currencies(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_tenant_currencies_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Essential Indexes
CREATE INDEX idx_tenant_currencies_tenant_id ON tenant_currencies(tenant_id);
CREATE INDEX idx_tenant_currencies_currency_id ON tenant_currencies(currency_id);
CREATE INDEX idx_tenant_currencies_is_base ON tenant_currencies(is_base_currency);
CREATE INDEX idx_tenant_currencies_is_active ON tenant_currencies(is_active);
CREATE INDEX idx_tenant_currencies_tenant_active ON tenant_currencies(tenant_id, is_active);

-- Create Trigger to Ensure Only One Base Currency Per Tenant
DELIMITER //
CREATE TRIGGER trg_tenant_currencies_single_base
BEFORE UPDATE ON tenant_currencies
FOR EACH ROW
BEGIN
    IF NEW.is_base_currency = TRUE AND OLD.is_base_currency = FALSE THEN
        -- If setting this currency as base, unset any existing base currency for this tenant
        UPDATE tenant_currencies 
        SET is_base_currency = FALSE 
        WHERE tenant_id = NEW.tenant_id 
        AND id != NEW.id 
        AND is_base_currency = TRUE;
    END IF;
END//
DELIMITER ;

-- Create Trigger for Insert to Handle Base Currency
DELIMITER //
CREATE TRIGGER trg_tenant_currencies_single_base_insert
BEFORE INSERT ON tenant_currencies
FOR EACH ROW
BEGIN
    IF NEW.is_base_currency = TRUE THEN
        -- If inserting a new base currency, unset any existing base currency for this tenant
        UPDATE tenant_currencies 
        SET is_base_currency = FALSE 
        WHERE tenant_id = NEW.tenant_id 
        AND is_base_currency = TRUE;
    END IF;
END//
DELIMITER ;

-- Create Stored Procedure to Add Currency to Tenant
DELIMITER //
DROP PROCEDURE sp_add_currency_to_tenant;
CREATE PROCEDURE sp_add_currency_to_tenant(
    IN p_tenant_id BIGINT,
    IN p_currency_id BIGINT,
    IN p_is_base_currency BOOLEAN,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE existing_base_count INT;
    
    -- Check if there's already a base currency
    IF p_is_base_currency = TRUE THEN
        SELECT COUNT(*) INTO existing_base_count 
        FROM tenant_currencies 
        WHERE tenant_id = p_tenant_id AND is_base_currency = TRUE;
        
        IF existing_base_count > 0 THEN
            -- Unset existing base currency
            UPDATE tenant_currencies 
            SET is_base_currency = FALSE 
            WHERE tenant_id = p_tenant_id AND is_base_currency = TRUE;
        END IF;
    END IF;
    
    -- Insert or update the currency mapping
    INSERT INTO tenant_currencies (
        tenant_id,
        currency_id,
        is_base_currency,
        created_by
    ) VALUES (
        p_tenant_id,
        p_currency_id,
        COALESCE(p_is_base_currency, FALSE),
        p_created_by
    )
    ON DUPLICATE KEY UPDATE
        is_base_currency = VALUES(is_base_currency),
        updated_at = CURRENT_TIMESTAMP;
    
    -- Return success
    SELECT 1 AS success;
END//
DELIMITER ;

-- Create Stored Procedure to Set Base Currency
DELIMITER //
DROP PROCEDURE sp_set_base_currency;
CREATE PROCEDURE sp_set_base_currency(
    IN p_tenant_id BIGINT,
    IN p_currency_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    -- First, unset all base currencies for this tenant
    UPDATE tenant_currencies 
    SET is_base_currency = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id 
    AND is_base_currency = TRUE;
    
    -- Then set the new base currency
    UPDATE tenant_currencies 
    SET is_base_currency = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id 
    AND currency_id = p_currency_id;
    
    -- Return success
    SELECT 1 AS success;
END//
DELIMITER ;

-- Create View for Tenant Currencies with Master Currency Details
DROP VIEW vw_tenant_currencies;
CREATE VIEW vw_tenant_currencies AS
SELECT 
    tc.id,
    tc.tenant_id,
    tc.currency_id,
    pc.code,
    pc.name,
    pc.symbol,
    tc.is_base_currency,
    tc.is_active,
    tc.created_at,
    tc.updated_at
FROM tenant_currencies tc
INNER JOIN fuelingsys_public.currencies pc ON tc.currency_id = pc.id
WHERE tc.is_active = TRUE;

-- Create View for Tenant Base Currency
DROP VIEW vw_tenant_base_currency;
CREATE VIEW vw_tenant_base_currency AS
SELECT 
    tc.tenant_id,
    tc.currency_id,
    pc.code,
    pc.name,
    pc.symbol
FROM tenant_currencies tc
INNER JOIN fuelingsys_public.currencies pc ON tc.currency_id = pc.id
WHERE tc.is_base_currency = TRUE 
  AND tc.is_active = TRUE;

-- Display table structure
DESCRIBE tenant_currencies;

-- Show indexes
SHOW INDEX FROM tenant_currencies;

-- Test the views
SELECT 'Tenant 1 Currencies' as report_type;
SELECT * FROM vw_tenant_currencies WHERE tenant_id = 1;

SELECT 'Tenant 1 Base Currency' as report_type;
SELECT * FROM vw_tenant_base_currency WHERE tenant_id = 1;