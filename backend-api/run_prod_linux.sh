#!/bin/bash

# Production Startup Script for Linux
# Uses Gunicorn with Uvicorn workers for high concurrency

set -e  # Exit on error

echo "=================================================="
echo "  PAYSAFE BACKEND - PRODUCTION STARTUP (LINUX)"
echo "=================================================="

# Configuration
WORKERS=${WORKERS:-9}
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# MySQL connection settings
MYSQL_USER=${MYSQL_USER:-paysafe}
MYSQL_PASS=${MYSQL_PASS:-senha123}
MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_DB=${MYSQL_DB:-paysafe_db}

cd "$SCRIPT_DIR"

echo ""
echo "Step 1: Installing Python dependencies..."
echo "-------------------------------------------"
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"

echo ""
echo "Step 2: Running database migrations..."
echo "-------------------------------------------"

# Check if mysql client is available
if command -v mysql &> /dev/null; then
    if [ -f "migrations/001_add_payment_status_mysql.sql" ]; then
        echo "Running migration: 001_add_payment_status_mysql.sql"
        mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -h"$MYSQL_HOST" "$MYSQL_DB" < migrations/001_add_payment_status_mysql.sql 2>/dev/null || echo "⚠️ Migration may already be applied"
        echo "✅ Migration complete"
    else
        echo "No migration files found"
    fi
else
    echo "⚠️ MySQL client not found in PATH"
    echo "   Please run migration manually:"
    echo "   mysql -u$MYSQL_USER -p -h$MYSQL_HOST $MYSQL_DB < migrations/001_add_payment_status_mysql.sql"
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
