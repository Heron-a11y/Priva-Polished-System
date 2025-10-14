import AsyncStorage from '@react-native-async-storage/async-storage';
import networkConfig from './network-config';

// Base API configuration - will be dynamically set based on network mode
let API_BASE_URL = 'http://192.168.1.56:8000/api'; // Updated to current IP

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = null;
        this.initializeNetwork();
    }

    // Initialize network configuration
    async initializeNetwork() {
        try {
            // Auto-detect network configuration
            const mode = await networkConfig.autoDetectNetwork();
            console.log('🌐 Auto-detected network mode:', mode);
            this.updateBaseURL();
            
            // Test current connection
            const connectionTest = await this.testApiConnection();
            if (!connectionTest.success) {
                console.log('🔄 Auto-detected network failed, trying local mode...');
                await networkConfig.setNetworkMode('local');
                this.updateBaseURL();
                
                // Test local connection
                const localTest = await this.testApiConnection();
                if (!localTest.success) {
                    console.log('❌ Local connection also failed, check if backend is running');
                } else {
                    console.log('✅ Local connection successful');
                }
            } else {
                console.log('✅ Connection test successful');
            }
        } catch (error) {
            console.log('⚠️ Failed to initialize network config:', error);
            // Fallback to local mode
            await networkConfig.setNetworkMode('local');
            this.updateBaseURL();
        }
    }

    // Update base URL based on current network mode
    updateBaseURL() {
        this.baseURL = networkConfig.getBackendUrl();
        console.log('🌐 API Base URL updated to:', this.baseURL);
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

    // Network management methods
    async setNetworkMode(mode) {
        await networkConfig.setNetworkMode(mode);
        this.updateBaseURL();
    }

    async getNetworkMode() {
        return await networkConfig.getNetworkMode();
    }

    async getAvailableNetworks() {
        return networkConfig.getAvailableModes();
    }

    async testConnection() {
        return await networkConfig.testConnection();
    }

    async autoDetectNetwork() {
        const mode = await networkConfig.autoDetectNetwork();
        this.updateBaseURL();
        return mode;
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

    // Make API request with retry logic
    async request(endpoint, options = {}, retryCount = 0) {
        const maxRetries = 2;
        
        try {
            const headers = await this.getHeaders();
            const url = `${this.baseURL}${endpoint}`;

            // Only log on first attempt to reduce spam
            if (retryCount === 0) {
                console.log(`🌐 Making API request to: ${url}`);
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', {
                    status: response.status,
                    contentType,
                    response: textResponse.substring(0, 200) + (textResponse.length > 200 ? '...' : '')
                });
                
                // If we're not using local mode and get a non-JSON response, try local mode
                const currentMode = await networkConfig.getNetworkMode();
                if (currentMode !== 'local' && retryCount === 0) {
                    console.log('🔄 Non-JSON response detected, trying local mode...');
                    await networkConfig.fallbackToLocal();
                    this.updateBaseURL();
                    return this.request(endpoint, options, retryCount + 1); // Retry with local mode
                }
                
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
            if (error.name === 'AbortError') {
                console.error('❌ Request timeout - server may be down or slow');
                throw new Error('Request timeout - please check your internet connection and try again');
            }
            
            if (error.message.includes('fetch') || error.message.includes('network')) {
                console.error('❌ Network error - check LAN connection');
                console.error('💡 Make sure both devices are on the same network');
                throw new Error('Network error - please check your LAN connection');
            }
            
            if (error.message.includes('Failed to fetch')) {
                console.error('❌ Failed to fetch - check LAN connection');
                throw new Error('Cannot connect to server - please check your LAN connection');
            }
            
            // Retry logic for network errors
            if (retryCount < maxRetries && (error.message.includes('network') || error.message.includes('timeout'))) {
                console.log(`🔄 Retrying request (${retryCount + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return this.request(endpoint, options, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

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

    // Customer Preferences
    async getPreferences() {
        return this.request('/preferences');
    }

    async createPreference(preferenceData) {
        return this.request('/preferences', {
            method: 'POST',
            body: JSON.stringify(preferenceData),
        });
    }

    async updatePreference(preferenceData) {
        return this.request('/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferenceData),
        });
    }

    // Appointments
    async getAppointments() {
        return this.request('/appointments');
    }

    async getBookedDates() {
        return this.request('/booked-dates');
    }

    async getDailyCapacity(date) {
        const params = date ? `?date=${date}` : '';
        return this.request(`/appointments/daily-capacity${params}`);
    }

    async createAppointment(appointmentData) {
        return this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }

    async updateAppointment(id, appointmentData) {
        return this.request(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(appointmentData),
        });
    }

    async deleteAppointment(id) {
        return this.request(`/appointments/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin Appointments
    async getAllAppointments() {
        return this.request('/admin/appointments');
    }
    async updateAdminAppointmentStatus(id, status) {
        return this.request(`/admin/appointments/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        });
    }
    async getAppointmentStats() {
        return this.request('/admin/appointments/stats');
    }

    // Rental Transactions
    async getRentalTransactions() {
        return this.request('/rental-transactions');
    }

    async createRentalTransaction(transactionData) {
        return this.request('/rental-transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
    }

    async updateRentalTransaction(id, transactionData) {
        return this.request(`/rental-transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(transactionData),
        });
    }

    async deleteRentalTransaction(id) {
        return this.request(`/rental-transactions/${id}`, {
            method: 'DELETE',
        });
    }

    // Purchase Transactions
    async createPurchaseTransaction(transactionData) {
        return this.request('/purchases', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
    }

    async getPurchases() {
        return this.request('/purchases');
    }

    async getPurchaseHistory() {
        return this.request('/purchases/history');
    }

    async getPurchase(id) {
        return this.request(`/purchases/${id}`);
    }

    async updatePurchase(id, purchaseData) {
        return this.request(`/purchases/${id}`, {
            method: 'PUT',
            body: JSON.stringify(purchaseData),
        });
    }

    async deletePurchase(id) {
        return this.request(`/purchases/${id}`, {
            method: 'DELETE',
        });
    }

    // Unified History
    async getRentalPurchaseHistory() {
        return this.request('/rental-purchase-history');
    }

    async deleteRentalPurchaseHistory(id) {
        return this.request(`/rental-purchase-history/${id}`, {
            method: 'DELETE',
        });
    }

    // Counter offer methods
    async submitCounterOffer(purchaseId, counterOfferData) {
        return this.request(`/purchases/${purchaseId}/counter-offer`, {
            method: 'POST',
            body: JSON.stringify(counterOfferData),
        });
    }

    // Rental counter offer methods
    async submitRentalCounterOffer(rentalId, counterOfferData) {
        return this.request(`/rentals/${rentalId}/counter-offer`, {
            method: 'POST',
            body: JSON.stringify(counterOfferData),
        });
    }

    // Rental Methods
    async getRentals() {
        return this.request('/rentals');
    }

    async getRentalHistory() {
        return this.request('/rentals/history');
    }

    async getRental(id) {
        return this.request(`/rentals/${id}`);
    }

    async createRental(rentalData) {
        return this.request('/rentals', {
            method: 'POST',
            body: JSON.stringify(rentalData),
        });
    }

    async updateRental(id, rentalData) {
        return this.request(`/rentals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(rentalData),
        });
    }

    async deleteRental(id) {
        return this.request(`/rentals/${id}`, {
            method: 'DELETE',
        });
    }

    async cancelRentalOrder(id) {
        return this.request(`/rentals/${id}/cancel`, {
            method: 'POST',
        });
    }

    // Note: Rental and Purchase history are now unified under getRentalPurchaseHistory()

    // Penalty management
    async getPenaltyBreakdown(rentalId) {
        return this.request(`/rentals/${rentalId}/penalties`);
    }
    async calculatePenalties(rentalId, data) {
        return this.request(`/rentals/${rentalId}/calculate-penalties`, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
    }
    async markPenaltiesPaid(rentalId) {
        return this.request(`/rentals/${rentalId}/mark-penalties-paid`, { method: 'POST' });
    }
    async acceptAgreement(rentalId) {
        return this.request(`/rentals/${rentalId}/accept-agreement`, { method: 'POST' });
    }

    // New rental flow methods
    async markRentalAsPickedUp(rentalId) {
        return this.request(`/rentals/${rentalId}/mark-picked-up`, { method: 'POST' });
    }

    async markRentalAsReturned(rentalId) {
        return this.request(`/rentals/${rentalId}/mark-returned`, { method: 'POST' });
    }

    // New purchase flow methods
    async markPurchaseAsPickedUp(purchaseId) {
        return this.request(`/purchases/${purchaseId}/mark-picked-up`, { method: 'POST' });
    }

    // Check if user is authenticated
    async isAuthenticated() {
        try {
            const token = await this.getToken();
            console.log('API Service - Token exists:', !!token);
            if (!token) return false;

            const userResponse = await this.getCurrentUser();
            console.log('API Service - getCurrentUser response:', userResponse);
            return true;
        } catch (error) {
            console.log('API Service - Authentication failed:', error);
            await this.clearToken();
            return false;
        }
    }

    // Profile Management
    async getProfile() {
        return this.request('/profile');
    }

    async updateProfile(profileData) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    async changePassword(passwordData) {
        return this.request('/profile/change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData),
        });
    }

    async uploadProfileImage(imageUri) {
        console.log('🖼️ Starting profile image upload:', imageUri);
        
        // Create FormData for React Native with proper format
        const formData = new FormData();
        formData.append('profile_image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'profile_image.jpg',
        });

        // Get auth token for authorization
        const token = await this.getToken();
        console.log('🔑 Auth token available:', !!token);
        
        const headers = {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            // Don't set Content-Type, let FormData set it automatically
        };

        const url = `${this.baseURL}/profile/upload-image`;
        console.log(`🌐 Uploading profile image to: ${url}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: headers,
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', {
                    status: response.status,
                    contentType,
                    response: textResponse.substring(0, 200) + (textResponse.length > 200 ? '...' : '')
                });
                throw new Error(`Server returned non-JSON response (${response.status}): ${textResponse.substring(0, 100)}`);
            }

            const data = await response.json();
            console.log('✅ Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || `API request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('❌ Upload error:', error);
            throw error;
        }
    }

    async deleteProfileImage() {
        return this.request('/profile/image', {
            method: 'DELETE',
        });
    }

    // Admin Profile Management
    async getProfileStats() {
        return this.request('/admin/profile/stats');
    }

    async getAllUsers() {
        return this.request('/admin/users');
    }

    async updateUserRole(userId, role) {
        return this.request(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        });
    }

    // Test API connectivity
    async testApiConnection() {
        try {
            console.log('🧪 Testing API connection to:', this.baseURL);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for faster response
            
            const response = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                throw new Error(`Non-JSON response: ${textResponse.substring(0, 100)}`);
            }

            const data = await response.json();
            console.log('✅ API connection successful:', data);
            return { success: true, data };
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ API connection timeout - server may be down');
                return { success: false, error: 'Connection timeout - check if backend is running' };
            }
            console.error('❌ API connection failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Sizing System Methods
    async getSizeRecommendations() {
        return this.request('/sizing/recommendations');
    }

    async getSizeCharts(category, gender) {
        let url = '/sizing/charts';
        const params = new URLSearchParams();
        
        if (category && category !== 'all') params.append('category', category);
        if (gender && gender !== 'all') params.append('gender', gender);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        return this.request(url);
    }

    async matchMeasurements(measurements) {
        return this.request('/sizing/match-measurements', {
            method: 'POST',
            body: JSON.stringify(measurements),
        });
    }

    // Measurement History Methods
    async getMeasurementHistory(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/measurement-history?${queryParams}` : '/measurement-history';
        return this.request(url);
    }

    async saveMeasurementHistory(data) {
        console.log('🌐 API: Sending measurement data to backend');
        if (data.notes) {
            console.log('🌐 API: Notes field:', data.notes);
        }
        return this.request('/measurement-history', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMeasurementHistoryById(id) {
        return this.request(`/measurement-history/${id}`);
    }

    // Get latest measurements for the current user
    async getLatestMeasurements() {
        try {
            // Skip the non-existent endpoint and go straight to fallback
            console.log('🔄 Using fallback for latest measurements...');
            
            // Try measurement history latest first
            const response = await this.request('/measurement-history/latest');
            if (response && response.data) {
                return { success: true, data: response.data };
            }
            
            // If that doesn't work, try getting the most recent from history
            const historyResponse = await this.request('/measurement-history');
            if (historyResponse && Array.isArray(historyResponse) && historyResponse.length > 0) {
                // Get the most recent measurement
                const latestMeasurement = historyResponse[0];
                return { success: true, data: latestMeasurement };
            }
            
            return { success: false, data: null };
        } catch (error) {
            console.log('❌ Error loading latest measurements:', error.message);
            return { success: false, data: null };
        }
    }

    // Get user's measurement history
    async getUserMeasurements() {
        try {
            // Skip the non-existent endpoint and go straight to fallback
            console.log('🔄 Using fallback for user measurements...');
            return await this.request('/measurement-history');
        } catch (error) {
            console.log('❌ Error loading user measurements:', error.message);
            return { success: false, data: [] };
        }
    }

    async updateMeasurementHistory(id, data) {
        return this.request(`/measurement-history/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteMeasurementHistory(id) {
        return this.request(`/measurement-history/${id}`, {
            method: 'DELETE',
        });
    }

    async getMeasurementHistoryStats() {
        return this.request('/measurement-history/stats');
    }

    async getLatestMeasurement() {
        return this.request('/measurement-history/latest');
    }

    // Admin Sizing Methods
    async getSizingStandards() {
        return this.request('/admin/sizing/standards');
    }

    async getAllSizingStandards() {
        return this.request('/admin/sizing/standards/all');
    }

    async getActiveSizingStandards() {
        return this.request('/admin/sizing/standards/active');
    }

    async checkSizingStandardDeletion(id) {
        return this.request(`/admin/sizing/standards/${id}/check-deletion`);
    }

    async updateSizingStandard(standardData) {
        return this.request('/admin/sizing/standards', {
            method: 'POST',
            body: JSON.stringify(standardData),
        });
    }

    async deleteSizingStandard(id) {
        return this.request(`/admin/sizing/standards/${id}`, {
            method: 'DELETE',
        });
    }

    async deactivateSizingStandard(id) {
        return this.request(`/admin/sizing/standards/${id}/deactivate`, {
            method: 'POST',
        });
    }

    async reactivateSizingStandard(id) {
        return this.request(`/admin/sizing/standards/${id}/reactivate`, {
            method: 'POST',
        });
    }

    async customizeSizeParameters(id, parameters) {
        return this.request(`/admin/sizing/standards/${id}/parameters`, {
            method: 'PUT',
            body: JSON.stringify(parameters),
        });
    }

    // Admin Measurement History Methods
    async getAdminMeasurementHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `/admin/measurement-history?${queryString}` : '/admin/measurement-history';
        return this.request(url);
    }

    async getAdminMeasurementHistoryStats() {
        return this.request('/admin/measurement-history/stats');
    }

    async deleteAdminMeasurementHistory(id) {
        return this.request(`/admin/measurement-history/${id}`, {
            method: 'DELETE',
        });
    }

    async updateAdminMeasurementHistory(id, data) {
        return this.request(`/admin/measurement-history/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getAdminMeasurementHistoryById(id) {
        return this.request(`/admin/measurement-history/${id}`);
    }

    async createAdminMeasurementHistory(data) {
        return this.request('/admin/measurement-history', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async markAdminMeasurementAsViewed(id) {
        return this.request(`/admin/measurement-history/${id}/mark-viewed`, {
            method: 'POST',
        });
    }

    async markAdminMeasurementAsProcessed(id) {
        return this.request(`/admin/measurement-history/${id}/mark-processed`, {
            method: 'POST',
        });
    }

    async archiveAdminMeasurement(id) {
        return this.request(`/admin/measurement-history/${id}/archive`, {
            method: 'POST',
        });
    }

    async restoreAdminMeasurement(id) {
        return this.request(`/admin/measurement-history/${id}/restore`, {
            method: 'POST',
        });
    }

    async syncAdminMeasurementHistory() {
        return this.request('/admin/measurement-history/sync', {
            method: 'POST',
        });
    }

    // Cancel functions
    async cancelRentalOrder(id) {
        return this.request(`/rentals/${id}/cancel`, {
            method: 'POST',
        });
    }

    async cancelPurchaseOrder(id) {
        return this.request(`/purchases/${id}/cancel`, {
            method: 'POST',
        });
    }

}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
