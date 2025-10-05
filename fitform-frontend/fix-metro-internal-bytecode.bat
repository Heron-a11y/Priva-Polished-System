@echo off
echo 🛑 Stopping Metro processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🧹 Clearing Metro cache and InternalBytecode.js...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"

echo Removing problematic files...
if exist InternalBytecode.js del InternalBytecode.js
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Clearing npm cache...
npm cache clean --force

echo.
echo 🚀 Starting Metro with clean cache...
npx expo start --clear --reset-cache

echo.
echo ✅ Metro should now start without InternalBytecode.js errors!
echo 📱 Look for the QR code in the Metro window
echo.
pause
