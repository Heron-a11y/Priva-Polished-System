@echo off
echo Finding your computer's IP address...
echo.
ipconfig | findstr "IPv4"
echo.
echo Use the IP address that starts with 192.168.x.x or 10.0.x.x
echo Update the API_BASE_URL in fitform-frontend/services/api.js with this IP
pause 