CREATE TABLE IF NOT EXISTS `production_expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `expense_number` varchar(50) NOT NULL,
  `production_order_id` int(11) NOT NULL,
  `expense_type` enum('Direct','Indirect') DEFAULT 'Direct',
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reference_table` varchar(100) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `production_order_id` (`production_order_id`),
  KEY `expense_number` (`expense_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `production_expense_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_expense_id` int(11) NOT NULL,
  `expense_account_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `production_expense_id` (`production_expense_id`),
  KEY `expense_account_id` (`expense_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
