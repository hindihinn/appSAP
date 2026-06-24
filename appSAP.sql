-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 24, 2026 at 08:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fleet_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `code`, `address`, `phone`, `email`, `logo`, `is_active`, `created_at`, `updated_at`) VALUES
(5, 'PT Sinar Alam Plantations', 'SAP', NULL, NULL, NULL, NULL, 1, '2026-06-04 04:04:57', '2026-06-04 04:04:57');

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
  `id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `divisions`
--

INSERT INTO `divisions` (`id`, `unit_id`, `name`, `code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(8, 6, 'Traksi', 'SAHO TK', '', 1, '2026-06-04 04:05:37', '2026-06-04 04:05:37');

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

CREATE TABLE `drivers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `nik` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `emergency_contact` varchar(255) DEFAULT NULL,
  `emergency_phone` varchar(30) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `blood_type` enum('A','B','AB','O') DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `status` enum('available','on_duty','off','inactive') DEFAULT 'available',
  `join_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `drivers`
--

INSERT INTO `drivers` (`id`, `user_id`, `employee_id`, `name`, `nik`, `address`, `phone`, `emergency_contact`, `emergency_phone`, `birth_date`, `photo`, `blood_type`, `unit_id`, `status`, `join_date`, `notes`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 8, '2332', 'Septha', '632125221145', NULL, '0800', NULL, NULL, '1993-06-01', NULL, 'B', 6, 'available', '2026-06-02', NULL, 1, '2026-06-04 04:08:39', '2026-06-08 07:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `driver_assignments`
--

CREATE TABLE `driver_assignments` (
  `id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `assigned_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','ended','temporary') DEFAULT 'active',
  `assigned_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `driver_assignments`
--

INSERT INTO `driver_assignments` (`id`, `driver_id`, `vehicle_id`, `assigned_date`, `end_date`, `status`, `assigned_by`, `notes`, `created_at`, `updated_at`) VALUES
(6, 6, 10, '2026-06-04', NULL, 'active', 1, '', '2026-06-04 04:08:48', '2026-06-04 04:08:48');

-- --------------------------------------------------------

--
-- Table structure for table `driver_legality`
--

CREATE TABLE `driver_legality` (
  `id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `type` enum('sim_a','sim_b1','sim_b2','sim_c','medical_checkup','training_cert') NOT NULL,
  `document_number` varchar(100) DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `expiry_date` date NOT NULL,
  `document_file` varchar(500) DEFAULT NULL,
  `reminder_days` int(11) DEFAULT 30,
  `status` enum('active','expiring_soon','expired') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','danger') DEFAULT 'info',
  `module` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `is_pushed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `module` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `display_name`, `module`, `description`, `created_at`) VALUES
(1, 'vehicles.view', 'Lihat Kendaraan', 'vehicles', NULL, '2026-04-28 08:23:46'),
(2, 'vehicles.create', 'Tambah Kendaraan', 'vehicles', NULL, '2026-04-28 08:23:46'),
(3, 'vehicles.edit', 'Edit Kendaraan', 'vehicles', NULL, '2026-04-28 08:23:46'),
(4, 'vehicles.delete', 'Hapus Kendaraan', 'vehicles', NULL, '2026-04-28 08:23:46'),
(5, 'drivers.view', 'Lihat Driver', 'drivers', NULL, '2026-04-28 08:23:46'),
(6, 'drivers.create', 'Tambah Driver', 'drivers', NULL, '2026-04-28 08:23:46'),
(7, 'drivers.edit', 'Edit Driver', 'drivers', NULL, '2026-04-28 08:23:46'),
(8, 'drivers.delete', 'Hapus Driver', 'drivers', NULL, '2026-04-28 08:23:46'),
(9, 'trips.view', 'Lihat Dinas', 'trips', NULL, '2026-04-28 08:23:46'),
(10, 'trips.create', 'Buat Order Dinas', 'trips', NULL, '2026-04-28 08:23:46'),
(11, 'trips.approve_admin', 'Approve Dinas (Admin)', 'trips', NULL, '2026-04-28 08:23:46'),
(12, 'trips.approve_hrga', 'Approve Dinas (HRGA)', 'trips', NULL, '2026-04-28 08:23:46'),
(13, 'trips.execute', 'Eksekusi Dinas', 'trips', NULL, '2026-04-28 08:23:46'),
(14, 'services.view', 'Lihat Service', 'services', NULL, '2026-04-28 08:23:46'),
(15, 'services.create', 'Buat WO Service', 'services', NULL, '2026-04-28 08:23:46'),
(16, 'services.approve', 'Approve Service', 'services', NULL, '2026-04-28 08:23:46'),
(17, 'reimburse.view', 'Lihat Reimburse', 'reimburse', NULL, '2026-04-28 08:23:46'),
(18, 'reimburse.create', 'Buat Reimburse', 'reimburse', NULL, '2026-04-28 08:23:46'),
(19, 'reimburse.approve', 'Approve Reimburse', 'reimburse', NULL, '2026-04-28 08:23:46'),
(20, 'roles.manage', 'Kelola Role', 'settings', NULL, '2026-04-28 08:23:46'),
(21, 'org.manage', 'Kelola Organisasi', 'settings', NULL, '2026-04-28 08:23:46');

-- --------------------------------------------------------

--
-- Table structure for table `reimbursements`
--

CREATE TABLE `reimbursements` (
  `id` int(11) NOT NULL,
  `reimburse_number` varchar(50) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `driver_id` int(11) NOT NULL,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `status` enum('draft','submitted','reviewed','approved','rejected','paid') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reimbursement_items`
--

CREATE TABLE `reimbursement_items` (
  `id` int(11) NOT NULL,
  `reimbursement_id` int(11) NOT NULL,
  `type` enum('bbm','tol','parkir','makan','penginapan','perbaikan','lainnya') NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `receipt_photo` varchar(500) DEFAULT NULL,
  `receipt_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `platform` varchar(10) DEFAULT 'web'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `is_system`, `created_at`, `updated_at`, `platform`) VALUES
(1, 'super_admin', 'Super Admin', 'Full system access', 1, '2026-04-28 08:23:46', '2026-04-28 08:23:46', 'web'),
(2, 'admin', 'Admin', 'Company administrator', 1, '2026-04-28 08:23:46', '2026-04-28 08:23:46', 'web'),
(3, 'staff_hrga', 'Staff HRGA', 'HR & GA staff for approvals', 1, '2026-04-28 08:23:46', '2026-04-28 08:23:46', 'web'),
(4, 'gudang', 'Staff Gudang', 'Warehouse staff for trip requests', 1, '2026-04-28 08:23:46', '2026-06-10 02:36:45', 'mobile'),
(5, 'driver', 'Driver', 'Vehicle driver', 1, '2026-04-28 08:23:46', '2026-06-10 02:36:45', 'mobile'),
(6, 'staff', 'Staff', 'Users', 0, '2026-06-10 02:39:43', '2026-06-10 02:39:58', 'mobile');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`) VALUES
(21, 1, 1),
(18, 1, 2),
(20, 1, 3),
(19, 1, 4),
(4, 1, 5),
(1, 1, 6),
(3, 1, 7),
(2, 1, 8),
(17, 1, 9),
(15, 1, 10),
(13, 1, 11),
(14, 1, 12),
(16, 1, 13),
(12, 1, 14),
(11, 1, 15),
(10, 1, 16),
(8, 1, 17),
(7, 1, 18),
(6, 1, 19),
(9, 1, 20),
(5, 1, 21),
(44, 2, 1),
(42, 2, 2),
(43, 2, 3),
(34, 2, 5),
(32, 2, 6),
(33, 2, 7),
(41, 2, 9),
(40, 2, 11),
(39, 2, 14),
(38, 2, 15),
(37, 2, 16),
(36, 2, 17),
(35, 2, 19),
(73, 2, 21),
(54, 3, 1),
(48, 3, 5),
(47, 3, 7),
(53, 3, 9),
(52, 3, 12),
(51, 3, 14),
(50, 3, 17),
(49, 3, 19),
(65, 4, 1),
(62, 4, 5),
(64, 4, 9),
(63, 4, 10),
(72, 5, 9),
(71, 5, 13),
(70, 5, 17),
(69, 5, 18);

-- --------------------------------------------------------

--
-- Table structure for table `routine_services`
--

CREATE TABLE `routine_services` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `service_type` varchar(100) NOT NULL,
  `interval_km` int(11) DEFAULT NULL,
  `interval_days` int(11) DEFAULT NULL,
  `last_service_date` date DEFAULT NULL,
  `last_service_km` int(11) DEFAULT NULL,
  `next_service_date` date DEFAULT NULL,
  `next_service_km` int(11) DEFAULT NULL,
  `status` enum('on_schedule','due_soon','overdue') DEFAULT 'on_schedule',
  `auto_create_wo` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_items`
--

CREATE TABLE `service_items` (
  `id` int(11) NOT NULL,
  `work_order_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` enum('part','labor','oil','consumable','other') DEFAULT 'part',
  `quantity` int(11) DEFAULT 1,
  `unit` varchar(20) DEFAULT 'pcs',
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `total_price` decimal(12,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trip_assignments`
--

CREATE TABLE `trip_assignments` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `sequence_no` int(11) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trip_checkpoints`
--

CREATE TABLE `trip_checkpoints` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `sequence_number` int(11) NOT NULL,
  `type` enum('departure','fuel_stop','rest_stop','arrival','unloading','return_departure','return_arrival') NOT NULL,
  `km_reading` int(11) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `location_accuracy` decimal(10,2) DEFAULT NULL,
  `photo_km` varchar(500) DEFAULT NULL,
  `photo_nota` varchar(500) DEFAULT NULL,
  `photo_pump` varchar(500) DEFAULT NULL,
  `photo_activity` varchar(500) DEFAULT NULL,
  `fuel_liters` decimal(10,2) DEFAULT NULL,
  `fuel_cost` decimal(12,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `trip_checkpoints`
--

INSERT INTO `trip_checkpoints` (`id`, `trip_id`, `sequence_number`, `type`, `km_reading`, `latitude`, `longitude`, `address`, `location_accuracy`, `photo_km`, `photo_nota`, `photo_pump`, `photo_activity`, `fuel_liters`, `fuel_cost`, `notes`, `recorded_at`) VALUES
(1, 1, 1, 'departure', 20000, -3.35261000, 114.62921720, 'Lat: -3.35261, Lng: 114.6292172', 20.41, '/uploads/trips/1780650215840-774748184.jpg', NULL, NULL, '/uploads/trips/1780650215940-251580700.jpg', 0.00, 0.00, NULL, '2026-06-05 09:03:36'),
(2, 1, 2, 'fuel_stop', 2005, -3.35260950, 114.62921870, 'Lat: -3.3526095, Lng: 114.6292187', 32.90, '/uploads/trips/1780650373928-685913463.jpg', '/uploads/trips/1780650374013-641425645.jpg', '/uploads/trips/1780650374092-583733752.jpg', NULL, 50.00, 350000.00, NULL, '2026-06-05 09:06:14'),
(3, 1, 3, 'unloading', 2060, -3.35264270, 114.62923840, 'Lat: -3.3526427, Lng: 114.6292384', 39.42, '/uploads/trips/1780650400279-562931017.jpg', NULL, NULL, '/uploads/trips/1780650400388-906573645.jpg', 0.00, 0.00, NULL, '2026-06-05 09:06:40'),
(4, 1, 4, 'return_arrival', 21000, -3.35262250, 114.62917580, 'Lat: -3.3526225, Lng: 114.6291758', 14.22, '/uploads/trips/1780650457796-5030569.jpg', NULL, NULL, '/uploads/trips/1780650457857-743434470.jpg', 0.00, 0.00, NULL, '2026-06-05 09:07:37'),
(5, 2, 1, 'departure', 21000, -3.35260470, 114.62922060, 'Lat: -3.3526047, Lng: 114.6292206', 20.00, '/uploads/trips/1780902654373-168196719.jpg', NULL, NULL, '/uploads/trips/1780902654419-131547585.jpg', 0.00, 0.00, NULL, '2026-06-08 07:10:54'),
(6, 2, 2, 'fuel_stop', 21015, -3.35260470, 114.62922060, 'Lat: -3.3526047, Lng: 114.6292206', 20.00, '/uploads/trips/1780902734145-867156606.jpg', '/uploads/trips/1780902734195-173478223.jpg', '/uploads/trips/1780902734247-357530315.jpg', NULL, 60.00, 1232882.00, NULL, '2026-06-08 07:12:14'),
(7, 2, 3, 'unloading', 21120, -3.35261110, 114.62922720, 'Lat: -3.3526111, Lng: 114.6292272', 16.74, '/uploads/trips/1780902804336-96375517.jpg', NULL, NULL, '/uploads/trips/1780902804359-287838225.jpg', 0.00, 0.00, NULL, '2026-06-08 07:13:24'),
(8, 2, 4, 'return_arrival', 21210, -3.35261140, 114.62920540, 'Lat: -3.3526114, Lng: 114.6292054', 14.57, '/uploads/trips/1780902840467-862455196.jpg', NULL, NULL, '/uploads/trips/1780902840500-463222848.jpg', 0.00, 0.00, NULL, '2026-06-08 07:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `trip_events`
--

CREATE TABLE `trip_events` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `checkpoint_id` int(11) DEFAULT NULL,
  `event_type` enum('kerusakan_kendaraan','ban_bocor','kecelakaan','macet_parah','jalan_rusak','cuaca_buruk','kendala_bongkar','lainnya') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `photo` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT 0,
  `resolution_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trip_orders`
--

CREATE TABLE `trip_orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `spd_number` varchar(60) DEFAULT NULL,
  `requester_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `division_id` int(11) DEFAULT NULL,
  `destination` varchar(500) NOT NULL,
  `destination_address` text DEFAULT NULL,
  `purpose` text NOT NULL,
  `items_description` text DEFAULT NULL,
  `planned_departure` datetime DEFAULT NULL,
  `planned_return` datetime DEFAULT NULL,
  `actual_departure` datetime DEFAULT NULL,
  `actual_return` datetime DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `status` enum('pending','admin_review','hrga_review','approved','in_progress','completed','rejected','cancelled') DEFAULT 'pending',
  `admin_id` int(11) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `admin_notes_spd` text DEFAULT NULL,
  `admin_reviewed_at` timestamp NULL DEFAULT NULL,
  `hrga_id` int(11) DEFAULT NULL,
  `hrga_notes` text DEFAULT NULL,
  `hrga_reviewed_at` timestamp NULL DEFAULT NULL,
  `departure_km` int(11) DEFAULT NULL,
  `arrival_km` int(11) DEFAULT NULL,
  `return_km` int(11) DEFAULT NULL,
  `total_distance` int(11) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `trip_orders`
--

INSERT INTO `trip_orders` (`id`, `order_number`, `spd_number`, `requester_id`, `company_id`, `unit_id`, `division_id`, `destination`, `destination_address`, `purpose`, `items_description`, `planned_departure`, `planned_return`, `actual_departure`, `actual_return`, `vehicle_id`, `driver_id`, `status`, `admin_id`, `admin_notes`, `admin_notes_spd`, `admin_reviewed_at`, `hrga_id`, `hrga_notes`, `hrga_reviewed_at`, `departure_km`, `arrival_km`, `return_km`, `total_distance`, `rejection_reason`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'TRP-20260605-0001', NULL, 11, 5, 6, NULL, 'PT Sinar Alam Plantations - Sinar Alam Head Office', NULL, 'kdpp', '[Butuh 1 Unit] - mau order', '2026-06-06 00:00:00', NULL, '2026-06-05 17:03:35', '2026-06-05 17:07:37', 10, 6, 'completed', 1, '', NULL, '2026-06-05 08:47:01', 1, '', '2026-06-05 08:47:10', 20000, NULL, 21000, 1000, NULL, NULL, '2026-06-05 08:33:10', '2026-06-05 09:07:37'),
(2, 'TRP-20260608-0001', NULL, 11, 5, 6, NULL, 'PT Sinar Alam Plantations - Sinar Alam Head Office', NULL, 'segera', '[Butuh 1 Unit] - Pupuk', '2026-06-09 00:00:00', NULL, '2026-06-08 15:10:54', '2026-06-08 15:14:00', 10, 6, 'completed', 1, 'yg lain full', NULL, '2026-06-08 07:08:51', 1, 'oke', '2026-06-08 07:09:18', 21000, 21120, 21210, 210, NULL, NULL, '2026-06-08 07:08:03', '2026-06-08 07:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `company_id`, `name`, `code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 5, 'Sinar Alam Head Office', 'SAHO', '', 1, '2026-06-04 04:05:19', '2026-06-04 04:05:19');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `division_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `fcm_token` varchar(500) DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  KEY `company_id` (`company_id`),
  KEY `unit_id` (`unit_id`),
  KEY `division_id` (`division_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `avatar`, `role_id`, `company_id`, `unit_id`, `division_id`, `is_active`, `fcm_token`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'superadmin@fleet.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081200000000', NULL, 1, NULL, NULL, NULL, 1, NULL, NULL, '2026-06-04 04:04:57', '2026-06-04 04:04:57'),
