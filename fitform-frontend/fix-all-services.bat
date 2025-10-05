@echo off
echo 🛑 Stopping all stuck processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im php.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🧹 Starting Backend Server...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"
start "Backend Server" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo ⏳ Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting Frontend Metro...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
start "Metro Server" cmd /k "npx expo start --clear"

echo.
echo ✅ Both services should now be running!
echo 📱 Check for QR code in Metro window
echo 🌐 Backend should be at http://192.168.1.105:8000
echo.
pause
