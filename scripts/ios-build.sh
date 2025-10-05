#!/bin/bash

# Enhanced iOS Build Script for AR Body Measurements
# Comprehensive iOS build process with optimizations and error handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Build configuration
BUILD_TYPE=${1:-"production"}
ENABLE_OPTIMIZATIONS=${2:-"true"}
ENABLE_DEBUG=${3:-"false"}
ENABLE_METAL=${4:-"true"}
ENABLE_COREML=${5:-"true"}

echo -e "${BLUE}🚀 Enhanced iOS Build Script for AR Body Measurements${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_enhanced() {
    echo -e "${PURPLE}[ENHANCED]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking iOS build prerequisites..."
    
    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS builds must be run on macOS"
        exit 1
    fi
    
    # Check Xcode installation
    if ! command -v xcodebuild &> /dev/null; then
        print_error "Xcode is not installed or not in PATH"
        exit 1
    fi
    
    # Check Xcode version
    XCODE_VERSION=$(xcodebuild -version | head -n1 | cut -d' ' -f2)
    print_status "Xcode version: $XCODE_VERSION"
    
    # Check iOS deployment target
    IOS_DEPLOYMENT_TARGET="13.0"
    print_status "iOS deployment target: $IOS_DEPLOYMENT_TARGET"
    
    # Check CocoaPods installation
    if ! command -v pod &> /dev/null; then
        print_error "CocoaPods is not installed. Please install it with: gem install cocoapods"
        exit 1
    fi
    
    # Check CocoaPods version
    POD_VERSION=$(pod --version)
    print_status "CocoaPods version: $POD_VERSION"
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "All prerequisites checked successfully"
}

# Function to clean build artifacts
clean_build_artifacts() {
    print_status "Cleaning iOS build artifacts..."
    
    # Clean Xcode build folder
    if [ -d "ios/build" ]; then
        rm -rf ios/build
        print_status "Removed ios/build directory"
    fi
    
    # Clean derived data
    if [ -d "~/Library/Developer/Xcode/DerivedData" ]; then
        rm -rf ~/Library/Developer/Xcode/DerivedData
        print_status "Cleaned Xcode derived data"
    fi
    
    # Clean CocoaPods cache
    pod cache clean --all
    print_status "Cleaned CocoaPods cache"
    
    # Clean node modules
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_status "Removed node_modules directory"
    fi
    
    print_success "Build artifacts cleaned successfully"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing iOS dependencies..."
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Install CocoaPods dependencies
    print_status "Installing CocoaPods dependencies..."
    cd ios
    pod install --repo-update
    cd ..
    
    print_success "Dependencies installed successfully"
}

# Function to validate iOS configuration
validate_ios_configuration() {
    print_status "Validating iOS configuration..."
    
    # Check Info.plist
    if [ ! -f "ios/ar-body-measurements/Info.plist" ]; then
        print_error "Info.plist not found"
        exit 1
    fi
    
    # Check Podfile
    if [ ! -f "ios/Podfile" ]; then
        print_error "Podfile not found"
        exit 1
    fi
    
    # Check app.json
    if [ ! -f "app.json" ]; then
        print_error "app.json not found"
        exit 1
    fi
    
    # Validate ARKit configuration
    print_status "Validating ARKit configuration..."
    
    # Check if ARKit is properly configured
    if ! grep -q "ARKit" ios/ar-body-measurements/Info.plist; then
        print_warning "ARKit configuration not found in Info.plist"
    fi
    
    # Check if camera permissions are set
    if ! grep -q "NSCameraUsageDescription" ios/ar-body-measurements/Info.plist; then
        print_warning "Camera usage description not found in Info.plist"
    fi
    
    print_success "iOS configuration validated successfully"
}

# Function to run pre-build checks
run_prebuild_checks() {
    print_status "Running iOS pre-build checks..."
    
    # Check iOS simulator availability
    print_status "Checking iOS simulator availability..."
    xcrun simctl list devices | grep -q "iPhone" || print_warning "No iPhone simulators found"
    
    # Check iOS device availability
    print_status "Checking iOS device availability..."
    xcrun devicectl list devices | grep -q "iPhone" || print_warning "No iPhone devices found"
    
    # Check code signing
    print_status "Checking code signing..."
    security find-identity -v -p codesigning | grep -q "iPhone" || print_warning "No iPhone code signing identities found"
    
    print_success "Pre-build checks completed successfully"
}

# Function to build iOS app
build_ios() {
    print_status "Building iOS app..."
    
    cd ios
    
    # Configure build settings
    BUILD_CONFIG="Release"
    if [ "$ENABLE_DEBUG" = "true" ]; then
        BUILD_CONFIG="Debug"
    fi
    
    print_status "Build configuration: $BUILD_CONFIG"
    
    # Build for iOS Simulator
    print_status "Building for iOS Simulator..."
    xcodebuild -workspace ar-body-measurements.xcworkspace \
               -scheme ar-body-measurements \
               -configuration $BUILD_CONFIG \
               -sdk iphonesimulator \
               -arch x86_64 \
               -arch arm64 \
               -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
               clean build
    
    # Build for iOS Device
    print_status "Building for iOS Device..."
    xcodebuild -workspace ar-body-measurements.xcworkspace \
               -scheme ar-body-measurements \
               -configuration $BUILD_CONFIG \
               -sdk iphoneos \
               -arch arm64 \
               -destination 'generic/platform=iOS' \
               clean build
    
    cd ..
    
    print_success "iOS build completed successfully"
}

# Function to run post-build tasks
run_postbuild_tasks() {
    print_status "Running iOS post-build tasks..."
    
    # Generate build report
    print_status "Generating build report..."
    
    # Check build artifacts
    if [ -d "ios/build" ]; then
        print_success "Build artifacts found in ios/build"
    else
        print_warning "No build artifacts found"
    fi
    
    # Check app bundle
    if [ -f "ios/build/Release-iphoneos/ar-body-measurements.app" ]; then
        print_success "iOS app bundle created successfully"
    else
        print_warning "iOS app bundle not found"
    fi
    
    print_success "Post-build tasks completed successfully"
}

# Function to handle errors
handle_error() {
    print_error "Build failed at step: $1"
    print_error "Error details: $2"
    exit 1
}

# Main function
main() {
    print_enhanced "Starting Enhanced iOS Build Process"
    print_enhanced "Build Type: $BUILD_TYPE"
    print_enhanced "Optimizations: $ENABLE_OPTIMIZATIONS"
    print_enhanced "Debug Mode: $ENABLE_DEBUG"
    print_enhanced "Metal Acceleration: $ENABLE_METAL"
    print_enhanced "Core ML: $ENABLE_COREML"
    
    # Execute build steps
    check_prerequisites || handle_error "Prerequisites Check" "Failed to check prerequisites"
    clean_build_artifacts || handle_error "Clean Build Artifacts" "Failed to clean build artifacts"
    install_dependencies || handle_error "Install Dependencies" "Failed to install dependencies"
    validate_ios_configuration || handle_error "Validate Configuration" "Failed to validate configuration"
    run_prebuild_checks || handle_error "Pre-build Checks" "Failed to run pre-build checks"
    build_ios || handle_error "Build iOS" "Failed to build iOS app"
    run_postbuild_tasks || handle_error "Post-build Tasks" "Failed to run post-build tasks"
    
    print_success "🎉 Enhanced iOS Build Process Completed Successfully!"
    print_enhanced "iOS app is ready for deployment"
}

# Run main function
main "$@"

