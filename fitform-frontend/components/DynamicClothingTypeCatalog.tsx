import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Platform,
  FlatList,
  Modal,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import apiService from '../services/api';
import { getLocalImageUrl } from '../utils/imageUrlHelper';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface CatalogItem {
  id: number;
  name: string;
  description: string;
  clothing_type: string;
  category: string;
  image_path: string;
  is_featured: boolean;
  is_available: boolean;
  measurements_required: string[];
  sort_order: number;
  notes?: string;
}

interface DynamicClothingTypeCatalogProps {
  selectedType: string;
  onSelectType: (typeId: string) => void;
  showCategories?: boolean;
}

export default function DynamicClothingTypeCatalog({ 
  selectedType, 
  onSelectType, 
  showCategories = false 
}: DynamicClothingTypeCatalogProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFloatingModal, setShowFloatingModal] = useState(false);
  const [floatingItem, setFloatingItem] = useState<CatalogItem | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = showCategories ? 
    ['popular', 'formal_attire', 'ph_traditional', 'evening_party_wear', 'wedding_bridal'] : 
    ['all'];

  // Load catalog items from API
  useEffect(() => {
    loadCatalogItems();
  }, []);

  const loadCatalogItems = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/catalog');
      
      if (response && response.success) {
        setCatalogItems(response.data || []);
      } else {
        console.error('Failed to load catalog items:', response);
        setCatalogItems([]);
      }
    } catch (error) {
      console.error('Error loading catalog items:', error);
      setCatalogItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTypes = (category: string) => {
    if (category === 'all') return catalogItems;
    if (category === 'popular') return catalogItems.filter(item => item.is_featured);
    return catalogItems.filter(item => item.category === category);
  };

  const handleItemPress = (item: CatalogItem) => {
    setFloatingItem(item);
    setShowFloatingModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFloatingModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowFloatingModal(false);
      setFloatingItem(null);
    });
  };

  const confirmSelection = () => {
    if (floatingItem) {
      onSelectType(floatingItem.name);
      closeFloatingModal();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'popular': return <Ionicons name="star" size={20} color="#FFD700" />;
      case 'formal_attire': return <Ionicons name="business" size={20} color="#2C3E50" />;
      case 'ph_traditional': return <Ionicons name="flag" size={20} color="#8B4513" />;
      case 'evening_party_wear': return <Ionicons name="sparkles" size={20} color="#E91E63" />;
      case 'wedding_bridal': return <Ionicons name="heart" size={20} color="#E91E63" />;
      default: return <Ionicons name="shirt" size={20} color="#666" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'popular': return 'Popular';
      case 'formal_attire': return 'Formal Attire';
      case 'ph_traditional': return 'PH Traditional Attire';
      case 'evening_party_wear': return 'Evening & Party Wear';
      case 'wedding_bridal': return 'Wedding & Bridal Collection';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'formal_attire': return '#2C3E50';
      case 'ph_traditional': return '#8B4513';
      case 'evening_party_wear': return '#E91E63';
      case 'wedding_bridal': return '#E91E63';
      case 'popular': return '#FFD700';
      default: return '#666';
    }
  };

  const renderClothingTypeCard = (item: CatalogItem) => {
    const cardAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(1);

    // Start entrance animation immediately
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const imageUrl = item.image_path ? getLocalImageUrl(item.image_path) : null;

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          key={item.id}
          style={[
            styles.clothingCard,
            selectedType === item.name && styles.selectedCard
          ]}
          onPress={() => handleItemPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <View style={[styles.imageContainer, { backgroundColor: getCategoryColor(item.category) }]}>
            {imageUrl ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.clothingImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="shirt-outline" size={48} color="#fff" />
              </View>
            )}
            {item.is_featured && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}
            {selectedType === item.name && (
              <View style={styles.selectedOverlay}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
              </View>
            )}
          </View>
          
          <View style={styles.cardContent}>
            <Text style={[
              styles.clothingLabel,
              selectedType === item.name && styles.selectedLabel
            ]}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategorySection = (category: string) => {
    const items = getFilteredTypes(category);
    if (items.length === 0) return null;

    return (
      <View key={category} style={styles.categorySection}>
        {showCategories && (
          <View style={styles.categoryHeader}>
            <View style={styles.categoryTitleContainer}>
              <View style={styles.categoryIconContainer}>
                {getCategoryIcon(category)}
              </View>
              <Text style={styles.categoryTitle}>
                {getCategoryTitle(category)}
              </Text>
            </View>
            <View style={styles.categoryDivider} />
          </View>
        )}
        <View style={styles.horizontalScrollContainer}>
          <FlatList
            data={items}
            renderItem={({ item }) => renderClothingTypeCard(item)}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 16}
            snapToAlignment="start"
            pagingEnabled={false}
            bounces={true}
            bouncesZoom={false}
            alwaysBounceHorizontal={false}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
          />
          {items.length > 1 && (
            <View style={styles.scrollIndicator}>
              <Text style={styles.scrollIndicatorText}>← Swipe to see more →</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading catalog...</Text>
      </View>
    );
  }

  if (catalogItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="shirt-outline" size={64} color={Colors.neutral[400]} />
        <Text style={styles.emptyTitle}>No Items Available</Text>
        <Text style={styles.emptySubtitle}>Please check back later for new items</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map(renderCategorySection)}
      </ScrollView>

      {/* Floating Modal */}
      <Modal
        visible={showFloatingModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeFloatingModal}
      >
        <Animated.View 
          style={[
            styles.floatingModalOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.floatingModalBackdrop}
            activeOpacity={1}
            onPress={closeFloatingModal}
          />
          
          {floatingItem && (
            <Animated.View 
              style={[
                styles.floatingModalContent,
                {
                  opacity: fadeAnim,
                  transform: [{
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.floatingCard}>
                <View style={[styles.floatingImageContainer, { backgroundColor: getCategoryColor(floatingItem.category) }]}>
                  {floatingItem.image_path ? (
                    <Image 
                      source={{ uri: getLocalImageUrl(floatingItem.image_path) }} 
                      style={styles.floatingImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.floatingPlaceholderContainer}>
                      <Ionicons name="shirt-outline" size={80} color="#fff" />
                    </View>
                  )}
                  {floatingItem.is_featured && (
                    <View style={styles.floatingPopularBadge}>
                      <Text style={styles.floatingPopularText}>Popular</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.floatingCardContent}>
                  <Text style={styles.floatingCardTitle}>{floatingItem.name}</Text>
                  <Text style={styles.floatingCardDescription}>{floatingItem.description}</Text>
                  {floatingItem.notes && (
                    <Text style={styles.floatingCardNotes}>{floatingItem.notes}</Text>
                  )}
                </View>

                <View style={styles.floatingCardActions}>
                  <TouchableOpacity 
                    style={styles.floatingCancelButton}
                    onPress={closeFloatingModal}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                    <Text style={styles.floatingCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.floatingConfirmButton}
                    onPress={confirmSelection}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.floatingConfirmText}>Select</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 32,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  categoryHeader: {
    marginBottom: 20,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  categoryDivider: {
    height: 2,
    backgroundColor: Colors.primary + '20',
    borderRadius: 1,
  },
  horizontalScrollContainer: {
    position: 'relative',
    marginTop: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  scrollIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  // Floating Modal Styles
  floatingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingModalContent: {
    width: width * 0.85,
    maxWidth: 400,
  },
  floatingCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  floatingImageContainer: {
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingImage: {
    width: '100%',
    height: '100%',
  },
  floatingPlaceholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPopularBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingPopularText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingCardContent: {
    padding: 20,
  },
  floatingCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  floatingCardDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  floatingCardNotes: {
    fontSize: 14,
    color: Colors.text.muted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  floatingCardActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  floatingCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  floatingCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clothingCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    marginBottom: 16,
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    transform: [{ scale: 1 }],
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  imageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  clothingImage: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  clothingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedLabel: {
    color: Colors.primary,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

