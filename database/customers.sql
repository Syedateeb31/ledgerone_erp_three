-- FuelingSys ERP - Customers Table Creation Script
-- This script creates the customers table with proper indexing, constraints, and relationships
-- Created in fuelingsys_tenant database (shared multi-tenant architecture)

-- Create the customers table
CREATE TABLE customers (
    -- Primary Key
    id INT PRIMARY KEY,
    
    -- Tenant ID for multi-tenant architecture (MUST HAVE)
    tenant_id INT NOT NULL,
    
    -- Customer Information
    customer_code VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    
    -- Contact Information
    address TEXT,
    primary_phone VARCHAR(15),
    secondary_phone VARCHAR(15),
    identity_card_no VARCHAR(15),
    email VARCHAR(300),
    
    -- Financial Information
    opening_debit_amount DECIMAL(15,2) DEFAULT 0.00,
    opening_credit_amount DECIMAL(15,2) DEFAULT 0.00,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status and Flags
    is_blacklisted BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED')),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    
    -- Constraints
    UNIQUE KEY uk_customers_tenant_code (tenant_id, customer_code),
    
    -- Foreign Key Relationships
    CONSTRAINT fk_customers_tenant 
        FOREIGN KEY (tenant_id) 
        REFERENCES fuelingsys_public.tenants(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_customers_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_customers_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_customers_deleted_by 
        FOREIGN KEY (deleted_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_customers_phone_format 
        CHECK (primary_phone IS NULL OR primary_phone REGEXP '^[0-9]{1,15}$'),
        
    CONSTRAINT chk_customers_secondary_phone_format 
        CHECK (secondary_phone IS NULL OR secondary_phone REGEXP '^[0-9]{1,15}$'),
        
    CONSTRAINT chk_customers_identity_card_format 
        CHECK (identity_card_no IS NULL OR identity_card_no REGEXP '^[0-9]{1,15}$'),
        
    CONSTRAINT chk_customers_email_format 
        CHECK (email IS NULL OR email LIKE '%@%.%'),
        
    CONSTRAINT chk_customers_name_format 
        CHECK (customer_name REGEXP '^[A-Za-z0-9 ]+$')
);

-- Create Indexes for Optimal Performance
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_customers_customer_name ON customers(customer_name);
CREATE INDEX idx_customers_primary_phone ON customers(primary_phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_is_blacklisted ON customers(is_blacklisted);
CREATE INDEX idx_customers_current_balance ON customers(current_balance);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_updated_at ON customers(updated_at);
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- Composite Indexes for Common Query Patterns
CREATE INDEX idx_customers_tenant_status ON customers(tenant_id, status);
CREATE INDEX idx_customers_tenant_blacklisted ON customers(tenant_id, is_blacklisted);
CREATE INDEX idx_customers_tenant_balance ON customers(tenant_id, current_balance);
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, primary_phone);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);

-- Full-Text Search Index for Customer Name and Address
CREATE FULLTEXT INDEX idx_customers_name_address_ft ON customers(customer_name, address);

-- Create Trigger to Update Current Balance
DELIMITER //
CREATE TRIGGER trg_customers_balance_update
BEFORE UPDATE ON customers
FOR EACH ROW
BEGIN
    -- Calculate current balance based on debit and credit amounts
    SET NEW.current_balance = COALESCE(NEW.opening_debit_amount, 0) - COALESCE(NEW.opening_credit_amount, 0);
    
    -- Auto-update status based on blacklist flag
    IF NEW.is_blacklisted = TRUE THEN
        SET NEW.status = 'BLACKLISTED';
    ELSEIF NEW.is_blacklisted = FALSE AND OLD.status = 'BLACKLISTED' THEN
        SET NEW.status = 'ACTIVE';
    END IF;
    
    -- Update timestamp
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Create Trigger for Insert to Set Current Balance
DELIMITER //
CREATE TRIGGER trg_customers_balance_insert
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
    -- Calculate current balance based on debit and credit amounts
    SET NEW.current_balance = COALESCE(NEW.opening_debit_amount, 0) - COALESCE(NEW.opening_credit_amount, 0);
    
    -- Auto-set status based on blacklist flag
    IF NEW.is_blacklisted = TRUE THEN
        SET NEW.status = 'BLACKLISTED';
    END IF;
END//
DELIMITER ;

-- Create Stored Procedure for Customer Creation
DELIMITER //
CREATE PROCEDURE sp_create_customer(
    IN p_tenant_id BIGINT,
    IN p_customer_code VARCHAR(20),
    IN p_customer_name VARCHAR(255),
    IN p_address TEXT,
    IN p_primary_phone VARCHAR(15),
    IN p_secondary_phone VARCHAR(15),
    IN p_identity_card_no VARCHAR(15),
    IN p_email VARCHAR(300),
    IN p_opening_debit_amount DECIMAL(15,2),
    IN p_opening_credit_amount DECIMAL(15,2),
    IN p_is_blacklisted BOOLEAN,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE new_id BIGINT;
    
    -- Generate new ID (you might use auto-increment in production)
    SELECT COALESCE(MAX(id), 0) + 1 INTO new_id FROM customers WHERE tenant_id = p_tenant_id;
    
    -- Insert the new customer
    INSERT INTO customers (
        id,
        tenant_id,
        customer_code,
        customer_name,
        address,
        primary_phone,
        secondary_phone,
        identity_card_no,
        email,
        opening_debit_amount,
        opening_credit_amount,
        is_blacklisted,
        created_by,
        updated_by
    ) VALUES (
        new_id,
        p_tenant_id,
        p_customer_code,
        p_customer_name,
        p_address,
        p_primary_phone,
        p_secondary_phone,
        p_identity_card_no,
        p_email,
        COALESCE(p_opening_debit_amount, 0),
        COALESCE(p_opening_credit_amount, 0),
        COALESCE(p_is_blacklisted, FALSE),
        p_created_by,
        p_created_by
    );
    
    -- Return the new customer ID
    SELECT new_id AS customer_id;
END//
DELIMITER ;

-- Create View for Active Customers
CREATE VIEW vw_active_customers AS
SELECT 
    id,
    tenant_id,
    customer_code,
    customer_name,
    primary_phone,
    email,
    current_balance,
    created_at
FROM customers
WHERE status = 'ACTIVE' 
  AND deleted_at IS NULL;

-- Create View for Blacklisted Customers
CREATE VIEW vw_blacklisted_customers AS
SELECT 
    id,
    tenant_id,
    customer_code,
    customer_name,
    primary_phone,
    email,
    current_balance,
    created_at,
    updated_at
FROM customers
WHERE is_blacklisted = TRUE 
  AND deleted_at IS NULL;

-- Create View for Customer Financial Summary
CREATE VIEW vw_customer_financial_summary AS
SELECT 
    tenant_id,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customers_with_credit,
    COUNT(CASE WHEN current_balance < 0 THEN 1 END) as customers_with_debit,
    COUNT(CASE WHEN current_balance = 0 THEN 1 END) as customers_with_zero_balance,
    SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END) as total_receivables,
    SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END) as total_payables,
    COUNT(CASE WHEN is_blacklisted = TRUE THEN 1 END) as blacklisted_customers
