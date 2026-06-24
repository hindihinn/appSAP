-- ============================================
-- FLEET MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================
-- Run this in phpMyAdmin or MySQL CLI
-- ============================================

CREATE DATABASE IF NOT EXISTS fleet_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fleet_management;

-- ============================================
-- ORGANIZATION STRUCTURE
-- ============================================

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(100),
  logo VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_unit_code (company_id, code)
) ENGINE=InnoDB;

CREATE TABLE divisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  UNIQUE KEY unique_division_code (unit_id, code)
) ENGINE=InnoDB;

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system TINYINT(1) DEFAULT 0, -- system roles can't be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL, -- e.g. 'vehicles', 'drivers', 'trips'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
) ENGINE=InnoDB;

-- ============================================
-- USERS & AUTH
-- ============================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  avatar VARCHAR(500),
  role_id INT NOT NULL,
  company_id INT,
  unit_id INT,
  division_id INT,
  is_active TINYINT(1) DEFAULT 1,
  fcm_token VARCHAR(500), -- Firebase Cloud Messaging token for push notifications
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (division_id) REFERENCES divisions(id)
) ENGINE=InnoDB;

-- ============================================
-- VEHICLES
-- ============================================

CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT,
  nopol VARCHAR(20) NOT NULL UNIQUE,
  merk VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  type ENUM('truck','pickup','van','minibus','sedan','motorcycle','other') DEFAULT 'truck',
  year INT,
  color VARCHAR(50),
  chassis_number VARCHAR(100),
  engine_number VARCHAR(100),
  capacity_ton DECIMAL(10,2),
  fuel_type ENUM('solar','pertalite','pertamax','dex') DEFAULT 'solar',
  photo VARCHAR(500),
  current_km INT DEFAULT 0,
  status ENUM('available','in_use','maintenance','inactive') DEFAULT 'available',
  ownership ENUM('owned','rental','leasing') DEFAULT 'owned',
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

