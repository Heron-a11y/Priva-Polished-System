@echo off
echo Running auto-cancellation of pending appointments...
echo ================================================

cd /d "%~dp0"

php artisan appointments:auto-cancel

echo.
echo Auto-cancellation completed.
pause





