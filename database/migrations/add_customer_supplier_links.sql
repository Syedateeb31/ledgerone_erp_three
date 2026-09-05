-- Links a Customer record to a Supplier record when the same real-world party
-- acts as both (e.g. a customer we also buy from, or a supplier we also sell to).
-- Kept as two separate records (not merged) since Receivable and Payable are
-- distinct accounting relationships even for the same party — this table only
-- links them for cross-navigation / one-click "also register as..." convenience.
CREATE TABLE `customer_supplier_links` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `tenant_id` INT(11) NOT NULL,
    `customer_id` INT(11) NOT NULL,
    `supplier_id` INT(11) NOT NULL,
    `created_by` INT(11) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_csl_customer` (`tenant_id`, `customer_id`),
    UNIQUE KEY `uniq_csl_supplier` (`tenant_id`, `supplier_id`),
    KEY `idx_csl_customer` (`customer_id`),
    KEY `idx_csl_supplier` (`supplier_id`),
    CONSTRAINT `fk_csl_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_csl_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
