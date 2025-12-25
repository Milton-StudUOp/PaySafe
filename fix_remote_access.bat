@echo off
echo ==========================================
echo   PAYSAFE REMOTE ACCESS FIX (FIREWALL)
echo ==========================================
echo.
echo Requesting Administrator privileges...
echo.

netsh advfirewall firewall add rule name="PaySafe Backend (8000)" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="PaySafe Frontend (3000)" dir=in action=allow protocol=TCP localport=3000

echo.
echo ==========================================
echo   FIREWALL RULES ADDED SUCCESSFULLY
echo ==========================================
echo.
echo You can now access the system from another device:
echo Frontend: http://192.168.0.103:3000
echo Backend:  http://192.168.0.103:8000
echo.
pause
