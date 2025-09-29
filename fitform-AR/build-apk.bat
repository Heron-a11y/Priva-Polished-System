@echo off
echo ========================================
echo    FitForm AR APK Builder
echo ========================================
echo.

echo Checking Java installation...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java is not installed!
    echo.
    echo Please install Java JDK 17 or higher:
    echo 1. Download from: https://adoptium.net/
    echo 2. Install Java JDK 17+
    echo 3. Set JAVA_HOME environment variable
    echo 4. Add %JAVA_HOME%\bin to PATH
    echo.
    pause
    exit /b 1
)

echo ✅ Java is installed!
echo.

echo Checking Android SDK...
if not exist "%ANDROID_HOME%" (
    echo ❌ Android SDK not found!
    echo.
    echo Please install Android Studio:
    echo 1. Download from: https://developer.android.com/studio
    echo 2. Install Android Studio (includes Android SDK)
    echo 3. Set ANDROID_HOME environment variable
    echo.
    pause
    exit /b 1
)

echo ✅ Android SDK found!
echo.

echo Building APK with ARCore support...
echo.

cd android
call gradlew.bat assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo ✅ APK built successfully!
    echo.
    echo APK location: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install on your Samsung Galaxy A26 5G:
    echo 1. Enable Developer Options
    echo 2. Enable USB Debugging
    echo 3. Connect device via USB
    echo 4. Run: adb install app-debug.apk
    echo.
) else (
    echo.
    echo ❌ Build failed!
    echo Please check the error messages above.
    echo.
)

pause
