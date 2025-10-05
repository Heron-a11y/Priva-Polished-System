@echo off
echo Fixing Metro transformer dependency...

echo.
echo 1. Installing metro-react-native-babel-transformer...
npm install metro-react-native-babel-transformer --save-dev

echo.
echo 2. Clearing Metro cache...
npx expo r -c

echo.
echo 3. Clearing npm cache...
npm cache clean --force

echo.
echo 4. Reinstalling dependencies...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install

echo.
echo 5. Starting Expo with clean cache...
npx expo start --clear

echo.
echo Metro transformer issue should now be fixed!
pause
