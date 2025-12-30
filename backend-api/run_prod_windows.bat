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

REM MySQL connection settings (adjust as needed)
SET MYSQL_USER=paysafe
SET MYSQL_PASS=senha123
SET MYSQL_HOST=localhost
SET MYSQL_DB=paysafe_db

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
if exist "migrations\001_add_payment_status_mysql.sql" (
    echo Running migration: 001_add_payment_status_mysql.sql
    mysql -u%MYSQL_USER% -p%MYSQL_PASS% -h%MYSQL_HOST% %MYSQL_DB% < migrations\001_add_payment_status_mysql.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Migration may already be applied or failed
    ) else (
        echo [OK] Migration applied successfully
    )
) else (
    echo No migration files found
)
echo.

echo Step 3: Starting Uvicorn server...
echo -------------------------------------------
echo Workers: %WORKERS%
echo Address: %HOST%:%PORT%
echo.

uvicorn app.main:app --host %HOST% --port %PORT% --workers %WORKERS%

pause
