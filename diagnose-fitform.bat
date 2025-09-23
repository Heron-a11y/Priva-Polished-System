@echo off
echo ========================================
echo FitForm Diagnostic Tool
echo ========================================

echo [1/5] Checking processes...
echo.
echo PHP processes:
tasklist | findstr php.exe
echo.
echo Node processes:
tasklist | findstr node.exe
echo.
echo Ngrok processes:
tasklist | findstr ngrok.exe

echo [2/5] Checking ports...
echo.
echo Port 8000 (Backend):
netstat -ano | findstr :8000
echo.
echo Port 8081 (Frontend):
netstat -ano | findstr :8081
echo.
echo Port 4040 (Ngrok):
netstat -ano | findstr :4040

echo [3/5] Testing backend connection...
curl -s http://localhost:8000/api/test
if %errorlevel% equ 0 (
    echo ✅ Backend is responding!
) else (
    echo ❌ Backend is not responding
)

echo [4/5] Testing ngrok connection...
curl -s https://6ce230b8c3f9.ngrok-free.app/api/test
if %errorlevel% equ 0 (
    echo ✅ Ngrok tunnel is working!
) else (
    echo ❌ Ngrok tunnel is not responding
)

echo [5/5] Checking Laravel logs...
if exist "fitform-backend\storage\logs\laravel.log" (
    echo Last 5 lines of Laravel log:
    powershell -Command "Get-Content 'fitform-backend\storage\logs\laravel.log' | Select-Object -Last 5"
) else (
    echo No Laravel log file found
)

echo.
echo ========================================
echo Diagnostic Complete
echo ========================================
echo.
echo If backend is not responding:
echo 1. Run: start-fitform-complete.bat
echo 2. Check backend window for errors
echo 3. Check Laravel logs
echo.
pause
