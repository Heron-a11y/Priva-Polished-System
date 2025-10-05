#!/bin/bash

# Test Gradle Dependency Fix
# This script tests the gradle dependency resolution fix

echo "🔧 Testing Gradle Dependency Fix..."
echo "=================================="

# Navigate to android directory
cd android

echo "📁 Current directory: $(pwd)"

# Clean previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
./gradlew clean

if [ $? -eq 0 ]; then
    echo "✅ Clean successful"
else
    echo "❌ Clean failed"
    exit 1
fi

# Test dependency resolution
echo "🔍 Testing dependency resolution..."
./gradlew app:dependencies --configuration releaseRuntimeClasspath

if [ $? -eq 0 ]; then
    echo "✅ Dependency resolution successful"
else
    echo "❌ Dependency resolution failed"
    exit 1
fi

# Test build configuration
echo "⚙️ Testing build configuration..."
./gradlew app:assembleRelease --dry-run

if [ $? -eq 0 ]; then
    echo "✅ Build configuration test successful"
    echo "🎉 Gradle dependency fix is working!"
    echo ""
    echo "You can now run:"
    echo "  eas build --platform android --profile production"
else
    echo "❌ Build configuration test failed"
    echo "Check the error messages above for remaining issues"
    exit 1
fi

echo ""
echo "📋 Summary:"
echo "- ✅ Gradle clean successful"
echo "- ✅ Dependency resolution working"
echo "- ✅ Build configuration valid"
echo "- 🚀 Ready for EAS build"




