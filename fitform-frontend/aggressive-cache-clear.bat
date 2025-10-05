@echo off
echo Aggressive Metro cache clearing...

echo Killing all Node processes...
taskkill /f /im node.exe 2>nul

echo Clearing all Metro and Expo caches...
del /s /q %TEMP%\metro-cache\*.* 2>nul
del /s /q %TEMP%\expo-cache\*.* 2>nul
del /s /q %LOCALAPPDATA%\Temp\metro-cache\*.* 2>nul
del /s /q %LOCALAPPDATA%\Temp\expo-cache\*.* 2>nul
rmdir /s /q ./.expo/web/cache 2>nul
rmdir /s /q ./node_modules/.cache 2>nul
rmdir /s /q ./.expo 2>nul

echo Clearing React Native cache...
npx react-native start --reset-cache 2>nul

echo Starting Expo with cleared cache...
npx expo start --clear --port 8082

echo Aggressive cache clearing completed.
pause
