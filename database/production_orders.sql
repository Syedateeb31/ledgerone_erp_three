-- Production Orders Table
CREATE TABLE IF NOT EXISTS `production_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `order_no` varchar(50) NOT NULL,
  `product_id` int(11) NOT NULL,
  `bom_id` int(11) NOT NULL,
  `bom_version` varchar(20) DEFAULT NULL,
  `branch_id` int(11) NOT NULL,
  `machine_id` int(11) DEFAULT NULL,
  `order_qty` decimal(10,2) NOT NULL,
  `status` varchar(20) DEFAULT 'Planned',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `product_id` (`product_id`),
  KEY `bom_id` (`bom_id`),
  KEY `branch_id` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Production Order Materials Table
CREATE TABLE IF NOT EXISTS `production_order_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_order_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `required_qty` decimal(10,2) NOT NULL,
  `issued_qty` decimal(10,2) DEFAULT 0,
  `uom_id` int(11) NOT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `production_order_id` (`production_order_id`),
  KEY `material_id` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
