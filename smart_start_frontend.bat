@echo off
setlocal
echo ==================================================
echo   PAYSAFE SMART STARTUP (AUTO-CONFIG)
echo ==================================================

REM 1. Get Local IPv4 Address (Looks for "IPv4 Address" line and takes the last token)
for /f "tokens=14" %%a in ('ipconfig ^| findstr "IPv4 Address"') do set IP_ADDRESS=%%a

REM Handle potential cleanup of extracted IP (sometimes it grabs trailing chars)
set IP_ADDRESS=%IP_ADDRESS: =%
set IP_ADDRESS=%IP_ADDRESS: =%

echo Detected Network IP: %IP_ADDRESS%
echo.

REM 2. Update Frontend Environment File
echo Updating config to use %IP_ADDRESS%...
REM echo NEXT_PUBLIC_API_URL=http://%IP_ADDRESS%:8000/api/v1 > frontend-next\.env
echo Skipping .env generation to use dynamic host resolution...

REM 3. Clean Cache (Robust)
if exist "frontend-next\.next" (
    echo Cleaning old cache...
    rmdir /s /q "frontend-next\.next"
)

REM 4. Start Instructions
echo ==================================================
echo   CONFIGURATION UPDATED!
echo   Frontend: http://%IP_ADDRESS%:3000
echo   Backend:  http://%IP_ADDRESS%:8000
echo ==================================================
echo.
echo Launching FRONTEND in production mode...
echo (Ensure Backend is running in another window!)
echo.

cd frontend-next
call npm run build
call npm start
pause
