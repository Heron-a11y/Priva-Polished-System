@echo off
echo 🔍 Debugging FitForm Connection Issues
echo =====================================
echo.

cd /d fitform-frontend

echo Running connection tests...
node debug-connection.js

echo.
echo If all tests fail:
echo 1. Start backend: cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000
echo 2. Start frontend: cd fitform-frontend && npx expo start --clear
echo 3. Check LAN IP: Use your computer's IP address (e.g., 192.168.1.104)
echo.
pause
