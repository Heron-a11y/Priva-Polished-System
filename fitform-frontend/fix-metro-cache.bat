@echo off
echo 🔧 Fixing Metro Cache Issues
echo =============================
echo.

echo Clearing Metro cache...
npx expo start --clear

echo.
echo If that doesn't work, try these commands:
echo 1. npx expo start --clear --reset-cache
echo 2. npm start -- --reset-cache
echo 3. Delete node_modules and reinstall
echo.
pause
