#!/bin/bash

# EAS Build Script for AR Body Measurements
# This script handles the complete EAS build process with optimizations

set -e

echo "🚀 Starting EAS Build Process for AR Body Measurements"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    print_warning "Not logged in to EAS. Please run: eas login"
    exit 1
fi

# Parse command line arguments
PLATFORM=""
PROFILE=""
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --platform <android|ios|all>  Platform to build for"
            echo "  --profile <development|preview|production>  Build profile"
            echo "  --clean                     Clean build cache"
            echo "  --help                      Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set defaults if not provided
if [ -z "$PLATFORM" ]; then
    PLATFORM="android"
fi

if [ -z "$PROFILE" ]; then
    PROFILE="preview"
fi

print_status "Build Configuration:"
print_status "  Platform: $PLATFORM"
print_status "  Profile: $PROFILE"
print_status "  Clean: $CLEAN"

# Clean build cache if requested
if [ "$CLEAN" = true ]; then
    print_status "Cleaning build cache..."
    rm -rf node_modules/.cache
    rm -rf .expo
    rm -rf android/build
    rm -rf ios/build
    print_success "Build cache cleaned"
fi

# Validate assets
print_status "Validating assets..."
if [ -f "validate-assets.js" ]; then
    node validate-assets.js
    if [ $? -eq 0 ]; then
        print_success "Assets validated successfully"
    else
        print_error "Asset validation failed"
        exit 1
    fi
fi

# Run prebuild if needed
if [ ! -d "android" ] || [ ! -d "ios" ]; then
    print_status "Running expo prebuild..."
    npx expo prebuild --clean
    print_success "Prebuild completed"
fi

# Build based on platform
case $PLATFORM in
    "android")
        print_status "Building for Android..."
        eas build --platform android --profile $PROFILE --non-interactive
        ;;
    "ios")
        print_status "Building for iOS..."
        eas build --platform ios --profile $PROFILE --non-interactive
        ;;
    "all")
        print_status "Building for both platforms..."
        eas build --platform all --profile $PROFILE --non-interactive
        ;;
    *)
        print_error "Invalid platform: $PLATFORM"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
    print_status "Check your builds at: https://expo.dev/accounts/reedewree/projects/ar-body-measurements/builds"
else
    print_error "Build failed!"
    exit 1
fi

