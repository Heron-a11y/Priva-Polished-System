#!/bin/bash

echo "🚀 Setting up AR Development Build for Android 15"
echo

echo "📋 Prerequisites:"
echo "- Android 15 device with ARCore support"
echo "- EAS CLI installed"
echo "- Expo account configured"
echo

echo "🔧 Step 1: Installing EAS CLI..."
npm install -g @expo/eas-cli
echo

echo "🔧 Step 2: Configuring EAS..."
eas build:configure
echo

echo "🔧 Step 3: Building development version..."
echo "This will create a development build with native modules enabled"
echo
eas build --profile development --platform android
echo

echo "📱 Step 4: Install on Device"
echo "1. Download the APK from the EAS dashboard"
echo "2. Install on your Android 15 device"
echo "3. AR will work with native modules"
echo

echo "✅ Development build setup complete!"
echo "🎯 AR will work on physical device with native modules"
echo
