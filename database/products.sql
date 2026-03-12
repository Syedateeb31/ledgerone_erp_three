-- Products table for FuelingSys ERP
CREATE TABLE products (
    id INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT(11) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    product_type ENUM('physical', 'service') NOT NULL DEFAULT 'physical',
    default_unit_id INT NULL,
    category_id INT NULL,
    subcategory_id INT NULL,
    default_supplier_id INT(11) NULL,
    description TEXT NULL,
    qr_code VARCHAR(255) NULL,
    barcode VARCHAR(255) NULL,
    photo VARCHAR(255) NULL,
    purchase_price DECIMAL(15,4) NULL DEFAULT 0.0000,
    mrp DECIMAL(15,4) NULL DEFAULT 0.0000,
    default_discount DECIMAL(5,2) NULL DEFAULT 0.00,
    min_stock_level DECIMAL(15,3) NULL DEFAULT 0.000,
    max_stock_level DECIMAL(15,3) NULL DEFAULT 0.000,
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_tenant_id (tenant_id),
    KEY idx_product_type (product_type),
    KEY idx_category (category),
    KEY idx_is_active (is_active),
    KEY idx_created_by (created_by),
    KEY idx_default_supplier_id (default_supplier_id),
    CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES fuelingsys_public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_supplier FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    CONSTRAINT fk_products_default_unit_id FOREIGN KEY (default_unit_id) REFERENCES uom(id) ON DELETE RESTRICT
--    CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
--    CONSTRAINT fk_products_subcategory_id FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;