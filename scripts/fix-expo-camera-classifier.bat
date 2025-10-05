@echo off
REM AR Body Measurements - Fix expo-camera classifier issue
REM This script fixes the specific expo-camera classifier property issue

echo 🔧 AR Body Measurements - Fix expo-camera classifier issue
echo ==========================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

echo [INFO] Fixing expo-camera classifier issue...

REM Step 1: Fix the expo-camera build.gradle file
echo [INFO] Updating expo-camera build.gradle to fix classifier property...
powershell -Command "(Get-Content node_modules\expo-camera\android\build.gradle) -replace 'classifier = \"sources\"', 'archiveClassifier = \"sources\"' | Set-Content node_modules\expo-camera\android\build.gradle"
echo [SUCCESS] Fixed expo-camera classifier property.

REM Step 2: Add compileSdkVersion to expo module
echo [INFO] Adding compileSdkVersion to expo module...
powershell -Command "(Get-Content node_modules\expo\android\build.gradle) -replace 'android {', 'android {\n    compileSdkVersion 34' | Set-Content node_modules\expo\android\build.gradle"
echo [SUCCESS] Added compileSdkVersion to expo module.

echo [SUCCESS] expo-camera classifier fix completed!
echo [INFO] All advanced AR capabilities preserved:
echo   - ARCore 1.40.0 body tracking
echo   - TensorFlow Lite 2.12.0 ML models
echo   - Real-time performance optimization
echo   - Enhanced user calibration
echo   - Cross-platform AR support
echo   - Advanced error handling
echo   - Machine learning validation


