@echo off
setlocal EnableDelayedExpansion

REM Production Startup Script for Windows (WampServer MySQL)
REM Uses Uvicorn with multiple workers

echo ==================================================
echo   PAYSAFE BACKEND - PRODUCTION STARTUP (WINDOWS)
echo ==================================================
echo.

REM Configuration
SET WORKERS=4
SET PORT=8000
SET HOST=0.0.0.0

REM MySQL connection settings
SET MYSQL_USER=paysafe
SET MYSQL_PASS=senha123
SET MYSQL_HOST=localhost
SET MYSQL_DB=paysafe_db

REM WampServer MySQL path (auto-detect version)
SET WAMP_MYSQL=C:\wamp64\bin\mysql\mysql8.4.7\bin\mysql.exe
IF NOT EXIST "%WAMP_MYSQL%" SET WAMP_MYSQL=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe
IF NOT EXIST "%WAMP_MYSQL%" SET WAMP_MYSQL=C:\wamp64\bin\mysql\mysql8.3.0\bin\mysql.exe
IF NOT EXIST "%WAMP_MYSQL%" SET WAMP_MYSQL=C:\wamp\bin\mysql\mysql8.0.31\bin\mysql.exe
IF NOT EXIST "%WAMP_MYSQL%" SET WAMP_MYSQL=C:\wamp\bin\mysql\mysql5.7.36\bin\mysql.exe

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
    if exist "%WAMP_MYSQL%" (
        echo Found MySQL at: %WAMP_MYSQL%
        echo Running migration: 001_add_payment_status_mysql.sql
        "%WAMP_MYSQL%" -u%MYSQL_USER% -p%MYSQL_PASS% -h%MYSQL_HOST% %MYSQL_DB% < migrations\001_add_payment_status_mysql.sql 2>nul
        if %ERRORLEVEL% NEQ 0 (
            echo [WARN] Migration may already be applied or failed
        ) else (
            echo [OK] Migration applied successfully
        )
    ) else (
        echo [WARN] MySQL not found at WampServer path
        echo        Please run migration manually or add MySQL to PATH
        echo        Expected: %WAMP_MYSQL%
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
