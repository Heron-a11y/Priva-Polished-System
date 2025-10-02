const os = require('os');
const fs = require('fs');
const path = require('path');

// Get LAN IP address
function getLanIp() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                // Check if it's a local network IP
                if (iface.address.startsWith('192.168.') || 
                    iface.address.startsWith('10.') || 
                    iface.address.startsWith('172.')) {
                    return iface.address;
                }
            }
        }
    }
    
    return null;
}

// Update network configuration
function updateNetworkConfig(ip) {
    const networkConfigPath = path.join(__dirname, 'services', 'network-config.js');
    
    try {
        let content = fs.readFileSync(networkConfigPath, 'utf8');
        
        // Update LAN configuration with detected IP
        content = content.replace(
            /backendUrl: 'http:\/\/192\.168\.1\.100:8000\/api'/g,
            `backendUrl: 'http://${ip}:8000/api'`
        );
        content = content.replace(
            /expoUrl: 'exp:\/\/192\.168\.1\.100:8081'/g,
            `expoUrl: 'exp://${ip}:8081'`
        );
        
        fs.writeFileSync(networkConfigPath, content);
        console.log(`✅ Updated network configuration with IP: ${ip}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update network configuration:', error.message);
        return false;
    }
}

// Main function
function main() {
    console.log('🔍 Detecting LAN IP address...');
    
    const ip = getLanIp();
    
    if (ip) {
        console.log(`🌐 Detected LAN IP: ${ip}`);
        
        if (updateNetworkConfig(ip)) {
            console.log('✅ LAN configuration updated successfully!');
            console.log('');
            console.log('📱 Mobile app configuration:');
            console.log(`   Backend URL: http://${ip}:8000/api`);
            console.log(`   Frontend URL: exp://${ip}:8081`);
            console.log('');
            console.log('💡 Make sure your mobile device is on the same WiFi network');
        } else {
            console.log('❌ Failed to update configuration');
        }
    } else {
        console.log('❌ Could not detect LAN IP address');
        console.log('💡 Please check your network connection and try again');
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { getLanIp, updateNetworkConfig };
