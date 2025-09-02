@echo off
echo 🌐 FitForm - Complete Ngrok Setup
echo =================================
echo.

echo ✅ Your ngrok authtoken is configured and ready!
echo.

echo 📋 This script will guide you through the complete setup.
echo.

echo 🔍 Step 1: Starting your backend...
echo    You need to run this in a separate terminal:
echo    cd fitform-backend
echo    start-backend.bat
echo.

echo 🌐 Step 2: Starting ngrok tunnel...
echo    In another terminal, run:
echo    cd fitform-backend
echo    start-ngrok-pro.bat
echo.

echo 📝 Step 3: After ngrok starts...
echo    1. Copy the ngrok URL (e.g., https://abc123.ngrok.io)
echo    2. Run: npm run update:ngrok-url
echo    3. Paste the ngrok URL when prompted
echo.

echo 🚀 Step 4: Start your frontend...
echo    cd fitform-frontend
echo    npm run start:tunnel
echo.

echo 🎯 Step 5: Share with your classmate...
echo    1. Your classmate opens Expo Go
echo    2. Scans the QR code
echo    3. The app works from any network!
echo.

echo ⚠️  Important Notes:
echo    - Keep both terminals open (backend and ngrok)
echo    - Ngrok URL changes each time you restart
echo    - Your backend must be running on port 8000
echo    - No port forwarding needed with ngrok
echo.

echo 🧪 Test your setup:
echo    After ngrok starts, visit the ngrok URL in your browser
echo    You should see your Laravel app
echo.

echo 🌟 Benefits of Ngrok:
echo    ✅ Secure HTTPS connection
echo    ✅ Works from any network
echo    ✅ No router configuration needed
echo    ✅ Professional-grade tunneling
echo    ✅ Your authtoken is already configured
echo.

pause
