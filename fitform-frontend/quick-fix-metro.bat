@echo off
echo Quick Metro Fix - Clearing cache and starting...

echo.
echo 1. Stopping any running processes...
taskkill /f /im node.exe 2>nul

echo.
echo 2. Clearing Metro cache...
npx expo r -c

echo.
echo 3. Starting Expo with clean cache...
npx expo start --clear

echo.
echo Metro should now start without errors!
pause
