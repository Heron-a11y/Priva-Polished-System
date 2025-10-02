@echo off
echo ========================================
echo Configuring FitForm for LAN Access
echo ========================================

echo.
echo Detecting your LAN IP address and updating configuration...
echo.

cd fitform-frontend
node configure-lan-ip.js

echo.
echo ========================================
echo LAN Configuration Complete!
echo ========================================
echo.
echo Your FitForm app is now configured for LAN access.
echo.
echo To start the development servers:
echo 1. Run: start-fitform-lan.bat
echo 2. Or run backend and frontend separately:
echo    - start-backend-lan.bat
echo    - start-frontend-lan.bat
echo.
echo To connect your mobile device:
echo 1. Make sure your phone is on the same WiFi network
echo 2. Open Expo Go app
echo 3. Scan the QR code from the Metro server
echo.
pause
