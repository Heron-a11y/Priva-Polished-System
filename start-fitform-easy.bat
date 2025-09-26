@echo off
echo ========================================
echo Starting FitForm System (EASY VERSION)
echo ========================================
echo.
echo This will start:
echo 1. Backend server on http://192.168.1.55:8000
echo 2. Frontend server on http://192.168.1.55:8081
echo.
echo Press any key to start the backend...
pause

echo.
echo Starting Backend Server...
start "FitForm Backend" cmd /k "cd /d fitform-backend && php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Testing Backend Connection...
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://192.168.1.55:8000/api/test' -TimeoutSec 5; Write-Host '✅ Backend: SUCCESS -' $response.message } catch { Write-Host '❌ Backend: FAILED -' $_.Exception.Message }"

echo.
echo Press any key to start the frontend...
pause

echo.
echo Starting Frontend Server...
start "FitForm Frontend" cmd /k "cd /d fitform-frontend && npx expo start --lan --port 8081"

echo.
echo ========================================
echo FitForm System Started!
echo ========================================
echo.
echo ✅ Backend: http://192.168.1.55:8000
echo ✅ Frontend: http://192.168.1.55:8081
echo ✅ Mobile: exp://192.168.1.55:8081
echo.
echo 📱 To use on mobile:
echo 1. Install Expo Go app
echo 2. Scan the QR code from the frontend window
echo 3. Your app will load on your mobile device!
echo.
echo To stop the servers, close the command windows
echo.
pause
