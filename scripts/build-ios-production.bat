@echo off
REM iOS Production Build Script for AR Body Measurements
REM This script prepares and builds the iOS app for production deployment

echo 🚀 Starting iOS Production Build Process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli
    exit /b 1
)

REM Check if user is logged in to EAS
eas whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] You are not logged in to EAS. Please run: eas login
    exit /b 1
)

echo [INFO] Preparing iOS production build...

REM Clean previous builds
echo [INFO] Cleaning previous builds...
if exist ".expo" rmdir /s /q ".expo"
if exist "ios\build" rmdir /s /q "ios\build"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM Install dependencies
echo [INFO] Installing dependencies...
npm install

REM Run prebuild to ensure iOS project is up to date
echo [INFO] Running prebuild...
npx expo prebuild --platform ios --clean

REM Install iOS dependencies (this will need to be run on macOS)
echo [INFO] Note: iOS dependencies (pod install) must be run on macOS
echo [INFO] Please run the following on your MacBook:
echo cd ios
echo pod install --repo-update
echo cd ..

REM Validate configuration
echo [INFO] Validating configuration...
npx expo doctor

REM Build for production
echo [INFO] Building for production...
eas build --platform ios --profile production --non-interactive

echo [SUCCESS] iOS production build completed successfully!
echo [INFO] You can check the build status at: https://expo.dev/accounts/cocband/projects/ar-body-measurements/builds

echo.
echo 📱 Next Steps:
echo 1. Wait for the build to complete
echo 2. Download the .ipa file when ready
echo 3. Upload to App Store Connect
echo 4. Submit for App Store review
echo.
echo 🔗 Build Dashboard: https://expo.dev/accounts/cocband/projects/ar-body-measurements/builds

pause


