-- =====================================================
-- Customer Types Table Creation
-- =====================================================

-- Create customer_types table
CREATE TABLE `customer_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL DEFAULT 0 COMMENT '0 = System, >0 = Tenant specific',
  `type_name` varchar(100) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_type_per_tenant` (`tenant_id`,`type_name`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert system customer types (tenant_id = 0 means locked/system types)
INSERT INTO `customer_types` (`id`, `tenant_id`, `type_name`, `created_by`, `updated_by`) VALUES
(1, 0, 'Retail', NULL, NULL),
(2, 0, 'Wholesale', NULL, NULL),
(3, 0, 'Distributor', NULL, NULL),
(4, 0, 'Corporate', NULL, NULL),
(5, 0, 'Government', NULL, NULL),
(6, 0, 'Individual', NULL, NULL);

-- =====================================================
-- DONE! 
-- customer_type_id column already exists in customers table
-- No other changes needed
-- =====================================================
