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
    // Force use of the correct IP address (192.168.1.56) for images
    // The network config might return 192.168.1.55 which doesn't work
    return 'http://192.168.1.56:8000';
  }

  // Convert image URL to local development URL
  getLocalImageUrl(imageUrl) {
    if (!imageUrl) {
      return null;
    }

    // If it's already a local URL, return as is
    if (imageUrl.includes('192.168.1.56') || imageUrl.includes('192.168.1.105') || imageUrl.includes('localhost') || imageUrl.includes('192.168.1.108')) {
      return imageUrl;
    }

    // If it's an ngrok URL, convert to local
    if (imageUrl.includes('ngrok.io')) {
      return imageUrl.replace(this.ngrokUrl, this.baseUrl);
    }

    // If it's a relative path, prepend base URL
    if (imageUrl.startsWith('/')) {
      return `${this.getBaseUrl()}${imageUrl}`;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // For Laravel storage paths, prepend /storage/ and base URL
    if (imageUrl.startsWith('profiles/') || imageUrl.startsWith('catalog/') || imageUrl.startsWith('storage/')) {
      return `${this.getBaseUrl()}/storage/${imageUrl.replace('storage/', '')}`;
    }

    // Default: prepend base URL
    return `${this.getBaseUrl()}/${imageUrl}`;
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
