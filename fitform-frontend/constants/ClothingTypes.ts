// Enhanced clothing types with images for catalog display
export interface ClothingType {
  id: string;
  label: string;
  description: string;
  image?: any; // Will be imported from assets
  imageUrl?: string; // For remote images
  icon: string; // Fallback emoji icon
  color: string; // Background color for placeholder
  category: 'formal_attire' | 'ph_traditional' | 'evening_party_wear' | 'wedding_bridal' | 'special';
  popular?: boolean;
}

export const CLOTHING_TYPES: ClothingType[] = [
  // Formal Attire Category
  {
    id: 'suit_katrina',
    label: 'Suit Katrina',
    description: 'Elegant Katrina-style suits',
    icon: '🤵',
    color: '#2C3E50',
    category: 'formal_attire',
    popular: true,
    image: require('../assets/images/clothing/suit-katrina.webp')
  },
  {
    id: 'suit_armani',
    label: 'Suit Armani',
    description: 'Luxury Armani-style suits',
    icon: '👔',
    color: '#34495E',
    category: 'formal_attire',
    popular: false,
    image: require('../assets/images/clothing/suit-armani.jpg')
  },
  {
    id: 'suit_marty',
    label: 'Suit Marty',
    description: 'Professional Marty-style suits',
    icon: '👨‍💼',
    color: '#2C3E50',
    category: 'formal_attire',
    popular: false,
    image: require('../assets/images/clothing/suit-marty.png')
  },
  {
    id: 'suit_costume',
    label: 'Suit Costume',
    description: 'Themed costume suits for special events',
    icon: '🎭',
    color: '#F39C12',
    category: 'formal_attire',
    popular: false,
    image: require('../assets/images/clothing/suit-costume.jpg')
  },
  {
    id: 'coat_barong',
    label: 'Coat Barong',
    description: 'Formal coat-style barong for special occasions',
    icon: '🧥',
    color: '#D4A5A5',
    category: 'formal_attire',
    popular: false,
    image: require('../assets/images/clothing/coat-barong.jpg')
  },
  {
    id: 'pants',
    label: 'Pants',
    description: 'Formal and casual pants for various occasions',
    icon: '👖',
    color: '#B8C5D6',
    category: 'formal_attire',
    popular: false,
    image: require('../assets/images/clothing/pants.webp')
  },

  // PH Traditional Attire Category
  {
    id: 'barong_kids',
    label: 'Barong - Kids',
    description: 'Traditional Filipino formal wear for children',
    icon: '👶',
    color: '#F4E4C1',
    category: 'ph_traditional',
    popular: true,
    image: require('../assets/images/clothing/barong-kids.webp')
  },
  {
    id: 'barong_adults',
    label: 'Barong - Adults',
    description: 'Traditional Filipino formal wear for adults',
    icon: '👔',
    color: '#F4E4C1',
    category: 'ph_traditional',
    popular: false,
    image: require('../assets/images/clothing/barong-adults.jpg')
  },
  {
    id: 'filipiniana_kids',
    label: 'Filipiniana - Kids',
    description: 'Traditional Filipino dresses for children',
    icon: '👧',
    color: '#F4E4C1',
    category: 'ph_traditional',
    popular: false,
    image: require('../assets/images/clothing/filipiniana-kids.jpg')
  },
  {
    id: 'filipiniana_bolero',
    label: 'Filipiniana - Bolero',
    description: 'Traditional Filipino dress with bolero jacket',
    icon: '👘',
    color: '#E8B4B8',
    category: 'ph_traditional',
    popular: false,
    image: require('../assets/images/clothing/filipiniana-bolero.jpg')
  },
  {
    id: 'filipiniana_cocktail',
    label: 'Filipiniana - Cocktail',
    description: 'Modern Filipiniana cocktail style',
    icon: '🍸',
    color: '#D4A5A5',
    category: 'ph_traditional',
    popular: false,
    image: require('../assets/images/clothing/filipiniana-cocktail.jpg')
  },
  {
    id: 'filipiniana_long_gown',
    label: 'Filipiniana - Long Gown',
    description: 'Traditional long Filipiniana gowns',
    icon: '👗',
    color: '#E8B4B8',
    category: 'ph_traditional',
    popular: false,
    image: require('../assets/images/clothing/filipiniana-long-gown.jpg')
  },

  // Evening & Party Wear Category
  {
    id: 'evening_gown_kids',
    label: 'Evening Gown - Kids',
    description: 'Elegant evening gowns for children',
    icon: '👧',
    color: '#E8B4B8',
    category: 'evening_party_wear',
    popular: true,
    image: require('../assets/images/clothing/evening-gown-kids.jpg')
  },
  {
    id: 'evening_gown_adults',
    label: 'Evening Gown - Adults',
    description: 'Elegant evening gowns for adults',
    icon: '👗',
    color: '#E8B4B8',
    category: 'evening_party_wear',
    popular: false,
    image: require('../assets/images/clothing/evening-gown-adults.jpg')
  },
  {
    id: 'cocktail_dress',
    label: 'Cocktail Dress',
    description: 'Stylish cocktail dresses for parties',
    icon: '🍸',
    color: '#D4A5A5',
    category: 'evening_party_wear',
    popular: false,
    image: require('../assets/images/clothing/filipiniana-cocktail.jpg')
  },
  {
    id: 'ballgown_minimalist',
    label: 'BallGown - Minimalist',
    description: 'Elegant minimalist ball gowns',
    icon: '👗',
    color: '#E8B4B8',
    category: 'evening_party_wear',
    popular: false,
    image: require('../assets/images/clothing/ballgown-minimalist.jpg')
  },
  {
    id: 'ballgown_luxe',
    label: 'BallGown - Luxe',
    description: 'Luxurious high-end ball gowns',
    icon: '💎',
    color: '#D4A5A5',
    category: 'evening_party_wear',
    popular: false,
    image: require('../assets/images/clothing/ballgown-luxe.jpg')
  },
  {
    id: 'ballgown_royal',
    label: 'BallGown - Royal',
    description: 'Royal-style majestic ball gowns',
    icon: '👑',
    color: '#E8B4B8',
    category: 'evening_party_wear',
    popular: false,
    image: require('../assets/images/clothing/ballgown-royal.webp')
  },

  // Wedding & Bridal Collection Category
  {
    id: 'wedding_gown',
    label: 'Wedding Gown',
    description: 'Beautiful wedding gowns for the bride',
    icon: '👰',
    color: '#F4E4C1',
    category: 'wedding_bridal',
    popular: true,
    image: require('../assets/images/clothing/wedding-gown.jpg')
  },
  {
    id: 'civil_wedding',
    label: 'Civil Wedding',
    description: 'Elegant dresses for civil wedding ceremonies',
    icon: '💒',
    color: '#A8DADC',
    category: 'wedding_bridal',
    popular: false,
    image: require('../assets/images/clothing/civil-wedding.jpg')
  },
  {
    id: 'mermaid',
    label: 'Mermaid',
    description: 'Stunning mermaid-style wedding gowns',
    icon: '🧜‍♀️',
    color: '#E8B4B8',
    category: 'wedding_bridal',
    popular: false,
    image: require('../assets/images/clothing/mermaid.webp')
  },
  {
    id: 'mothers_dress',
    label: 'Mother\'s Dress',
    description: 'Elegant dresses for mothers of the bride/groom',
    icon: '👩',
    color: '#A8DADC',
    category: 'wedding_bridal',
    popular: false,
    image: require('../assets/images/clothing/mother-dress.jpg')
  },
  {
    id: 'bridesmaid',
    label: 'Bridesmaid',
    description: 'Beautiful bridesmaid dresses',
    icon: '👰',
    color: '#F4E4C1',
    category: 'wedding_bridal',
    popular: false,
    image: require('../assets/images/clothing/bridemaid.jpg')
  }
];

