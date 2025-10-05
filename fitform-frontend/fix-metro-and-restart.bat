@echo off
echo 🔧 Fixing Metro bundler issues and restarting...
echo.

echo 🛑 Stopping any existing Metro processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🧹 Clearing Metro cache...
npx expo start --clear --reset-cache

echo.
echo ✅ Metro should now be running without InternalBytecode.js errors
echo 📱 Check your device for the QR code
echo.
pause
