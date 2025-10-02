@echo off
echo 🧪 Testing FitForm Backend
echo ==========================
echo.

echo Checking if backend is running...
cd /d fitform-frontend
node test-backend-simple.js

echo.
echo If backend is not running:
echo 1. Open a new command window
echo 2. Run: cd fitform-backend
echo 3. Run: php artisan serve --host=0.0.0.0 --port=8000
echo.
pause
