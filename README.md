# AR Body Measurements 📏

A React Native application that uses Augmented Reality (AR) technology to provide accurate body measurements using your smartphone's camera.

## 🌟 Features

- **Real AR Body Tracking**: Uses ARCore (Android) and ARKit (iOS) for authentic body measurement
- **Accurate Measurements**: Provides precise measurements for chest, waist, hips, shoulders, and more
- **Cross-Platform**: Works on both Android and iOS devices
- **User-Friendly Interface**: Intuitive design with step-by-step measurement guidance
- **Measurement History**: Save and track your measurements over time
- **Multiple Units**: Support for centimeters, inches, and feet/inches
- **Real-Time Feedback**: Live confidence scoring and tracking quality indicators

## 📱 Supported Devices

### Android
- Devices with ARCore 1.40.0+ support
- Android 7.0 (API level 24) or higher
- Camera with autofocus
- Gyroscope and accelerometer

### iOS
- iPhone 6s or newer
- iPad Pro (all models)
- iPad 5th generation or newer
- iOS 13.0 or higher
- ARKit 4.0+ support

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ar-body-measurements.git
   cd ar-body-measurements
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   npm run verify-build
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   
   # Web (for testing)
   npm run web
   ```

## 📖 Detailed Setup

For comprehensive setup instructions, see [SETUP.md](SETUP.md).

## 🏗️ Architecture

### AR Implementation
- **Android**: ARCore 1.40.0 with `AugmentedBody` APIs
- **iOS**: ARKit 4.0 with `ARBodyAnchor` and `ARSkeleton`
- **React Native**: Custom native modules for AR session management

### Key Components
- `ARSessionManagerModule.kt` - Android ARCore implementation
- `ARSessionManager.swift` - iOS ARKit implementation
- `ARSessionManager.ts` - TypeScript interface
- `App.tsx` - Main React Native application

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_API_URL=https://your-api-url.com
EXPO_PUBLIC_DEBUG_MODE=false
```

### Build Configuration
- **Android**: Gradle with ARCore dependencies
- **iOS**: Xcode project with ARKit framework
- **EAS Build**: Cloud building configuration included

## 📦 Building for Production

### Using EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

### Local Building
```bash
# Android APK
cd android && ./gradlew assembleRelease

# iOS (requires Xcode)
open ios/ar-body-measurements.xcworkspace
```

## 🧪 Testing

```bash
# TypeScript compilation
npx tsc --noEmit

# Build verification
npm run verify-build

# Asset validation
npm run validate-assets
```

## 🔍 Troubleshooting

### Common Issues

1. **AR Not Working**
   - Ensure device supports ARCore/ARKit
   - Check camera permissions
   - Verify sufficient lighting
   - Ensure device is not in restricted environment

2. **Build Issues**
   ```bash
   # Clear caches
   npx expo start --clear
   cd android && ./gradlew clean
   cd ios && rm -rf build/ && pod install
   ```

3. **Dependencies Issues**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

For more troubleshooting, see [SETUP.md](SETUP.md#troubleshooting).

## 📊 Technical Specifications

### Dependencies
- **React**: 19.1.0
- **React Native**: 0.81.4
- **Expo**: 54.0.9
- **TypeScript**: 5.9.2
- **ARCore**: 1.40.0 (Android)
- **ARKit**: 4.0+ (iOS)

### Performance
- **Memory**: Optimized for mobile devices
- **Battery**: Efficient AR session management
- **Accuracy**: Real-time measurement validation
- **Smoothing**: Jitter reduction algorithms

## 🔐 Security & Privacy

- **No Data Collection**: All measurements stay on your device
- **Camera Access**: Only used for AR body tracking
- **Permissions**: Minimal required permissions
- **Local Storage**: Measurements saved locally only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain AR accuracy standards
- Test on both Android and iOS
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google ARCore** for Android AR capabilities
- **Apple ARKit** for iOS AR capabilities
- **Expo** for React Native development platform
- **React Native** for cross-platform mobile development

## 📞 Support

- **Documentation**: [SETUP.md](SETUP.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/ar-body-measurements/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ar-body-measurements/discussions)

## 📈 Roadmap

- [ ] Measurement export functionality
- [ ] 3D body visualization
- [ ] Measurement comparison over time
- [ ] Custom measurement points
- [ ] Batch measurement processing
- [ ] Cloud sync (optional)

## 🏷️ Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

**Made with ❤️ using React Native and AR technology**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0.9-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)