# AR Body Measurements - Setup Guide

## 📋 Prerequisites

Before setting up the AR Body Measurements project, ensure you have the following installed:

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

### For Android Development
- **Android Studio** (latest version) - [Download here](https://developer.android.com/studio)
- **Android SDK** (API level 33 or higher)
- **Java Development Kit (JDK)** (version 17 or higher)
- **Android device** with ARCore support or **Android emulator** with ARCore

### For iOS Development
- **macOS** (required for iOS development)
- **Xcode** (latest version) - [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **iOS device** with ARKit support (iPhone 6s or newer, iPad Pro, or iPad 5th generation or newer)
- **Apple Developer Account** (for device testing)

### For EAS Build (Cloud Building)
- **Expo CLI** - Install globally: `npm install -g @expo/cli`
- **EAS CLI** - Install globally: `npm install -g eas-cli`
- **Expo account** - [Sign up here](https://expo.dev/)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ar-body-measurements.git
cd ar-body-measurements
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Verify Setup
```bash
npm run verify-build
```

### 4. Start Development Server
```bash
npm start
```

## 📱 Platform-Specific Setup

### Android Setup

#### 1. Configure Android Environment
- Open Android Studio
- Install Android SDK (API level 33+)
- Set up Android emulator with ARCore support
- Enable Developer Options and USB Debugging on your Android device

#### 2. Run on Android
```bash
# For physical device
npm run android

# For emulator
npm run android
```

#### 3. Build for Production
```bash
# Using EAS Build (recommended)
eas build --platform android

# Or local build
cd android
./gradlew assembleRelease
```

### iOS Setup

#### 1. Configure iOS Environment
- Install Xcode from App Store
- Open Xcode and accept license agreements
- Install iOS simulators
- Connect your iOS device and trust the computer

#### 2. Install iOS Dependencies
```bash
cd ios
pod install
cd ..
```

#### 3. Run on iOS
```bash
# For simulator
npm run ios

# For physical device
npm run ios -- --device
```

#### 4. Build for Production
```bash
# Using EAS Build (recommended)
eas build --platform ios

# Or local build
npm run ios -- --configuration Release
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Optional: Custom configuration
EXPO_PUBLIC_API_URL=https://your-api-url.com
EXPO_PUBLIC_DEBUG_MODE=false
```

### EAS Build Configuration
The project includes `eas.json` for cloud building:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## 🧪 Testing

### Run Tests
```bash
# TypeScript compilation check
npx tsc --noEmit

# Build verification
npm run verify-build

# Asset validation
npm run validate-assets
```

### Test on Different Platforms
```bash
# Web (for testing UI components)
npm run web

# Android emulator
npm run android

# iOS simulator
npm run ios
```

## 📦 Building for Production

### Using EAS Build (Recommended)

#### 1. Login to Expo
```bash
eas login
```

#### 2. Configure Project
```bash
eas build:configure
```

#### 3. Build for Android
```bash
eas build --platform android --profile production
```

#### 4. Build for iOS
```bash
eas build --platform ios --profile production
```

### Local Building

#### Android APK
```bash
cd android
./gradlew assembleRelease
# APK will be in android/app/build/outputs/apk/release/
```

#### iOS IPA
```bash
# Open Xcode
open ios/ar-body-measurements.xcworkspace
# Build and archive in Xcode
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Metro Bundler Issues
```bash
# Clear Metro cache
npx expo start --clear

# Reset Metro cache
npx react-native start --reset-cache
```

#### 2. Android Build Issues
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Clear Gradle cache
rm -rf ~/.gradle/caches/
```

#### 3. iOS Build Issues
```bash
# Clean iOS build
cd ios
rm -rf build/
pod deintegrate
pod install
cd ..
```

#### 4. Node Modules Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 5. AR Not Working
- Ensure device supports ARCore (Android) or ARKit (iOS)
- Check camera permissions are granted
- Verify device has sufficient lighting
- Ensure device is not in a restricted environment

### Debug Mode
Enable debug mode for troubleshooting:
```bash
# Start with debug mode
npm start -- --dev-client

# Check logs
npx expo logs
```

## 📚 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# Test changes
npm run verify-build

# Commit changes
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature
```

### 2. Code Quality
```bash
# Type checking
npx tsc --noEmit

# Build verification
npm run verify-build

# Test on multiple platforms
npm run android
npm run ios
npm run web
```

### 3. Release Process
```bash
# Update version in package.json
# Update version in app.json
# Create release notes

# Build for production
eas build --platform all --profile production

# Submit to app stores
eas submit --platform all
```

## 🛠️ Project Structure

```
ar-body-measurements/
├── android/                 # Android native code
│   ├── app/
│   │   └── src/main/java/   # ARCore implementation
│   └── gradle.properties    # Android configuration
├── ios/                     # iOS native code
│   ├── ar-body-measurements/ # iOS app files
│   └── ARSessionManager.swift # ARKit implementation
├── src/                     # TypeScript source
│   └── ARSessionManager.ts  # AR session interface
├── assets/                  # App assets
├── App.tsx                  # Main app component
├── app.json                 # Expo configuration
├── package.json             # Dependencies
├── eas.json                 # EAS build configuration
└── README.md                # Project documentation
```

## 🔐 Security Considerations

### Production Builds
- Debug keystore is automatically excluded
- All sensitive data is properly managed
- AR permissions are properly configured
- No hardcoded secrets in the codebase

### Device Requirements
- **Android**: ARCore 1.40.0+ support
- **iOS**: ARKit 4.0+ support (iOS 13.0+)
- **Camera**: Required for AR functionality
- **Storage**: Required for saving measurements

## 📞 Support

### Getting Help
- Check the [troubleshooting section](#troubleshooting) above
- Review [Expo documentation](https://docs.expo.dev/)
- Check [React Native documentation](https://reactnative.dev/)
- Review [ARCore documentation](https://developers.google.com/ar)
- Review [ARKit documentation](https://developer.apple.com/augmented-reality/)

### Reporting Issues
- Create an issue on GitHub
- Include device information
- Include error logs
- Include steps to reproduce

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Happy coding! 🚀**

For more information, visit the [project repository](https://github.com/your-username/ar-body-measurements).
