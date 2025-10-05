@echo off
echo 🧪 Testing API connection to 192.168.1.105:8000...
echo.

echo 📡 Testing backend connection...
curl -X GET "http://192.168.1.105:8000/api/test" -H "Accept: application/json" --connect-timeout 10

echo.
echo 📡 Testing if backend is running on port 8000...
netstat -an | findstr :8000

echo.
echo 📡 Testing if Metro is running on port 8081...
netstat -an | findstr :8081

echo.
echo ✅ If you see connection errors above, make sure:
echo 1. Backend is running: cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000
echo 2. Metro is running: cd fitform-frontend && npx expo start --clear
echo.
pause
