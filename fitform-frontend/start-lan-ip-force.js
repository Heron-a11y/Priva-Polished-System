#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

// Get local IP address
function getLocalIP() {
    const networkInterfaces = os.networkInterfaces();
    
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                    return ip;
                }
            }
        }
    }
    
    return '192.168.1.104'; // Fallback to your IP
}

const localIP = getLocalIP();

console.log(`🌐 Using IP: ${localIP}`);

// Set environment variables
process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS = localIP;
process.env.EXPO_DEV_SERVER_URL = `http://${localIP}:8081`;
process.env.EXPO_PACKAGER_HOSTNAME = localIP;
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = localIP;

// Start Expo with forced LAN IP
const expoProcess = spawn('npx', ['expo', 'start', '--lan', '--port', '8081', '--clear'], {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        EXPO_DEVTOOLS_LISTEN_ADDRESS: localIP,
        EXPO_DEV_SERVER_URL: `http://${localIP}:8081`,
        EXPO_PACKAGER_HOSTNAME: localIP,
        REACT_NATIVE_PACKAGER_HOSTNAME: localIP
    }
});

expoProcess.on('error', (error) => {
    console.error('Error starting Expo:', error);
});

expoProcess.on('close', (code) => {
    console.log(`Expo process exited with code ${code}`);
});