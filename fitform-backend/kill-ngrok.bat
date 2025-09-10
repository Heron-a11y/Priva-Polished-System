@echo off
echo 🔧 FitForm - Ngrok Process Manager
echo ==================================
echo.

echo 🔍 Checking for running ngrok processes...
tasklist | findstr ngrok >nul
if %errorlevel% equ 0 (
    echo ⚠️  Found running ngrok processes. Terminating...
    for /f "tokens=2" %%i in ('tasklist ^| findstr ngrok') do (
        echo    Killing process %%i...
        taskkill /PID %%i /F >nul 2>&1
    )
    echo ✅ All ngrok processes terminated.
) else (
    echo ✅ No ngrok processes found.
)

echo.
echo 🚀 You can now start ngrok safely!
echo    Run: start-ngrok-pro.bat
echo.
pause
