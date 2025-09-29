@echo off
echo Clearing all caches and restarting Expo development server...

REM Navigate to the frontend directory
cd C:\xampp\htdocs\Capstone-Project\fitform-frontend

REM Stop any running processes
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul

REM Clear Metro cache
echo Clearing Metro cache...
npx expo r -c 2>nul

REM Remove .expo folder
echo Removing .expo folder...
if exist .expo rmdir /s /q .expo

REM Clear node_modules cache
echo Clearing node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Clear npm cache
echo Clearing npm cache...
npm cache clean --force

REM Clear watchman cache (if available)
echo Clearing watchman cache...
watchman watch-del-all 2>nul

REM Clear temporary files
echo Clearing temporary files...
if exist %TEMP%\metro-* rmdir /s /q %TEMP%\metro-*
if exist %TEMP%\expo-* rmdir /s /q %TEMP%\expo-*

REM Clear React Native cache
echo Clearing React Native cache...
npx react-native start --reset-cache 2>nul

REM Start Expo with clear cache
echo Starting Expo development server...
npx expo start --clear --port 8088

echo All caches cleared and server restarted.
echo You can now open your Expo Go app or web browser to view the changes.
pause
