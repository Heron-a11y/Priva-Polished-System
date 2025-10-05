@echo off
echo Fixing Metro cache and native module issues...

echo Clearing all Metro and Expo caches...
del /s /q %TEMP%\metro-cache\*.* 2>nul
del /s /q %TEMP%\expo-cache\*.* 2>nul
del /s /q %LOCALAPPDATA%\Temp\metro-cache\*.* 2>nul
del /s /q %LOCALAPPDATA%\Temp\expo-cache\*.* 2>nul
rmdir /s /q ./.expo/web/cache 2>nul
rmdir /s /q ./node_modules/.cache/babel-loader 2>nul
rmdir /s /q ./node_modules/.cache/metro 2>nul
rmdir /s /q ./node_modules/.cache 2>nul

echo Clearing React Native cache...
npx react-native start --reset-cache 2>nul

echo Reinstalling node_modules...
rmdir /s /q ./node_modules 2>nul
npm install --legacy-peer-deps

echo Rebuilding native modules...
cd android
./gradlew clean
cd ..

echo Starting Expo with cleared cache...
npx expo start --clear --dev-client

echo Metro cache and native module issues fixed.
pause
