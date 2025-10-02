# FitForm - AR Body Measurement Mobile App

## 📱 **Project Overview**

FitForm is a comprehensive mobile application that provides AR (Augmented Reality) body measurement capabilities for the fashion industry. The app allows customers to get accurate body measurements using their smartphone camera and AR technology, making online clothing purchases more precise and reducing returns.

## 🎯 **Key Features**

### **Customer Features**
- **AR Body Measurements**: Real-time body scanning using smartphone camera
- **Manual Measurements**: Alternative input method for body measurements
- **Appointment Booking**: Schedule fitting appointments with professionals
- **Order Management**: Track rental and purchase orders
- **Profile Management**: User profiles with measurement history
- **Measurement History**: Track body changes over time

### **Admin Features**
- **Appointment Management**: Manage customer appointments
- **Order Processing**: Handle rental and purchase orders
- **Customer Management**: View customer profiles and measurements
- **Analytics Dashboard**: Business insights and statistics
- **Sizing Management**: Configure clothing sizes and measurements

## 🏗️ **Project Structure**

```
FitForm-Project/
├── fitform-frontend/          # React Native/Expo mobile app
├── fitform-backend/           # Laravel API backend
├── fitform-AR/               # AR measurement module
├── DEPENDENCIES.md           # Detailed dependencies documentation
├── README.md                 # This file
└── [startup scripts]         # Development startup scripts
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (^18.0.0)
- PHP (^8.1)
- MySQL (^8.0)
- Expo CLI
- Android Studio (for Android development)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Heron-a11y/Updated-Fitform-Project.git
   cd Updated-Fitform-Project
   ```

2. **Setup Backend**
   ```bash
   cd fitform-backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate
   php artisan serve
   ```

3. **Setup Frontend**
   ```bash
   cd fitform-frontend
   npm install
   npx expo start
   ```

4. **Setup AR Module**
   ```bash
   cd fitform-AR
   npm install
   ```

### **Development Startup**
```bash
# Start the entire system
./start-fitform-lan.bat

# Or start components individually
./start-backend-lan.bat    # Backend only
./start-frontend-lan.bat   # Frontend only
```

## 📱 **Mobile App Features**

### **AR Body Measurements**
- Real-time body scanning using smartphone camera
- 8 key measurements: Height, Chest, Waist, Hips, Shoulders, Inseam, Arm Length, Neck
- Manual measurement input as alternative
- Measurement validation and accuracy checks

### **User Interface**
- Modern, intuitive design
- Role-based navigation (Customer/Admin)
- Profile management with image upload
- Order tracking and history
- Appointment scheduling

### **Order Management**
- **Rental Orders**: Clothing rental with measurement requirements
- **Purchase Orders**: Direct clothing purchases
- **Order Tracking**: Real-time order status updates
- **Payment Integration**: Secure payment processing

## 🖥️ **Backend API**

### **Authentication**
- Laravel Sanctum for API authentication
- JWT token-based authentication
- Role-based access control (Customer/Admin)

### **Core Endpoints**
- `/api/login` - User authentication
- `/api/register` - User registration
- `/api/profile` - Profile management
- `/api/appointments` - Appointment management
- `/api/orders` - Order processing
- `/api/measurements` - Body measurement storage

### **File Management**
- Profile image upload and storage
- Secure file serving
- Image optimization and resizing

## 🔧 **Development Tools**

### **Frontend Development**
- **Expo Dev Client**: Development builds
- **Metro Bundler**: JavaScript bundling
- **TypeScript**: Type safety
- **ESLint**: Code quality

### **Backend Development**
- **Laravel Artisan**: Command-line tools
- **PHPUnit**: Testing framework
- **Laravel Tinker**: Interactive shell

### **Build & Deployment**
- **EAS Build**: Expo Application Services
- **Android APK**: Production-ready builds
- **Version Control**: Git with GitHub integration

## 📊 **Database Schema**

### **Core Tables**
- `users` - User accounts and profiles
- `appointments` - Appointment scheduling
- `orders` - Rental and purchase orders
- `measurements` - Body measurement data
- `clothing_items` - Product catalog

### **Relationships**
- Users have many appointments and orders
- Orders belong to users and have measurements
- Appointments are linked to users and orders

## 🔒 **Security Features**

- **API Authentication**: Secure token-based authentication
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Data sanitization and validation
- **File Upload Security**: Secure image handling
- **Role-based Access**: Admin and customer permissions

## 📱 **Platform Support**

- **Android**: API Level 21+ (Android 5.0+)
- **iOS**: iOS 13.0+ (planned)
- **Web**: Progressive Web App (planned)

## 🚀 **Deployment**

### **Mobile App**
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### **Backend API**
- Deploy to cloud hosting (AWS, DigitalOcean, etc.)
- Configure database and file storage
- Set up SSL certificates
- Configure CORS for mobile app

## 📈 **Performance Optimization**

- **Image Optimization**: Compressed profile images
- **Lazy Loading**: Efficient component loading
- **Caching**: API response caching
- **Bundle Optimization**: Minimized JavaScript bundles

## 🧪 **Testing**

### **Frontend Testing**
- Component testing with Jest
- Integration testing
- E2E testing with Detox

### **Backend Testing**
- Unit tests with PHPUnit
- API endpoint testing
- Database testing

## 📋 **API Documentation**

### **Authentication Endpoints**
```
POST /api/login
POST /api/register
POST /api/logout
GET  /api/user
```

### **Appointment Endpoints**
```
GET    /api/appointments
POST   /api/appointments
PUT    /api/appointments/{id}
DELETE /api/appointments/{id}
```

### **Order Endpoints**
```
GET    /api/orders
POST   /api/orders
GET    /api/orders/{id}
PUT    /api/orders/{id}
```

## 🔧 **Configuration**

### **Environment Variables**
- `APP_URL` - Application URL
- `DB_CONNECTION` - Database connection
- `JWT_SECRET` - JWT signing key
- `CORS_ALLOWED_ORIGINS` - CORS configuration

### **Mobile App Configuration**
- Network configuration for API endpoints
- Camera permissions for AR features
- Storage permissions for profile images

## 📞 **Support & Contact**

- **Developer**: Heron-a11y
- **Repository**: https://github.com/Heron-a11y/Updated-Fitform-Project
- **Documentation**: See DEPENDENCIES.md for detailed setup

## 📄 **License**

This project is proprietary software developed for academic purposes.

---

**Version**: 1.0.0  
**Last Updated**: October 2, 2025  
**Status**: Production Ready
