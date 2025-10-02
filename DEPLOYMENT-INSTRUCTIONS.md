# FitForm AR Body Measurements - Deployment Instructions

This document provides comprehensive instructions for deploying and running the FitForm AR Body Measurements system in different network configurations.

## 🚀 Quick Start Options

### Option 1: Enhanced Auto-Detection (Recommended)
```bash
# Run the enhanced startup script
start-fitform-enhanced.bat
```
This script will:
- Auto-detect your local IP address
- Test different network configurations
- Choose the best working option
- Start both backend and frontend servers

### Option 2: Ngrok Tunnel (For External Access)
```bash
# Run the ngrok tunnel script
start-fitform-ngrok.bat
```
This script will:
- Start backend server
- Create ngrok tunnel for backend
- Start frontend server
- Create ngrok tunnel for frontend
- Auto-update network configuration

### Option 3: Manual Configuration
```bash
# Start backend manually
cd fitform-backend
php artisan serve --host=0.0.0.0 --port=8000

# Start frontend manually (in another terminal)
cd fitform-frontend
npx expo start --lan --port 8081
```

## 🌐 Network Configuration Options

### 1. Local Development (localhost only)
- **Backend**: `http://localhost:8000`
- **Frontend**: `http://localhost:8081`
- **Mobile**: Not accessible from mobile devices
- **Use Case**: Development and testing on same machine

### 2. LAN Network (Local Network)
- **Backend**: `http://[YOUR_IP]:8000` (e.g., `http://192.168.1.55:8000`)
- **Frontend**: `http://[YOUR_IP]:8081` (e.g., `http://192.168.1.55:8081`)
- **Mobile**: Accessible from devices on same network
- **Use Case**: Testing with mobile devices on local network

### 3. Custom IP Address
- **Backend**: `http://[CUSTOM_IP]:8000`
- **Frontend**: `http://[CUSTOM_IP]:8081`
- **Mobile**: Accessible from devices on same network
- **Use Case**: Specific IP configuration requirements

### 4. Ngrok Tunnel (Internet Access)
- **Backend**: `https://[ngrok-url].ngrok-free.app`
- **Frontend**: `exp://[ngrok-url].ngrok-free.app:443`
- **Mobile**: Accessible from anywhere with internet
- **Use Case**: External testing, demos, or remote access

## 📱 Mobile Device Setup

### Prerequisites
1. Install **Expo Go** app on your mobile device
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

### Connection Methods

#### Method 1: QR Code (Recommended)
1. Start the frontend server
2. Scan the QR code displayed in the terminal
3. The app will load automatically on your device

#### Method 2: Manual Connection
1. Get the connection URL from the frontend server output
2. Open Expo Go app
3. Enter the URL manually

#### Method 3: Same Network
1. Ensure your mobile device is on the same network
2. Use the LAN configuration
3. Scan QR code or enter URL manually

## 🔧 Configuration Files

### Backend Configuration
- **File**: `fitform-backend/config/app.php`
- **Key Settings**:
  - `APP_URL`: Set to your server URL
  - `APP_ENV`: Set to `production` for production
  - `APP_DEBUG`: Set to `false` for production

### Frontend Configuration
- **File**: `fitform-frontend/services/network-config.js`
- **Key Settings**:
  - Auto-detection of network configuration
  - Priority-based network selection
  - Custom IP address support

### Ngrok Configuration
- **File**: `fitform-backend/ngrok.yml`
- **Key Settings**:
  - Backend tunnel on port 8000
  - Frontend tunnel on port 8081
  - HTTPS support enabled

## 🛠️ Troubleshooting

### Common Issues

#### 1. Backend Connection Failed
**Symptoms**: Frontend cannot connect to backend
**Solutions**:
- Check if backend is running on port 8000
- Verify firewall settings
- Ensure backend is accessible from frontend IP
- Check network configuration

#### 2. Mobile Device Cannot Connect
**Symptoms**: Expo Go cannot load the app
**Solutions**:
- Ensure mobile device is on same network
- Check if frontend server is accessible
- Verify QR code is correct
- Try manual URL entry

