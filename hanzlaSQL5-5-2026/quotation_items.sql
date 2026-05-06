-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 05, 2026 at 05:36 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ledgerone_public`
--

-- --------------------------------------------------------

--
-- Table structure for table `quotation_items`
--

CREATE TABLE `quotation_items` (
  `id` int(11) NOT NULL,
  `quotation_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `product_id` int(11) DEFAULT NULL COMMENT 'FK → products.id',
  `item_code` varchar(50) DEFAULT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `pack_type` varchar(20) DEFAULT 'Qty' COMMENT 'Qty / Packing',
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `qty_unit_id` int(11) DEFAULT NULL COMMENT 'FK → units.id (quantity unit)',
  `unit_id` int(11) DEFAULT NULL COMMENT 'FK → units.id (sale unit)',
  `rate` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `excl_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sales_tax_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `sales_tax_amt` decimal(15,2) NOT NULL DEFAULT 0.00,
  `further_tax_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `further_tax_amt` decimal(15,2) NOT NULL DEFAULT 0.00,
  `incl_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items of each quotation';

--
-- Dumping data for table `quotation_items`
--

INSERT INTO `quotation_items` (`id`, `quotation_id`, `tenant_id`, `sort_order`, `product_id`, `item_code`, `item_name`, `description`, `pack_type`, `quantity`, `qty_unit_id`, `unit_id`, `rate`, `excl_tax`, `sales_tax_pct`, `sales_tax_amt`, `further_tax_pct`, `further_tax_amt`, `incl_tax`, `line_total`) VALUES
(1, 1, 1, 1, 37, 'PROD026', 'Emmamactin Benzoate 400ml (1x20)', 'nothing', 'Qty', 1.000, 12, NULL, 2.0000, 2.00, 2.00, 0.04, 0.00, 0.00, 2.04, 2.04);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_qi_quotation` (`quotation_id`),
  ADD KEY `idx_qi_product` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `quotation_items`
--
ALTER TABLE `quotation_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD CONSTRAINT `fk_qi_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
