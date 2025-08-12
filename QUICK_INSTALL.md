# 🚀 FitForm - Quick Installation Guide

## 📋 Essential Commands for New Device Setup

### **1. Clone & Setup:**
```bash
git clone https://github.com/Heron-a11y/Fitform.git
cd Fitform
```

### **2. Backend Setup:**
```bash
cd fitform-backend
composer install
npm install
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve --host=0.0.0.0 --port=8000
```

### **3. Frontend Setup:**
```bash
cd fitform-frontend
npm install
npm start
```

## 🔧 System Requirements:
- **PHP:** 8.2+
- **Node.js:** 18+
- **MySQL:** 8.0+
- **Composer:** Latest
- **Git:** Latest

## 📱 Mobile Testing:
- Install **Expo Go** app
- Update IP in `fitform-frontend/services/api.js`
- Scan QR code from terminal

---
**For detailed guide, see `INSTALLATION_GUIDE.md`**
