import apiService from '../services/api.js';
import { Alert, Linking } from 'react-native';

/**
 * Simple Receipt Helper - Alternative approach using direct URL opening
 * This version opens the receipt in the device's default PDF viewer
 */
class ReceiptHelperSimple {
    
    /**
     * Generate and open a rental receipt
     * @param {number} rentalId - The rental order ID
     * @param {string} customerName - Customer name for filename
     */
    static async generateRentalReceipt(rentalId, customerName = 'Customer') {
        try {
            console.log('🧾 Generating rental receipt for ID:', rentalId);
            
            // Get the base URL from the API service
            const baseURL = apiService.baseURL || 'http://192.168.1.56:8000/api';
            
            // Get authentication token from API service
            const token = await apiService.getToken();
            console.log('🔑 Retrieved token:', token ? 'Token found' : 'No token');
            
            // If no token, try to get it from the current user session
            if (!token) {
                console.log('⚠️ No token found, trying alternative authentication...');
                // For now, we'll allow access without token for completed transactions
                const receiptUrl = `${baseURL}/receipts/rental/${rentalId}`;
                console.log('🌐 Opening receipt URL (no token):', receiptUrl);
                
                const canOpen = await Linking.canOpenURL(receiptUrl);
                if (canOpen) {
                    await Linking.openURL(receiptUrl);
                    console.log('✅ Rental receipt opened successfully (no token)');
                    return { success: true, message: 'Receipt opened in PDF viewer' };
                } else {
                    throw new Error('Cannot open receipt URL');
                }
            }
            
            const receiptUrl = `${baseURL}/receipts/rental/${rentalId}?token=${token}`;
            console.log('🌐 Opening receipt URL:', receiptUrl);
            
            // Open the receipt URL in the device's default browser/PDF viewer
            const canOpen = await Linking.canOpenURL(receiptUrl);
            
            if (canOpen) {
                await Linking.openURL(receiptUrl);
                console.log('✅ Rental receipt opened successfully');
                return { success: true, message: 'Receipt opened in PDF viewer' };
            } else {
                throw new Error('Cannot open receipt URL');
            }
            
        } catch (error) {
            console.error('❌ Error generating rental receipt:', error);
            Alert.alert(
                'Receipt Error',
                'Failed to open receipt. Please try again or contact support.',
                [{ text: 'OK' }]
            );
            return { 
                success: false, 
                message: error.message || 'Failed to generate receipt' 
            };
        }
    }
    
    /**
     * Generate and open a purchase receipt
     * @param {number} purchaseId - The purchase order ID
     * @param {string} customerName - Customer name for filename
     */
    static async generatePurchaseReceipt(purchaseId, customerName = 'Customer') {
        try {
            console.log('🧾 Generating purchase receipt for ID:', purchaseId);
            
            // Get the base URL from the API service
            const baseURL = apiService.baseURL || 'http://192.168.1.56:8000/api';
            
            // Get authentication token from API service
            const token = await apiService.getToken();
            console.log('🔑 Retrieved token:', token ? 'Token found' : 'No token');
            
            // If no token, try to get it from the current user session
            if (!token) {
                console.log('⚠️ No token found, trying alternative authentication...');
                // For now, we'll allow access without token for completed transactions
                const receiptUrl = `${baseURL}/receipts/purchase/${purchaseId}`;
                console.log('🌐 Opening receipt URL (no token):', receiptUrl);
                
                const canOpen = await Linking.canOpenURL(receiptUrl);
                if (canOpen) {
                    await Linking.openURL(receiptUrl);
                    console.log('✅ Purchase receipt opened successfully (no token)');
                    return { success: true, message: 'Receipt opened in PDF viewer' };
                } else {
                    throw new Error('Cannot open receipt URL');
                }
            }
            
            const receiptUrl = `${baseURL}/receipts/purchase/${purchaseId}?token=${token}`;
            console.log('🌐 Opening receipt URL:', receiptUrl);
            
            // Open the receipt URL in the device's default browser/PDF viewer
            const canOpen = await Linking.canOpenURL(receiptUrl);
            
            if (canOpen) {
                await Linking.openURL(receiptUrl);
                console.log('✅ Purchase receipt opened successfully');
                return { success: true, message: 'Receipt opened in PDF viewer' };
            } else {
                throw new Error('Cannot open receipt URL');
            }
            
        } catch (error) {
            console.error('❌ Error generating purchase receipt:', error);
            Alert.alert(
                'Receipt Error',
                'Failed to open receipt. Please try again or contact support.',
                [{ text: 'OK' }]
            );
            return { 
                success: false, 
                message: error.message || 'Failed to generate receipt' 
            };
        }
    }
    
    /**
     * Check if a transaction is eligible for receipt generation
     * @param {string} orderType - 'rental' or 'purchase'
     * @param {string} status - Transaction status
     * @returns {boolean} - Whether receipt can be generated
     */
    static canGenerateReceipt(orderType, status) {
        if (orderType === 'rental') {
            return ['picked_up', 'returned'].includes(status);
        } else if (orderType === 'purchase') {
            return status === 'picked_up';
        }
        return false;
    }
    
    /**
     * Get receipt button text based on transaction status
     * @param {string} orderType - 'rental' or 'purchase'
     * @param {string} status - Transaction status
     * @returns {string} - Button text
     */
    static getReceiptButtonText(orderType, status) {
        return 'Generate Receipt';
    }
}

export default ReceiptHelperSimple;