// Measurement requirements for each clothing type
export const MEASUREMENT_REQUIREMENTS = {
  // Formal Attire Category
  suit_katrina: ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
  suit_armani: ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
  suit_marty: ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
  suit_costume: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length', 'inseam'],
  coat_barong: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  pants: ['waist', 'hips', 'inseam'],
  
  // PH Traditional Attire Category
  barong_kids: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  barong_adults: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  filipiniana_kids: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  filipiniana_bolero: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  filipiniana_cocktail: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  filipiniana_long_gown: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  
  // Evening & Party Wear Category
  evening_gown_kids: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  evening_gown_adults: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  cocktail_dress: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  ballgown_minimalist: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  ballgown_luxe: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  ballgown_royal: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  
  // Wedding & Bridal Collection Category
  wedding_gown: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  civil_wedding: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  mermaid: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  mothers_dress: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  bridesmaid: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length']
};

// Measurement field labels and descriptions
export const MEASUREMENT_FIELDS = {
  bust: { label: 'Bust', description: 'Chest circumference at fullest point' },
  waist: { label: 'Waist', description: 'Natural waistline circumference' },
  hips: { label: 'Hips', description: 'Hip circumference at fullest point' },
  shoulder_width: { label: 'Shoulder Width', description: 'Distance across shoulders' },
  arm_length: { label: 'Arm Length', description: 'Shoulder to wrist length' },
  inseam: { label: 'Inseam', description: 'Inner leg length from crotch to ankle' }
};
