USE fleet_management;

-- Roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
('super_admin', 'Super Admin', 'Full system access', 1),
('admin', 'Admin', 'Company administrator', 1),
('staff_hrga', 'Staff HRGA', 'HR & GA staff for approvals', 1),
('gudang', 'Staff Gudang', 'Warehouse staff for trip requests', 1),
('driver', 'Driver', 'Vehicle driver', 1);

-- Permissions
INSERT INTO permissions (name, display_name, module) VALUES
('vehicles.view','Lihat Kendaraan','vehicles'),
('vehicles.create','Tambah Kendaraan','vehicles'),
('vehicles.edit','Edit Kendaraan','vehicles'),
('vehicles.delete','Hapus Kendaraan','vehicles'),
('drivers.view','Lihat Driver','drivers'),
('drivers.create','Tambah Driver','drivers'),
('drivers.edit','Edit Driver','drivers'),
('drivers.delete','Hapus Driver','drivers'),
('trips.view','Lihat Dinas','trips'),
('trips.create','Buat Order Dinas','trips'),
('trips.approve_admin','Approve Dinas (Admin)','trips'),
('trips.approve_hrga','Approve Dinas (HRGA)','trips'),
('trips.execute','Eksekusi Dinas','trips'),
('services.view','Lihat Service','services'),
('services.create','Buat WO Service','services'),
('services.approve','Approve Service','services'),
('reimburse.view','Lihat Reimburse','reimburse'),
('reimburse.create','Buat Reimburse','reimburse'),
('reimburse.approve','Approve Reimburse','reimburse'),
('roles.manage','Kelola Role','settings'),
('org.manage','Kelola Organisasi','settings');

-- Role permissions (super_admin gets all)
INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions;
-- Admin
INSERT INTO role_permissions (role_id, permission_id) SELECT 2, id FROM permissions WHERE name IN ('vehicles.view','vehicles.create','vehicles.edit','drivers.view','drivers.create','drivers.edit','trips.view','trips.approve_admin','services.view','services.create','services.approve','reimburse.view','reimburse.approve');
-- HRGA
INSERT INTO role_permissions (role_id, permission_id) SELECT 3, id FROM permissions WHERE name IN ('vehicles.view','drivers.view','drivers.edit','trips.view','trips.approve_hrga','services.view','reimburse.view','reimburse.approve');
-- Gudang
INSERT INTO role_permissions (role_id, permission_id) SELECT 4, id FROM permissions WHERE name IN ('vehicles.view','drivers.view','trips.view','trips.create');
-- Driver
INSERT INTO role_permissions (role_id, permission_id) SELECT 5, id FROM permissions WHERE name IN ('trips.view','trips.execute','reimburse.view','reimburse.create');

-- Companies
INSERT INTO companies (name, code, address, phone, email) VALUES
('PT Sinar Abadi Perkasa', 'SAP', 'Jl. Industri Raya No. 100, Jakarta Timur', '021-8765432', 'info@sap.co.id'),
('PT Mitra Logistik Nusantara', 'MLN', 'Jl. Raya Bekasi KM 25, Bekasi', '021-7654321', 'info@mln.co.id');

-- Units
INSERT INTO units (company_id, name, code) VALUES
(1, 'Unit Operasional', 'OPS'),
(1, 'Unit Logistik', 'LOG'),
(1, 'Unit Maintenance', 'MTN'),
(2, 'Unit Distribusi', 'DST'),
(2, 'Unit Fleet', 'FLT');

-- Divisions
INSERT INTO divisions (unit_id, name, code) VALUES
(1, 'Divisi Pengiriman Jabodetabek', 'JBD'),
(1, 'Divisi Pengiriman Luar Kota', 'LK'),
(2, 'Divisi Gudang Pusat', 'GDP'),
(2, 'Divisi Gudang Cabang', 'GDC'),
(3, 'Divisi Bengkel', 'BKL'),
(4, 'Divisi Distribusi Jawa', 'DJW'),
(5, 'Divisi Fleet Management', 'FM');

