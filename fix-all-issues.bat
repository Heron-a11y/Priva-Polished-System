@echo off
echo ========================================
echo Fixing FitForm Development Issues
echo ========================================

echo.
echo 1. Fixing Metro InternalBytecode.js error...
cd fitform-frontend

echo   - Stopping any running Metro processes...
taskkill /f /im node.exe 2>nul

echo   - Clearing Metro cache...
npx expo r -c 2>nul

echo   - Clearing npm cache...
npm cache clean --force

echo   - Clearing node_modules and reinstalling...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install

echo.
echo 2. Starting Backend Server...
cd ..\fitform-backend

echo   - Checking PHP availability...
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: PHP not found. Please start XAMPP first.
    pause
    exit /b 1
)

echo   - Installing dependencies...
composer install --no-interaction

echo   - Generating application key...
php artisan key:generate --force

echo   - Running migrations...
php artisan migrate --force

echo   - Starting Laravel server...
start "FitForm Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo 3. Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 4. Testing backend connection...
curl -s http://localhost:8000/api/test >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Backend is running successfully!
) else (
    echo   ⚠️  Backend may not be ready yet. Please check manually.
)

echo.
echo 5. Starting Frontend...
cd ..\fitform-frontend

echo   - Starting Expo with clean cache...
start "FitForm Frontend" cmd /k "npx expo start --clear"

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo API: http://localhost:8000/api
echo Frontend: Check the Expo window for the URL
echo.
echo If you still see errors:
echo 1. Make sure XAMPP is running
echo 2. Check that MySQL is running in XAMPP
echo 3. Verify the .env file in fitform-backend
echo.
pause
