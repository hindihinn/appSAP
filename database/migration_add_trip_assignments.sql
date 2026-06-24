-- ============================================
-- MIGRATION: Add trip_assignments & spd_number
-- Jalankan di phpMyAdmin atau MySQL CLI
-- ============================================

USE fleet_management;

-- 1. Tambah kolom spd_number di trip_orders (setelah order_number)
ALTER TABLE trip_orders 
  ADD COLUMN spd_number VARCHAR(60) NULL UNIQUE AFTER order_number,
  ADD COLUMN admin_notes_spd TEXT NULL AFTER admin_notes;

-- 2. Tabel untuk multi-driver/kendaraan per trip
CREATE TABLE IF NOT EXISTS trip_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  unit_id INT,
  sequence_no INT DEFAULT 1,  -- urutan (1 = driver utama)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

CREATE INDEX idx_trip_assignments_trip ON trip_assignments(trip_id);
