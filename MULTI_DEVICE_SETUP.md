# FitForm Multi-Device Setup Guide

This guide will help you set up your FitForm application to run on multiple devices within the same network, including using Expo Go on your phone.

## Prerequisites

- Both devices (computer and phone) must be connected to the same WiFi network
- Expo Go app installed on your phone
- Laravel backend and React Native frontend code ready

## Step 1: Find Your Computer's IP Address

1. **Windows**: Run `fitform-backend/find-ip.bat`
2. **Mac/Linux**: Run `ifconfig` or `ip addr` in terminal
3. Look for an IP address that starts with:
   - `192.168.x.x` (most common)
   - `10.0.x.x`
   - `172.16.x.x`

## Step 2: Update Frontend API Configuration

1. Open `fitform-frontend/services/api.js`
2. Update the `API_BASE_URL` constant:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:8000/api';
   ```
   Replace `YOUR_IP_ADDRESS` with your actual IP (e.g., `192.168.1.100`)

## Step 3: Start the Backend Server

1. Navigate to `fitform-backend` folder
2. Run `start-backend.bat` (Windows) or `php artisan serve --host=0.0.0.0 --port=8000`
3. The server will start on `0.0.0.0:8000` (accessible from any device on the network)
4. Verify it's working by visiting `http://YOUR_IP:8000` in your browser

## Step 4: Start the Frontend Development Server

1. Navigate to `fitform-frontend` folder
2. Run `start-frontend.bat` (Windows) or `npm start`
3. Expo will start and show a QR code
4. The server will be accessible at `exp://YOUR_IP:19000`

## Step 5: Connect with Expo Go on Your Phone

1. Open Expo Go app on your phone
2. Make sure your phone is on the same WiFi network
3. Scan the QR code displayed in your terminal
4. The app should load on your phone

## Troubleshooting

### Common Issues:

1. **Connection Refused**: 
   - Check if both devices are on the same network
   - Verify firewall settings allow connections on port 8000
   - Ensure backend is running on `0.0.0.0:8000`

2. **CORS Errors**:
   - Backend CORS is already configured for common local network IPs
   - If issues persist, check the IP format in `config/cors.php`

3. **Expo Go Connection Issues**:
   - Try using the manual URL entry: `exp://YOUR_IP:19000`
   - Check if your network allows device-to-device communication

### Network Configuration:

- **Windows Firewall**: Allow Laravel on port 8000
- **Antivirus**: Whitelist your development ports
- **Router**: Ensure local network communication is enabled

## Testing the Setup

1. **Backend Test**: Visit `http://YOUR_IP:8000/api/health` (if you have a health endpoint)
2. **Frontend Test**: Load the app on your phone via Expo Go
3. **API Test**: Try logging in or making API calls from your phone

## Security Notes

- This setup is for development only
- Never expose your development server to the internet
- Use HTTPS in production
- Consider using environment variables for IP configuration

## Quick Commands

```bash
# Find IP (Windows)
fitform-backend/find-ip.bat

# Start Backend (Windows)
fitform-backend/start-backend.bat

# Start Backend (Mac/Linux)
cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000

# Start Frontend (Windows)
fitform-frontend/start-frontend.bat

# Start Frontend (Mac/Linux)
cd fitform-frontend && npm start
```

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify network connectivity between devices
3. Ensure all required services are running
4. Check firewall and antivirus settings
