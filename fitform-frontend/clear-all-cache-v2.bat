@echo off
echo Clearing all caches and restarting Expo development server...

REM Terminate all Node.js processes to ensure Metro is fully stopped
taskkill /F /IM node.exe /T >nul 2>&1
echo Node.js processes terminated.

REM Navigate to the frontend directory
cd C:\xampp\htdocs\Capstone-Project\fitform-frontend

echo Clearing Metro cache...
npx expo r -c

echo Removing .expo folder...
if exist .expo rmdir /s /q .expo

echo Clearing node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Cleaning npm cache...
npm cache clean --force

echo Removing InternalBytecode.js if it exists...
if exist InternalBytecode.js del /f /q InternalBytecode.js

echo All caches cleared.
echo Starting Expo development server...
npx expo start --clear --port 8082

echo Expo development server restarted.
echo You can now open your Expo Go app or web browser to view the changes.
pause
