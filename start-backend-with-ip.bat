@echo off
echo Starting FitForm Backend Server with IP Configuration
echo =====================================================
echo.
echo Current IP Address: 192.168.1.56
echo Backend URL: http://192.168.1.56:8000
echo Frontend URL: http://192.168.1.56:8081
echo.

cd fitform-backend

echo Checking PHP installation...
php --version
if %errorlevel% neq 0 (
    echo ERROR: PHP is not installed or not in PATH
    echo Please install PHP and add it to your PATH
    pause
    exit /b 1
)

echo.
echo Installing/Updating Composer dependencies...
composer install --no-dev --optimize-autoloader

echo.
echo Generating application key...
php artisan key:generate

echo.
echo Running database migrations...
php artisan migrate --force

echo.
echo Clearing caches...
php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo.
echo Starting Laravel development server...
echo Server will be accessible at: http://192.168.1.56:8000
echo Press Ctrl+C to stop the server
echo.

php artisan serve --host=0.0.0.0 --port=8000

pause
