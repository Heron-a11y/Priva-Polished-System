// Network Configuration Fix
// This script ensures the frontend connects to the correct backend URL

import AsyncStorage from '@react-native-async-storage/async-storage';

class NetworkFix {
    constructor() {
        this.correctIP = '192.168.1.56';
        this.correctPort = '8000';
        this.baseURL = `http://${this.correctIP}:${this.correctPort}/api`;
    }

    // Force update the network configuration
    async fixNetworkConfig() {
        try {
            console.log('🔧 Fixing network configuration...');
            
            // Clear any cached network settings
            await AsyncStorage.removeItem('network_mode');
            await AsyncStorage.removeItem('last_known_ip');
            await AsyncStorage.removeItem('network_diagnostics');
            
            // Set the correct network configuration
            await AsyncStorage.setItem('network_mode', 'lan');
            await AsyncStorage.setItem('last_known_ip', this.correctIP);
            await AsyncStorage.setItem('backend_url', this.baseURL);
            
            console.log('✅ Network configuration updated:', {
                ip: this.correctIP,
                port: this.correctPort,
                baseURL: this.baseURL
            });
            
            return { success: true, baseURL: this.baseURL };
        } catch (error) {
            console.error('❌ Failed to fix network configuration:', error);
            return { success: false, error: error.message };
        }
    }

    // Test the connection
    async testConnection() {
        try {
            console.log('🧪 Testing connection to:', this.baseURL);
            
            const response = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Connection successful:', data);
                return { success: true, data };
            } else {
                console.log('❌ Connection failed:', response.status);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.log('❌ Connection error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get the correct base URL
    getBaseURL() {
        return this.baseURL;
    }

    // Update API service base URL
    async updateAPIService(apiService) {
        try {
            console.log('🔄 Updating API service base URL...');
            apiService.baseURL = this.baseURL;
            console.log('✅ API service updated with URL:', this.baseURL);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to update API service:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export default new NetworkFix();


