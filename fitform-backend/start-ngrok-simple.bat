@echo off
echo 🌐 Starting Ngrok Tunnel (Simple Mode)
echo =====================================
echo.

echo 📋 This will create a temporary tunnel for testing.
echo    Note: URL will change each time you restart.
echo.

echo 🚀 Starting ngrok tunnel on port 8000...
echo    Your backend will be accessible from the internet!
echo.

echo ⚠️  If you get authentication error:
echo    1. Go to: https://dashboard.ngrok.com/signup
echo    2. Sign up for free account
echo    3. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
echo    4. Run: ngrok config add-authtoken YOUR_TOKEN
echo.

ngrok http 8000

pause
