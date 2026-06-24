# ARCHITECTURE.md — Fleet Management System (appSAP)

> Dokumen ini dirancang agar AI agent dapat memahami seluruh arsitektur proyek tanpa perlu membaca file satu per satu. Baca dokumen ini terlebih dahulu sebelum menyentuh file mana pun.

---

## 1. Gambaran Umum

**Fleet Management System** adalah sistem manajemen armada kendaraan berbasis multi-platform yang terdiri dari:

| Sub-Project | Teknologi | Tujuan |
|---|---|---|
| `api/` | Node.js + Express + MySQL | REST API backend |
| `web/` | React 18 + Vite | Dashboard admin (browser) |
| `mobile/` | Flutter (Dart) | Aplikasi driver di HP |
| `database/` | MySQL SQL files | Schema & seed data |

**Nama database:** `fleet_management`  
**API berjalan di:** port `5000` (via XAMPP / node)  
**Web berjalan di:** port `5173` (via Vite dev server)

---

## 2. Struktur Direktori Root

```
appSAP/
├── api/          # Node.js REST API
├── web/          # React admin dashboard
├── mobile/       # Flutter mobile app (driver)
├── database/     # SQL schema & seed
└── ARCHITECTURE.md
```

---

## 3. Backend API (`api/`)

### Stack
- **Runtime:** Node.js
- **Framework:** Express 4
- **Database:** MySQL 2
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **File Upload:** Multer → disimpan di `api/uploads/`
- **Validasi:** express-validator

### Entry Point
`api/server.js` — register semua middleware dan route, listen di `PORT=5000`.

### Konfigurasi Environment (`api/.env`)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Itsapcpka25
DB_NAME=fleet_management
DB_PORT=3306
JWT_SECRET=fleet_management_secret_key_2026_sap
JWT_EXPIRES_IN=7d
PORT=5000
UPLOAD_DIR=./uploads
```

### Middleware (`api/middleware/`)
| File | Fungsi |
|---|---|
| `auth.js` | Verifikasi JWT token dari header `Authorization: Bearer <token>` |
| `upload.js` | Konfigurasi Multer untuk file upload (foto, dokumen PDF) |

### Database Connection
`api/config/db.js` — pool connection ke MySQL menggunakan `mysql2`.

### Route Map (semua prefix `/api/`)

| Endpoint Prefix | File Route | Deskripsi |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Login, logout, profile |
| `/api/organizations` | `routes/organizations.js` | CRUD companies, units, divisions |
| `/api/roles` | `routes/roles.js` | CRUD roles & permissions |
| `/api/vehicles` | `routes/vehicles.js` | CRUD kendaraan + upload foto |
| `/api/vehicle-legality` | `routes/vehicleLegality.js` | Dokumen legalitas kendaraan (STNK, KIR, dll) |
| `/api/vehicle-km` | `routes/vehicleKm.js` | Log KM kendaraan |
| `/api/drivers` | `routes/drivers.js` | CRUD data driver |
| `/api/driver-legality` | `routes/driverLegality.js` | Dokumen legalitas driver (SIM, medical, dll) |
| `/api/driver-assignments` | `routes/driverAssignments.js` | Assignment driver ke kendaraan |
| `/api/trips` | `routes/trips.js` | Trip orders + checkpoints + events + SPD (terbesar, ~15KB) |
| `/api/trips/:id/create-dinas` | `routes/trips.js` | Admin buat SPD: generate nomor + multi-driver assignment |
| `/api/trips/:id/assignments` | `routes/trips.js` | Ambil daftar driver/kendaraan per trip |
| `/api/trips/:id/hrga-approve` | `routes/trips.js` | HRGA setujui / tolak SPD |
| `/api/services` | `routes/services.js` | Work orders & routine service maintenance |
| `/api/reimbursements` | `routes/reimbursements.js` | Reimbursement driver |
| `/api/dashboard` | `routes/dashboard.js` | Statistik & ringkasan untuk dashboard |
| `/api/users` | `routes/users.js` | CRUD user web & mobile |
| `/api/health` | (inline server.js) | Health check endpoint |

### File Upload
- URL akses file: `http://[host]:5000/uploads/[filename]`
- Disimpan di: `api/uploads/`

---

## 4. Database (`database/`)

### File
| File | Isi |
|---|---|
| `schema.sql` | DDL lengkap semua tabel (536 baris) |
| `seed.sql` | Data awal (roles, companies, users default, dll) |

