@echo off
echo ========================================
echo Starting Ngrok Tunnel for FitForm Backend
echo ========================================

REM Check if ngrok is available
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    if not exist "ngrok.exe" (
        echo ERROR: ngrok not found!
        echo Please install ngrok or place ngrok.exe in this directory
        pause
        exit /b 1
    )
    set NGROK_CMD=.\ngrok.exe
) else (
    set NGROK_CMD=ngrok
)

REM Check if ngrok.yml exists
if not exist "ngrok.yml" (
    echo ERROR: ngrok.yml not found!
    echo Please run setup-ngrok-tunnel.bat first
    pause
    exit /b 1
)

echo Starting ngrok tunnel...
echo Backend will be available at: https://fitform-api-dev.ngrok-free.app
echo.
echo Press Ctrl+C to stop the tunnel
echo.

%NGROK_CMD% start fitform-api --config=ngrok.yml

pause
