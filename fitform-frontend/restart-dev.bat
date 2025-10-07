@echo off
echo Cleaning Metro cache and restarting development server...
echo.

echo Stopping any running Metro processes...
taskkill /f /im node.exe 2>nul

echo Clearing Metro cache...
npx expo start --clear --reset-cache

echo.
echo Development server restarted successfully!
pause
