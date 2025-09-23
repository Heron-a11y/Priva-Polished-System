@echo off
echo ========================================
echo Starting FitForm Development Environment
echo ========================================

echo [1/4] Stopping existing processes...
taskkill /f /im ngrok.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im php.exe >nul 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Starting Laravel backend...
cd fitform-backend
start "FitForm Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
timeout /t 3 /nobreak >nul

echo [3/4] Starting ngrok tunnel...
start "FitForm Ngrok" cmd /k "ngrok start fitform-api --config=ngrok.yml"
timeout /t 5 /nobreak >nul

echo [4/4] Starting frontend...
cd ..\fitform-frontend
start "FitForm Frontend" cmd /k "npx expo start --port 8081 --tunnel --clear"

echo.
echo ✅ Development environment started!
echo.
echo Backend: http://localhost:8000
echo Ngrok: https://6ce230b8c3f9.ngrok-free.app
echo Frontend: http://localhost:8081
echo.
echo 📱 Mobile App:
echo 1. Scan QR code in frontend window
echo 2. App will use ngrok URL automatically
echo.
pause