-- Users (password: password123 - bcrypt hash)
INSERT INTO users (name, email, password, phone, role_id, company_id, unit_id, division_id) VALUES
('Admin SAP', 'admin@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567890', 2, 1, 1, 1),
('Budi Santoso', 'hrga@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567891', 3, 1, 1, 1),
('Andi Warehouse', 'gudang@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567892', 4, 1, 2, 3),
('Supardi', 'supardi@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567893', 5, 1, 1, 1),
('Joko Susilo', 'joko@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567894', 5, 1, 1, 1),
('Rahmat Hidayat', 'rahmat@sap.co.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567895', 5, 1, 1, 2),
('Super Admin', 'superadmin@fleet.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081200000000', 1, NULL, NULL, NULL);

-- Vehicles
INSERT INTO vehicles (unit_id, nopol, merk, model, type, year, color, capacity_ton, fuel_type, current_km, status) VALUES
(1, 'B 1234 SAP', 'Mitsubishi', 'Colt Diesel FE 74', 'truck', 2022, 'Kuning', 5.00, 'solar', 45000, 'available'),
(1, 'B 5678 SAP', 'Isuzu', 'Elf NMR 71', 'truck', 2023, 'Putih', 4.00, 'solar', 28000, 'available'),
(1, 'B 9012 SAP', 'Toyota', 'Hilux DC', 'pickup', 2023, 'Hitam', 1.00, 'solar', 15000, 'in_use'),
(2, 'B 3456 SAP', 'Mitsubishi', 'L300', 'van', 2021, 'Putih', 1.50, 'solar', 62000, 'available'),
(2, 'B 7890 SAP', 'Suzuki', 'Carry Pick Up', 'pickup', 2022, 'Hitam', 0.80, 'pertalite', 35000, 'maintenance'),
(1, 'B 2468 SAP', 'Hino', 'Dutro 130 MDL', 'truck', 2021, 'Hijau', 8.00, 'solar', 78000, 'available'),
(4, 'B 1357 MLN', 'Mitsubishi', 'Colt Diesel FE 84', 'truck', 2022, 'Biru', 6.00, 'solar', 52000, 'available'),
(4, 'B 2469 MLN', 'Isuzu', 'Giga FVM', 'truck', 2020, 'Putih', 15.00, 'solar', 120000, 'available');

-- Drivers
INSERT INTO drivers (user_id, employee_id, name, nik, address, phone, blood_type, unit_id, status, join_date) VALUES
(4, 'DRV-001', 'Supardi', '3175012345670001', 'Jl. Mawar No. 10, Jakarta Timur', '081234567893', 'O', 1, 'available', '2020-01-15'),
(5, 'DRV-002', 'Joko Susilo', '3175012345670002', 'Jl. Melati No. 5, Bekasi', '081234567894', 'B', 1, 'available', '2020-03-01'),
(6, 'DRV-003', 'Rahmat Hidayat', '3175012345670003', 'Jl. Kenanga No. 8, Tangerang', '081234567895', 'A', 1, 'on_duty', '2021-06-10'),
(NULL, 'DRV-004', 'Agus Setiawan', '3175012345670004', 'Jl. Dahlia No. 12, Depok', '081234567896', 'AB', 2, 'available', '2019-08-20'),
(NULL, 'DRV-005', 'Dedi Kurniawan', '3175012345670005', 'Jl. Anggrek No. 3, Bogor', '081234567897', 'O', 4, 'available', '2021-11-01');

-- Vehicle Legality
INSERT INTO vehicle_legality (vehicle_id, type, document_number, issued_date, expiry_date, status) VALUES
(1, 'stnk', 'STNK-001-2022', '2022-03-15', '2027-03-15', 'active'),
(1, 'kir', 'KIR-001-2024', '2024-01-10', '2024-07-10', 'expired'),
(1, 'pajak_tahunan', 'PJK-001-2025', '2025-03-15', '2026-03-15', 'active'),
(2, 'stnk', 'STNK-002-2023', '2023-06-20', '2028-06-20', 'active'),
(2, 'kir', 'KIR-002-2025', '2025-01-15', '2025-07-15', 'active'),
(3, 'stnk', 'STNK-003-2023', '2023-09-01', '2028-09-01', 'active'),
(4, 'stnk', 'STNK-004-2021', '2021-04-10', '2026-04-10', 'expiring_soon'),
(5, 'stnk', 'STNK-005-2022', '2022-07-25', '2027-07-25', 'active'),
(6, 'kir', 'KIR-006-2025', '2025-02-01', '2025-08-01', 'active'),
(1, 'asuransi', 'ASR-001-2025', '2025-01-01', '2026-01-01', 'active');

