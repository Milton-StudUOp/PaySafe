@echo off
REM Production Startup Script for Frontend (Windows)
REM This script ensures the app is built before starting server

echo Starting PaySafe Frontend in PRODUCTION mode...

IF EXIST ".next" (
    echo Build found. Starting server...
) ELSE (
    echo No build found. Building project... (This may take a minute)
    call npm run build
)

REM Start the production server
call npm run start

pause
