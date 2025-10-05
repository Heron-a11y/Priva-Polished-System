#!/bin/bash

# iOS Production Build Script for AR Body Measurements
# This script prepares and builds the iOS app for production deployment

set -e

echo "🚀 Starting iOS Production Build Process..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Check if user is logged in to EAS
if ! eas whoami &> /dev/null; then
    print_error "You are not logged in to EAS. Please run: eas login"
    exit 1
fi

print_status "Preparing iOS production build..."

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .expo
rm -rf ios/build
rm -rf node_modules/.cache

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run prebuild to ensure iOS project is up to date
print_status "Running prebuild..."
npx expo prebuild --platform ios --clean

# Install iOS dependencies
print_status "Installing iOS dependencies..."
cd ios
pod install --repo-update
cd ..

# Validate configuration
print_status "Validating configuration..."
npx expo doctor

# Build for production
print_status "Building for production..."
eas build --platform ios --profile production --non-interactive

print_success "iOS production build completed successfully!"
print_status "You can check the build status at: https://expo.dev/accounts/cocband/projects/ar-body-measurements/builds"

echo ""
echo "📱 Next Steps:"
echo "1. Wait for the build to complete"
echo "2. Download the .ipa file when ready"
echo "3. Upload to App Store Connect"
echo "4. Submit for App Store review"
echo ""
echo "🔗 Build Dashboard: https://expo.dev/accounts/cocband/projects/ar-body-measurements/builds"


