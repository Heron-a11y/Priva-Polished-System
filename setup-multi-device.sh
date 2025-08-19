#!/bin/bash

echo "========================================"
echo "FitForm Multi-Device Setup (Mac/Linux)"
echo "========================================"
echo ""
echo "This script will help you set up your FitForm app"
echo "to run on multiple devices within the same network."
echo ""

# Get the current IP address automatically
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

# Alternative method for different systems
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d'/' -f1 | head -1)
fi

echo "Current IP Address: $IP_ADDRESS"
echo ""
echo "========================================"
echo "STEP 1: Update Frontend API Configuration"
echo "========================================"
echo ""
echo "You need to update the API_BASE_URL in your frontend code."
echo ""
echo "Open: fitform-frontend/services/api.js"
echo "Change line 8 to: const API_BASE_URL = 'http://$IP_ADDRESS:8000/api';"
echo ""
read -p "Press Enter after you've made this change..."

echo ""
echo "========================================"
echo "STEP 2: Start Backend Server"
echo "========================================"
echo ""
echo "Starting Laravel backend server..."
echo "This will make your API accessible at: http://$IP_ADDRESS:8000"
echo ""
read -p "Press Enter to start the backend..."

cd fitform-backend
gnome-terminal -- bash -c "php artisan serve --host=0.0.0.0 --port=8000; exec bash" &
# Alternative for different terminal emulators
# xterm -e "php artisan serve --host=0.0.0.0 --port=8000; exec bash" &
# konsole -e "php artisan serve --host=0.0.0.0 --port=8000; exec bash" &
cd ..

echo ""
echo "Backend server started in a new terminal."
echo "Wait a few seconds for it to fully start up."
echo ""
echo "========================================"
echo "STEP 3: Start Frontend Development Server"
echo "========================================"
echo ""
echo "Starting Expo development server..."
echo "This will make your app accessible at: exp://$IP_ADDRESS:19000"
echo ""
read -p "Press Enter to start the frontend..."

cd fitform-frontend
gnome-terminal -- bash -c "npm start; exec bash" &
# Alternative for different terminal emulators
# xterm -e "npm start; exec bash" &
# konsole -e "npm start; exec bash" &
cd ..

echo ""
echo "========================================"
echo "SETUP COMPLETE!"
echo "========================================"
echo ""
echo "Your FitForm app is now accessible on your network:"
echo ""
echo "Backend API: http://$IP_ADDRESS:8000"
echo "Frontend App: exp://$IP_ADDRESS:19000"
echo ""
echo "========================================"
echo "NEXT STEPS:"
echo "========================================"
echo "1. Make sure your phone is on the same WiFi network"
echo "2. Install Expo Go app on your phone"
echo "3. Scan the QR code from the frontend terminal"
echo "4. Your app should load on your phone!"
echo ""
echo "========================================"
echo "TROUBLESHOOTING:"
echo "========================================"
echo "- If connection fails, check firewall settings"
echo "- Ensure both devices are on the same network"
echo "- Try manually entering: exp://$IP_ADDRESS:19000"
echo ""
echo "Press Enter to exit..."
read