-- Driver Legality
INSERT INTO driver_legality (driver_id, type, document_number, issued_date, expiry_date, status) VALUES
(1, 'sim_b1', 'SIM-B1-001', '2023-05-10', '2028-05-10', 'active'),
(1, 'medical_checkup', 'MCU-001-2025', '2025-01-15', '2026-01-15', 'active'),
(2, 'sim_b1', 'SIM-B1-002', '2022-08-20', '2027-08-20', 'active'),
(3, 'sim_b1', 'SIM-B1-003', '2021-03-15', '2026-03-15', 'expiring_soon'),
(3, 'medical_checkup', 'MCU-003-2024', '2024-06-01', '2025-06-01', 'expiring_soon'),
(4, 'sim_a', 'SIM-A-004', '2023-11-10', '2028-11-10', 'active'),
(5, 'sim_b2', 'SIM-B2-005', '2024-02-28', '2029-02-28', 'active');

-- Driver Assignments
INSERT INTO driver_assignments (driver_id, vehicle_id, assigned_date, status, assigned_by) VALUES
(1, 1, '2024-01-01', 'active', 1),
(2, 2, '2024-01-01', 'active', 1),
(3, 3, '2024-03-15', 'active', 1),
(4, 4, '2024-06-01', 'active', 1),
(5, 7, '2024-06-01', 'active', 1);

-- Trip Orders
INSERT INTO trip_orders (order_number, requester_id, company_id, unit_id, division_id, destination, destination_address, purpose, items_description, planned_departure, planned_return, vehicle_id, driver_id, status, admin_id, hrga_id) VALUES
('TRP-20260415-0001', 3, 1, 2, 3, 'Site Karawang', 'Jl. Industri Karawang KM 5', 'Pengiriman material', 'Semen 50 sak, Besi 20 batang', '2026-04-15 07:00:00', '2026-04-15 18:00:00', 1, 1, 'completed', 1, 2),
('TRP-20260420-0002', 3, 1, 2, 3, 'Site Cikarang', 'Kawasan MM2100 Blok A', 'Pengiriman sparepart', 'Sparepart mesin 5 box', '2026-04-20 06:00:00', '2026-04-20 15:00:00', 2, 2, 'completed', 1, 2),
('TRP-20260425-0003', 3, 1, 2, 3, 'Site Subang', 'Jl. Raya Subang No. 50', 'Pengiriman alat berat', 'Genset 1 unit, Kompresor 2 unit', '2026-04-25 05:00:00', '2026-04-26 20:00:00', 6, 3, 'in_progress', 1, 2),
('TRP-20260428-0004', 3, 1, 2, 4, 'Site Tangerang', 'BSD City Sektor 14', 'Pengiriman furniture', 'Meja kantor 10, Kursi 20', '2026-04-28 07:00:00', '2026-04-28 16:00:00', NULL, NULL, 'pending', NULL, NULL),
('TRP-20260429-0005', 3, 1, 2, 3, 'Site Bogor', 'Jl. Raya Bogor KM 30', 'Pengiriman consumable', 'ATK 10 box, Toner 5 box', '2026-04-29 08:00:00', '2026-04-29 17:00:00', 4, NULL, 'admin_review', 1, NULL);