FROM customers
WHERE deleted_at IS NULL
GROUP BY tenant_id;

-- Insert Sample Data (for testing)
INSERT INTO customers (
    id, tenant_id, customer_code, customer_name, address, primary_phone, 
    secondary_phone, identity_card_no, email, opening_debit_amount, 
    opening_credit_amount, is_blacklisted, created_by, updated_by
) VALUES 
(1, 1, 'CUST-00123', 'John Smith', '123 Main Street, New York, NY', '1234567890', 
 NULL, '123456789012345', 'john.smith@example.com', 1250.50, 0.00, 
 FALSE, 1, 1),
 
(2, 1, 'CUST-00124', 'Sarah Johnson', '456 Oak Avenue, Los Angeles, CA', '2345678901', 
 '0987654321', '234567890123456', 'sarah.j@example.com', 0.00, 500.00, 
 FALSE, 1, 1),
 
(3, 1, 'CUST-00125', 'Michael Brown', '789 Pine Road, Chicago, IL', '3456789012', 
 NULL, '345678901234567', 'm.brown@example.com', 0.00, 0.00, 
 FALSE, 1, 1),
 
(4, 1, 'CUST-00126', 'Emily Davis', '321 Elm Street, Houston, TX', '4567890123', 
 NULL, '456789012345678', 'emily.davis@example.com', 3200.75, 0.00, 
 FALSE, 1, 1),
 
(5, 1, 'CUST-00127', 'Robert Wilson', '654 Maple Drive, Phoenix, AZ', '5678901234', 
 NULL, '567890123456789', 'robert.w@example.com', 0.00, 1200.00, 
 TRUE, 1, 1);

-- Display table structure
DESCRIBE customers;

-- Show indexes
SHOW INDEX FROM customers;

-- Test the views
SELECT 'Active Customers' as report_type;
SELECT * FROM vw_active_customers WHERE tenant_id = 1;

SELECT 'Blacklisted Customers' as report_type;
SELECT * FROM vw_blacklisted_customers WHERE tenant_id = 1;

SELECT 'Financial Summary' as report_type;
SELECT * FROM vw_customer_financial_summary WHERE tenant_id = 1;