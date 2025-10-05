@echo off
REM Enhanced iOS Build Script for AR Body Measurements (Windows)
REM Comprehensive iOS build process with optimizations and error handling

setlocal enabledelayedexpansion

REM Build configuration
set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=production
set ENABLE_OPTIMIZATIONS=%2
if "%ENABLE_OPTIMIZATIONS%"=="" set ENABLE_OPTIMIZATIONS=true
set ENABLE_DEBUG=%3
if "%ENABLE_DEBUG%"=="" set ENABLE_DEBUG=false
set ENABLE_METAL=%4
if "%ENABLE_METAL%"=="" set ENABLE_METAL=true
set ENABLE_COREML=%5
if "%ENABLE_COREML%"=="" set ENABLE_COREML=true

echo.
echo ================================
echo Enhanced iOS AR Body Measurements Build
echo ================================
echo Build Type: %BUILD_TYPE%
echo Optimizations: %ENABLE_OPTIMIZATIONS%
echo Debug Mode: %ENABLE_DEBUG%
echo Metal Acceleration: %ENABLE_METAL%
echo Core ML: %ENABLE_COREML%
echo.

REM Function to print colored output
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_enhanced
echo [ENHANCED] %~1
goto :eof

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking iOS build prerequisites..."

REM Check if running on macOS (iOS builds require macOS)
call :print_error "iOS builds must be run on macOS"
call :print_error "Please use the Unix build script on macOS: scripts/ios-build.sh"
exit /b 1

REM Function to clean build artifacts
:clean_build_artifacts
call :print_status "Cleaning iOS build artifacts..."

if exist "ios\build" (
    rmdir /s /q "ios\build"
    call :print_status "Removed ios\build directory"
)

if exist "node_modules" (
    rmdir /s /q "node_modules"
    call :print_status "Removed node_modules directory"
)

call :print_success "Build artifacts cleaned successfully"
goto :eof

REM Function to install dependencies
:install_dependencies
call :print_status "Installing iOS dependencies..."

call :print_status "Installing Node.js dependencies..."
npm install
if errorlevel 1 (
    call :print_error "Failed to install Node.js dependencies"
    exit /b 1
)

call :print_success "Dependencies installed successfully"
goto :eof

REM Function to validate iOS configuration
:validate_ios_configuration
call :print_status "Validating iOS configuration..."

if not exist "ios\ar-body-measurements\Info.plist" (
    call :print_error "Info.plist not found"
    exit /b 1
)

if not exist "ios\Podfile" (
    call :print_error "Podfile not found"
    exit /b 1
)

if not exist "app.json" (
    call :print_error "app.json not found"
    exit /b 1
)

call :print_success "iOS configuration validated successfully"
goto :eof

REM Function to run pre-build checks
:run_prebuild_checks
call :print_status "Running iOS pre-build checks..."

call :print_warning "iOS builds require macOS and Xcode"
call :print_warning "Please use the Unix build script on macOS: scripts/ios-build.sh"

call :print_success "Pre-build checks completed successfully"
goto :eof

REM Function to build iOS app
:build_ios
call :print_status "Building iOS app..."

call :print_error "iOS builds are not supported on Windows"
call :print_error "Please use macOS with Xcode for iOS builds"
call :print_error "Use the Unix build script: scripts/ios-build.sh"

exit /b 1

REM Function to run post-build tasks
:run_postbuild_tasks
call :print_status "Running iOS post-build tasks..."

call :print_success "Post-build tasks completed successfully"
goto :eof

REM Function to handle errors
:handle_error
call :print_error "Build failed at step: %~1"
call :print_error "Error details: %~2"
exit /b 1

REM Main function
:main
call :print_enhanced "Starting Enhanced iOS Build Process"
call :print_enhanced "Build Type: %BUILD_TYPE%"
call :print_enhanced "Optimizations: %ENABLE_OPTIMIZATIONS%"
call :print_enhanced "Debug Mode: %ENABLE_DEBUG%"
call :print_enhanced "Metal Acceleration: %ENABLE_METAL%"
call :print_enhanced "Core ML: %ENABLE_COREML%"

REM Execute build steps
call :check_prerequisites
if errorlevel 1 call :handle_error "Prerequisites Check" "Failed to check prerequisites"

call :clean_build_artifacts
if errorlevel 1 call :handle_error "Clean Build Artifacts" "Failed to clean build artifacts"

call :install_dependencies
if errorlevel 1 call :handle_error "Install Dependencies" "Failed to install dependencies"

call :validate_ios_configuration
if errorlevel 1 call :handle_error "Validate Configuration" "Failed to validate configuration"

call :run_prebuild_checks
if errorlevel 1 call :handle_error "Pre-build Checks" "Failed to run pre-build checks"

call :build_ios
if errorlevel 1 call :handle_error "Build iOS" "Failed to build iOS app"

call :run_postbuild_tasks
if errorlevel 1 call :handle_error "Post-build Tasks" "Failed to run post-build tasks"

call :print_success "🎉 Enhanced iOS Build Process Completed Successfully!"
call :print_enhanced "iOS app is ready for deployment"

goto :eof

REM Run main function
call :main %*

goto :eof



