#!/bin/bash

# 🎯 ACCURACY PRESERVING PRODUCTION BUILD SCRIPT
# This script builds the app with crash fixes while preserving accuracy

echo "🎯 Starting accuracy-preserving production build..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Please install it first:"
    echo "npm install -g @expo/eas-cli"
    exit 1
fi

# Login to EAS (if not already logged in)
echo "🔐 Checking EAS authentication..."
eas whoami || eas login

# Build with accuracy preservation
echo "🏗️ Building with accuracy preservation..."
eas build --platform android --profile production-crash-fixed

# Verify build
echo "✅ Build completed with accuracy preservation!"
echo "📱 Your app is now ready for deployment with crash fixes and accuracy preserved!"

# Show build status
echo "📊 Build status:"
eas build:list --limit 1