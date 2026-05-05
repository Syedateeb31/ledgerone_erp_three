-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 05, 2026 at 05:35 PM
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
-- Table structure for table `quotations`
--

CREATE TABLE `quotations` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `quotation_number` varchar(30) NOT NULL,
  `quotation_date` date NOT NULL,
  `valid_till` date DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `salesman_id` int(11) DEFAULT NULL COMMENT 'FK → employees.id',
  `payment_term_id` int(11) DEFAULT NULL COMMENT 'FK → payment_terms.id',
  `terms_conditions` text DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `so_reference` varchar(100) DEFAULT NULL,
  `status` enum('draft','sent','approved','rejected','converted','cancelled') NOT NULL DEFAULT 'draft',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_sales_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_further_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quotation / Price Offer headers';

--
-- Dumping data for table `quotations`
--

INSERT INTO `quotations` (`id`, `tenant_id`, `quotation_number`, `quotation_date`, `valid_till`, `customer_id`, `contact_person`, `salesman_id`, `payment_term_id`, `terms_conditions`, `remarks`, `so_reference`, `status`, `subtotal`, `total_sales_tax`, `total_further_tax`, `grand_total`, `created_by`, `updated_by`, `created_at`, `updated_at`, `is_deleted`, `deleted_at`) VALUES
(1, 1, 'QTN-0001', '2026-05-05', '2026-05-12', 1, 'new', 15, 8, 'AVAILABILITY: 05 Days after confirmation with purchase order\nVALIDITY: This offer is valid for 5 days thereafter subject to our confirmation\nPAYMENT TERMS: 100% Advance\nPRICES: Ex-works and exclusive of unloading charges\nTAX: Exclusive of all Tax', 'nothing', NULL, 'converted', 2.00, 0.04, 0.00, 2.04, 61, 61, '2026-05-05 13:04:20', '2026-05-05 13:07:34', 0, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_qtn_number_tenant` (`tenant_id`,`quotation_number`),
  ADD KEY `idx_qtn_customer` (`customer_id`),
  ADD KEY `idx_qtn_tenant` (`tenant_id`),
  ADD KEY `idx_qtn_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
