@echo off
echo ========================================
echo Starting FitForm Frontend (LAN Mode)
echo ========================================

echo.
echo Starting Expo Metro server on LAN...
echo Frontend will be accessible at: exp://YOUR_IP:8081
echo.

cd fitform-frontend
npx expo start --lan --scheme fitform

echo.
echo Frontend server stopped.
pause