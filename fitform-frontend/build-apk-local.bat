@echo off
echo Building APK locally using Expo...

echo.
echo --- Step 1: Installing dependencies ---
npm install

echo.
echo --- Step 2: Prebuilding for Android ---
npx expo prebuild --platform android --clean

echo.
echo --- Step 3: Building APK ---
cd android
./gradlew assembleDebug

echo.
echo --- Build Complete ---
echo APK should be located at: android/app/build/outputs/apk/debug/app-debug.apk
echo.
pause
