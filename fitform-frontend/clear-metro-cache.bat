@echo off
echo Clearing Metro cache and restarting Expo development server...

REM Navigate to the frontend directory
cd C:\xampp\htdocs\Capstone-Project\fitform-frontend

REM Clear Metro cache
npx expo r -c

REM Clear node_modules cache
rmdir /s /q node_modules\.cache 2>nul

REM Clear .expo folder
rmdir /s /q .expo 2>nul

REM Clear npm cache
npm cache clean --force

REM Reinstall dependencies
npm install

REM Start Expo with clear cache
npx expo start --clear --port 8088

echo Metro cache cleared and server restarted.
echo You can now open your Expo Go app or web browser to view the changes.
pause