### Diagram Tabel (relasi utama)

```
companies
  └── units
        └── divisions

roles ──────────────────┐
users (role_id, company_id, unit_id, division_id)
  └── drivers (user_id) │
                        │
vehicles (unit_id)      │
  ├── vehicle_legality  │   (STNK, KIR, pajak, asuransi, izin_trayek)
  ├── vehicle_km_logs   │
  └── driver_assignments (driver_id, vehicle_id)

trip_orders (requester_id, vehicle_id, driver_id, admin_id, hrga_id)
  ├── trip_assignments  (multi driver: vehicle_id, driver_id, unit_id, sequence_no)  ← BARU
  ├── trip_checkpoints  (departure, fuel_stop, rest_stop, arrival, unloading, return_*)
  └── trip_events       (kerusakan, ban bocor, kecelakaan, dll)

work_orders (vehicle_id, created_by, approved_by)
  └── service_items

routine_services (vehicle_id)

reimbursements (trip_id, driver_id, reviewed_by, approved_by)
  └── reimbursement_items (bbm, tol, parkir, makan, penginapan, perbaikan, lainnya)

notifications (user_id)
```

### Status Flow Penting

**Trip Orders:**
```
pending 
  → [Admin: Create Dinas] → admin_review (spd_number dibuat, trip_assignments diisi)
  → [HRGA: Approval Dinas] → approved
                           ↘ rejected / cancelled
```

**Nomor SPD:** `PJD-{KODE_PT}-{KODE_UNIT}-{YYYYMMDD}-{001}`  
Contoh: `PJD-SAP-LOGISTIK-20260610-001`

**Reimbursements:**
```
draft → submitted → reviewed → approved → paid
                            ↘ rejected
```

**Work Orders:**
```
draft → pending → approved → in_progress → completed / cancelled
```

### Tipe ENUM Penting
- **vehicle.type:** truck, pickup, van, minibus, sedan, motorcycle, other
- **vehicle.status:** available, in_use, maintenance, inactive
- **vehicle.fuel_type:** solar, pertalite, pertamax, dex
- **driver.status:** available, on_duty, off, inactive
- **driver_legality.type:** sim_a, sim_b1, sim_b2, sim_c, medical_checkup, training_cert
- **vehicle_legality.type:** stnk, kir, pajak_tahunan, asuransi, izin_trayek
- **trip_checkpoint.type:** departure, fuel_stop, rest_stop, arrival, unloading, return_departure, return_arrival
- **trip_event.event_type:** kerusakan_kendaraan, ban_bocor, kecelakaan, macet_parah, jalan_rusak, cuaca_buruk, kendala_bongkar, lainnya
- **reimbursement_items.type:** bbm, tol, parkir, makan, penginapan, perbaikan, lainnya

---

## 5. Web Admin Dashboard (`web/`)

### Stack
- **Framework:** React 18 + Vite
- **Routing:** React Router DOM v6
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Icons:** react-icons
- **Notifications:** react-toastify
- **Styling:** Vanilla CSS (`src/index.css`)

### Entry Point
`web/src/main.jsx` → `web/src/App.jsx`

### Autentikasi
- `src/context/AuthContext.jsx` — React Context yang menyimpan user & token
- `src/services/api.js` — Axios instance dengan baseURL ke API backend
- Route yang tidak login akan redirect ke `/login`

### Struktur Halaman (`web/src/pages/`)

| Route Path | Komponen | Modul |
|---|---|---|
| `/` | `Dashboard.jsx` | Statistik ringkasan |
| `/login` | `Login.jsx` | Autentikasi |
| `/vehicles/units` | `VehicleList.jsx` | Manajemen kendaraan (halaman terbesar 32KB) |
| `/vehicles/legality` | `VehicleLegality.jsx` | Legalitas kendaraan |
| `/vehicles/km` | `VehicleKm.jsx` | Log KM kendaraan |
| `/hr/drivers` | `DriverList.jsx` | Daftar driver |
| `/hr/legality` | `DriverLegality.jsx` | Legalitas driver |
| `/hr/management` | `DriverManagement.jsx` | Manajemen driver-vehicle assignment |
| `/trips/create-dinas` | `CreateDinas.jsx` | **[BARU]** Buat SPD dari order pending + multi-driver |
| `/trips/approval` | `ApprovalDinas.jsx` | **[BARU]** Approval HRGA — lihat No Order, Pemohon, SPD |
| `/trips/monitoring` | `TripMonitoring.jsx` | Monitoring trip real-time (19KB) |
| `/trips/report` | `TripReport.jsx` | Laporan trip |
| `/services/work-orders` | `WorkOrder.jsx` | Work order maintenance |
| `/services/routine` | `RoutineService.jsx` | Jadwal servis rutin |
| `/services/management` | `ServiceManagement.jsx` | Manajemen servis |
| `/services/history` | `ServiceHistory.jsx` | Riwayat servis |
| `/reimbursements/monitoring` | `ReimburseMonitoring.jsx` | Monitoring reimburse |
| `/reimbursements/history` | `ReimburseHistory.jsx` | Riwayat reimburse |
| `/settings/organizations` | `Organizations.jsx` | CRUD company/unit/division |
| `/settings/roles` | `Roles.jsx` | CRUD roles |
| `/settings/users/web` | `UserWeb.jsx` | User admin web |
| `/settings/users/mobile` | `UserMobile.jsx` | User driver mobile |

