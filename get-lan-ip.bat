@echo off
echo ========================================
echo Getting Your LAN IP Address
echo ========================================

echo.
echo Your LAN IP addresses:
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo %%b
    )
)

echo.
echo ========================================
echo LAN Configuration for FitForm
echo ========================================
echo.
echo Backend URL: http://YOUR_IP:8000/api
echo Frontend URL: exp://YOUR_IP:8081
echo.
echo Make sure to:
echo 1. Update the IP in your network configuration
echo 2. Ensure both devices are on the same WiFi network
echo 3. Use the correct IP address in your mobile app
echo.
pause
