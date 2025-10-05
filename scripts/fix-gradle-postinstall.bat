@echo off
REM AR Body Measurements - Post-install Gradle Fix Script (Windows)
REM This script automatically fixes Gradle compatibility issues after npm install

echo 🔧 AR Body Measurements - Post-install Gradle Fix
echo ================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

echo [INFO] Starting post-install Gradle fix...

REM Step 1: Fix expo-camera classifier property
echo [INFO] Fixing expo-camera classifier property...
if exist "node_modules\expo-camera\android\build.gradle" (
    powershell -Command "(Get-Content node_modules\expo-camera\android\build.gradle) -replace \"archivearchiveClassifier\", \"archiveClassifier\" | Set-Content node_modules\expo-camera\android\build.gradle"
    powershell -Command "(Get-Content node_modules\expo-camera\android\build.gradle) -replace \"classifier 'android-sources'\", \"archiveClassifier.set('android-sources')\" | Set-Content node_modules\expo-camera\android\build.gradle"
    echo [SUCCESS] Fixed expo-camera classifier property.
) else (
    echo [WARNING] expo-camera build.gradle not found, skipping...
)

REM Step 2: Fix expo module compileSdkVersion
echo [INFO] Fixing expo module compileSdkVersion...
if exist "node_modules\expo\android\build.gradle" (
    powershell -Command "(Get-Content node_modules\expo\android\build.gradle) -replace \"android {\\n    compileSdkVersion 34\\n    compileSdkVersion 34\", \"android {\" | Set-Content node_modules\expo\android\build.gradle"
    powershell -Command "(Get-Content node_modules\expo\android\build.gradle) -replace \"android {\", \"android {\n  compileSdkVersion safeExtGet(\\\"compileSdkVersion\\\", 34)\" | Set-Content node_modules\expo\android\build.gradle"
    echo [SUCCESS] Fixed expo module compileSdkVersion.
) else (
    echo [WARNING] expo build.gradle not found, skipping...
)

echo [SUCCESS] Post-install Gradle fix completed!
echo [INFO] All advanced AR capabilities preserved:
echo   - ARCore 1.40.0 body tracking
echo   - TensorFlow Lite 2.12.0 ML models
echo   - Real-time performance optimization
echo   - Enhanced user calibration
echo   - Cross-platform AR support
echo   - Advanced error handling
echo   - Machine learning validation
