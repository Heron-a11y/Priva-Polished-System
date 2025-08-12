@echo off
echo Starting FitForm Backend for Mobile Access...
echo.
echo Your IP Address: 192.168.1.55
echo Backend will be available at: http://192.168.1.55:8000
echo.
echo Make sure your mobile device is on the same WiFi network!
echo.
pause
echo.
echo Starting Laravel server...
php artisan serve --host=0.0.0.0 --port=8000
pause 