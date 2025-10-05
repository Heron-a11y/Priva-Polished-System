import AsyncStorage from '@react-native-async-storage/async-storage';

// Network configuration for LAN access
const NETWORK_CONFIG = {
    // Local development
    local: {
        backendUrl: 'http://localhost:8000/api',
        expoUrl: 'exp://localhost:8082',
        description: 'Local development (localhost)',
        priority: 1
    },
    // LAN access (auto-detect local IP)
    lan: {
        backendUrl: 'http://192.168.1.105:8000/api', // Updated to match your current IP
        expoUrl: 'exp://192.168.1.105:8082', // Updated to match Metro port
        description: 'LAN access (accessible from same network)',
        priority: 2
    }
};

class NetworkConfig {
    constructor() {
        this.currentMode = 'local'; // Default to local mode since backend is running on localhost
        console.log('🌐 NetworkConfig initialized with local mode');
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

    // Update LAN IP dynamically
    updateLanIp(newIp) {
        if (NETWORK_CONFIG.lan) {
            NETWORK_CONFIG.lan.backendUrl = `http://${newIp}:8000/api`;
            NETWORK_CONFIG.lan.expoUrl = `exp://${newIp}:8082`;
            console.log(`🌐 Updated LAN IP to: ${newIp}`);
        }
    }

    // Get current LAN IP
    getCurrentLanIp() {
        return NETWORK_CONFIG.lan ? NETWORK_CONFIG.lan.backendUrl.replace('http://', '').replace(':8000/api', '') : null;
    }

    // Test network connectivity
    async testConnection() {
        const config = this.getCurrentConfig();
        try {
            console.log(`🧪 Testing connection to: ${config.backendUrl}`);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced timeout for faster fallback
            
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

    // Auto-detect network and update configuration
    async autoDetectNetwork() {
        console.log('🔍 Auto-detecting network configuration...');
        
        // For mobile devices, prioritize LAN over localhost
        // First try LAN connection
        try {
            const lanIp = await this.detectLanIp();
            if (lanIp) {
                console.log(`✅ Auto-detected LAN IP: ${lanIp}`);
                await this.setNetworkMode('lan');
                return 'lan';
            }
        } catch (error) {
            console.log('❌ Error detecting LAN IP:', error.message);
        }
        
        // If LAN fails, try local connection
        try {
            const localTest = await this.testLocalConnection();
            if (localTest.success) {
                console.log('✅ Local connection successful');
                await this.setNetworkMode('local');
                return 'local';
            }
        } catch (error) {
            console.log('❌ Local connection failed:', error.message);
        }
        
        // Fallback to LAN mode (better for mobile devices)
        console.log('⚠️ Using LAN mode as fallback');
        await this.setNetworkMode('lan');
        return 'lan';
    }
    
    // Test local connection
    async testLocalConnection() {
        try {
            console.log('🧪 Testing local connection to: http://localhost:8000/api/test');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch('http://localhost:8000/api/test', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Local connection successful:', data);
                return { success: true, data };
            } else {
                console.log('❌ Local connection failed:', response.status, response.statusText);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('❌ Local connection timeout');
                return { success: false, error: 'Connection timeout' };
            }
            console.log('❌ Local connection error:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Auto-detect LAN IP
    async detectLanIp() {
        try {
            console.log('🔍 Attempting to detect LAN IP...');
            
            // For mobile devices, we'll use the configured LAN IP
            // The LAN IP should be set during development setup
            const currentLanIp = this.getCurrentLanIp();
            if (currentLanIp && currentLanIp !== '192.168.1.100') {
                console.log(`🌐 Using configured LAN IP: ${currentLanIp}`);
                return currentLanIp;
            }
            
            // Try to get the local IP by making a request to a service that returns it
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            // Try multiple methods to get local IP
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://httpbin.org/ip'
            ];
            
            for (const service of ipServices) {
                try {
                    const response = await fetch(service, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
                    if (response.ok) {
                        const data = await response.json();
                        let ip = data.ip || data.origin;
                        
                        if (ip) {
                            // Check if it's a local network IP
                            if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                                console.log(`🌐 Detected LAN IP: ${ip}`);
                                this.updateLanIp(ip);
                                return ip;
                            }
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Failed to get IP from ${service}:`, error.message);
                }
            }
            
            // Fallback: Use the configured LAN IP even if detection failed
            console.log('⚠️ Could not auto-detect LAN IP, using configured IP');
            return currentLanIp || '192.168.1.105';
        } catch (error) {
            console.log('⚠️ Could not detect LAN IP:', error.message);
            // Return configured IP as fallback
            return this.getCurrentLanIp() || '192.168.1.105';
        }
    }

    // Force fallback to local mode
    async fallbackToLocal() {
        console.log('🔄 Falling back to local mode due to connection issues');
        await this.setNetworkMode('local');
        return 'local';
    }
}

// Export singleton instance
export default new NetworkConfig();
export { NETWORK_CONFIG };