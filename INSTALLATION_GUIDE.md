# 🚀 FitForm Project - Complete Installation Guide

This guide will help you set up the FitForm project on any new device after pulling from GitHub.

## 📋 Prerequisites

### **System Requirements:**
- **Operating System:** Windows 10/11, macOS, or Linux
- **PHP:** Version 8.2 or higher
- **Node.js:** Version 18 or higher
- **Composer:** Latest version
- **Git:** Latest version
- **Database:** MySQL 8.0+ or MariaDB 10.5+

## 🖥️ Backend Dependencies (Laravel)

### **PHP Extensions Required:**
```bash
# Required PHP extensions
php-bcmath
php-curl
php-dom
php-fileinfo
php-gd
php-mbstring
php-mysql
php-openssl
php-pdo
php-tokenizer
php-xml
php-zip
```

### **Composer Dependencies:**
```bash
# Navigate to backend directory
cd fitform-backend

# Install PHP dependencies
composer install

# Production dependencies (if deploying)
composer install --no-dev --optimize-autoloader
```

**Main Dependencies:**
- `php: ^8.2`
- `laravel/framework: ^12.0`
- `laravel/sanctum: ^4.1`
- `laravel/tinker: ^2.10.1`

**Development Dependencies:**
- `fakerphp/faker: ^1.23`
- `laravel/pail: ^1.2.2`
- `laravel/pint: ^1.13`
- `laravel/sail: ^1.41`
- `mockery/mockery: ^1.6`
- `nunomaduro/collision: ^8.6`
- `phpunit/phpunit: ^11.5.3`

### **Frontend Build Dependencies (Backend):**
```bash
# Install Node.js dependencies for Vite build
npm install

# Dependencies:
# - @tailwindcss/vite: ^4.0.0
# - axios: ^1.7.4
# - concurrently: ^9.0.1
# - laravel-vite-plugin: ^1.2.0
# - tailwindcss: ^4.0.0
# - vite: ^6.0.11
```

## 📱 Frontend Dependencies (React Native/Expo)

### **Navigate to Frontend Directory:**
```bash
cd fitform-frontend
```

### **Install Node.js Dependencies:**
```bash
npm install
```

### **Main Dependencies:**
```json
{
  "@expo/vector-icons": "^14.1.0",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/datetimepicker": "^8.4.2",
  "@react-navigation/bottom-tabs": "^7.3.10",
  "@react-navigation/elements": "^2.3.8",
  "@react-navigation/native": "^7.1.6",
  "axios": "^1.9.0",
  "expo": "~53.0.11",
  "expo-blur": "~14.1.5",
  "expo-constants": "~17.1.6",
  "expo-font": "~13.3.1",
  "expo-haptics": "~14.1.4",
  "expo-image": "~2.3.0",
  "expo-image-picker": "~16.1.4",
  "expo-linking": "~7.1.5",
  "expo-router": "~5.1.0",
  "expo-splash-screen": "~0.30.9",
  "expo-status-bar": "~2.2.3",
  "expo-symbols": "~0.4.5",
  "expo-system-ui": "~5.0.8",
  "expo-web-browser": "~14.1.6",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "react-native": "0.79.3",
  "react-native-calendars": "^1.1312.1",
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.17.4",
  "react-native-safe-area-context": "^5.4.0",
  "react-native-screens": "~4.11.1",
  "react-native-web": "~0.20.0",
  "react-native-webview": "13.13.5"
}
```

### **Development Dependencies:**
```json
{
  "@babel/core": "^7.25.2",
  "@types/react": "~19.0.10",
  "eslint": "^9.25.0",
  "eslint-config-expo": "~9.2.0",
  "typescript": "~5.8.3"
}
```

## 🗄️ Database Setup

### **Create Database:**
```sql
CREATE DATABASE fitform_db;
CREATE USER 'fitform_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON fitform_db.* TO 'fitform_user'@'localhost';
FLUSH PRIVILEGES;
```

### **Environment Configuration:**
```bash
# Copy environment file
cp .env.example .env

# Edit .env file with your database credentials
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fitform_db
DB_USERNAME=fitform_user
DB_PASSWORD=your_password
```

## ⚙️ Complete Setup Steps

### **1. Clone Repository:**
```bash
git clone https://github.com/Heron-a11y/Fitform.git
cd Fitform
```

### **2. Backend Setup:**
```bash
cd fitform-backend

# Install PHP dependencies
composer install

# Install Node.js dependencies for build
npm install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# Seed database with initial data
php artisan db:seed

# Start backend server
php artisan serve --host=0.0.0.0 --port=8000
```

### **3. Frontend Setup:**
```bash
cd fitform-frontend

# Install dependencies
npm install

# Start Expo development server
npm start
```

### **4. Mobile App Setup:**
- Install **Expo Go** app on your mobile device
- Scan QR code from terminal
- Or run on emulator/simulator

## 🔧 Additional Tools

### **Required Software:**
- **XAMPP/WAMP/MAMP** (for local development)
- **VS Code** or preferred code editor
- **Postman** or similar API testing tool
- **Git** for version control

### **Optional Tools:**
- **Laravel Telescope** for debugging
- **Laravel Debugbar** for development
- **React Native Debugger** for mobile debugging

## 🚨 Common Issues & Solutions

### **PHP Version Issues:**
```bash
# Check PHP version
php -v

# If version < 8.2, update PHP
# Windows: Update XAMPP
# macOS: brew install php@8.2
# Linux: sudo apt install php8.2
```

### **Composer Issues:**
```bash
# Clear composer cache
composer clear-cache

# Update composer
composer self-update
```

### **Node.js Issues:**
```bash
# Check Node.js version
node -v

# If version < 18, update Node.js
# Download from: https://nodejs.org/
```

### **Database Connection Issues:**
- Verify MySQL service is running
- Check database credentials in `.env`
- Ensure database exists and user has permissions

## 📱 Mobile Development

### **Expo CLI (Optional):**
```bash
npm install -g @expo/cli
```

### **Android Studio (for Android development):**
- Install Android Studio
- Set up Android SDK
- Configure environment variables

### **Xcode (for iOS development - macOS only):**
- Install Xcode from App Store
- Install iOS Simulator

## 🌐 Network Configuration

### **For Mobile Testing:**
1. Find your computer's IP address
2. Update `API_BASE_URL` in `fitform-frontend/services/api.js`
3. Ensure backend runs with `--host=0.0.0.0`

### **IP Address Commands:**
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

## ✅ Verification Checklist

- [ ] PHP 8.2+ installed
- [ ] Composer installed
- [ ] Node.js 18+ installed
- [ ] MySQL running
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Environment file configured
- [ ] Database created and migrated
- [ ] Backend server running
- [ ] Frontend development server running
- [ ] Mobile app connecting to backend

## 🆘 Support

If you encounter issues:
1. Check error logs in `storage/logs/`
2. Verify all dependencies are installed
3. Ensure correct versions are used
4. Check network configuration for mobile testing

---

**Happy Coding! 🚀**
