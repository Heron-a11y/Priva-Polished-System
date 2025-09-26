import AsyncStorage from '@react-native-async-storage/async-storage';
import networkConfig from './network-config';

// Base API configuration - will be dynamically set based on network mode
let API_BASE_URL = 'http://localhost:8000/api'; // Default fallback                

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = null;
        this.initializeNetwork();
    }

    // Initialize network configuration
    async initializeNetwork() {
        try {
            const mode = await networkConfig.getNetworkMode();
            console.log('🌐 Current network mode:', mode);
            this.updateBaseURL();
            
            // If not in ngrok mode, try to auto-detect
            if (mode !== 'ngrok') {
                console.log('🔄 Auto-detecting best network...');
                const detectedMode = await networkConfig.autoDetectNetwork();
                console.log('🔍 Detected network mode:', detectedMode);
                this.updateBaseURL();
            }
        } catch (error) {
            console.log('⚠️ Failed to initialize network config:', error);
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

    // Make API request
    async request(endpoint, options = {}) {
        try {
            const headers = await this.getHeaders();
            const url = `${this.baseURL}${endpoint}`;

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
            });

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
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (response.success && response.data.token) {
            this.setToken(response.data.token);
        }

        return response;
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
    async updateAppointmentStatus(id, status) {
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

    // Note: Rental and Purchase history are now unified under getRentalPurchaseHistory()

    // Penalty management
    async getPenaltyBreakdown(rentalId) {
        return this.request(`/rentals/${rentalId}/penalties`);
    }
    async calculatePenalties(rentalId, data) {
        return this.request(`/rentals/${rentalId}/calculate-penalties`, { method: 'POST', data });
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
        return this.request('/measurement-history', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMeasurementHistoryById(id) {
        return this.request(`/measurement-history/${id}`);
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

}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 












































