CREATE TABLE IF NOT EXISTS `bill_of_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `finished_good_id` int(11) NOT NULL,
  `version` varchar(20) DEFAULT '1.0',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `finished_good_id` (`finished_good_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bom_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `raw_material_id` (`raw_material_id`),
  KEY `unit_id` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
