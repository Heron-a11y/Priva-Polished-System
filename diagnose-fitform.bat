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
echo Testing localhost:8000...
curl -s http://localhost:8000/api/test
if %errorlevel% equ 0 (
    echo ✅ Backend (localhost) is responding!
) else (
    echo ❌ Backend (localhost) is not responding
)

echo Testing network IP:192.168.1.55:8000...
curl -s http://192.168.1.55:8000/api/test
if %errorlevel% equ 0 (
    echo ✅ Backend (network) is responding!
) else (
    echo ❌ Backend (network) is not responding
)

echo [4/5] Testing frontend connection...
echo Testing localhost:8081...
curl -s http://localhost:8081
if %errorlevel% equ 0 (
    echo ✅ Frontend (localhost) is responding!
) else (
    echo ❌ Frontend (localhost) is not responding
)

echo Testing network IP:192.168.1.55:8081...
curl -s http://192.168.1.55:8081
if %errorlevel% equ 0 (
    echo ✅ Frontend (network) is responding!
) else (
    echo ❌ Frontend (network) is not responding
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
echo 1. Run: start-fitform-easy.bat
echo 2. Check backend window for errors
echo 3. Check Laravel logs
echo.
echo If frontend is not responding:
echo 1. Make sure backend is running first
echo 2. Check frontend window for errors
echo 3. Try restarting with start-fitform-easy.bat
echo.
echo Mobile app access:
echo - Backend API: http://192.168.1.55:8000/api
echo - Frontend: http://192.168.1.55:8081
echo - Mobile: exp://192.168.1.55:8081
echo.
pause
