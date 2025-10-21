import apiService from '../services/api.js';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Receipt Helper - Utility functions for generating and downloading receipts
 */
class ReceiptHelper {
    
    /**
     * Generate and download a rental receipt
     * @param {number} rentalId - The rental order ID
     * @param {string} customerName - Customer name for filename
     */
    static async generateRentalReceipt(rentalId, customerName = 'Customer') {
        try {
            console.log('🧾 Generating rental receipt for ID:', rentalId);
            
            const response = await apiService.generateRentalReceipt(rentalId);
            
            // Handle the new response format from API service
            const blob = response.data || response;
            
            // Convert blob to base64 for React Native
            const base64Data = await this.blobToBase64(blob);
            
            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `rental-receipt-${rentalId}-${customerName.replace(/\s+/g, '-')}-${date}.pdf`;
            
            // Save file to device
            const fileUri = await this.saveReceiptToDevice(base64Data, filename);
            
            // Share the file
            await this.shareReceipt(fileUri, filename);
            
            console.log('✅ Rental receipt generated and shared successfully');
            return { success: true, message: 'Receipt generated and shared successfully' };
            
        } catch (error) {
            console.error('❌ Error generating rental receipt:', error);
            return { 
                success: false, 
                message: error.message || 'Failed to generate receipt' 
            };
        }
    }
    
    /**
     * Generate and download a purchase receipt
     * @param {number} purchaseId - The purchase order ID
     * @param {string} customerName - Customer name for filename
     */
    static async generatePurchaseReceipt(purchaseId, customerName = 'Customer') {
        try {
            console.log('🧾 Generating purchase receipt for ID:', purchaseId);
            
            const response = await apiService.generatePurchaseReceipt(purchaseId);
            
            // Handle the new response format from API service
            const blob = response.data || response;
            
            // Convert blob to base64 for React Native
            const base64Data = await this.blobToBase64(blob);
            
            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `purchase-receipt-${purchaseId}-${customerName.replace(/\s+/g, '-')}-${date}.pdf`;
            
            // Save file to device
            const fileUri = await this.saveReceiptToDevice(base64Data, filename);
            
            // Share the file
            await this.shareReceipt(fileUri, filename);
            
            console.log('✅ Purchase receipt generated and shared successfully');
            return { success: true, message: 'Receipt generated and shared successfully' };
            
        } catch (error) {
            console.error('❌ Error generating purchase receipt:', error);
            return { 
                success: false, 
                message: error.message || 'Failed to generate receipt' 
            };
        }
    }
    
    /**
     * Convert blob to base64 string
     * @param {Blob} blob - The blob to convert
     * @returns {string} Base64 string
     */
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * Save receipt to device storage
     * @param {string} base64Data - Base64 encoded PDF data
     * @param {string} filename - Filename for the receipt
     * @returns {string} File URI
     */
    static async saveReceiptToDevice(base64Data, filename) {
        try {
            const fileUri = FileSystem.documentDirectory + filename;
            
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('📁 Receipt saved to:', fileUri);
            return fileUri;
        } catch (error) {
            console.error('❌ Error saving receipt to device:', error);
            throw new Error('Failed to save receipt to device');
        }
    }
    
    /**
     * Share the receipt file
     * @param {string} fileUri - URI of the saved file
     * @param {string} filename - Filename for sharing
     */
    static async shareReceipt(fileUri, filename) {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (!isAvailable) {
                Alert.alert(
                    'Sharing Not Available',
                    'Sharing is not available on this device. The receipt has been saved to your device.',
                    [{ text: 'OK' }]
                );
                return;
            }
            
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Share ${filename}`,
            });
            
            console.log('📤 Receipt shared successfully');
        } catch (error) {
            console.error('❌ Error sharing receipt:', error);
            Alert.alert(
                'Sharing Error',
                'Failed to share receipt, but it has been saved to your device.',
                [{ text: 'OK' }]
            );
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
        if (orderType === 'rental') {
            if (status === 'picked_up') return 'Download Rental Receipt';
            if (status === 'returned') return 'Download Return Receipt';
        } else if (orderType === 'purchase') {
            if (status === 'picked_up') return 'Download Purchase Receipt';
        }
        return 'Generate Receipt';
    }
}

export default ReceiptHelper;
