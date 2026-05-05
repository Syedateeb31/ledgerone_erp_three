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
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `lead_code` varchar(255) NOT NULL,
  `lead_source` varchar(50) NOT NULL,
  `lead_date` date NOT NULL,
  `lead_status` varchar(50) NOT NULL,
  `contact_name` varchar(255) NOT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `email` varchar(255) DEFAULT NULL,
  `primary_cell_no` varchar(20) DEFAULT NULL,
  `secondary_cell_no` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `interested_service_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `company_name` varchar(255) DEFAULT NULL,
  `whatsapp` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `service_type_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `tenant_id`, `lead_code`, `lead_source`, `lead_date`, `lead_status`, `contact_name`, `business_name`, `priority`, `email`, `primary_cell_no`, `secondary_cell_no`, `address`, `interested_service_id`, `created_at`, `updated_at`, `is_deleted`, `company_name`, `whatsapp`, `remarks`, `service_type_id`, `created_by`, `updated_by`) VALUES
(0, 1, 'LED001', 'Cold Call', '2026-05-05', 'new', 'name', NULL, 'medium', 'email@gmail.com', NULL, NULL, NULL, NULL, '2026-05-05 15:19:56', '2026-05-05 15:19:56', 0, 'name', '03487892374897', NULL, 1, 61, 61);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
