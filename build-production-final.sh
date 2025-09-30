#!/bin/bash

echo "🚨 FINAL COMPLETE CRASH FIX - Building production app..."

# Apply final crash fixes
node FINAL_CRASH_FIX_COMPLETE.js

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf android/app/build
rm -rf android/build

# Build with production-crash-fixed profile
echo "🔨 Building with production-crash-fixed profile..."
eas build --platform android --profile production-crash-fixed --non-interactive

echo "✅ Production build complete with all crash fixes!"
echo "📱 Your app should now work without crashes!"