-- Work Orders
INSERT INTO work_orders (wo_number, vehicle_id, service_type, category, description, workshop_name, reported_date, started_date, completed_date, km_at_service, estimated_cost, actual_cost, status, priority, created_by) VALUES
('WO-20260401-0001', 5, 'corrective', 'engine', 'Overheating mesin, perlu cek radiator dan thermostat', 'Bengkel Jaya Motor', '2026-04-01', '2026-04-02', '2026-04-03', 35000, 2500000, 2200000, 'completed', 'high', 1),
('WO-20260410-0002', 1, 'preventive', 'engine', 'Service berkala 40.000 KM - ganti oli, filter', 'Bengkel Resmi Mitsubishi', '2026-04-10', '2026-04-11', '2026-04-11', 45000, 1500000, 1350000, 'completed', 'medium', 1),
('WO-20260420-0003', 6, 'preventive', 'tire', 'Ganti ban depan kiri-kanan, sudah tipis', 'Toko Ban Sejahtera', '2026-04-20', NULL, NULL, 78000, 4000000, 0, 'pending', 'medium', 1),
('WO-20260425-0004', 3, 'corrective', 'brake', 'Rem berdecit, perlu ganti kampas rem', 'Bengkel Jaya Motor', '2026-04-25', '2026-04-26', NULL, 15000, 800000, 0, 'in_progress', 'high', 1);

-- Service Items
INSERT INTO service_items (work_order_id, item_name, category, quantity, unit, unit_price, total_price) VALUES
(1, 'Radiator Assy', 'part', 1, 'pcs', 1500000, 1500000),
(1, 'Thermostat', 'part', 1, 'pcs', 350000, 350000),
(1, 'Coolant', 'consumable', 2, 'liter', 75000, 150000),
(1, 'Jasa Service', 'labor', 1, 'job', 200000, 200000),
(2, 'Oli Mesin 10W-40', 'oil', 8, 'liter', 85000, 680000),
(2, 'Filter Oli', 'part', 1, 'pcs', 120000, 120000),
(2, 'Filter Solar', 'part', 1, 'pcs', 150000, 150000),
(2, 'Jasa Service', 'labor', 1, 'job', 400000, 400000);

-- Routine Services
INSERT INTO routine_services (vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, status) VALUES
(1, 'Ganti Oli Mesin', 10000, 90, '2026-04-11', 45000, '2026-07-10', 55000, 'on_schedule'),
(1, 'Ganti Filter Solar', 20000, 180, '2026-04-11', 45000, '2026-10-08', 65000, 'on_schedule'),
(2, 'Ganti Oli Mesin', 10000, 90, '2026-01-15', 20000, '2026-04-15', 30000, 'due_soon'),
(3, 'Tune Up', 15000, 120, '2025-12-01', 10000, '2026-03-31', 25000, 'overdue'),
(6, 'Ganti Oli Mesin', 10000, 90, '2025-11-01', 70000, '2026-01-30', 80000, 'overdue');

-- Reimbursements
INSERT INTO reimbursements (reimburse_number, trip_id, driver_id, total_amount, status, submitted_at) VALUES
('RMB-20260416-0001', 1, 1, 385000, 'paid', '2026-04-16 09:00:00'),
('RMB-20260421-0002', 2, 2, 275000, 'approved', '2026-04-21 10:00:00'),
('RMB-20260425-0003', 3, 3, 150000, 'submitted', '2026-04-25 14:00:00');

-- Reimbursement Items
INSERT INTO reimbursement_items (reimbursement_id, type, description, amount, receipt_date) VALUES
(1, 'bbm', 'Solar 30 liter di SPBU Cikampek', 180000, '2026-04-15'),
(1, 'tol', 'Tol Jakarta-Karawang PP', 120000, '2026-04-15'),
(1, 'makan', 'Makan siang driver', 35000, '2026-04-15'),
(1, 'parkir', 'Parkir di site', 50000, '2026-04-15'),
(2, 'bbm', 'Solar 25 liter di SPBU Cikarang', 150000, '2026-04-20'),
(2, 'tol', 'Tol Jakarta-Cikarang PP', 90000, '2026-04-20'),
(2, 'makan', 'Makan siang', 35000, '2026-04-20'),
(3, 'bbm', 'Solar 20 liter', 120000, '2026-04-25'),
(3, 'makan', 'Makan siang', 30000, '2026-04-25');
