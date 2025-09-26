import AsyncStorage from '@react-native-async-storage/async-storage';

// Network configuration for different environments
const NETWORK_CONFIG = {
    // Local development
    local: {
        backendUrl: 'http://localhost:8000/api',
        expoUrl: 'exp://localhost:8081',
        description: 'Local development (localhost only)'
    },
    
    // Ngrok tunnel
    ngrok: {
        backendUrl: 'https://c51a906a7960.ngrok-free.app/api',
        expoUrl: 'exp://c51a906a7960.ngrok-free.app:443',
        description: 'Ngrok tunnel (accessible from any network)'
    },
    
    // Auto-detect ngrok (fallback)
    ngrokAuto: {
        backendUrl: 'https://c51a906a7960.ngrok-free.app/api',
        expoUrl: 'exp://c51a906a7960.ngrok-free.app:443',
        description: 'Auto-detect ngrok tunnel'
    },
    
    // LAN network
    lan: {
        backendUrl: 'http://192.168.1.55:8000/api', // Your local IP address
        expoUrl: 'exp://192.168.1.55:8081',
        description: 'LAN network (local network only)'
    }
};

class NetworkConfig {
    constructor() {
        this.currentMode = 'lan'; // Default to LAN mode for network access
    }

    // Get current network configuration
    getCurrentConfig() {
        return NETWORK_CONFIG[this.currentMode] || NETWORK_CONFIG.local;
    }

    // Set network mode
    async setNetworkMode(mode) {
        if (!NETWORK_CONFIG[mode]) {
            throw new Error(`Invalid network mode: ${mode}`);
        }
        
        this.currentMode = mode;
        await AsyncStorage.setItem('network_mode', mode);
        console.log(`🌐 Network mode set to: ${mode} - ${NETWORK_CONFIG[mode].description}`);
    }

    // Get network mode from storage
    async getNetworkMode() {
        const storedMode = await AsyncStorage.getItem('network_mode');
        if (storedMode && NETWORK_CONFIG[storedMode]) {
            this.currentMode = storedMode;
        }
        return this.currentMode;
    }

    // Get backend URL for current mode
    getBackendUrl() {
        return this.getCurrentConfig().backendUrl;
    }

    // Get Expo URL for current mode
    getExpoUrl() {
        return this.getCurrentConfig().expoUrl;
    }

    // Get all available network modes
    getAvailableModes() {
        return Object.keys(NETWORK_CONFIG).map(mode => ({
            mode,
            ...NETWORK_CONFIG[mode]
        }));
    }

    // Update ngrok URL dynamically
    updateNgrokUrl(newUrl) {
        if (NETWORK_CONFIG.ngrok) {
            NETWORK_CONFIG.ngrok.backendUrl = `${newUrl}/api`;
            NETWORK_CONFIG.ngrok.expoUrl = `exp://${newUrl.replace('https://', '')}:443`;
            console.log(`🌐 Updated ngrok URL to: ${newUrl}`);
        }
    }

    // Get current ngrok URL
    getCurrentNgrokUrl() {
        return NETWORK_CONFIG.ngrok ? NETWORK_CONFIG.ngrok.backendUrl.replace('/api', '') : null;
    }

    // Test network connectivity
    async testConnection() {
        const config = this.getCurrentConfig();
        try {
            console.log(`🧪 Testing connection to: ${config.backendUrl}`);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(`${config.backendUrl}/test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Connection successful:', data);
                return { success: true, data, config };
            } else {
                console.log('❌ Connection failed:', response.status, response.statusText);
                return { success: false, error: `HTTP ${response.status}`, config };
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('❌ Connection timeout');
                return { success: false, error: 'Connection timeout', config };
            }
            console.log('❌ Connection error:', error.message);
            return { success: false, error: error.message, config };
        }
    }

    // Auto-detect best network mode
    async autoDetectNetwork() {
        console.log('🔍 Auto-detecting best network mode...');
        
        // Test each mode with a small delay between tests
        for (const mode of Object.keys(NETWORK_CONFIG)) {
            try {
                this.currentMode = mode;
                const result = await this.testConnection();
                
                if (result.success) {
                    console.log(`✅ Auto-detected working network: ${mode}`);
                    await this.setNetworkMode(mode);
                    return mode;
                }
                
                // Small delay between tests to avoid overwhelming the network
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.log(`❌ Error testing ${mode}:`, error.message);
            }
        }
        
        // Fallback to local if nothing works
        console.log('⚠️ No network modes working, falling back to local');
        await this.setNetworkMode('local');
        return 'local';
    }
}

// Export singleton instance
export default new NetworkConfig();
export { NETWORK_CONFIG };