-- Units of Measurement (UOM) table for FuelingSys ERP
CREATE TABLE uom (
    id INT(11) NOT NULL AUTO_INCREMENT,
    tenant_id INT(11) NOT NULL,
    uom_name VARCHAR(50) NOT NULL,
    uom_type ENUM('weight', 'volume', 'length', 'count', 'area') NOT NULL,
    base_unit_id INT(11) NULL,
    conversion_factor DECIMAL(18,6) NOT NULL DEFAULT 1.000000,
    is_base_unit TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tenant_id (tenant_id),
    KEY idx_uom_type (uom_type),
    KEY idx_base_unit_id (base_unit_id),
    KEY idx_is_base_unit (is_base_unit),
    CONSTRAINT fk_uom_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_base_unit FOREIGN KEY (base_unit_id) REFERENCES uom(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;