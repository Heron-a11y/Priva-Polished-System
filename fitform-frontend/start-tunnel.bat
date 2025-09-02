@echo off
echo 🌐 FitForm - Tunnel Mode Setup for External Access
echo ================================================
echo.

echo 📋 Checking current configuration...
if not exist "network-info.json" (
    echo ❌ Network configuration not found. Running setup...
    call npm run setup:public-ip
    if errorlevel 1 (
        echo ❌ Setup failed. Please run manually: npm run setup:public-ip
        pause
        exit /b 1
    )
)

echo.
echo 🔍 Current network configuration:
type "network-info.json"
echo.

echo ⚠️  IMPORTANT: Make sure your backend is running and accessible from the internet!
echo    - Backend should be running on 0.0.0.0:8000
echo    - Port 8000 should be forwarded in your router
echo    - Your backend should be accessible at the public IP shown above
echo.

echo 🚀 Starting Expo with tunnel mode...
echo    This will create a tunnel that works from any network.
echo.

call npm run start:tunnel

pause
