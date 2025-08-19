@echo off
echo ========================================
echo FitForm Backend - Multi-Device Setup
echo ========================================
echo.

REM Get the current IP address automatically
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"192.168"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"10.0"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"172.16"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

:found_ip
set "IP_ADDRESS=%IP_ADDRESS: =%"

echo Current IP Address: %IP_ADDRESS%
echo Backend will be available at: http://%IP_ADDRESS%:8000
echo.
echo ========================================
echo IMPORTANT SETUP STEPS:
echo ========================================
echo 1. Make sure your mobile device is on the same WiFi network
echo 2. Update fitform-frontend/services/api.js with this IP: %IP_ADDRESS%
echo 3. Your phone can access the app via Expo Go using: exp://%IP_ADDRESS%:19000
echo.
echo ========================================
echo Starting Laravel server...
echo ========================================
echo.
echo Server will start on: 0.0.0.0:8000
echo This allows connections from any device on your network
echo.
pause
echo.
php artisan serve --host=0.0.0.0 --port=8000
pause 