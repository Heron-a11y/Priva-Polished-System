// Image Error Handler utility
import { getLocalImageUrl } from './imageUrlHelper';

class ImageErrorHandler {
  constructor() {
    this.failedUrls = new Set();
  }

  // Handle image loading errors with fallback
  handleImageError = (error, imageUrl, fallbackSource) => {
    console.log('❌ Image loading error:', error.nativeEvent?.error || error.message);
    console.log('🖼️ Failed image URL:', imageUrl);
    
    // Add to failed URLs to prevent retry loops
    this.failedUrls.add(imageUrl);
    
    // Return fallback source
    return fallbackSource;
  };

  // Check if URL has previously failed
  hasFailed = (url) => {
    return this.failedUrls.has(url);
  };

  // Clear failed URLs (useful for retry scenarios)
  clearFailedUrls = () => {
    this.failedUrls.clear();
  };

  // Get processed image URL with error handling
  getProcessedImageUrl = (imageUrl, fallbackSource = null) => {
    if (!imageUrl) {
      return fallbackSource;
    }

    // Check if this URL has previously failed
    if (this.hasFailed(imageUrl)) {
      console.log('⚠️ Using fallback for previously failed URL:', imageUrl);
      return fallbackSource;
    }

    // Process the URL
    const processedUrl = getLocalImageUrl(imageUrl);
    
    if (!processedUrl) {
      console.log('⚠️ Could not process image URL, using fallback');
      return fallbackSource;
    }

    return processedUrl;
  };

  // Create image source with error handling
  createImageSource = (imageUrl, fallbackSource = null) => {
    const processedUrl = this.getProcessedImageUrl(imageUrl, fallbackSource);
    
    if (processedUrl === fallbackSource) {
      return fallbackSource;
    }

    return {
      uri: processedUrl,
      cache: 'force-cache'
    };
  };
}

// Create and export singleton instance
const imageErrorHandler = new ImageErrorHandler();

// Export helper functions
export const handleImageError = (error, imageUrl, fallbackSource) => 
  imageErrorHandler.handleImageError(error, imageUrl, fallbackSource);

export const getProcessedImageUrl = (imageUrl, fallbackSource) => 
  imageErrorHandler.getProcessedImageUrl(imageUrl, fallbackSource);

export const createImageSource = (imageUrl, fallbackSource) => 
  imageErrorHandler.createImageSource(imageUrl, fallbackSource);

export const clearFailedUrls = () => imageErrorHandler.clearFailedUrls();

export default imageErrorHandler;




