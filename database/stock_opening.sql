CREATE TABLE `stock_opening` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `tenant_id` INT NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `opening_qty` decimal(15,3) DEFAULT 0.000,
  `opening_price` decimal(15,4) DEFAULT 0.0000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  
  -- Foreign key constraints
  -- CONSTRAINT `fk_stock_opening_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_opening_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_opening_tenant` FOREIGN KEY (`tenant_id`) REFERENCES fuelingsys_public.tenants (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Essential Indexes
ALTER TABLE `stock_opening`
  ADD KEY `fk_stock_opening_product` (`product_id`),
  ADD KEY `fk_stock_opening_branch` (`branch_id`),
  ADD KEY `fk_stock_opening_tenant` (`tenant_id`);

-- Additional Performance Indexes
CREATE INDEX idx_stock_opening_product_branch ON stock_opening (product_id, branch_id);
CREATE INDEX idx_stock_opening_tenant_branch ON stock_opening (tenant_id, branch_id);
CREATE INDEX idx_stock_opening_created_at ON stock_opening (created_at);
CREATE INDEX idx_stock_opening_tenant_product_date ON stock_opening (tenant_id, product_id, created_at);