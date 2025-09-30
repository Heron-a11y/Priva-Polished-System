@echo off
echo 🚨 CRITICAL CRASH FIX - Building with fixes...

REM Apply critical fixes
node critical-crash-fix.js

REM Build with EAS
echo Building with production-crash-fixed profile...
eas build --platform android --profile production-crash-fixed

echo ✅ Build complete with critical crash fixes!
pause
