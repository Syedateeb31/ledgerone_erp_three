-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 05, 2026 at 05:31 PM
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
-- Table structure for table `payment_terms`
--

CREATE TABLE `payment_terms` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `term_name` varchar(150) NOT NULL,
  `days` int(11) DEFAULT 0 COMMENT 'Due days (0 = immediate/advance)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable payment terms for quotations, invoices, etc.';

--
-- Dumping data for table `payment_terms`
--

INSERT INTO `payment_terms` (`id`, `tenant_id`, `term_name`, `days`, `is_active`, `created_at`) VALUES
(1, 0, '100% Advance', 0, 1, '2026-05-05 11:42:29'),
(2, 0, 'Cash on Delivery', 0, 1, '2026-05-05 11:42:29'),
(3, 0, 'Net 15 Days', 15, 1, '2026-05-05 11:42:29'),
(4, 0, 'Net 30 Days', 30, 1, '2026-05-05 11:42:29'),
(5, 0, 'Net 60 Days', 60, 1, '2026-05-05 11:42:29'),
(6, 0, '50% Advance, 50% Delivery', 0, 1, '2026-05-05 11:42:29'),
(7, 0, 'LC at Sight', 0, 1, '2026-05-05 11:42:29'),
(8, 1, 'new', 0, 1, '2026-05-05 12:09:16');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `payment_terms`
--
ALTER TABLE `payment_terms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pt_tenant` (`tenant_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `payment_terms`
--
ALTER TABLE `payment_terms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
