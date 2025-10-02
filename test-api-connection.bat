@echo off
echo ========================================
echo FitForm API Connection Test
echo ========================================
echo.

echo 🧪 Testing backend API connection...
curl -s http://localhost:8000/api/test

echo.
echo ========================================
echo Test Complete
echo ========================================
echo.

if %errorlevel% equ 0 (
    echo ✅ Backend API is working correctly!
    echo ✅ Your app should now connect successfully
) else (
    echo ❌ Backend API connection failed
    echo 💡 Make sure the backend server is running:
    echo    cd fitform-backend
    echo    php artisan serve --port=8000
)

echo.
pause