### Komponen Bersama (`web/src/components/`)
- `Layout/` — Layout utama dengan sidebar & header
- `common/` — Komponen reusable

---

## 6. Mobile App Driver (`mobile/`)

### Stack
- **Framework:** Flutter (Dart SDK ^3.10.4)
- **State Management:** Provider pattern
- **HTTP Client:** Dio
- **Storage:** shared_preferences (simpan token & data user)
- **Maps:** flutter_map + latlong2 + geolocator
- **Charts:** fl_chart
- **Image:** image_picker, cached_network_image, photo_view
- **Fonts:** google_fonts
- **Animasi:** animate_do, shimmer

### Entry Point
`mobile/lib/main.dart` → setup Provider, inisialisasi service, jalankan `FleetApp`.

### Konfigurasi API (`mobile/lib/config/api_config.dart`)
```dart
// Ganti baseUrl sesuai environment:
// Android Emulator : http://10.0.2.2:5000/api
// iOS Simulator   : http://localhost:5000/api
// Real Device      : http://192.168.x.x:5000/api  ← IP komputer di Wi-Fi yang sama
static const String baseUrl = 'http://192.168.6.160:5000/api';
static const String imageUrl = 'http://192.168.6.160:5000';
```

### Layanan (`mobile/lib/services/`)
| File | Fungsi |
|---|---|
| `api_service.dart` | Dio HTTP client dasar + token injection |
| `auth_service.dart` | Login, logout, get profile |
| `storage_service.dart` | Wrapper shared_preferences (simpan/baca token & user) |
| `trip_service.dart` | CRUD trip order + checkpoints |
| `vehicle_service.dart` | Ambil data kendaraan & legalitas |

### Providers (`mobile/lib/providers/`)
| File | State yang dikelola |
|---|---|
| `auth_provider.dart` | User yang login, status auth |
| `vehicle_provider.dart` | Daftar kendaraan |
| `trip_provider.dart` | Data trip aktif |

### Model (`mobile/lib/models/`)
| File | Model |
|---|---|
| `user.dart` | User model |
| `vehicle.dart` | Vehicle model |

### Routing (`mobile/lib/config/routes.dart`)
| Route | Screen |
|---|---|
| `/` | `SplashScreen` |
| `/login` | `LoginScreen` |
| `/dashboard` | `DashboardScreen` |
| `/vehicles` | `VehicleListScreen` |
| `/vehicles/legality` | `VehicleLegalityScreen` |
| `/vehicles/km` | `VehicleKmScreen` |
| `/trips/create` | `CreateOrderScreen` |
| `/trips/driver-tasks` | `DriverTasksScreen` |

### Layar (`mobile/lib/screens/`)
| File | Deskripsi |
|---|---|
| `splash_screen.dart` | Loading awal, cek token |
| `login_screen.dart` | Form login driver |
| `dashboard_screen.dart` | Statistik & menu utama driver (17KB) |
| `trips/create_order_screen.dart` | Form buat trip order (18KB, terbesar) |
| `trips/driver_tasks_screen.dart` | Daftar tugas driver |
| `trips/active_trip_stepper_screen.dart` | Stepper checkpoint perjalanan aktif (16KB) |
| `vehicles/vehicle_list_screen.dart` | Daftar kendaraan |
| `vehicles/vehicle_detail_screen.dart` | Detail kendaraan + foto |
| `vehicles/vehicle_legality_screen.dart` | Dokumen legalitas kendaraan |
| `vehicles/vehicle_km_screen.dart` | Input/lihat log KM |

