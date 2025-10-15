// Simple API Service
// This is a simplified version of the API service that bypasses complex network configuration

import AsyncStorage from '@react-native-async-storage/async-storage';
import SIMPLE_API_CONFIG from './simple-api-config';

class SimpleApiService {
    constructor() {
        this.baseURL = SIMPLE_API_CONFIG.baseURL;
        this.token = null;
        console.log('🌐 SimpleApiService initialized with URL:', this.baseURL);
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        AsyncStorage.setItem('auth_token', token);
    }

    // Get auth token
    async getToken() {
        if (!this.token) {
            this.token = await AsyncStorage.getItem('auth_token');
        }
        return this.token;
    }

    // Clear auth token
    async clearToken() {
        this.token = null;
        await AsyncStorage.removeItem('auth_token');
    }

    // Get headers for API requests
    async getHeaders() {
        const token = await this.getToken();
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    // Make API request
    async request(endpoint, options = {}) {
        try {
            const headers = await this.getHeaders();
            const url = `${this.baseURL}${endpoint}`;

            console.log(`🌐 Making API request to: ${url}`);

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
                timeout: 10000,
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', {
                    status: response.status,
                    contentType,
                    response: textResponse.substring(0, 200)
                });
                throw new Error(`Server returned non-JSON response (${response.status}): ${textResponse.substring(0, 100)}`);
            }

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors (422) with more detail
                if (response.status === 422 && data.errors) {
                    const errorMessages = Object.values(data.errors).flat().join(', ');
                    throw new Error(`Validation failed: ${errorMessages}`);
                }
                throw new Error(data.message || `API request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Handle specific error types
            if (error.message.includes('fetch') || error.message.includes('network')) {
                console.error('❌ Network error - check LAN connection');
                console.error('💡 Current API URL:', this.baseURL);
                console.error('💡 Make sure backend server is running on port 8000');
                throw new Error('Network error - please check your LAN connection and ensure backend is running');
            }
            
            if (error.message.includes('Failed to fetch')) {
                console.error('❌ Failed to fetch - check LAN connection');
                console.error('💡 Current API URL:', this.baseURL);
                console.error('💡 Make sure backend server is running on port 8000');
                throw new Error('Cannot connect to server - please check your LAN connection and ensure backend is running');
            }
            
            throw error;
        }
    }

    // HTTP method shortcuts
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data = null, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put(endpoint, data = null, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Authentication methods
    async login(credentials) {
        try {
            const response = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });

            if (response.success && response.data.token) {
                this.setToken(response.data.token);
            }

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.request('/logout', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await this.clearToken();
        }
    }

    async getCurrentUser() {
        return this.request('/me');
    }

    // Appointments
    async getAppointments() {
        try {
            console.log('🌐 Fetching appointments...');
            const token = await this.getToken();
            console.log('🔑 Auth token available:', !!token);
            
            if (!token) {
                throw new Error('Authentication required - please login first');
            }
            
            return this.request('/appointments');
        } catch (error) {
            console.error('❌ Error fetching appointments:', error);
            throw error;
        }
    }

    // Test connection
    async testConnection() {
        return await SIMPLE_API_CONFIG.testConnection();
    }

    // Get current URL
    getCurrentURL() {
        return this.baseURL;
    }
}

// Create and export a singleton instance
const simpleApiService = new SimpleApiService();
export default simpleApiService;

