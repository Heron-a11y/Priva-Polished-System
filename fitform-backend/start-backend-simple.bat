@echo off
echo 🚀 Starting FitForm Backend
echo ===========================
echo.

echo 📋 Starting Laravel backend on port 8000...
echo    This will make your backend accessible from all network interfaces.
echo.

echo ⚠️  Important:
echo    - Keep this terminal open
echo    - Your backend will run on 0.0.0.0:8000
echo    - This allows external access
echo.

php artisan serve --host=0.0.0.0 --port=8000

pause
