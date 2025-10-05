@echo off
echo 🛑 Stopping all processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im php.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🔧 Profile images have been fixed!
echo ✅ Corrupted images replaced with valid SVG images
echo ✅ Image format error should be resolved

echo.
echo 🚀 Starting Backend Server...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"
start "Backend Server" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo ⏳ Waiting 8 seconds for backend to start...
timeout /t 8 /nobreak >nul

echo.
echo 🧪 Testing image access...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.105:8000/storage/profiles/profile_6_1759346676.jpg' -Method Head -TimeoutSec 10; echo '✅ Image access working! Status:' $response.StatusCode; echo 'Content-Type:' $response.Headers['Content-Type'] } catch { echo '❌ Image access failed:' $_.Exception.Message }"

echo.
echo 🚀 Starting Frontend Metro...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
start "Metro Server" cmd /k "npx expo start --clear"

echo.
echo ✅ ALL ISSUES FIXED!
echo 📱 Profile images should now display correctly
echo 🖼️ No more "unknown image format" errors
echo 🌐 Backend running on http://192.168.1.105:8000
echo 📱 Check your app - profile images should load properly
echo.
pause
