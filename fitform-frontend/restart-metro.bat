@echo off
echo 🛑 Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🧹 Starting Metro with clear cache...
npx expo start --clear

echo.
echo ✅ Metro should now be running!
echo 📱 Check your device for the QR code
echo.
pause
