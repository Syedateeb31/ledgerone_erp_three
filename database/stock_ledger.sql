-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Nov 28, 2025 at 10:37 PM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u808919719_client7`
--

-- --------------------------------------------------------

--
-- Table structure for table `stock_ledger`
--

CREATE TABLE `stock_ledger` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` INT NOT NULL,
  `product_id` int(11) NOT NULL,
  `reference_table` varchar(100) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `qty_in` decimal(15,3) DEFAULT 0.000,
  `qty_out` decimal(15,3) DEFAULT 0.000,
  `balance_qty` decimal(15,3) DEFAULT 0.000,
  `unit_cost` decimal(15,4) DEFAULT 0.0000,
  `transaction_type` enum('Purchase Invoice','Purchase Return','Meter Reading','Sales Invoice','Sales Return','Stock Transfer','Stock Adjustment','Opening Stock') NOT NULL,
  `transaction_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `stock_ledger`
--

-- Primary key is automatically indexed

-- Foreign Key Indexes
ALTER TABLE `stock_ledger`
  ADD KEY `fk_stock_ledger_tenant` (`tenant_id`),
  ADD KEY `fk_stock_ledger_branch` (`branch_id`),
  ADD KEY `fk_stock_ledger_product` (`product_id`);

-- Composite indexes for common query patterns
ALTER TABLE `stock_ledger`
  ADD KEY `idx_stock_ledger_tenant_branch` (`tenant_id`, `branch_id`),
  ADD KEY `idx_stock_ledger_product_transaction` (`product_id`, `transaction_type`),
  ADD KEY `idx_stock_ledger_dates` (`transaction_date`, `created_at`),
  ADD KEY `idx_stock_ledger_reference` (`reference_table`, `reference_id`),
  ADD KEY `idx_stock_ledger_transaction_type` (`transaction_type`),
  ADD KEY `idx_stock_ledger_tenant_product` (`tenant_id`, `product_id`),
  ADD KEY `idx_stock_ledger_branch_product` (`branch_id`, `product_id`);

-- Comprehensive composite index for stock balance queries
ALTER TABLE `stock_ledger`
  ADD KEY `idx_stock_ledger_balance_query` (`tenant_id`, `branch_id`, `product_id`, `transaction_date`, `created_at`);

--
-- Foreign Key Constraints
--

ALTER TABLE `stock_ledger`
  ADD CONSTRAINT `fk_stock_ledger_tenant` 
  FOREIGN KEY (`tenant_id`) REFERENCES fuelingsys_public.tenants (`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE,

  ADD CONSTRAINT `fk_stock_ledger_branch` 
  FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

--   Uncomment and execute this once the products table is created.

--   ADD CONSTRAINT `fk_stock_ledger_product` 
--   FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
--   ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;