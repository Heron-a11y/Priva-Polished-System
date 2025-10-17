import AsyncStorage from '@react-native-async-storage/async-storage';
import networkConfig from './network-config';

// Base API configuration - use dynamic network config
class ApiService {
    constructor() {
        this.baseURL = null;
        this.token = null;
        this.initializeNetwork();
    }

    async initializeNetwork() {
        try {
            // Try to get the current network config
            const config = await networkConfig.getCurrentConfig();
            this.baseURL = config.backendUrl;
            console.log('🌐 ApiService initialized with URL:', this.baseURL);
            
            // Test the connection
            const testResult = await this.testConnection();
            if (!testResult.success) {
                console.log('⚠️ Network test failed, trying fallback');
                this.baseURL = 'http://192.168.1.59:8000/api';
                console.log('🌐 ApiService using fallback URL:', this.baseURL);
            }
        } catch (error) {
            console.log('⚠️ Failed to get network config, using fallback');
            this.baseURL = 'http://192.168.1.59:8000/api';
            console.log('🌐 ApiService using fallback URL:', this.baseURL);
        }
    }

    // Simple network test
    async testConnection() {
        try {
            console.log('🧪 Testing connection to:', this.baseURL);
            const response = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                timeout: 5000
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

    // Simple network management
    getCurrentURL() {
        return this.baseURL;
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

    // Make API request with simplified error handling
    async request(endpoint, options = {}) {
        try {
            // Ensure baseURL is initialized
            if (!this.baseURL) {
                await this.initializeNetwork();
            }
            
            const headers = await this.getHeaders();
            const url = `${this.baseURL}${endpoint}`;

            console.log(`🌐 Making API request to: ${url}`);

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
                timeout: 10000, // 10 second timeout
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
    async register(userData) {
        try {
            const response = await this.request('/register', {
                method: 'POST',
                body: JSON.stringify(userData),
            });
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            
            // Provide specific error messages based on response
            if (error.message?.includes('422') || error.message?.includes('validation')) {
                if (error.message?.includes('email') && error.message?.includes('taken')) {
                    throw new Error('Email already exists. Please use a different email or try logging in.');
                } else if (error.message?.includes('email') && error.message?.includes('invalid')) {
                    throw new Error('Invalid email format. Please enter a valid email address.');
                } else if (error.message?.includes('password') && error.message?.includes('weak')) {
                    throw new Error('Password is too weak. Please use a stronger password.');
                } else if (error.message?.includes('name') && error.message?.includes('required')) {
                    throw new Error('Name is required. Please enter your full name.');
                } else {
                    throw new Error('Invalid registration data. Please check your input and try again.');
                }
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                throw new Error('Network error - please check your connection and try again.');
            } else {
                throw error;
            }
        }
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
            
            // Provide specific error messages based on response
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                throw new Error('Invalid email or password. Please check your credentials and try again.');
            } else if (error.message?.includes('422') || error.message?.includes('validation')) {
                throw new Error('Invalid email or password format. Please check your input.');
            } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
                throw new Error('Account access denied. Please contact support.');
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                throw new Error('Network error - please check your connection and try again.');
            } else {
                throw error;
            }
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

    // Admin Settings
    async getAdminSettings() {
        return this.request('/admin/settings');
    }
    async updateAdminSettings(settings) {
        return this.request('/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    }
    async toggleAutoApproval(enabled) {
        return this.request('/admin/settings/toggle-auto-approval', {
            method: 'POST',
            body: JSON.stringify({ enabled }),
        });
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
        try {
            const response = await this.request('/rental-purchase-history');
            console.log('✅ Rental purchase history loaded');
            return { success: true, data: response.data || response };
        } catch (error) {
            console.log('❌ Error loading rental purchase history:', error.message);
            return { success: false, data: [] };
        }
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
        try {
            const response = await this.request('/profile');
            console.log('✅ Profile loaded');
            return { success: true, data: response.data || response };
        } catch (error) {
            console.log('❌ Error loading profile:', error.message);
            return { success: false, data: null };
        }
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

    // Simple connection test
    async testApiConnection() {
        return await this.testConnection();
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
        try {
            const queryParams = new URLSearchParams(params).toString();
            const url = queryParams ? `/measurement-history?${queryParams}` : '/measurement-history';
            const response = await this.request(url);
            console.log('✅ Measurement history loaded');
            return { success: true, data: response.data || response };
        } catch (error) {
            // Handle 404 errors gracefully (no measurements found)
            if (error.message.includes('No measurements found') || error.message.includes('404')) {
                console.log('ℹ️ No measurement history found');
                return { success: false, data: [] };
            }
            console.log('❌ Error loading measurement history:', error.message);
            return { success: false, data: [] };
        }
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
            console.log('🔄 Fetching latest measurements...');
            
            // Try measurement history latest first
            const response = await this.request('/measurement-history/latest');
            if (response && response.data) {
                console.log('✅ Latest measurements found');
                return { success: true, data: response.data };
            }
            
            // If that doesn't work, try getting the most recent from history
            const historyResponse = await this.request('/measurement-history');
            if (historyResponse && Array.isArray(historyResponse) && historyResponse.length > 0) {
                // Get the most recent measurement
                const latestMeasurement = historyResponse[0];
                console.log('✅ Latest measurement from history');
                return { success: true, data: latestMeasurement };
            }
            
            console.log('ℹ️ No latest measurements found');
            return { success: false, data: null };
        } catch (error) {
            // Handle 404 errors gracefully (no measurements found)
            if (error.message.includes('No measurements found') || error.message.includes('404')) {
                console.log('ℹ️ No latest measurements found');
                return { success: false, data: null };
            }
            console.log('❌ Error loading latest measurements:', error.message);
            return { success: false, data: null };
        }
    }

    // Get user's measurement history
    async getUserMeasurements() {
        try {
            console.log('🔄 Fetching user measurements...');
            const response = await this.request('/measurement-history');
            console.log('✅ User measurements loaded');
            return { success: true, data: response.data || response };
        } catch (error) {
            // Handle 404 errors gracefully (no measurements found)
            if (error.message.includes('No measurements found') || error.message.includes('404')) {
                console.log('ℹ️ No user measurements found');
                return { success: false, data: [] };
            }
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
