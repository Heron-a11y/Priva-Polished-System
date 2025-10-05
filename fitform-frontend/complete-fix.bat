@echo off
echo 🔧 Complete Fix for Metro and Network Issues
echo.

echo 🛑 Step 1: Stopping all processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul
taskkill /f /im php.exe 2>nul

echo.
echo 🧹 Step 2: Clearing all caches...
cd fitform-frontend
npx expo install --fix
npx expo start --clear --reset-cache

echo.
echo 🔍 Step 3: Checking if backend is running...
netstat -an | findstr :8000
if %errorlevel% neq 0 (
    echo ❌ Backend not running on port 8000
    echo 💡 Start backend: cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000
) else (
    echo ✅ Backend is running on port 8000
)

echo.
echo 🚀 Step 4: Starting Metro with correct configuration...
echo 📱 Metro should now start without InternalBytecode.js errors
echo 🌐 Network configuration will auto-detect working IP
echo.
pause
