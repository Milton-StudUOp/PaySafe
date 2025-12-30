#!/bin/bash

# PAYSAFE SMART STARTUP - FRONTEND (LINUX/MAC)
# Auto-detect IP and start frontend in production mode

set -e  # Exit on error

echo "=================================================="
echo "  PAYSAFE SMART STARTUP - FRONTEND (LINUX)"
echo "=================================================="
echo ""

# 1. Get Local IP Address
IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 | awk '{print $7}' | head -1)
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS="localhost"
fi

echo "Detected Network IP: $IP_ADDRESS"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend-next"

echo "Step 1: Installing Node.js dependencies..."
echo "-------------------------------------------"
npm install --silent
echo "✅ Dependencies installed"
echo ""

# 2. Clean Cache
if [ -d ".next" ]; then
    echo "Step 2: Cleaning old cache..."
    rm -rf .next
    echo "✅ Cache cleaned"
    echo ""
fi

echo "=================================================="
echo "  CONFIGURATION READY!"
echo "  Frontend: http://$IP_ADDRESS:3000"
echo "  Backend:  http://$IP_ADDRESS:8000"
echo "=================================================="
echo ""

echo "Step 3: Building production bundle..."
echo "-------------------------------------------"
npm run build
echo "✅ Build complete"
echo ""

echo "Step 4: Starting production server..."
echo "-------------------------------------------"
echo "(Ensure Backend is running in another terminal!)"
echo ""
npm start
