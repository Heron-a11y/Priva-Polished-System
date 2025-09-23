@echo off
echo ========================================
echo Starting FitForm - Complete Setup
echo ========================================

echo [1/8] Stopping all existing processes...
taskkill /f /im ngrok.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im php.exe >nul 2>nul
timeout /t 3 /nobreak >nul

echo [2/8] Setting up Laravel backend...
cd fitform-backend

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy ".env.example" ".env" >nul 2>nul
)

REM Generate application key
echo Generating application key...
php artisan key:generate --force >nul 2>nul

REM Run migrations
echo Running database migrations...
php artisan migrate --force >nul 2>nul

REM Clear caches
echo Clearing caches...
php artisan config:clear >nul 2>nul
php artisan cache:clear >nul 2>nul

echo [3/8] Starting Laravel backend...
start "FitForm Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo [4/8] Waiting for backend to start...
timeout /t 8 /nobreak >nul

REM Test backend
echo Testing backend connection...
curl -s http://localhost:8000/api/test >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Backend is running!
) else (
    echo ⚠️ Backend may need more time to start
)

echo [5/8] Starting ngrok tunnel...
start "FitForm Ngrok" cmd /k "ngrok start fitform-api --config=ngrok.yml"

echo [6/8] Waiting for ngrok to start...
timeout /t 8 /nobreak >nul

echo [7/8] Updating frontend configuration...
cd ..\fitform-frontend
node update-ngrok-url-auto.js

echo [8/8] Starting frontend...
start "FitForm Frontend" cmd /k "npx expo start --port 8081 --tunnel --clear"

echo.
echo ✅ Development environment started!
echo.
echo Backend: http://localhost:8000
echo Ngrok: https://6ce230b8c3f9.ngrok-free.app
echo Frontend: http://localhost:8081
echo.
echo 📱 Mobile App Setup:
echo 1. Wait for all services to fully start
echo 2. Check backend window for "Laravel development server started"
echo 3. Check ngrok window for tunnel URL
echo 4. Scan QR code in frontend window
echo 5. App will automatically use ngrok URL
echo.
echo 🔧 If issues persist:
echo - Run: test-backend-connection.bat
echo - Check backend logs in backend window
echo - Check ngrok status at: http://localhost:4040
echo.
pause
