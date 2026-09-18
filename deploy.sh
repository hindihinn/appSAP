#!/bin/bash
set -e

echo "=========================================="
echo "   Fleet Management (appSAP) Deploy Script"
echo "=========================================="

# 1. Cek apakah Docker sudah terinstall
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker belum terinstal di server ini!"
    echo "Silakan instal Docker terlebih dahulu dengan perintah:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo "Setelah itu, logout dan login kembali ke SSH server Anda."
    exit 1
fi

# 2. Cek apakah Docker Compose tersedia (v2 atau v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "[ERROR] Docker Compose belum terpasang!"
    echo "Silakan instal dengan: sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
    exit 1
fi

# 3. Pastikan folder uploads tersedia dan memiliki permission yang benar
mkdir -p api/uploads/trips api/uploads/vehicles
chmod -R 777 api/uploads 2>/dev/null || true

# 4. Siapkan file .env jika belum ada
if [ ! -f .env ]; then
    echo "[INFO] File .env belum ditemukan. Menyalin dari .env.example..."
    cp .env.example .env
    echo "[INFO] Silakan sesuaikan .env jika ada konfigurasi khusus."
fi

# 5. Cek argumen --with-db
COMPOSE_FILE="docker-compose.yml"
if [ "$1" == "--with-db" ]; then
    COMPOSE_FILE="docker-compose.db.yml"
    echo "[INFO] Menjalankan deployment All-in-One (termasuk MySQL Container)..."
else
    echo "[INFO] Menjalankan deployment standar (menggunakan MySQL host/server eksternal)..."
    echo "[HINT] Jika server Anda belum ada MySQL, jalankan: ./deploy.sh --with-db"
fi

# 6. Build dan jalankan container
echo "[INFO] Memulai $COMPOSE_CMD build & up..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build

echo "=========================================="
echo "   Deployment Berhasil Dijalankan!"
echo "=========================================="
echo "Layanan aktif:"
echo " - Web Admin Dashboard : http://<IP_SERVER>:1300"
echo " - Backend REST API    : http://<IP_SERVER>:1200"
echo " - phpMyAdmin          : http://<IP_SERVER>:8085"
echo ""
echo "Untuk melihat logs: $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "Untuk menghentikan: $COMPOSE_CMD -f $COMPOSE_FILE down"
echo "=========================================="
