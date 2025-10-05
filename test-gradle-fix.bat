@echo off
REM Test Gradle Dependency Fix
REM This script tests the gradle dependency resolution fix

echo 🔧 Testing Gradle Dependency Fix...
echo ==================================

REM Navigate to android directory
cd android

echo 📁 Current directory: %CD%

REM Clean previous build artifacts
echo 🧹 Cleaning previous build artifacts...
call gradlew clean

if %ERRORLEVEL% EQU 0 (
    echo ✅ Clean successful
) else (
    echo ❌ Clean failed
    exit /b 1
)

REM Test dependency resolution
echo 🔍 Testing dependency resolution...
call gradlew app:dependencies --configuration releaseRuntimeClasspath

if %ERRORLEVEL% EQU 0 (
    echo ✅ Dependency resolution successful
) else (
    echo ❌ Dependency resolution failed
    exit /b 1
)

REM Test build configuration
echo ⚙️ Testing build configuration...
call gradlew app:assembleRelease --dry-run

if %ERRORLEVEL% EQU 0 (
    echo ✅ Build configuration test successful
    echo 🎉 Gradle dependency fix is working!
    echo.
    echo You can now run:
    echo   eas build --platform android --profile production
) else (
    echo ❌ Build configuration test failed
    echo Check the error messages above for remaining issues
    exit /b 1
)

echo.
echo 📋 Summary:
echo - ✅ Gradle clean successful
echo - ✅ Dependency resolution working
echo - ✅ Build configuration valid
echo - 🚀 Ready for EAS build

pause




