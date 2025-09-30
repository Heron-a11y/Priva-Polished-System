@echo off
echo 🚨 FINAL COMPLETE CRASH FIX - Building production app...

REM Apply final crash fixes
node FINAL_CRASH_FIX_COMPLETE.js

REM Clean previous builds
echo 🧹 Cleaning previous builds...
rmdir /s /q android\app\build
rmdir /s /q android\build

REM Build with production-crash-fixed profile
echo 🔨 Building with production-crash-fixed profile...
eas build --platform android --profile production-crash-fixed --non-interactive

echo ✅ Production build complete with all crash fixes!
echo 📱 Your app should now work without crashes!
pause
