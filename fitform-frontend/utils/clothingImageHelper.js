// Clothing Image Helper utility
import imageUrlHelper from './imageUrlHelper';

class ClothingImageHelper {
  constructor() {
    this.imageUrlHelper = imageUrlHelper;
  }

  // Get clothing item image URL from catalog data
  getClothingImageUrl(catalogItem) {
    if (!catalogItem) {
      return null;
    }

    // Check if catalog item has image_path
    if (catalogItem.image_path) {
      return this.imageUrlHelper.getLocalImageUrl(catalogItem.image_path);
    }

    // Check if catalog item has image_url (from backend accessor)
    if (catalogItem.image_url) {
      return this.imageUrlHelper.getLocalImageUrl(catalogItem.image_url);
    }

    return null;
  }

  // Get clothing item image URL with fallback
  getClothingImageUrlWithFallback(catalogItem, fallback = null) {
    const imageUrl = this.getClothingImageUrl(catalogItem);
    
    if (!imageUrl) {
      return fallback;
    }

    return imageUrl;
  }

  // Get clothing type image from static assets (fallback)
  getClothingTypeImage(clothingType) {
    // This would map to static clothing type images
    // For now, return null to use placeholder
    return null;
  }

  // Check if clothing item has valid image
  hasClothingImage(catalogItem) {
    return !!(catalogItem?.image_path || catalogItem?.image_url);
  }

  // Get image URL from clothing type name (for orders without catalog reference)
  getImageUrlFromClothingType(clothingTypeName) {
    // This would be used when we only have the clothing type name
    // and need to find the corresponding catalog item
    return null;
  }

  // Get fallback placeholder image
  getPlaceholderImage() {
    return null; // Will use Ionicons placeholder in components
  }
}

// Create and export singleton instance
const clothingImageHelper = new ClothingImageHelper();

// Export helper functions for convenience
export const getClothingImageUrl = (catalogItem) => clothingImageHelper.getClothingImageUrl(catalogItem);
export const getClothingImageUrlWithFallback = (catalogItem, fallback) => clothingImageHelper.getClothingImageUrlWithFallback(catalogItem, fallback);
export const hasClothingImage = (catalogItem) => clothingImageHelper.hasClothingImage(catalogItem);
export const getImageUrlFromClothingType = (clothingTypeName) => clothingImageHelper.getImageUrlFromClothingType(clothingTypeName);

export default clothingImageHelper;

