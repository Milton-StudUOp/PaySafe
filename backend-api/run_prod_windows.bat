@echo off
REM Production Startup Script for Windows
REM Uses Uvicorn with multiple workers (since Gunicorn is Linux-only)

REM Configuration
REM Workers = Number of CPU cores. Adjust based on your server.
SET WORKERS=4
SET PORT=8000
SET HOST=0.0.0.0

echo Starting PaySafe Backend in PRODUCTION mode (Windows)...
echo Workers: %WORKERS%
echo Address: %HOST%:%PORT%

REM Start Uvicorn
REM --workers: Number of worker processes (Use only on Prod)
REM --host: Bind address
REM --port: Bind port
REM --no-access-log: Reduce I/O overhead (optional)

uvicorn app.main:app --host %HOST% --port %PORT% --workers %WORKERS%

pause