(2, 'Admin SAP', 'admin@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567890', NULL, 2, 5, 6, 8, 1, NULL, NULL, '2026-06-04 04:04:57', '2026-06-04 04:04:57'),
(3, 'Budi Santoso', 'hrga@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567891', NULL, 3, 5, 6, 8, 1, NULL, NULL, '2026-06-04 04:04:57', '2026-06-04 04:04:57'),
(8, 'Septha', 'septha@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0800', NULL, 5, 5, 6, 8, 1, NULL, NULL, '2026-06-04 04:04:57', '2026-06-04 04:04:57'),
(11, 'Andi Warehouse', 'gudang@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567892', NULL, 4, 5, 6, 8, 1, NULL, NULL, '2026-06-04 04:04:57', '2026-06-04 04:04:57');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `vehicle_code` varchar(50) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `nopol` varchar(20) NOT NULL,
  `merk` varchar(100) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `type` enum('truck','pickup','van','minibus','sedan','motorcycle','other') DEFAULT 'truck',
  `year` int(11) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `chassis_number` varchar(100) DEFAULT NULL,
  `engine_number` varchar(100) DEFAULT NULL,
  `capacity_ton` decimal(10,2) DEFAULT NULL,
  `fuel_type` enum('solar','pertalite','pertamax','dex') DEFAULT 'solar',
  `photo` varchar(500) DEFAULT NULL,
  `photo_front` varchar(255) DEFAULT NULL,
  `photo_back` varchar(255) DEFAULT NULL,
  `photo_left` varchar(255) DEFAULT NULL,
  `photo_right` varchar(255) DEFAULT NULL,
  `current_km` int(11) DEFAULT 0,
  `status` enum('available','in_use','maintenance','inactive') DEFAULT 'available',
  `ownership` enum('owned','rental','leasing') DEFAULT 'owned',
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `vehicle_code`, `unit_id`, `nopol`, `merk`, `model`, `type`, `year`, `color`, `chassis_number`, `engine_number`, `capacity_ton`, `fuel_type`, `photo`, `photo_front`, `photo_back`, `photo_left`, `photo_right`, `current_km`, `status`, `ownership`, `notes`, `is_active`, `created_at`, `updated_at`) VALUES
(10, '001', 6, 'DA 1056 JV', 'Toyota', 'Fortuner', 'minibus', 2023, 'Putih', '', '', NULL, 'solar', NULL, NULL, NULL, NULL, NULL, 21210, 'available', 'owned', '', 1, '2026-06-04 04:06:50', '2026-06-08 07:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_km_logs`
--

CREATE TABLE `vehicle_km_logs` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `km_reading` int(11) NOT NULL,
  `previous_km` int(11) DEFAULT 0,
  `recorded_date` date NOT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `source` enum('manual','trip','service') DEFAULT 'manual',
  `trip_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_legality`
--

CREATE TABLE `vehicle_legality` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `type` enum('stnk','kir','pajak_tahunan','asuransi','izin_trayek') NOT NULL,
  `document_number` varchar(100) DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `expiry_date` date NOT NULL,
  `document_file` varchar(500) DEFAULT NULL,
  `reminder_days` int(11) DEFAULT 30,
  `status` enum('active','expiring_soon','expired') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_orders`
--

CREATE TABLE `work_orders` (
  `id` int(11) NOT NULL,
  `wo_number` varchar(50) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `service_type` enum('preventive','corrective','emergency','bodywork') NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `workshop_name` varchar(255) DEFAULT NULL,
  `workshop_address` text DEFAULT NULL,
  `mechanic_name` varchar(255) DEFAULT NULL,
  `reported_date` date NOT NULL,
  `started_date` date DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `km_at_service` int(11) DEFAULT NULL,
  `estimated_cost` decimal(12,2) DEFAULT 0.00,
  `actual_cost` decimal(12,2) DEFAULT 0.00,
  `status` enum('draft','pending','approved','in_progress','completed','cancelled') DEFAULT 'draft',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `created_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `before_photo` varchar(500) DEFAULT NULL,
  `after_photo` varchar(500) DEFAULT NULL,
  `document_file` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `divisions`
--
ALTER TABLE `divisions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_division_code` (`unit_id`,`code`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `idx_drivers_status` (`status`),
  ADD KEY `drivers_ibfk_1` (`user_id`),
  ADD KEY `drivers_ibfk_2` (`unit_id`);

--
-- Indexes for table `driver_assignments`
--
ALTER TABLE `driver_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `driver_id` (`driver_id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `driver_legality`
--
ALTER TABLE `driver_legality`
  ADD PRIMARY KEY (`id`),
  ADD KEY `driver_id` (`driver_id`),
  ADD KEY `idx_driver_legality_expiry` (`expiry_date`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`is_read`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `reimbursements`
--
ALTER TABLE `reimbursements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reimburse_number` (`reimburse_number`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_reimbursements_status` (`status`),
  ADD KEY `reimbursements_ibfk_1` (`trip_id`),
  ADD KEY `reimbursements_ibfk_2` (`driver_id`);

--
-- Indexes for table `reimbursement_items`
--
ALTER TABLE `reimbursement_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reimbursement_id` (`reimbursement_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `routine_services`
--
ALTER TABLE `routine_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `service_items`
--
ALTER TABLE `service_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `work_order_id` (`work_order_id`);

--
-- Indexes for table `trip_assignments`
--
ALTER TABLE `trip_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `driver_id` (`driver_id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `idx_trip_assignments_trip` (`trip_id`);

--
-- Indexes for table `trip_checkpoints`
--
ALTER TABLE `trip_checkpoints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_trip_checkpoints_trip` (`trip_id`,`sequence_number`);

--
-- Indexes for table `trip_events`
--
ALTER TABLE `trip_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`),
  ADD KEY `checkpoint_id` (`checkpoint_id`);

--
-- Indexes for table `trip_orders`
--
ALTER TABLE `trip_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD UNIQUE KEY `spd_number` (`spd_number`),
  ADD KEY `requester_id` (`requester_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `hrga_id` (`hrga_id`),
  ADD KEY `idx_trip_orders_status` (`status`),
  ADD KEY `idx_trip_orders_dates` (`planned_departure`,`planned_return`),
  ADD KEY `trip_orders_ibfk_2` (`company_id`),
  ADD KEY `trip_orders_ibfk_3` (`unit_id`),
  ADD KEY `trip_orders_ibfk_4` (`division_id`),
  ADD KEY `trip_orders_ibfk_6` (`driver_id`),
  ADD KEY `trip_orders_ibfk_5` (`vehicle_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_unit_code` (`company_id`,`code`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nopol` (`nopol`),
  ADD KEY `idx_vehicles_status` (`status`),
  ADD KEY `idx_vehicles_unit` (`unit_id`);

--
-- Indexes for table `vehicle_km_logs`
--
ALTER TABLE `vehicle_km_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `vehicle_legality`
--
ALTER TABLE `vehicle_legality`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `idx_vehicle_legality_expiry` (`expiry_date`);

--
-- Indexes for table `work_orders`
--
ALTER TABLE `work_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `wo_number` (`wo_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_work_orders_status` (`status`),
  ADD KEY `work_orders_ibfk_1` (`vehicle_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `divisions`
--
ALTER TABLE `divisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `driver_assignments`
--
ALTER TABLE `driver_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `driver_legality`
--
ALTER TABLE `driver_legality`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `reimbursements`
--
ALTER TABLE `reimbursements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reimbursement_items`
--
ALTER TABLE `reimbursement_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `routine_services`
--
ALTER TABLE `routine_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_items`
--
ALTER TABLE `service_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trip_assignments`
--
ALTER TABLE `trip_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trip_checkpoints`
--
ALTER TABLE `trip_checkpoints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `trip_events`
--
ALTER TABLE `trip_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trip_orders`
--
ALTER TABLE `trip_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `vehicle_km_logs`
--
ALTER TABLE `vehicle_km_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_legality`
--
ALTER TABLE `vehicle_legality`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `work_orders`
--
ALTER TABLE `work_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `divisions`
--
ALTER TABLE `divisions`
  ADD CONSTRAINT `divisions_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `drivers`
--
ALTER TABLE `drivers`
  ADD CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `drivers_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `driver_assignments`
--
ALTER TABLE `driver_assignments`
  ADD CONSTRAINT `driver_assignments_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `driver_assignments_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `driver_assignments_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `driver_legality`
--
ALTER TABLE `driver_legality`
  ADD CONSTRAINT `driver_legality_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reimbursements`
--
ALTER TABLE `reimbursements`
  ADD CONSTRAINT `reimbursements_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trip_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reimbursements_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reimbursements_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `reimbursements_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `reimbursement_items`
--
ALTER TABLE `reimbursement_items`
  ADD CONSTRAINT `reimbursement_items_ibfk_1` FOREIGN KEY (`reimbursement_id`) REFERENCES `reimbursements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `routine_services`
--
ALTER TABLE `routine_services`
  ADD CONSTRAINT `routine_services_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_items`
--
ALTER TABLE `service_items`
  ADD CONSTRAINT `service_items_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `trip_assignments`
--
ALTER TABLE `trip_assignments`
  ADD CONSTRAINT `trip_assignments_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trip_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trip_assignments_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  ADD CONSTRAINT `trip_assignments_ibfk_3` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`),
  ADD CONSTRAINT `trip_assignments_ibfk_4` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`);

--
-- Constraints for table `trip_checkpoints`
--
ALTER TABLE `trip_checkpoints`
  ADD CONSTRAINT `trip_checkpoints_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trip_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `trip_events`
--
ALTER TABLE `trip_events`
  ADD CONSTRAINT `trip_events_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trip_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trip_events_ibfk_2` FOREIGN KEY (`checkpoint_id`) REFERENCES `trip_checkpoints` (`id`);

--
-- Constraints for table `trip_orders`
--
ALTER TABLE `trip_orders`
  ADD CONSTRAINT `trip_orders_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `trip_orders_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trip_orders_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `trip_orders_ibfk_4` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `trip_orders_ibfk_5` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `trip_orders_ibfk_6` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `trip_orders_ibfk_7` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `trip_orders_ibfk_8` FOREIGN KEY (`hrga_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `vehicle_km_logs`
--
ALTER TABLE `vehicle_km_logs`
  ADD CONSTRAINT `vehicle_km_logs_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `vehicle_km_logs_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `vehicle_legality`
--
ALTER TABLE `vehicle_legality`
  ADD CONSTRAINT `vehicle_legality_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `work_orders`
--
ALTER TABLE `work_orders`
  ADD CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `work_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `work_orders_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
