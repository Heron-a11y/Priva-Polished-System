@echo off
echo Fixing Metro InternalBytecode.js error...

echo.
echo 1. Stopping Metro bundler...
taskkill /f /im node.exe 2>nul

echo.
echo 2. Clearing Metro cache...
npx expo r -c

echo.
echo 3. Clearing npm cache...
npm cache clean --force

echo.
echo 4. Clearing node_modules and reinstalling...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install

echo.
echo 5. Clearing Expo cache...
npx expo install --fix

echo.
echo 6. Starting Metro with clean cache...
npx expo start --clear

echo.
echo Metro cache cleared and restarted!
echo The InternalBytecode.js error should now be resolved.
pause
