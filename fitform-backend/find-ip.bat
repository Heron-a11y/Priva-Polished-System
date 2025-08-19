@echo off
echo ========================================
echo FitForm - Network Configuration Helper
echo ========================================
echo.
echo Finding your computer's IP address...
echo.

REM Get all IPv4 addresses
ipconfig | findstr "IPv4"

echo.
echo ========================================
echo IMPORTANT: Use the IP address that starts with:
echo - 192.168.x.x (most common)
echo - 10.0.x.x
echo - 172.16.x.x
echo ========================================
echo.
echo Next steps:
echo 1. Copy the IP address above
echo 2. Update fitform-frontend/services/api.js
echo 3. Update fitform-backend/start-backend.bat
echo 4. Make sure your phone is on the same WiFi network
echo.
echo Your backend will be accessible at: http://[YOUR_IP]:8000
echo Your frontend will be accessible at: exp://[YOUR_IP]:19000
echo.
pause 