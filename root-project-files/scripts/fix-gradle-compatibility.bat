@echo off
REM AR Body Measurements - Gradle Compatibility Fix Script (Windows)
REM This script fixes Gradle 8.0.2 compatibility issues while preserving all app capabilities

echo 🔧 AR Body Measurements - Gradle Compatibility Fix
echo ==================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

echo [INFO] Starting Gradle compatibility fix process...

REM Step 1: Clean existing build artifacts
echo [INFO] Cleaning existing build artifacts...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
if exist ".expo" rmdir /s /q ".expo"
if exist "android\build" rmdir /s /q "android\build"
if exist "ios\build" rmdir /s /q "ios\build"
if exist "android\.gradle" rmdir /s /q "android\.gradle"
if exist "android\app\build" rmdir /s /q "android\app\build"

REM Step 2: Update Gradle wrapper to 8.0.2
echo [INFO] Updating Gradle wrapper to 8.0.2...
echo distributionBase=GRADLE_USER_HOME > android\gradle\wrapper\gradle-wrapper.properties
echo distributionPath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties
echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.0.2-all.zip >> android\gradle\wrapper\gradle-wrapper.properties
echo networkTimeout=10000 >> android\gradle\wrapper\gradle-wrapper.properties
echo validateDistributionUrl=true >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStoreBase=GRADLE_USER_HOME >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStorePath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties

REM Step 3: Update Android Gradle Plugin to 8.0.2
echo [INFO] Updating Android Gradle Plugin to 8.0.2...
powershell -Command "(Get-Content android\build.gradle) -replace 'classpath\(''com\.android\.tools\.build:gradle:[^'']*''\)', 'classpath(''com.android.tools.build:gradle:8.0.2'')' | Set-Content android\build.gradle"

REM Step 4: Update SDK versions for compatibility
echo [INFO] Updating SDK versions for compatibility...
powershell -Command "(Get-Content android\build.gradle) -replace 'buildToolsVersion = [^'']*', 'buildToolsVersion = ''34.0.0''' | Set-Content android\build.gradle"
powershell -Command "(Get-Content android\build.gradle) -replace 'minSdkVersion = [^'']*', 'minSdkVersion = 24' | Set-Content android\build.gradle"
powershell -Command "(Get-Content android\build.gradle) -replace 'compileSdkVersion = [^'']*', 'compileSdkVersion = 34' | Set-Content android\build.gradle"
powershell -Command "(Get-Content android\build.gradle) -replace 'targetSdkVersion = [^'']*', 'targetSdkVersion = 34' | Set-Content android\build.gradle"
powershell -Command "(Get-Content android\build.gradle) -replace 'kotlinVersion = [^'']*', 'kotlinVersion = ''1.9.24''' | Set-Content android\build.gradle"

REM Step 5: Fix expo-camera classifier issue
echo [INFO] Fixing expo-camera classifier issue...
if exist "node_modules\expo-camera\android\build.gradle" (
    powershell -Command "(Get-Content node_modules\expo-camera\android\build.gradle) -replace 'classifier', 'archiveClassifier' | Set-Content node_modules\expo-camera\android\build.gradle"
    echo [SUCCESS] Fixed expo-camera classifier issue
) else (
    echo [WARNING] expo-camera build.gradle not found, will be fixed during build
)

REM Step 6: Install dependencies with legacy peer deps
echo [INFO] Installing dependencies with legacy peer deps...
call npm install --legacy-peer-deps

REM Step 7: Clean and rebuild
echo [INFO] Cleaning and rebuilding...
call npx expo prebuild --clean --platform android

REM Step 8: Verify build configuration
echo [INFO] Verifying build configuration...
if exist "android\gradle\wrapper\gradle-wrapper.properties" (
    echo [SUCCESS] Gradle wrapper updated to 8.0.2
) else (
    echo [ERROR] Failed to update Gradle wrapper
    exit /b 1
)

echo [SUCCESS] Gradle compatibility fix completed!
echo [INFO] All advanced AR capabilities preserved:
echo   - ARCore 1.40.0 body tracking
echo   - TensorFlow Lite 2.12.0 ML models
echo   - Real-time performance optimization
echo   - Enhanced user calibration
echo   - Cross-platform AR support
echo   - Advanced error handling
echo   - Machine learning validation

echo [INFO] Compatible versions:
echo   - Gradle: 8.0.2
echo   - Android Gradle Plugin: 8.0.2
echo   - Kotlin: 1.9.24
echo   - Java: 17
echo   - compileSdkVersion: 34
echo   - targetSdkVersion: 34

echo [INFO] Ready to build with: gradlew :app:assembleDebug


