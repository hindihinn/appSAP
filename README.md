# Fleet Management System (appSAP)

Sistem Manajemen Armada Kendaraan Terpadu berbasis Multi-Platform (Web Admin Dashboard, Mobile Driver App, dan REST API Backend Go).

---

## Arsitektur Aplikasi

| Layanan | Teknologi | Port Container | Port Default Publik |
|---|---|---|---|
| **Web Dashboard** | React 18 + Vite | `1300` | `1300` |
| **Backend API** | Go 1.26 + Gin + GORM / MySQL | `5000` | `1200` |
| **phpMyAdmin** | phpMyAdmin Official Image | `80` | `8085` |
| **Database** | MySQL 8.0 (`fleet_management`) | `3306` | `3310` |

---

## Panduan Cepat Deploy di Server (VPS Linux)

### 1. Clone / Tarik Repository di Server
```bash
git clone https://github.com/hindihinn/appSAP.git
cd appSAP
```

Jika repositori sudah ada di server dan Anda ingin memperbarui ke versi terbaru:
```bash
git pull origin main
```

---

### 2. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi jika diperlukan (misalnya password database atau port):
```ini
DB_HOST=host.docker.internal   # atau 'db' jika menggunakan opsi container MySQL
DB_PORT=3310
DB_USER=root
DB_PASSWORD=Itsapcpka25
DB_NAME=fleet_management
JWT_SECRET=fleet_management_secret_key_2026_sap

API_PORT=1200
WEB_PORT=1300
PMA_PORT=8085
```

---

### 3. Jalankan Aplikasi (Docker)

#### **Opsi A: Menggunakan MySQL yang Sudah Ada di Server / Host (Rekomendasi jika sudah ada DB)**
Jika di server Anda sudah terinstal MySQL pada port `3310` (atau port host lainnya):
```bash
# Pastikan script deploy dapat dieksekusi
chmod +x deploy.sh
./deploy.sh
```
*Atau langsung via Docker Compose:*
```bash
docker compose up -d --build
```

#### **Opsi B: All-in-One Termasuk Container MySQL (Rekomendasi untuk server baru / kosongan)**
Jika server Anda belum memiliki database MySQL terpasang, gunakan konfigurasi All-in-One yang otomatis menjalankan container MySQL dan mengimpor file `fleet_management.sql`:
```bash
chmod +x deploy.sh
./deploy.sh --with-db
```
*Atau langsung via Docker Compose:*
```bash
docker compose -f docker-compose.db.yml up -d --build
```

---

### 4. Akses Layanan Setelah Deploy

Buka browser dan akses menggunakan IP Server Anda:
- **Web Admin Dashboard:** `http://<IP_SERVER>:1300`
- **Backend API:** `http://<IP_SERVER>:1200`
- **phpMyAdmin:** `http://<IP_SERVER>:8085` (User: `root`, Password sesuai `.env`)

---

### 5. Perintah Manajemen Server yang Berguna

- **Melihat status container:**
  ```bash
  docker compose ps
  ```
- **Melihat logs backend secara realtime:**
  ```bash
  docker compose logs -f api
  ```
- **Melihat logs web:**
  ```bash
  docker compose logs -f web
  ```
- **Restart layanan:**
  ```bash
  docker compose restart
  ```
- **Hentikan layanan:**
  ```bash
  docker compose down
  ```
- **Update setelah melakukan perubahan di GitHub:**
  ```bash
  git pull origin main
  docker compose up -d --build
  ```
