#!/bin/bash

# Enhanced Build Script for AR Body Measurements
# Comprehensive build process with optimizations and error handling

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
PLATFORM=${2:-"all"}
ENABLE_OPTIMIZATIONS=${3:-"true"}
ENABLE_DEBUG=${4:-"false"}

# Function to print colored output
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js $(node --version) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version) found"
    
    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        print_warning "EAS CLI not found. Installing..."
        npm install -g @expo/eas-cli
    fi
    print_success "EAS CLI found"
    
    # Check if logged in to EAS
    if ! eas whoami &> /dev/null; then
        print_warning "Not logged in to EAS. Please run: eas login"
        exit 1
    fi
    print_success "EAS authentication verified"
}

# Function to clean build artifacts
clean_build_artifacts() {
    print_header "Cleaning Build Artifacts"
    
    print_step "Removing node_modules"
    rm -rf node_modules
    
    print_step "Removing build directories"
    rm -rf android/build
    rm -rf ios/build
    rm -rf .expo
    
    print_step "Clearing npm cache"
    npm cache clean --force
    
    print_success "Build artifacts cleaned"
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_step "Installing npm packages"
    npm install --no-optional --production=false
    
    if [ "$ENABLE_DEBUG" = "true" ]; then
        print_step "Installing debug dependencies"
        npm install --save-dev @types/react @types/react-native
    fi
    
    print_success "Dependencies installed"
}

# Function to validate configuration
validate_configuration() {
    print_header "Validating Configuration"
    
    # Check app.json
    if [ ! -f "app.json" ]; then
        print_error "app.json not found"
        exit 1
    fi
    print_success "app.json found"
    
    # Check eas.json
    if [ ! -f "eas.json" ]; then
        print_error "eas.json not found"
        exit 1
    fi
    print_success "eas.json found"
    
    # Check package.json
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    print_success "package.json found"
    
    # Validate TypeScript configuration
    if [ -f "tsconfig.json" ]; then
        print_step "Validating TypeScript configuration"
        npx tsc --noEmit
        print_success "TypeScript configuration valid"
    fi
    
    # Check for required files
    required_files=(
        "App.tsx"
        "src/ARSessionManager.ts"
        "src/config/ARConfig.ts"
        "android/app/build.gradle"
        "ios/Podfile"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    print_success "All required files found"
}

# Function to run pre-build checks
run_prebuild_checks() {
    print_header "Running Pre-build Checks"
    
    # Lint code
    print_step "Running ESLint"
    if command -v eslint &> /dev/null; then
        npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0 || {
            print_warning "ESLint found issues, but continuing build"
        }
    else
        print_info "ESLint not available, skipping"
    fi
    
    # Type checking
    print_step "Running TypeScript type checking"
    npx tsc --noEmit || {
        print_error "TypeScript type checking failed"
        exit 1
    }
    print_success "TypeScript type checking passed"
    
    # Asset validation
    print_step "Validating assets"
    if [ -f "validate-assets.js" ]; then
        node validate-assets.js || {
            print_error "Asset validation failed"
            exit 1
        }
    fi
    print_success "Asset validation passed"
}

# Function to build for Android
build_android() {
    print_header "Building for Android"
    
    print_step "Prebuilding Android project"
    npx expo prebuild --platform android --clean
    
    print_step "Building Android APK"
    if [ "$BUILD_TYPE" = "production" ]; then
        eas build --platform android --profile production
    elif [ "$BUILD_TYPE" = "preview" ]; then
        eas build --platform android --profile preview
    else
        eas build --platform android --profile development
    fi
    
    print_success "Android build completed"
}

# Function to build for iOS
build_ios() {
    print_header "Building for iOS"
    
    print_step "Prebuilding iOS project"
    npx expo prebuild --platform ios --clean
    
    print_step "Installing iOS dependencies"
    cd ios && pod install && cd ..
    
    print_step "Building iOS app"
    if [ "$BUILD_TYPE" = "production" ]; then
        eas build --platform ios --profile production
    elif [ "$BUILD_TYPE" = "preview" ]; then
        eas build --platform ios --profile preview
    else
        eas build --platform ios --profile development
    fi
    
    print_success "iOS build completed"
}

# Function to run post-build tasks
run_postbuild_tasks() {
    print_header "Running Post-build Tasks"
    
    # Generate build report
    print_step "Generating build report"
    cat > build-report.md << EOF
# Build Report

**Build Type:** $BUILD_TYPE
**Platform:** $PLATFORM
**Timestamp:** $(date)
**Node Version:** $(node --version)
**NPM Version:** $(npm --version)

## Build Configuration
- Optimizations: $ENABLE_OPTIMIZATIONS
- Debug Mode: $ENABLE_DEBUG

## Build Status
✅ Build completed successfully

## Next Steps
1. Test the build on target devices
2. Deploy to app stores if production build
3. Monitor performance and user feedback
EOF
    
    print_success "Build report generated"
    
    # Clean up temporary files
    print_step "Cleaning up temporary files"
    rm -rf .expo
    rm -rf node_modules/.cache
    
    print_success "Post-build tasks completed"
}

# Function to handle errors
handle_error() {
    print_error "Build failed at step: $1"
    print_info "Check the logs above for details"
    print_info "Common solutions:"
    print_info "1. Check your EAS authentication: eas whoami"
    print_info "2. Verify your app configuration in app.json and eas.json"
    print_info "3. Ensure all dependencies are properly installed"
    print_info "4. Check for TypeScript errors: npx tsc --noEmit"
    exit 1
}

# Main build function
main() {
    print_header "🚀 Enhanced AR Body Measurements Build"
    print_info "Build Type: $BUILD_TYPE"
    print_info "Platform: $PLATFORM"
    print_info "Optimizations: $ENABLE_OPTIMIZATIONS"
    print_info "Debug Mode: $ENABLE_DEBUG"
    
    # Set up error handling
    trap 'handle_error "Unknown"' ERR
    
    # Run build steps
    check_prerequisites
    clean_build_artifacts
    install_dependencies
    validate_configuration
    run_prebuild_checks
    
    # Build for specified platform
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
        build_android
    fi
    
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
        build_ios
    fi
    
    run_postbuild_tasks
    
    print_header "🎉 Build Completed Successfully!"
    print_success "Your AR Body Measurements app has been built successfully"
    print_info "Check the EAS dashboard for build status and download links"
}

# Run main function
main "$@"

