// Network Connection Fix Script
// This script helps diagnose and fix network connectivity issues

import AsyncStorage from '@react-native-async-storage/async-storage';

class NetworkConnectionFix {
    constructor() {
        this.currentIP = '192.168.1.56'; // Your current IP
        this.baseURL = `http://${this.currentIP}:8000/api`;
        this.testEndpoints = [
            '/test',
            '/appointments',
            '/me'
        ];
    }

    // Test basic connectivity
    async testBasicConnection() {
        try {
            console.log('🧪 Testing basic connection to:', this.baseURL);
            
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
                console.log('✅ Basic connection successful:', data);
                return { success: true, data };
            } else {
                console.log('❌ Basic connection failed:', response.status);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.log('❌ Basic connection error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Test authentication endpoints
    async testAuthEndpoints() {
        const results = {};
        
        for (const endpoint of ['/login', '/register', '/me']) {
            try {
                console.log(`🧪 Testing auth endpoint: ${endpoint}`);
                
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000
                });

                results[endpoint] = {
                    status: response.status,
                    ok: response.ok,
                    success: response.ok || response.status === 401 // 401 is expected for protected routes
                };
                
                console.log(`✅ Auth endpoint ${endpoint}: ${response.status}`);
            } catch (error) {
                results[endpoint] = {
                    success: false,
                    error: error.message
                };
                console.log(`❌ Auth endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        return results;
    }

    // Test appointments endpoint with authentication
    async testAppointmentsEndpoint() {
        try {
            console.log('🧪 Testing appointments endpoint...');
            
            // First, try to get auth token
            const token = await AsyncStorage.getItem('auth_token');
            console.log('🔑 Auth token exists:', !!token);
            
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${this.baseURL}/appointments`, {
                method: 'GET',
                headers,
                timeout: 10000
            });

            console.log('📊 Appointments endpoint response:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.status === 401) {
                console.log('🔐 Authentication required - this is expected');
                return { success: true, requiresAuth: true, message: 'Authentication required' };
            }

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Appointments endpoint successful:', data);
                return { success: true, data };
            } else {
                const errorText = await response.text();
                console.log('❌ Appointments endpoint failed:', errorText);
                return { success: false, error: errorText };
            }
        } catch (error) {
            console.log('❌ Appointments endpoint error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Run comprehensive network test
    async runNetworkDiagnostics() {
        console.log('🔍 Starting comprehensive network diagnostics...');
        
        const results = {
            basicConnection: await this.testBasicConnection(),
            authEndpoints: await this.testAuthEndpoints(),
            appointmentsEndpoint: await this.testAppointmentsEndpoint(),
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Network diagnostics results:', results);
        
        // Store results for debugging
        await AsyncStorage.setItem('network_diagnostics', JSON.stringify(results));
        
        return results;
    }

    // Fix common network issues
    async fixNetworkIssues() {
        console.log('🔧 Attempting to fix network issues...');
        
        try {
            // Clear any cached network settings
            await AsyncStorage.removeItem('network_mode');
            await AsyncStorage.removeItem('last_known_ip');
            
            // Set correct network configuration
            await AsyncStorage.setItem('network_mode', 'lan');
            await AsyncStorage.setItem('last_known_ip', this.currentIP);
            
            console.log('✅ Network configuration updated');
            
            // Test the fix
            const testResult = await this.testBasicConnection();
            if (testResult.success) {
                console.log('✅ Network fix successful');
                return { success: true, message: 'Network configuration fixed' };
            } else {
                console.log('❌ Network fix failed');
                return { success: false, error: 'Network fix failed' };
            }
        } catch (error) {
            console.log('❌ Error fixing network:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get current network status
    async getNetworkStatus() {
        try {
            const diagnostics = await AsyncStorage.getItem('network_diagnostics');
            if (diagnostics) {
                return JSON.parse(diagnostics);
            }
            return null;
        } catch (error) {
            console.log('❌ Error getting network status:', error.message);
            return null;
        }
    }
}

// Export singleton instance
export default new NetworkConnectionFix();