CREATE TABLE vehicle_legality (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  type ENUM('stnk','kir','pajak_tahunan','asuransi','izin_trayek') NOT NULL,
  document_number VARCHAR(100),
  issued_date DATE,
  expiry_date DATE NOT NULL,
  document_file VARCHAR(500), -- path to uploaded file (PDF/photo)
  reminder_days INT DEFAULT 30, -- days before expiry to send reminder
  status ENUM('active','expiring_soon','expired') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vehicle_km_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  km_reading INT NOT NULL,
  previous_km INT DEFAULT 0,
  recorded_date DATE NOT NULL,
  recorded_by INT, -- user_id
  photo VARCHAR(500),
  source ENUM('manual','trip','service') DEFAULT 'manual',
  trip_id INT, -- if from trip
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- DRIVERS
-- ============================================

CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT, -- linked to users table
  employee_id VARCHAR(50) UNIQUE, -- NIP/NIK internal
  name VARCHAR(255) NOT NULL,
  nik VARCHAR(20), -- KTP
  address TEXT,
  phone VARCHAR(30),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(30),
  birth_date DATE,
  photo VARCHAR(500),
  blood_type ENUM('A','B','AB','O') DEFAULT NULL,
  unit_id INT,
  status ENUM('available','on_duty','off','inactive') DEFAULT 'available',
  join_date DATE,
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

CREATE TABLE driver_legality (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  type ENUM('sim_a','sim_b1','sim_b2','sim_c','medical_checkup','training_cert') NOT NULL,
  document_number VARCHAR(100),
  issued_date DATE,
  expiry_date DATE NOT NULL,
  document_file VARCHAR(500),
  reminder_days INT DEFAULT 30,
  status ENUM('active','expiring_soon','expired') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE driver_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  end_date DATE,
  status ENUM('active','ended','temporary') DEFAULT 'active',
  assigned_by INT, -- user_id
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- TRIP ORDERS (DINAS)
-- ============================================

CREATE TABLE trip_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL, -- auto-generated: TRP-YYYYMMDD-XXXX
  requester_id INT NOT NULL, -- user from gudang who requested
  company_id INT NOT NULL,
  unit_id INT,
  division_id INT,
  
  -- Destination info
  destination VARCHAR(500) NOT NULL,
  destination_address TEXT,
  purpose TEXT NOT NULL,
  items_description TEXT, -- barang yang dikirim
  
  -- Schedule
  planned_departure DATETIME,
  planned_return DATETIME,
  actual_departure DATETIME,
  actual_return DATETIME,
  
  -- Assignment (filled by admin)
  vehicle_id INT,
  driver_id INT,
  
  -- Status flow: pending -> admin_review -> hrga_review -> approved -> in_progress -> completed
  status ENUM('pending','admin_review','hrga_review','approved','in_progress','completed','rejected','cancelled') DEFAULT 'pending',
  
  -- Admin review
  admin_id INT,
  admin_notes TEXT,
  admin_reviewed_at TIMESTAMP NULL,
  
  -- HRGA review
  hrga_id INT,
  hrga_notes TEXT,
  hrga_reviewed_at TIMESTAMP NULL,
  
  -- Completion
  departure_km INT,
  arrival_km INT,
  return_km INT,
  total_distance INT,
  
  rejection_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (division_id) REFERENCES divisions(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (hrga_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Trip checkpoints: setiap stop/event dalam perjalanan
CREATE TABLE trip_checkpoints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  sequence_number INT NOT NULL, -- urutan checkpoint
  
  type ENUM(
    'departure',        -- berangkat dari kantor
    'fuel_stop',        -- berhenti isi BBM
    'rest_stop',        -- istirahat
    'arrival',          -- sampai lokasi tujuan
    'unloading',        -- bongkar barang
    'return_departure', -- berangkat pulang
    'return_arrival'    -- sampai kantor
  ) NOT NULL,
  
  km_reading INT NOT NULL,
  
  -- Location
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  location_accuracy DECIMAL(10,2), -- in meters
  
  -- Photos (multiple per checkpoint)
  photo_km VARCHAR(500),
  photo_nota VARCHAR(500),     -- nota BBM
  photo_pump VARCHAR(500),     -- mesin pom
  photo_activity VARCHAR(500), -- foto aktivitas (bongkar barang, dll)
  
  -- Fuel info (for fuel_stop)
  fuel_liters DECIMAL(10,2),
  fuel_cost DECIMAL(12,2),
  
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trip_id) REFERENCES trip_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Trip events: kejadian selama perjalanan
CREATE TABLE trip_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  checkpoint_id INT,
  
  event_type ENUM(
    'kerusakan_kendaraan',
    'ban_bocor',
    'kecelakaan',
    'macet_parah',
    'jalan_rusak',
    'cuaca_buruk',
    'kendala_bongkar',
    'lainnya'
  ) NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity ENUM('low','medium','high','critical') DEFAULT 'medium',
  
  photo VARCHAR(500),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  resolved TINYINT(1) DEFAULT 0,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trip_id) REFERENCES trip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (checkpoint_id) REFERENCES trip_checkpoints(id)
) ENGINE=InnoDB;

-- ============================================
-- SERVICES & MAINTENANCE
-- ============================================

CREATE TABLE work_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wo_number VARCHAR(50) UNIQUE NOT NULL, -- WO-YYYYMMDD-XXXX
  vehicle_id INT NOT NULL,
  
  service_type ENUM('preventive','corrective','emergency','bodywork') NOT NULL,
  category VARCHAR(100), -- e.g. 'engine', 'brake', 'tire', 'electrical'
  description TEXT NOT NULL,
  
  -- Workshop info
  workshop_name VARCHAR(255),
  workshop_address TEXT,
  mechanic_name VARCHAR(255),
  
  -- Dates
  reported_date DATE NOT NULL,
  started_date DATE,
  completed_date DATE,
  
  -- KM at service
  km_at_service INT,
  
  -- Cost
  estimated_cost DECIMAL(12,2) DEFAULT 0,
  actual_cost DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status ENUM('draft','pending','approved','in_progress','completed','cancelled') DEFAULT 'draft',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  
  -- Approval
  created_by INT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  
  before_photo VARCHAR(500),
  after_photo VARCHAR(500),
  document_file VARCHAR(500), -- invoice/receipt
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE service_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category ENUM('part','labor','oil','consumable','other') DEFAULT 'part',
  quantity INT DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'pcs',
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE routine_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  service_type VARCHAR(100) NOT NULL, -- e.g. 'Ganti Oli', 'Tune Up', 'Ganti Filter'
  interval_km INT, -- every X km
  interval_days INT, -- every X days
  last_service_date DATE,
  last_service_km INT,
  next_service_date DATE,
  next_service_km INT,
  status ENUM('on_schedule','due_soon','overdue') DEFAULT 'on_schedule',
  auto_create_wo TINYINT(1) DEFAULT 1, -- auto create WO when due
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- REIMBURSEMENTS
-- ============================================

CREATE TABLE reimbursements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reimburse_number VARCHAR(50) UNIQUE NOT NULL, -- RMB-YYYYMMDD-XXXX
  trip_id INT,
  driver_id INT NOT NULL,
  
  total_amount DECIMAL(12,2) DEFAULT 0,
  
  status ENUM('draft','submitted','reviewed','approved','rejected','paid') DEFAULT 'draft',
  
  submitted_at TIMESTAMP NULL,
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  
  rejection_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trip_id) REFERENCES trip_orders(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE reimbursement_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reimbursement_id INT NOT NULL,
  type ENUM('bbm','tol','parkir','makan','penginapan','perbaikan','lainnya') NOT NULL,
  description VARCHAR(500),
  amount DECIMAL(12,2) NOT NULL,
  receipt_photo VARCHAR(500),
  receipt_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','success','danger') DEFAULT 'info',
  module VARCHAR(50), -- 'trip','vehicle','driver','service','reimbursement'
  reference_id INT, -- ID of the related record
  reference_type VARCHAR(50), -- 'trip_order','vehicle_legality', etc.
  is_read TINYINT(1) DEFAULT 0,
  is_pushed TINYINT(1) DEFAULT 0, -- has been pushed to mobile
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_unit ON vehicles(unit_id);
CREATE INDEX idx_vehicle_legality_expiry ON vehicle_legality(expiry_date);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_driver_legality_expiry ON driver_legality(expiry_date);
CREATE INDEX idx_trip_orders_status ON trip_orders(status);
CREATE INDEX idx_trip_orders_dates ON trip_orders(planned_departure, planned_return);
CREATE INDEX idx_trip_checkpoints_trip ON trip_checkpoints(trip_id, sequence_number);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_reimbursements_status ON reimbursements(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
