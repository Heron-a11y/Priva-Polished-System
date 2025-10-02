# FitForm Project Dependencies

## 📱 **Frontend Dependencies (React Native/Expo)**

### **Core Framework**
- **expo**: `54.0.12` - Expo SDK for React Native development
- **react**: `19.1.0` - React library
- **react-native**: `0.81.4` - React Native framework
- **react-dom**: `19.1.0` - React DOM for web support

### **Navigation & Routing**
- **expo-router**: `~6.0.10` - File-based routing for Expo
- **@react-navigation/native**: `^7.1.6` - Navigation library
- **@react-navigation/bottom-tabs**: `^7.3.10` - Bottom tab navigation
- **@react-navigation/elements**: `^2.3.8` - Navigation elements

### **UI Components & Styling**
- **@expo/vector-icons**: `^15.0.2` - Icon library
- **expo-font**: `~14.0.4` - Custom fonts
- **expo-splash-screen**: `~31.0.10` - Splash screen
- **expo-status-bar**: `~3.0.8` - Status bar control
- **expo-system-ui**: `~6.0.7` - System UI control
- **react-native-safe-area-context**: `^5.6.1` - Safe area handling
- **react-native-screens**: `~4.16.0` - Native screen optimization

### **Camera & AR Features**
- **expo-camera**: `~17.0.8` - Camera access
- **expo-image-picker**: `~17.0.7` - Image selection
- **expo-media-library**: `~18.2.0` - Media library access
- **react-native-vision-camera**: `^4.7.2` - Advanced camera features
- **expo-gl**: `~16.0.7` - OpenGL support for AR
- **expo-sensors**: `~15.0.7` - Device sensors for AR

### **State Management & Data**
- **@react-native-async-storage/async-storage**: `^2.2.0` - Local storage
- **axios**: `^1.9.0` - HTTP client
- **react-native-calendars**: `^1.1313.0` - Calendar components

### **Development & Build Tools**
- **expo-dev-client**: `~6.0.12` - Development client
- **expo-build-properties**: `~1.0.9` - Build configuration
- **expo-constants**: `~18.0.9` - App constants
- **expo-linking**: `~8.0.8` - Deep linking
- **expo-web-browser**: `~15.0.7` - Web browser integration

### **Animation & Gestures**
- **react-native-reanimated**: `~4.1.1` - Advanced animations
- **react-native-gesture-handler**: `~2.28.0` - Gesture handling

### **Utilities**
- **expo-haptics**: `~15.0.7` - Haptic feedback
- **expo-blur**: `~15.0.7` - Blur effects
- **expo-symbols**: `~1.0.7` - Symbol support
- **expo-image**: `~3.0.8` - Optimized image component

## 🖥️ **Backend Dependencies (Laravel/PHP)**

### **Core Framework**
- **Laravel**: `^10.0` - PHP web framework
- **PHP**: `^8.1` - PHP runtime

### **Database**
- **MySQL**: Database server
- **Laravel Eloquent**: ORM for database operations

### **Authentication & Security**
- **Laravel Sanctum**: API authentication
- **Laravel CORS**: Cross-origin resource sharing

### **File Storage**
- **Laravel Storage**: File storage management
- **Image Processing**: Profile image handling

## 📱 **AR Module Dependencies**

### **AR Framework**
- **Custom AR Implementation**: Native AR functionality
- **Device Sensors**: Accelerometer, Gyroscope
- **Camera Integration**: Real-time body measurement

## 🛠️ **Development Tools**

### **Frontend Development**
- **Expo CLI**: `^54.0.8` - Development tools
- **Metro Bundler**: JavaScript bundler
- **TypeScript**: Type checking
- **ESLint**: Code linting

### **Build & Deployment**
- **EAS Build**: Expo Application Services
- **Android SDK**: Version 35
- **Gradle**: Build system
- **Node.js**: JavaScript runtime

## 📦 **Package Managers**

### **Frontend**
- **npm**: Node package manager
- **package-lock.json**: Dependency lock file

### **Backend**
- **Composer**: PHP dependency manager
- **composer.json**: PHP dependencies

## 🔧 **System Requirements**

### **Development Environment**
- **Node.js**: `^18.0.0`
- **npm**: `^8.0.0`
- **Expo CLI**: Latest version
- **Android Studio**: For Android development
- **Xcode**: For iOS development (macOS only)

### **Server Requirements**
- **PHP**: `^8.1`
- **MySQL**: `^8.0`
- **Apache/Nginx**: Web server
- **Composer**: PHP dependency manager

## 📋 **Installation Commands**

### **Frontend Setup**
```bash
cd fitform-frontend
npm install
npx expo install
```

### **Backend Setup**
```bash
cd fitform-backend
composer install
php artisan key:generate
php artisan migrate
```

### **AR Module Setup**
```bash
cd fitform-AR
npm install
```

## 🚀 **Build Commands**

### **Development Build**
```bash
eas build --platform android --profile development
```

### **Production Build**
```bash
eas build --platform android --profile production
```

## 📱 **Platform Support**

- **Android**: API Level 21+ (Android 5.0+)
- **iOS**: iOS 13.0+
- **Web**: Modern browsers with WebGL support

## 🔒 **Security Dependencies**

- **Laravel Sanctum**: API token authentication
- **CORS**: Cross-origin request handling
- **HTTPS**: Secure communication
- **Input Validation**: Data sanitization

## 📊 **Performance Dependencies**

- **React Native Reanimated**: Smooth animations
- **Expo Image**: Optimized image loading
- **AsyncStorage**: Efficient local storage
- **Metro Bundler**: Fast JavaScript bundling

---

**Last Updated**: October 2, 2025  
**Project Version**: 1.0.0  
**Maintainer**: Heron-a11y
