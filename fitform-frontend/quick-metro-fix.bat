@echo off
echo 🔧 Quick Metro Fix
echo ==================
echo.

cd /d fitform-frontend

echo Clearing Metro cache...
npx expo r -c

echo.
echo Starting Expo with cleared cache...
npx expo start --scheme fitform --lan --port 8081

echo.
echo ✅ Metro cache cleared and Expo started!
echo.
pause
