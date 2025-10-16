// Image URL Helper utility
import networkConfig from '../services/network-config';

class ImageUrlHelper {
  constructor() {
    this.baseUrl = 'http://192.168.1.56:8000';
    this.ngrokUrl = 'https://fitform-api.ngrok.io';
    this.isDevelopment = __DEV__;
  }

  // Get the appropriate base URL based on environment
  getBaseUrl() {
    // Use dynamic network configuration if available
    try {
      const networkUrl = networkConfig.getBackendUrl();
      if (networkUrl) {
        // Remove /api suffix if present to get base URL
        return networkUrl.replace('/api', '');
      }
    } catch (error) {
      console.log('⚠️ Could not get network config, using fallback:', error.message);
    }
    
    return this.isDevelopment ? this.baseUrl : this.ngrokUrl;
  }

  // Convert image URL to local development URL
  getLocalImageUrl(imageUrl) {
    if (!imageUrl) {
      console.log('⚠️ No image URL provided');
      return null;
    }

    console.log('🖼️ Processing image URL:', imageUrl);

    // If it's already a local URL, return as is
    if (imageUrl.includes('192.168.1.56') || imageUrl.includes('192.168.1.105') || imageUrl.includes('localhost') || imageUrl.includes('192.168.1.108')) {
      console.log('✅ Already local URL:', imageUrl);
      return imageUrl;
    }

    // If it's an ngrok URL, convert to local
    if (imageUrl.includes('ngrok.io')) {
      const localUrl = imageUrl.replace(this.ngrokUrl, this.baseUrl);
      console.log('🔄 Converted ngrok to local:', localUrl);
      return localUrl;
    }

    // If it's a relative path, prepend base URL
    if (imageUrl.startsWith('/')) {
      const fullUrl = `${this.getBaseUrl()}${imageUrl}`;
      console.log('🔄 Added base URL to relative path:', fullUrl);
      return fullUrl;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      console.log('✅ Full URL provided:', imageUrl);
      return imageUrl;
    }

    // For Laravel storage paths, prepend /storage/ and base URL
    if (imageUrl.startsWith('profiles/') || imageUrl.startsWith('storage/')) {
      const storageUrl = `${this.getBaseUrl()}/storage/${imageUrl.replace('storage/', '')}`;
      console.log('🔄 Laravel storage URL construction:', storageUrl);
      return storageUrl;
    }

    // Default: prepend base URL
    const defaultUrl = `${this.getBaseUrl()}/${imageUrl}`;
    console.log('🔄 Default URL construction:', defaultUrl);
    return defaultUrl;
  }

  // Convert image URL to production URL
  getProductionImageUrl(imageUrl) {
    if (!imageUrl) {
      return null;
    }

    // If it's already a production URL, return as is
    if (imageUrl.includes('ngrok.io')) {
      return imageUrl;
    }

    // If it's a local URL, convert to production
    if (imageUrl.includes('192.168.1.56') || imageUrl.includes('192.168.1.105') || imageUrl.includes('localhost')) {
      return imageUrl.replace(this.baseUrl, this.ngrokUrl);
    }

    // If it's a relative path, prepend production URL
    if (imageUrl.startsWith('/')) {
      return `${this.ngrokUrl}${imageUrl}`;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Default: prepend production URL
    return `${this.ngrokUrl}/${imageUrl}`;
  }

  // Get profile image URL with fallback
  getProfileImageUrl(profileImage, fallback = null) {
    if (!profileImage) {
      return fallback;
    }

    const imageUrl = this.getLocalImageUrl(profileImage);
    
    // Return fallback if URL conversion failed
    if (!imageUrl) {
      return fallback;
    }

    return imageUrl;
  }

  // Check if image URL is valid
  isValidImageUrl(url) {
    if (!url) {
      return false;
    }

    // Check if it's a valid URL format
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Get image URL with error handling
  getImageUrlWithFallback(imageUrl, fallback = null) {
    if (!this.isValidImageUrl(imageUrl)) {
      return fallback;
    }

    return this.getLocalImageUrl(imageUrl);
  }

  // Update base URL (useful for switching environments)
  updateBaseUrl(newBaseUrl) {
    this.baseUrl = newBaseUrl;
  }

  // Update ngrok URL
  updateNgrokUrl(newNgrokUrl) {
    this.ngrokUrl = newNgrokUrl;
  }

  // Get current configuration
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      ngrokUrl: this.ngrokUrl,
      isDevelopment: this.isDevelopment,
    };
  }
}

// Create and export singleton instance
const imageUrlHelper = new ImageUrlHelper();

// Export helper functions for convenience
export const getLocalImageUrl = (imageUrl) => imageUrlHelper.getLocalImageUrl(imageUrl);
export const getProductionImageUrl = (imageUrl) => imageUrlHelper.getProductionImageUrl(imageUrl);
export const getProfileImageUrl = (profileImage, fallback) => imageUrlHelper.getProfileImageUrl(profileImage, fallback);
export const isValidImageUrl = (url) => imageUrlHelper.isValidImageUrl(url);
export const getImageUrlWithFallback = (imageUrl, fallback) => imageUrlHelper.getImageUrlWithFallback(imageUrl, fallback);

export default imageUrlHelper;
