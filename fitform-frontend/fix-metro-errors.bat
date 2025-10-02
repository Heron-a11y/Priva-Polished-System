@echo off
echo 🔧 Fixing Metro InternalBytecode.js Error
echo =========================================
echo.

cd /d fitform-frontend

echo Step 1: Clearing all Metro cache...
npx expo start --clear --reset-cache >nul 2>&1

echo Step 2: Clearing npm cache...
npm cache clean --force

echo Step 3: Clearing watchman cache (if available)...
watchman watch-del-all >nul 2>&1

echo Step 4: Clearing React Native cache...
npx react-native start --reset-cache >nul 2>&1

echo Step 5: Clearing Expo cache...
npx expo r -c >nul 2>&1

echo.
echo ✅ Metro cache cleared!
echo.
echo Now try starting your frontend again:
echo npx expo start --scheme fitform --lan --port 8081 --clear
echo.
pause
