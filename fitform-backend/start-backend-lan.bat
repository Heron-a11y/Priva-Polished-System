@echo off
echo ========================================
echo Starting FitForm Backend (LAN Mode)
echo ========================================

echo.
echo Starting Laravel backend server on LAN...
echo Server will be accessible at: http://YOUR_IP:8000
echo.

cd fitform-backend
php artisan serve --host=0.0.0.0 --port=8000

echo.
echo Backend server stopped.
pause
