import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API configuration
// IMPORTANT: This will be automatically updated by update-api-ip.js script
// For external network access, this should be your computer's public IP or a domain
const API_BASE_URL = 'https://b6e512836c9c.ngrok-free.app/api'; // Public IP for external access

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = null;
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

    // Check if user is authenticated
    async isAuthenticated() {
        try {
            const token = await this.getToken();
            if (!token) return false;

            await this.getCurrentUser();
            return true;
        } catch (error) {
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

}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 