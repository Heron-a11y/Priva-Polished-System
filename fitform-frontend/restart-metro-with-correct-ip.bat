@echo off
echo 🔄 Restarting Metro with correct IP configuration...
echo.

echo 📱 Current Metro server should be running on: 192.168.1.105:8081
echo 🌐 API should be accessible at: 192.168.1.105:8000/api
echo.

echo 🛑 Stopping any existing Metro processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🚀 Starting Metro server with correct IP...
npx expo start --clear --host 192.168.1.105

echo.
echo ✅ Metro server should now be running on 192.168.1.105:8081
echo 📱 Scan the QR code to connect your device
echo.
pause
