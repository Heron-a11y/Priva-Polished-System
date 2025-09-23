@echo off
echo ========================================
echo Setting up Ngrok Tunnel for FitForm
echo ========================================

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed or not in PATH!
    echo.
    echo Please install ngrok:
    echo 1. Download from: https://ngrok.com/download
    echo 2. Extract ngrok.exe to a folder in your PATH
    echo 3. Or place ngrok.exe in this directory
    echo.
    pause
    exit /b 1
)

REM Check if ngrok.yml exists
if not exist "ngrok.yml" (
    echo ERROR: ngrok.yml not found!
    echo Please ensure ngrok.yml exists in this directory
    pause
    exit /b 1
)

echo Setting up ngrok tunnel...
echo.

REM Check if authtoken is set
findstr /C:"YOUR_NGROK_AUTHTOKEN_HERE" ngrok.yml >nul
if %errorlevel% equ 0 (
    echo WARNING: Please set your ngrok authtoken in ngrok.yml
    echo.
    echo To get your authtoken:
    echo 1. Sign up at https://ngrok.com
    echo 2. Go to https://dashboard.ngrok.com/get-started/your-authtoken
    echo 3. Copy your authtoken
    echo 4. Replace "YOUR_NGROK_AUTHTOKEN_HERE" in ngrok.yml with your token
    echo.
    pause
    exit /b 1
)

echo Testing ngrok configuration...
ngrok config check
if %errorlevel% neq 0 (
    echo ERROR: ngrok configuration is invalid!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Ngrok setup complete!
echo ========================================
echo.
echo Your tunnel will be available at:
echo https://fitform-api-dev.ngrok-free.app
echo.
echo To start the tunnel, run: start-ngrok-tunnel.bat
echo.

pause
