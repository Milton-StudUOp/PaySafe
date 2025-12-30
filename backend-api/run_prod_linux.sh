#!/bin/bash

# Production Startup Script for Linux
# Uses Gunicorn with Uvicorn workers for high concurrency (1000+ users)

set -e  # Exit on error

echo "=================================================="
echo "  PAYSAFE BACKEND - PRODUCTION STARTUP (LINUX)"
echo "=================================================="

# Configuration
# Workers = (2 * CPU_CORES) + 1. Adjust as needed.
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
if [ -f "migrations/001_add_payment_status.sql" ]; then
    # Check if DATABASE_URL is set
    if [ -n "$DATABASE_URL" ]; then
        echo "Executing migration via DATABASE_URL..."
        psql "$DATABASE_URL" -f migrations/001_add_payment_status.sql 2>/dev/null || echo "⚠️ Migration may already be applied or failed"
    else
        echo "⚠️ DATABASE_URL not set - skipping automatic migration"
        echo "   Run manually: psql -f migrations/001_add_payment_status.sql"
    fi
else
    echo "No pending migrations found"
fi
echo "✅ Migration step complete"

echo ""
echo "Step 3: Starting Gunicorn server..."
echo "-------------------------------------------"
echo "Workers: $WORKERS"
echo "Address: $HOST:$PORT"
echo ""

# Start Gunicorn
# -w: Number of workers
# -k: Worker class (Uvicorn)
# --timeout: Worker timeout (120s for slow mobile connections)
# --access-logfile: Access logs path
# --error-logfile: Error logs path

exec gunicorn app.main:app \
    -w $WORKERS \
    -k uvicorn.workers.UvicornWorker \
    --bind $HOST:$PORT \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
