import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class DynamicNetworkConfig {
    constructor() {
        this.currentIP = null;
        this.fallbackIPs = ['192.168.1.56', '192.168.1.100', '192.168.0.1', '10.0.0.1'];
        this.initializeNetwork();
    }

    async initializeNetwork() {
        try {
            // Try to get stored IP first
            const storedIP = await AsyncStorage.getItem('last_known_ip');
            if (storedIP) {
                this.currentIP = storedIP;
                console.log('🌐 Using stored IP:', storedIP);
            } else {
                // Auto-detect current network IP
                await this.detectCurrentIP();
            }
        } catch (error) {
            console.log('⚠️ Network initialization failed:', error.message);
            this.currentIP = this.fallbackIPs[0];
        }
    }

    async detectCurrentIP() {
        try {
            console.log('🔍 Detecting current network IP...');
            
            // For React Native, we'll use a different approach
            // Try to make a request to a service that returns the local IP
            const response = await fetch('https://api.ipify.org?format=json', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                const publicIP = data.ip;
                
                // For local development, we'll use common local network ranges
                // This is a simplified approach - in production you'd want more sophisticated detection
                const localIP = this.guessLocalIP(publicIP);
                this.currentIP = localIP;
                
                // Store the detected IP
                await AsyncStorage.setItem('last_known_ip', localIP);
                console.log('🌐 Detected local IP:', localIP);
            }
        } catch (error) {
            console.log('⚠️ IP detection failed, using fallback');
            this.currentIP = this.fallbackIPs[0];
        }
    }

    guessLocalIP(publicIP) {
        // This is a simplified approach - in a real app you'd want more sophisticated detection
        // For now, we'll cycle through common local network ranges
        const commonRanges = [
            '192.168.1.56', '192.168.1.100', '192.168.1.105',
            '192.168.0.1', '192.168.0.100',
            '10.0.0.1', '10.0.0.100',
            '172.16.0.1'
        ];
        
        // Return the first one for now - in production you'd test connectivity
        return commonRanges[0];
    }

    getBackendUrl() {
        const ip = this.currentIP || this.fallbackIPs[0];
        return `http://${ip}:8000/api`;
    }

    getExpoUrl() {
        const ip = this.currentIP || this.fallbackIPs[0];
        return `exp://${ip}:8081`;
    }

    async updateIP(newIP) {
        this.currentIP = newIP;
        await AsyncStorage.setItem('last_known_ip', newIP);
        console.log('🌐 IP updated to:', newIP);
    }

    async testConnection() {
        const backendUrl = this.getBackendUrl();
        try {
            console.log('🧪 Testing connection to:', backendUrl);
            
            const response = await fetch(`${backendUrl}/test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                timeout: 10000
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Connection successful:', data);
                return { success: true, data, url: backendUrl };
            } else {
                console.log('❌ Connection failed:', response.status);
                return { success: false, error: `HTTP ${response.status}`, url: backendUrl };
            }
        } catch (error) {
            console.log('❌ Connection error:', error.message);
            return { success: false, error: error.message, url: backendUrl };
        }
    }

    async findWorkingIP() {
        console.log('🔍 Searching for working IP...');
        
        for (const ip of this.fallbackIPs) {
            console.log(`🧪 Testing IP: ${ip}`);
            this.currentIP = ip;
            
            const result = await this.testConnection();
            if (result.success) {
                await this.updateIP(ip);
                console.log(`✅ Found working IP: ${ip}`);
                return ip;
            }
        }
        
        console.log('❌ No working IP found');
        return null;
    }

    getCurrentIP() {
        return this.currentIP || this.fallbackIPs[0];
    }

    async resetNetworkConfig() {
        await AsyncStorage.removeItem('last_known_ip');
        this.currentIP = null;
        await this.initializeNetwork();
    }
}

// Export singleton instance
export default new DynamicNetworkConfig();
