const fs = require('fs');
const path = require('path');

// Function to get the current ngrok URL from the API
async function getCurrentNgrokUrl() {
    try {
        const response = await fetch('http://localhost:4040/api/tunnels');
        const data = await response.json();
        
        if (data.tunnels && data.tunnels.length > 0) {
            // Find the tunnel that's running on port 8000
            const tunnel = data.tunnels.find(t => 
                t.config.addr === 'localhost:8000' || 
                t.config.addr === '127.0.0.1:8000' ||
                t.name === 'fitform-api'
            );
            
            if (tunnel && tunnel.public_url) {
                return tunnel.public_url;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Failed to get ngrok URL:', error.message);
        return null;
    }
}

// Function to update the network config with the current ngrok URL
function updateNetworkConfig(ngrokUrl) {
    const networkConfigPath = path.join(__dirname, 'services', 'network-config.js');
    
    try {
        let content = fs.readFileSync(networkConfigPath, 'utf8');
        
        // Update the ngrok backend URL
        const ngrokBackendUrl = `${ngrokUrl}/api`;
        const ngrokExpoUrl = `exp://${ngrokUrl.replace('https://', '')}:443`;
        
        // Replace the ngrok configuration
        content = content.replace(
            /backendUrl: 'https:\/\/[^']*\.ngrok-free\.app\/api'/g,
            `backendUrl: '${ngrokBackendUrl}'`
        );
        
        content = content.replace(
            /expoUrl: 'exp:\/\/[^']*\.ngrok-free\.app:443'/g,
            `expoUrl: '${ngrokExpoUrl}'`
        );
        
        fs.writeFileSync(networkConfigPath, content);
        console.log(`✅ Updated network config with ngrok URL: ${ngrokUrl}`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to update network config:', error.message);
        return false;
    }
}

// Main function
async function main() {
    console.log('🔍 Getting current ngrok URL...');
    
    const ngrokUrl = await getCurrentNgrokUrl();
    if (ngrokUrl) {
        console.log(`🌐 Found ngrok URL: ${ngrokUrl}`);
        updateNetworkConfig(ngrokUrl);
    } else {
        console.log('⚠️ No ngrok tunnel found, using default URL');
        // Use the URL you provided as fallback
        updateNetworkConfig('https://6ce230b8c3f9.ngrok-free.app');
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { updateNetworkConfig, getCurrentNgrokUrl };
