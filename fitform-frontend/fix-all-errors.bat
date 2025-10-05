@echo off
echo 🛑 Stopping all processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im php.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🧹 Clearing Metro cache and temporary files...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"

echo Removing Metro cache...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist InternalBytecode.js del InternalBytecode.js

echo Clearing npm cache...
npm cache clean --force

echo.
echo 🔧 Fixing Laravel backend configuration...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"

echo Updating APP_URL to local IP...
powershell -Command "(Get-Content .env) -replace 'APP_URL=.*', 'APP_URL=http://192.168.1.105:8000' | Set-Content .env"

echo Updating CORS configuration...
powershell -Command "(Get-Content .env) -replace 'CORS_ALLOWED_ORIGINS=.*', 'CORS_ALLOWED_ORIGINS=http://192.168.1.105:8081,http://192.168.1.105:8000' | Set-Content .env"

echo Clearing Laravel cache...
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo Recreating storage link...
php artisan storage:link

echo.
echo 🚀 Starting Backend Server...
start "Backend Server" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo ⏳ Waiting 8 seconds for backend to start...
timeout /t 8 /nobreak >nul

echo.
echo 🧪 Testing backend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.105:8000/api/test' -Method GET -TimeoutSec 10; echo '✅ Backend API working! Status:' $response.StatusCode } catch { echo '❌ Backend API failed:' $_.Exception.Message }"

echo.
echo 🧪 Testing image access...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.105:8000/storage/profiles/profile_5_1759344509.jpg' -Method Head -TimeoutSec 10; echo '✅ Image access working! Status:' $response.StatusCode } catch { echo '❌ Image access failed:' $_.Exception.Message }"

echo.
echo 🚀 Starting Frontend Metro...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
start "Metro Server" cmd /k "npx expo start --clear --reset-cache"

echo.
echo ✅ All services should now be running properly!
echo 📱 Check for QR code in Metro window
echo 🌐 Backend should be at http://192.168.1.105:8000
echo 🖼️ Images should be accessible at http://192.168.1.105:8000/storage/profiles/
echo.
echo 🔍 If you still see errors:
echo 1. Check backend window for Laravel errors
echo 2. Check Metro window for bundling errors
echo 3. Restart your device/emulator
echo.
pause
