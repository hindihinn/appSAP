#!/bin/bash
set -e

echo "=========================================="
echo "   Fleet Management (appSAP) Deploy Script"
echo "=========================================="

# 1. Pastikan folder uploads tersedia dan memiliki permission yang benar
mkdir -p api/uploads/trips api/uploads/vehicles
chmod -R 777 api/uploads 2>/dev/null || true

# 2. Siapkan file .env jika belum ada
if [ ! -f .env ]; then
    echo "[INFO] File .env belum ditemukan. Menyalin dari .env.example..."
    cp .env.example .env
    echo "[INFO] Silakan sesuaikan .env jika ada konfigurasi khusus."
fi

# 3. Cek argumen --with-db
COMPOSE_FILE="docker-compose.yml"
if [ "$1" == "--with-db" ]; then
    COMPOSE_FILE="docker-compose.db.yml"
    echo "[INFO] Menjalankan deployment All-in-One (termasuk MySQL Container)..."
else
    echo "[INFO] Menjalankan deployment standar (menggunakan MySQL host/server eksternal)..."
    echo "[HINT] Jika server Anda belum ada MySQL, jalankan: ./deploy.sh --with-db"
fi

# 4. Build dan jalankan container
echo "[INFO] Memulai docker compose build & up..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "=========================================="
echo "   Deployment Berhasil Dijalankan!"
echo "=========================================="
echo "Layanan aktif:"
echo " - Web Admin Dashboard : http://<IP_SERVER>:1300"
echo " - Backend REST API    : http://<IP_SERVER>:1200"
echo " - phpMyAdmin          : http://<IP_SERVER>:8085"
echo ""
echo "Untuk melihat logs: docker compose -f $COMPOSE_FILE logs -f"
echo "Untuk menghentikan: docker compose -f $COMPOSE_FILE down"
echo "=========================================="
