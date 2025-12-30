#!/bin/bash

# Production Startup Script for Linux
# Uses Gunicorn with Uvicorn workers for high concurrency (1000+ users)

set -e  # Exit on error

echo "=================================================="
echo "  PAYSAFE BACKEND - PRODUCTION STARTUP (LINUX)"
echo "=================================================="

# Configuration
WORKERS=${WORKERS:-9}
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

echo ""
echo "Step 1: Installing Python dependencies..."
echo "-------------------------------------------"
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"

echo ""
echo "Step 2: Running database migrations..."
echo "-------------------------------------------"
# Parse MySQL connection from DATABASE_URL or use defaults
MYSQL_USER=${MYSQL_USER:-paysafe}
MYSQL_PASS=${MYSQL_PASS:-senha123}
MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_DB=${MYSQL_DB:-paysafe_db}

# Run MySQL migration if file exists
if [ -f "migrations/001_add_payment_status_mysql.sql" ]; then
    echo "Running migration: 001_add_payment_status_mysql.sql"
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" "$MYSQL_DB" < migrations/001_add_payment_status_mysql.sql 2>&1 || echo "⚠️ Migration may already be applied"
    echo "✅ Migration complete"
else
    echo "No migration files found"
fi

echo ""
echo "Step 3: Starting Gunicorn server..."
echo "-------------------------------------------"
echo "Workers: $WORKERS"
echo "Address: $HOST:$PORT"
echo ""

# Start Gunicorn
exec gunicorn app.main:app \
    -w $WORKERS \
    -k uvicorn.workers.UvicornWorker \
    --bind $HOST:$PORT \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
