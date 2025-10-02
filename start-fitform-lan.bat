@echo off
echo ========================================
echo Starting FitForm with LAN Configuration
echo ========================================

echo.
echo [1/3] Starting Backend Server...
cd fitform-backend
start "FitForm Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Starting Frontend Metro Server...
cd ..\fitform-frontend
start "FitForm Frontend" cmd /k "npx expo start --lan --scheme fitform"
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Getting your LAN IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Your LAN IP: %%b
        echo.
        echo ========================================
        echo LAN Configuration Complete!
        echo ========================================
        echo.
        echo Backend URL: http://%%b:8000/api
        echo Frontend URL: exp://%%b:8081
        echo.
        echo To connect your mobile device:
        echo 1. Make sure your phone is on the same WiFi network
        echo 2. Open Expo Go app
        echo 3. Scan the QR code from the Metro server
        echo.
        echo Press any key to continue...
        pause >nul
        goto :end
    )
)

:end
echo.
echo FitForm is now running on your LAN!
echo Check the Metro server window for the QR code.
