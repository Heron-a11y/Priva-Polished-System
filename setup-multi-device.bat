@echo off
echo ========================================
echo FitForm Multi-Device Setup
echo ========================================
echo.
echo This script will help you set up your FitForm app
echo to run on multiple devices within the same network.
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
echo.
echo ========================================
echo STEP 1: Update Frontend API Configuration
echo ========================================
echo.
echo You need to update the API_BASE_URL in your frontend code.
echo.
echo Open: fitform-frontend/services/api.js
echo Change line 8 to: const API_BASE_URL = 'http://%IP_ADDRESS%:8000/api';
echo.
echo Press any key after you've made this change...
pause >nul

echo.
echo ========================================
echo STEP 2: Start Backend Server
echo ========================================
echo.
echo Starting Laravel backend server...
echo This will make your API accessible at: http://%IP_ADDRESS%:8000
echo.
echo Press any key to start the backend...
pause >nul

cd fitform-backend
start "FitForm Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
cd ..

echo.
echo Backend server started in a new window.
echo Wait a few seconds for it to fully start up.
echo.
echo ========================================
echo STEP 3: Start Frontend Development Server
echo ========================================
echo.
echo Starting Expo development server...
echo This will make your app accessible at: exp://%IP_ADDRESS%:19000
echo.
echo Press any key to start the frontend...
pause >nul

cd fitform-frontend
start "FitForm Frontend" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo Your FitForm app is now accessible on your network:
echo.
echo Backend API: http://%IP_ADDRESS%:8000
echo Frontend App: exp://%IP_ADDRESS%:19000
echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo 1. Make sure your phone is on the same WiFi network
echo 2. Install Expo Go app on your phone
echo 3. Scan the QR code from the frontend window
echo 4. Your app should load on your phone!
echo.
echo ========================================
echo TROUBLESHOOTING:
echo ========================================
echo - If connection fails, check Windows Firewall
echo - Ensure both devices are on the same network
echo - Try manually entering: exp://%IP_ADDRESS%:19000
echo.
echo Press any key to exit...
pause >nul
