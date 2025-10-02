# FitForm LAN Setup Instructions

This guide will help you set up FitForm for LAN access, allowing your mobile app to connect to the backend server over your local network.

## Prerequisites

- Both your development computer and mobile device must be on the same WiFi network
- XAMPP with MySQL running
- Node.js and npm installed
- Expo CLI installed (`npm install -g @expo/cli`)

## Quick Start

1. **Configure LAN IP automatically:**
   ```bash
   configure-lan-ip.bat
   ```

2. **Start both servers:**
   ```bash
   start-fitform-lan.bat
   ```

3. **Connect your mobile device:**
   - Open Expo Go app on your phone
   - Scan the QR code from the Metro server
   - Your app should now connect to the backend over LAN

## Manual Setup

### Step 1: Get Your LAN IP Address

Run this command to find your LAN IP:
```bash
get-lan-ip.bat
```

Note down your IP address (e.g., `192.168.1.104`).

### Step 2: Update Configuration

The configuration is automatically updated when you run `configure-lan-ip.bat`, but you can also manually update:

1. **Backend CORS Configuration** (`fitform-backend/config/cors.php`):
   - Already configured to allow LAN access
   - Supports common LAN IP ranges (192.168.x.x, 10.x.x.x, 172.16.x.x)

2. **Frontend Network Configuration** (`fitform-frontend/services/network-config.js`):
   - Automatically updated by the configuration script
   - Uses detected LAN IP for backend and frontend URLs

### Step 3: Start the Servers

#### Option A: Start Both Together
```bash
start-fitform-lan.bat
```

#### Option B: Start Separately
```bash
# Terminal 1 - Backend
start-backend-lan.bat

# Terminal 2 - Frontend  
start-frontend-lan.bat
```

### Step 4: Connect Mobile Device

1. **Install Expo Go** on your mobile device from:
   - [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to the same WiFi network** as your development computer

3. **Scan the QR code** from the Metro server terminal

4. **Your app should now load** and connect to the backend over LAN

## Troubleshooting

### Mobile App Can't Connect

1. **Check Network Connection:**
   - Ensure both devices are on the same WiFi network
   - Try disconnecting and reconnecting to WiFi

2. **Check IP Address:**
   - Run `get-lan-ip.bat` to verify your IP
   - Make sure the IP in configuration matches your actual IP

3. **Check Firewall:**
   - Windows Firewall might be blocking connections
   - Allow Node.js and PHP through the firewall

4. **Check Backend Status:**
   - Visit `http://YOUR_IP:8000/api/test` in your browser
   - Should return a JSON response if backend is running

### Backend Not Starting

1. **Check XAMPP:**
   - Ensure Apache and MySQL are running in XAMPP
   - Check if port 8000 is available

2. **Check Laravel:**
   - Run `php artisan serve --host=0.0.0.0 --port=8000` manually
   - Check for any error messages

### Frontend Not Starting

1. **Check Node.js:**
   - Ensure Node.js and npm are installed
   - Try `npm install` in the frontend directory

2. **Check Expo:**
   - Ensure Expo CLI is installed globally
   - Try `npx expo start --lan` manually

## Configuration Files

### Backend Configuration
- **CORS**: `fitform-backend/config/cors.php` - Allows LAN access
- **Environment**: `fitform-backend/.env` - Set APP_URL to your LAN IP

### Frontend Configuration  
- **Network Config**: `fitform-frontend/services/network-config.js` - LAN URLs
- **API Service**: `fitform-frontend/services/api.js` - Backend connection

## Network Requirements

- **Backend Port**: 8000 (must be accessible from mobile device)
- **Frontend Port**: 8081 (Expo Metro server)
- **Protocol**: HTTP (not HTTPS for local development)
- **Network**: Same WiFi network for all devices

## Security Notes

- This setup is for **development only**
- Do not use in production without proper security measures
- LAN access allows any device on your network to connect
- Consider using VPN for remote development

## Alternative: Manual IP Configuration

If automatic detection fails, you can manually set your IP:

1. Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `fitform-frontend/services/network-config.js`:
   ```javascript
   lan: {
       backendUrl: 'http://192.168.1.104:8000/api',
       expoUrl: 'exp://192.168.1.104:8081',
       // ...
   }
   ```

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify network connectivity between devices
3. Ensure all required services are running
4. Check firewall and antivirus settings
