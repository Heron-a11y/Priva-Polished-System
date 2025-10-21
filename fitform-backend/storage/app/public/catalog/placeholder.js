// Placeholder images for clothing types
// These should be replaced with actual clothing images

export const clothingImages = {
  gown: require('./gown.jpg'),
  barong: require('./barong.jpg'),
  suit: require('./suit.jpg'),
  dress: require('./dress.jpg'),
  tuxedo: require('./tuxedo.jpg'),
  uniform: require('./uniform.jpg'),
  costume: require('./costume.jpg'),
  other: require('./other.jpg'),
};

// Fallback to a default image if specific clothing image is not available
export const getClothingImage = (typeId) => {
  return clothingImages[typeId] || clothingImages.other;
};