#### 3. Ngrok Tunnel Issues
**Symptoms**: External access not working
**Solutions**:
- Check if ngrok is running
- Verify ngrok configuration
- Check ngrok dashboard at `http://localhost:4040`
- Ensure both backend and frontend tunnels are active

#### 4. AR Tracking Issues
**Symptoms**: AR body tracking not working properly
**Solutions**:
- Ensure good lighting conditions
- Check camera permissions
- Verify device supports ARCore/ARKit
- Check AR configuration settings

### Network Testing

#### Test Backend Connection
```bash
# Test local connection
curl http://localhost:8000/api/test

# Test LAN connection
curl http://[YOUR_IP]:8000/api/test

# Test ngrok connection
curl https://[ngrok-url].ngrok-free.app/api/test
```

#### Test Frontend Connection
```bash
# Test local connection
curl http://localhost:8081

# Test LAN connection
curl http://[YOUR_IP]:8081
```

## 🔒 Security Considerations

### Production Deployment
1. **HTTPS Only**: Use HTTPS in production
2. **Authentication**: Implement proper authentication
3. **CORS**: Configure CORS properly
4. **Environment Variables**: Use environment variables for sensitive data
5. **Firewall**: Configure firewall rules appropriately

### Development Security
1. **Local Network Only**: Use LAN configuration for development
2. **Ngrok Security**: Be cautious with ngrok tunnels in production
3. **API Keys**: Keep API keys secure
4. **Database**: Use secure database configuration

## 📊 Performance Optimization

### Backend Optimization
1. **PHP Configuration**: Optimize PHP settings
2. **Database**: Use appropriate database configuration
3. **Caching**: Implement caching where appropriate
4. **Memory**: Monitor memory usage

### Frontend Optimization
1. **Bundle Size**: Optimize JavaScript bundle
2. **Images**: Optimize image assets
3. **Network**: Minimize network requests
4. **AR Performance**: Optimize AR processing

### AR Tracking Optimization
1. **Frame Rate**: Adjust frame processing interval
2. **Confidence**: Tune confidence thresholds
3. **Smoothing**: Adjust smoothing parameters
4. **Memory**: Monitor AR processing memory usage

## 🚀 Production Deployment

### Backend Deployment
1. **Server Setup**: Configure production server
2. **Database**: Set up production database
3. **SSL**: Configure SSL certificates
4. **Domain**: Set up domain name
5. **Monitoring**: Implement monitoring and logging

### Frontend Deployment
1. **Build**: Create production build
2. **CDN**: Use CDN for assets
3. **SSL**: Ensure HTTPS support
4. **Performance**: Optimize for performance
5. **Testing**: Comprehensive testing

## 📞 Support

### Getting Help
1. **Documentation**: Check this documentation first
2. **Logs**: Check server and application logs
3. **Network**: Verify network configuration
4. **Testing**: Use provided test scripts
5. **Community**: Check project community resources

### Reporting Issues
1. **Description**: Provide detailed description
2. **Logs**: Include relevant logs
3. **Configuration**: Include configuration details
4. **Environment**: Specify environment details
5. **Steps**: Provide steps to reproduce

---

## 🎯 Quick Reference

### Start Commands
```bash
# Enhanced auto-detection
start-fitform-enhanced.bat

# Ngrok tunnel
start-fitform-ngrok.bat

# Manual start
start-fitform-easy.bat
```

### Network URLs
- **Local**: `http://localhost:8000` (backend), `http://localhost:8081` (frontend)
- **LAN**: `http://[YOUR_IP]:8000` (backend), `http://[YOUR_IP]:8081` (frontend)
- **Ngrok**: `https://[ngrok-url].ngrok-free.app` (both)

### Mobile Connection
1. Install Expo Go app
2. Scan QR code from frontend server
3. App loads automatically

### Testing
- Backend: `http://[URL]/api/test`
- Frontend: `http://[URL]`
- Ngrok: Check dashboard at `http://localhost:4040`
