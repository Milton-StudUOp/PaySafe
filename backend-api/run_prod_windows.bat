@echo off
setlocal EnableDelayedExpansion

REM Production Startup Script for Windows
REM Uses Uvicorn with multiple workers (since Gunicorn is Linux-only)

echo ==================================================
echo   PAYSAFE BACKEND - PRODUCTION STARTUP (WINDOWS)
echo ==================================================
echo.

REM Configuration
SET WORKERS=4
SET PORT=8000
SET HOST=0.0.0.0

cd /d "%~dp0"

echo Step 1: Installing Python dependencies...
echo -------------------------------------------
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo Step 2: Running database migrations...
echo -------------------------------------------
if exist "migrations\001_add_payment_status.sql" (
    echo Migration file found: 001_add_payment_status.sql
    echo To apply manually, run:
    echo   psql -U your_user -d your_database -f migrations\001_add_payment_status.sql
    echo.
    REM Note: Windows doesn't have easy psql access, so we just notify
) else (
    echo No pending migrations found
)
echo [OK] Migration step complete
echo.

echo Step 3: Starting Uvicorn server...
echo -------------------------------------------
echo Workers: %WORKERS%
echo Address: %HOST%:%PORT%
echo.

REM Start Uvicorn
REM --workers: Number of worker processes
REM --host: Bind address
REM --port: Bind port

uvicorn app.main:app --host %HOST% --port %PORT% --workers %WORKERS%

pause
