@echo off
echo 🌐 FitForm - Complete Ngrok Setup
echo =================================
echo.

echo 📋 This script will set up ngrok for external access to your app.
echo    No port forwarding needed - ngrok creates a secure tunnel!
echo.

echo 🔍 Step 1: Checking current setup...
if exist "network-info.json" (
    echo ✅ Network configuration found
    type "network-info.json"
) else (
    echo ❌ Network configuration not found
)

echo.
echo 🚀 Step 2: Starting ngrok setup...
echo    You'll need to run this in two terminals:
echo.

echo 📱 Terminal 1 - Start Backend:
echo    cd fitform-backend
echo    start-backend.bat
echo.

echo 🌐 Terminal 2 - Start Ngrok:
echo    cd fitform-backend
echo    start-ngrok.bat
echo.

echo 📋 Step 3: After ngrok starts:
echo    1. Copy the ngrok URL (e.g., https://abc123.ngrok.io)
echo    2. Run: node setup-ngrok.js
echo    3. Enter the ngrok URL when prompted
echo.

echo 🎯 Step 4: Start Frontend:
echo    cd fitform-frontend
echo    start-tunnel.bat
echo.

echo ⚠️  Important Notes:
echo    - Keep both terminals open (backend and ngrok)
echo    - Ngrok URL changes each time you restart it
echo    - No router configuration needed
echo    - Works from any network automatically
echo.

echo 🧪 Test your setup:
echo    Visit the ngrok URL in your browser
echo    You should see your Laravel app
echo.

pause
