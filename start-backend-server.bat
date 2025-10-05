@echo off
echo Starting FitForm Backend Server...

cd fitform-backend

echo.
echo 1. Checking if PHP is available...
php --version
if %errorlevel% neq 0 (
    echo ERROR: PHP is not available. Please make sure XAMPP is running.
    pause
    exit /b 1
)

echo.
echo 2. Checking if Composer is available...
composer --version
if %errorlevel% neq 0 (
    echo ERROR: Composer is not available. Please install Composer.
    pause
    exit /b 1
)

echo.
echo 3. Installing/updating dependencies...
composer install

echo.
echo 4. Generating application key...
php artisan key:generate

echo.
echo 5. Running database migrations...
php artisan migrate

echo.
echo 6. Starting Laravel development server on port 8000...
echo Backend will be available at: http://localhost:8000
echo API endpoints will be available at: http://localhost:8000/api
echo.
echo Press Ctrl+C to stop the server
echo.

php artisan serve --host=0.0.0.0 --port=8000
