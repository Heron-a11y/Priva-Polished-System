@echo off
echo 🌐 Starting Ngrok Tunnel for FitForm Backend
echo ===========================================
echo.

echo 📋 This will create a public URL that works from any network.
echo.

echo 🚀 Starting ngrok tunnel on port 8000...
echo    Your backend will be accessible from the internet!
echo.

ngrok http 8000

pause
