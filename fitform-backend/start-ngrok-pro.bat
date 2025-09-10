@echo off
echo 🌐 FitForm - Professional Ngrok Setup
echo =====================================
echo.

echo 🔍 Checking for existing ngrok processes...
tasklist | findstr ngrok >nul
if %errorlevel% equ 0 (
    echo ⚠️  Found running ngrok processes. Terminating...
    for /f "tokens=2" %%i in ('tasklist ^| findstr ngrok') do (
        echo    Killing process %%i...
        taskkill /PID %%i /F >nul 2>&1
    )
    echo ✅ All ngrok processes terminated.
    echo.
) else (
    echo ✅ No ngrok processes found.
    echo.
)

echo ✅ Ngrok authtoken is configured and ready!
echo.

echo 🚀 Starting ngrok tunnel on port 8000...
echo    This will create a secure HTTPS tunnel to your backend.
echo.

echo 📋 What will happen:
echo    1. Ngrok will start and show you a public URL
echo    2. Copy that URL (e.g., https://abc123.ngrok.io)
echo    3. Your backend will be accessible from anywhere!
echo.

echo ⚠️  Important:
echo    - Keep this terminal open
echo    - The ngrok URL will change each time you restart
echo    - Your backend must be running on port 8000
echo.

echo 🎯 Next steps after ngrok starts:
echo    1. Copy the ngrok URL
echo    2. Update your app configuration with the new URL
echo    3. Start your frontend with tunnel mode
echo    4. Share the QR code with your classmate
echo.

ngrok http 8000

pause
