#!/bin/bash

# Production Startup Script for Linux
# Uses Gunicorn with Uvicorn workers for high concurrency (1000+ users)

# Configuration
# Workers = (2 * CPU_CORES) + 1. Assuming 4 cores = 9 workers. Adjust as needed.
WORKERS=9
PORT=8000
HOST=0.0.0.0

echo "Starting PaySafe Backend in PRODUCTION mode..."
echo "Workers: $WORKERS"
echo "Address: $HOST:$PORT"

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
