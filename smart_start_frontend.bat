@echo off
setlocal EnableDelayedExpansion

echo ==================================================
echo   PAYSAFE SMART STARTUP - FRONTEND (WINDOWS)
echo ==================================================
echo.

REM 1. Get Local IPv4 Address
for /f "tokens=14" %%a in ('ipconfig ^| findstr "IPv4 Address"') do set IP_ADDRESS=%%a
set IP_ADDRESS=%IP_ADDRESS: =%

echo Detected Network IP: %IP_ADDRESS%
echo.

cd /d "%~dp0"
cd frontend-next

echo Step 1: Installing Node.js dependencies...
echo -------------------------------------------
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM 2. Clean Cache
if exist ".next" (
    echo Step 2: Cleaning old cache...
    rmdir /s /q ".next"
    echo [OK] Cache cleaned
    echo.
)

echo ==================================================
echo   CONFIGURATION READY!
echo   Frontend: http://%IP_ADDRESS%:3000
echo   Backend:  http://%IP_ADDRESS%:8000
echo ==================================================
echo.

echo Step 3: Building production bundle...
echo -------------------------------------------
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

echo Step 4: Starting production server...
echo -------------------------------------------
echo (Ensure Backend is running in another window!)
echo.
call npm start

pause
