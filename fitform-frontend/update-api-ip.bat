@echo off
echo ========================================
echo FitForm - API IP Update Helper
echo ========================================
echo.

REM Get the current IP address automatically
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"192.168"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"10.0"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"172.16"') do (
    set "IP_ADDRESS=%%a"
    goto :found_ip
)

:found_ip
set "IP_ADDRESS=%IP_ADDRESS: =%"

echo Current IP Address: %IP_ADDRESS%
echo.
echo This script will help you update the API_BASE_URL in services/api.js
echo.
echo Current API_BASE_URL should be: http://%IP_ADDRESS%:8000/api
echo.
echo ========================================
echo MANUAL UPDATE REQUIRED:
echo ========================================
echo 1. Open fitform-frontend/services/api.js
echo 2. Find the line: const API_BASE_URL = '...'
echo 3. Update it to: const API_BASE_URL = 'http://%IP_ADDRESS%:8000/api'
echo 4. Save the file
echo.
echo ========================================
echo After updating:
echo ========================================
echo - Backend: http://%IP_ADDRESS%:8000
echo - Frontend: exp://%IP_ADDRESS%:19000
echo - API: http://%IP_ADDRESS%:8000/api
echo.
pause
