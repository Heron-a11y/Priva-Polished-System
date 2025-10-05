@echo off
REM Enhanced Build Script for AR Body Measurements (Windows)
REM Comprehensive build process with optimizations and error handling

setlocal enabledelayedexpansion

REM Build configuration
set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=production

set PLATFORM=%2
if "%PLATFORM%"=="" set PLATFORM=all

set ENABLE_OPTIMIZATIONS=%3
if "%ENABLE_OPTIMIZATIONS%"=="" set ENABLE_OPTIMIZATIONS=true

set ENABLE_DEBUG=%4
if "%ENABLE_DEBUG%"=="" set ENABLE_DEBUG=false

echo.
echo ================================
echo Enhanced AR Body Measurements Build
echo ================================
echo Build Type: %BUILD_TYPE%
echo Platform: %PLATFORM%
echo Optimizations: %ENABLE_OPTIMIZATIONS%
echo Debug Mode: %ENABLE_DEBUG%
echo.

REM Function to check prerequisites
:check_prerequisites
echo ================================
echo Checking Prerequisites
echo ================================

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)
echo ✅ Node.js found

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    exit /b 1
)
echo ✅ npm found

REM Check EAS CLI
eas --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  EAS CLI not found. Installing...
    npm install -g @expo/eas-cli
)
echo ✅ EAS CLI found

REM Check if logged in to EAS
eas whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Not logged in to EAS. Please run: eas login
    exit /b 1
)
echo ✅ EAS authentication verified
goto :clean_build_artifacts

REM Function to clean build artifacts
:clean_build_artifacts
echo ================================
echo Cleaning Build Artifacts
echo ================================

echo 🔄 Removing node_modules
if exist node_modules rmdir /s /q node_modules

echo 🔄 Removing build directories
if exist android\build rmdir /s /q android\build
if exist ios\build rmdir /s /q ios\build
if exist .expo rmdir /s /q .expo

echo 🔄 Clearing npm cache
npm cache clean --force

echo ✅ Build artifacts cleaned
goto :install_dependencies

REM Function to install dependencies
:install_dependencies
echo ================================
echo Installing Dependencies
echo ================================

echo 🔄 Installing npm packages
npm install --no-optional --production=false

if "%ENABLE_DEBUG%"=="true" (
    echo 🔄 Installing debug dependencies
    npm install --save-dev @types/react @types/react-native
)

echo ✅ Dependencies installed
goto :validate_configuration

REM Function to validate configuration
:validate_configuration
echo ================================
echo Validating Configuration
echo ================================

REM Check app.json
if not exist app.json (
    echo ❌ app.json not found
    exit /b 1
)
echo ✅ app.json found

REM Check eas.json
if not exist eas.json (
    echo ❌ eas.json not found
    exit /b 1
)
echo ✅ eas.json found

REM Check package.json
if not exist package.json (
    echo ❌ package.json not found
    exit /b 1
)
echo ✅ package.json found

REM Validate TypeScript configuration
if exist tsconfig.json (
    echo 🔄 Validating TypeScript configuration
    npx tsc --noEmit
    if %errorlevel% neq 0 (
        echo ❌ TypeScript configuration invalid
        exit /b 1
    )
    echo ✅ TypeScript configuration valid
)

REM Check for required files
set REQUIRED_FILES=App.tsx src\ARSessionManager.ts src\config\ARConfig.ts android\app\build.gradle ios\Podfile
for %%f in (%REQUIRED_FILES%) do (
    if not exist "%%f" (
        echo ❌ Required file not found: %%f
        exit /b 1
    )
)
echo ✅ All required files found
goto :run_prebuild_checks

REM Function to run pre-build checks
:run_prebuild_checks
echo ================================
echo Running Pre-build Checks
echo ================================

REM Lint code
echo 🔄 Running ESLint
npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  ESLint found issues, but continuing build
) else (
    echo ✅ ESLint passed
)

REM Type checking
echo 🔄 Running TypeScript type checking
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ TypeScript type checking failed
    exit /b 1
)
echo ✅ TypeScript type checking passed

REM Asset validation
if exist validate-assets.js (
    echo 🔄 Validating assets
    node validate-assets.js
    if %errorlevel% neq 0 (
        echo ❌ Asset validation failed
        exit /b 1
    )
    echo ✅ Asset validation passed
)
goto :build_platform

REM Function to build for specified platform
:build_platform
if "%PLATFORM%"=="android" goto :build_android
if "%PLATFORM%"=="ios" goto :build_ios
if "%PLATFORM%"=="all" goto :build_all
goto :build_all

:build_all
call :build_android
if %errorlevel% neq 0 exit /b 1
call :build_ios
if %errorlevel% neq 0 exit /b 1
goto :run_postbuild_tasks

:build_android
echo ================================
echo Building for Android
echo ================================

echo 🔄 Prebuilding Android project
npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (
    echo ❌ Android prebuild failed
    exit /b 1
)

echo 🔄 Building Android APK
if "%BUILD_TYPE%"=="production" (
    eas build --platform android --profile production
) else if "%BUILD_TYPE%"=="preview" (
    eas build --platform android --profile preview
) else (
    eas build --platform android --profile development
)
if %errorlevel% neq 0 (
    echo ❌ Android build failed
    exit /b 1
)

echo ✅ Android build completed
goto :eof

:build_ios
echo ================================
echo Building for iOS
echo ================================

echo 🔄 Prebuilding iOS project
npx expo prebuild --platform ios --clean
if %errorlevel% neq 0 (
    echo ❌ iOS prebuild failed
    exit /b 1
)

echo 🔄 Installing iOS dependencies
cd ios
pod install
if %errorlevel% neq 0 (
    echo ❌ iOS pod install failed
    exit /b 1
)
cd ..

echo 🔄 Building iOS app
if "%BUILD_TYPE%"=="production" (
    eas build --platform ios --profile production
) else if "%BUILD_TYPE%"=="preview" (
    eas build --platform ios --profile preview
) else (
    eas build --platform ios --profile development
)
if %errorlevel% neq 0 (
    echo ❌ iOS build failed
    exit /b 1
)

echo ✅ iOS build completed
goto :eof

REM Function to run post-build tasks
:run_postbuild_tasks
echo ================================
echo Running Post-build Tasks
echo ================================

echo 🔄 Generating build report
(
echo # Build Report
echo.
echo **Build Type:** %BUILD_TYPE%
echo **Platform:** %PLATFORM%
echo **Timestamp:** %date% %time%
echo **Node Version:** 
node --version
echo **NPM Version:** 
npm --version
echo.
echo ## Build Configuration
echo - Optimizations: %ENABLE_OPTIMIZATIONS%
echo - Debug Mode: %ENABLE_DEBUG%
echo.
echo ## Build Status
echo ✅ Build completed successfully
echo.
echo ## Next Steps
echo 1. Test the build on target devices
echo 2. Deploy to app stores if production build
echo 3. Monitor performance and user feedback
) > build-report.md

echo ✅ Build report generated

echo 🔄 Cleaning up temporary files
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo ✅ Post-build tasks completed

echo.
echo ================================
echo 🎉 Build Completed Successfully!
echo ================================
echo ✅ Your AR Body Measurements app has been built successfully
echo ℹ️  Check the EAS dashboard for build status and download links
echo.

goto :eof