### Widget Bersama (`mobile/lib/widgets/`)
| File | Fungsi |
|---|---|
| `app_bottom_menu.dart` | Bottom navigation bar |
| `app_drawer.dart` | Side drawer menu |
| `photo_viewer.dart` | Viewer foto fullscreen |

---

## 7. Alur Autentikasi

```
User/Driver
  │
  ├─ POST /api/auth/login  {email, password}
  │       ↓
  │   API: cek DB → generate JWT token (7 hari)
  │       ↓
  │   Response: { success, token, user: { id, name, role, ... } }
  │
  ├─ Web: simpan di AuthContext (in-memory)
  └─ Mobile: simpan via StorageService (shared_preferences)

Semua request selanjutnya:
  Header: Authorization: Bearer <token>
  Middleware api/middleware/auth.js memverifikasi token
```

---

## 8. Alur Trip (Perjalanan Dinas)

```
1. Driver (Mobile) buat trip order → POST /api/trips
   Status: pending

2. Admin (Web) buka Create Dinas → POST /api/trips/:id/create-dinas
   - Generate nomor SPD: PJD-{PT}-{UNIT}-{YYYYMMDD}-{001}
   - Assign 1 atau lebih driver+kendaraan (trip_assignments)
   Status: pending → admin_review

3. HRGA (Web) buka Approval Dinas → PUT /api/trips/:id/hrga-approve
   - Lihat No Order, Pemohon, Perusahaan, SPD, semua driver
   - Setujui → Status: approved
   - Tolak → Status: rejected

4. Driver berangkat → POST /api/trips/:id/checkpoints
   Status: approved → in_progress
   (input checkpoint: departure, fuel_stop, rest_stop, arrival, dll)

5. Driver rekap & selesai → PUT /api/trips/:id/complete
   Status: in_progress → completed

6. Driver buat reimbursement → POST /api/reimbursements
   (terkait trip_id)
```

---

## 9. Catatan Penting untuk Developer / AI

1. **File terbesar & paling kompleks:**
   - `api/routes/trips.js` (~15KB) — logika trip paling kompleks, termasuk SPD
   - `web/src/pages/vehicles/VehicleList.jsx` (32KB) — halaman kendaraan paling lengkap
   - `web/src/pages/trips/TripMonitoring.jsx` (19KB) — monitoring trip real-time
   - `web/src/pages/trips/CreateDinas.jsx` — form multi-driver assignment
   - `web/src/pages/trips/ApprovalDinas.jsx` — approval HRGA dengan detail lengkap
   - `mobile/lib/screens/trips/create_order_screen.dart` (18KB)

2. **Tabel baru `trip_assignments`:** 1 trip bisa punya N baris (driver+kendaraan). Field `sequence_no=1` adalah driver utama.

3. **Nomor SPD vs Nomor Order:**
   - `order_number` = TRP-YYYYMMDD-XXXX (dari mobile saat create order)
   - `spd_number` = PJD-PT-UNIT-YYYYMMDD-XXX (dari admin saat Create Dinas)

2. **Konvensi penamaan API response:**
   ```json
   { "success": true/false, "data": {...}, "message": "..." }
   ```

3. **Upload file:** endpoint menggunakan `multipart/form-data`, file disimpan di `api/uploads/`, diakses via `http://[host]:5000/uploads/[filename]`

4. **Roles sistem:** Minimal ada `super_admin`, `admin`, `hrga`, `driver` (lihat `database/seed.sql` untuk data lengkap)

5. **Multi-level organisasi:** companies → units → divisions; user & driver terikat ke unit_id

6. **Legalitas otomatis:** field `status` pada `vehicle_legality` & `driver_legality` bisa: `active`, `expiring_soon`, `expired` — berdasarkan `expiry_date` dan `reminder_days`

7. **Checkpoint foto:** setiap checkpoint perjalanan bisa menyimpan hingga 4 foto (photo_km, photo_nota, photo_pump, photo_activity)

8. **Menjalankan project:**
   ```bash
   # API
   cd api && npm run dev          # nodemon server.js, port 5000

   # Web
   cd web && npm run dev          # Vite dev server, port 5173

   # Mobile
   cd mobile && flutter run       # pastikan device/emulator aktif
   ```

---

*Dokumen ini di-generate otomatis berdasarkan struktur kode aktual. Update jika ada perubahan arsitektur signifikan.*
