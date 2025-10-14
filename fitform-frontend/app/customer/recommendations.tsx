import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { CustomerDataAnalyzer, CustomerInsights, Recommendation, MeasurementData, HistoryItem } from '../../utils/CustomerDataAnalysis';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

export default function RecommendationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageSource, setSelectedImageSource] = useState<any>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadData();
    loadDismissedRecommendations();
  }, []);

  // Load dismissed recommendations from AsyncStorage
  const loadDismissedRecommendations = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('dismissedRecommendations');
      if (dismissed) {
        const dismissedArray = JSON.parse(dismissed);
        setDismissedRecommendations(new Set(dismissedArray));
      }
    } catch (error) {
      // Silent error handling - don't show to user
    }
  };

  // Save dismissed recommendations to AsyncStorage
  const saveDismissedRecommendations = async (dismissedSet: Set<string>) => {
    try {
      const dismissedArray = Array.from(dismissedSet);
      await AsyncStorage.setItem('dismissedRecommendations', JSON.stringify(dismissedArray));
    } catch (error) {
      // Silent error handling - don't show to user
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadInsights(),
        loadRecommendations()
      ]);
    } catch (error) {
      console.error('Error loading recommendations data:', error);
      Alert.alert('Error', 'Failed to load recommendations data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadInsights = async () => {
    try {
      // Load order history for insights
      const historyResponse = await apiService.getRentalPurchaseHistory();
      const orders = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
      
      // Load measurement history
      const measurementResponse = await apiService.getMeasurementHistory();
      const measurements = Array.isArray(measurementResponse?.data) ? measurementResponse.data : [];

      // Load profile data
      const profileResponse = await apiService.getProfile();
      const profile = profileResponse?.data?.user || {};

      // Use the analyzer
      const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
      const insightsData = analyzer.generateInsights();
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      // Load fresh data for recommendations
      const historyResponse = await apiService.getRentalPurchaseHistory();
      const orders = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
      
      const measurementResponse = await apiService.getMeasurementHistory();
      const measurements = Array.isArray(measurementResponse?.data) ? measurementResponse.data : [];

      const profileResponse = await apiService.getProfile();
      const profile = profileResponse?.data?.user || {};

      // Use the analyzer to generate insights and recommendations
      const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
      const insightsData = analyzer.generateInsights();
      setInsights(insightsData);
      
      const recs = analyzer.generateRecommendations(insightsData);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowRecommendationDetails(true);
  };

  const handleTakeAction = (recommendation: Recommendation) => {
    switch (recommendation.type) {
      case 'size':
        // Navigate to AR measurements screen
        router.push('/customer/ar-measurements');
        setShowRecommendationDetails(false);
        break;
      case 'sizing':
        // Navigate to AR measurements screen for sizing
        router.push('/customer/ar-measurements');
        setShowRecommendationDetails(false);
        break;
      case 'style':
        // Navigate to orders screen for browsing clothing
        const favoriteType = recommendation.relatedData?.favoriteType;
        if (favoriteType) {
          // Navigate to orders with a note about preferred type
        Alert.alert(
          'Perfect Style Match!',
          `We found amazing ${favoriteType} items that match your style perfectly! Discover your next favorite outfit.`,
          [
            { text: 'Discover My Style', onPress: () => router.push('/customer/orders') },
            { text: 'Maybe Later', style: 'cancel' }
          ]
        );
        } else {
          router.push('/customer/orders');
        }
        setShowRecommendationDetails(false);
        break;
      case 'seasonal':
        // Navigate to orders screen for seasonal items
        const currentMonth = new Date().getMonth();
        const season = currentMonth >= 2 && currentMonth <= 4 ? 'spring' : 
                      currentMonth >= 5 && currentMonth <= 7 ? 'summer' :
                      currentMonth >= 8 && currentMonth <= 10 ? 'fall' : 'winter';
        Alert.alert(
          'Seasonal Style Alert!',
          `Don't miss out on our stunning ${season} collection! Perfect pieces for this season are waiting for you.`,
          [
            { text: 'Shop Seasonal Styles', onPress: () => router.push('/customer/orders') },
            { text: 'Not Now', style: 'cancel' }
          ]
        );
        setShowRecommendationDetails(false);
        break;
      case 'budget':
        // Navigate to orders or show budget options
        if (recommendation.title.includes('Premium') || recommendation.title.includes('premium')) {
          Alert.alert(
            'Premium Collection Available!',
            'You deserve the best! Explore our exclusive premium collection with high-quality formal wear that will make you stand out.',
            [
              { text: 'View Premium Collection', onPress: () => router.push('/customer/orders') },
              { text: 'Maybe Later', style: 'cancel' }
            ]
          );
        } else if (recommendation.title.includes('Rental') || recommendation.title.includes('rental')) {
          Alert.alert(
            'Smart Rental Solutions!',
            'Save money while looking fabulous! Our rental services offer cost-effective formal wear solutions for any occasion.',
            [
              { text: 'Explore Rentals', onPress: () => router.push('/customer/orders') },
              { text: 'Not Now', style: 'cancel' }
            ]
          );
        } else {
          router.push('/customer/orders');
        }
        setShowRecommendationDetails(false);
        break;
      case 'maintenance':
        // Navigate to appropriate screens
        if (recommendation.title.includes('Return') || recommendation.title.includes('return')) {
          router.push('/customer/rental-purchase-history');
        } else if (recommendation.title.includes('Loyalty') || recommendation.title.includes('loyalty')) {
          router.push('/customer/profile');
        } else {
          router.push('/customer/profile');
        }
        setShowRecommendationDetails(false);
        break;
      default:
        // Show alert for manual actions
        Alert.alert(
          'Ready to Take Action!',
          'You have personalized recommendations waiting! Follow the steps to unlock your perfect style match.',
          [{ text: 'Let\'s Go!', style: 'default' }]
        );
        setShowRecommendationDetails(false);
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    const newDismissedSet = new Set([...dismissedRecommendations, recommendationId]);
    setDismissedRecommendations(newDismissedSet);
    await saveDismissedRecommendations(newDismissedSet);
  };

  const handleImagePress = (imageSource: any, imageUrl?: string) => {
    // Store the original image source and URL for the floating viewer
    setSelectedImageSource(imageSource);
    setSelectedImageUrl(imageUrl);
    
    // For display purposes, we'll use a placeholder URI for local images
    // but the actual image will be rendered using the original source
    if (typeof imageSource === 'number') {
      setSelectedImage('local-image'); // Special marker for local images
    } else {
      // For remote images, use the URI
      let imageUri: string;
      if (imageSource) {
        if (typeof imageSource === 'object' && imageSource.uri) {
          imageUri = imageSource.uri;
        } else if (typeof imageSource === 'string') {
          imageUri = imageSource;
        } else {
          return;
        }
      } else if (imageUrl) {
        imageUri = imageUrl;
      } else {
        return;
      }
      setSelectedImage(imageUri);
    }
    
    setShowImageViewer(true);
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your recommendations...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Ionicons name="bulb" size={24} color={Colors.primary} style={styles.titleIcon} />
            <Text style={styles.headerTitle}>Recommendations</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Placeholder for future actions */}
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {recommendations.length > 0 ? (
            recommendations
              .filter(recommendation => !dismissedRecommendations.has(recommendation.id))
              .map((recommendation) => (
              <View key={recommendation.id} style={styles.recommendationCardContainer}>
                <TouchableOpacity
                  style={styles.recommendationCard}
                  onPress={() => handleRecommendationPress(recommendation)}
                >
            {(recommendation.imageSource || recommendation.imageUrl) && (
              <Image 
                source={recommendation.imageSource || { uri: recommendation.imageUrl }} 
                style={styles.recommendationImage}
                resizeMode="cover"
                onError={() => console.log('Image failed to load:', recommendation.imageUrl || recommendation.imageSource)}
              />
            )}
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationTitleContainer}>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: recommendation.priority === 'high' ? '#ff4444' : 
                                       recommendation.priority === 'medium' ? '#ff8800' : '#00aa00' }
                    ]}>
                      <Text style={styles.priorityText}>{recommendation.priority}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#737373" />
                </View>
                <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
                <View style={styles.recommendationFooter}>
                  <Text style={styles.recommendationCategory}>{recommendation.category}</Text>
                  {recommendation.actionable && (
                    <View style={styles.actionableBadge}>
                      <Text style={styles.actionableText}>Actionable</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleDismissRecommendation(recommendation.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#737373" />
              </TouchableOpacity>
            </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bulb-outline" size={48} color="#737373" />
              <Text style={styles.emptyStateTitle}>No Recommendations Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Complete some orders and measurements to receive personalized recommendations.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Recommendation Details Modal */}
        <Modal
          visible={showRecommendationDetails}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recommendation Details</Text>
              <TouchableOpacity
                onPress={() => setShowRecommendationDetails(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedRecommendation && (
              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentContainer}
                showsVerticalScrollIndicator={false}
              >
            <View style={styles.modalImageContainer}>
              {(selectedRecommendation.imageSource || selectedRecommendation.imageUrl) ? (
                <TouchableOpacity
                  onPress={() => handleImagePress(selectedRecommendation.imageSource, selectedRecommendation.imageUrl)}
                  style={styles.touchableImage}
                >
                  <Image 
                    source={selectedRecommendation.imageSource || { uri: selectedRecommendation.imageUrl }} 
                    style={styles.modalRecommendationImage}
                    resizeMode="cover"
                    onError={() => console.log('Modal image failed to load:', selectedRecommendation.imageUrl || selectedRecommendation.imageSource)}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Ionicons name="sparkles" size={48} color="#4A90E2" />
                  <Text style={styles.modalImagePlaceholderText}>Personalized Recommendations</Text>
                </View>
              )}
            </View>
                
                <Text style={styles.modalRecommendationTitle}>
                  {selectedRecommendation.title}
                </Text>
                <Text style={styles.modalRecommendationDescription}>
                  {selectedRecommendation.description}
                </Text>
                
                <View style={styles.modalRecommendationMeta}>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Category</Text>
                    <Text style={styles.modalMetaValue}>{selectedRecommendation.category}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Priority</Text>
                    <View style={[
                      styles.priorityIndicator,
                      { backgroundColor: selectedRecommendation.priority === 'high' ? '#ff4444' : 
                                       selectedRecommendation.priority === 'medium' ? '#ff8800' : '#00aa00' }
                    ]}>
                      <Text style={styles.priorityIndicatorText}>{selectedRecommendation.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Confidence</Text>
                    <Text style={styles.modalMetaValue}>{selectedRecommendation.confidence}%</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Actionable</Text>
                    <View style={[
                      styles.actionableIndicator,
                      { backgroundColor: selectedRecommendation.actionable ? '#00aa00' : '#ff4444' }
                    ]}>
                      <Text style={styles.actionableIndicatorText}>
                        {selectedRecommendation.actionable ? 'YES' : 'NO'}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedRecommendation.suggestedItems && selectedRecommendation.suggestedItems.length > 0 && (
                  <View style={styles.suggestedItemsContainer}>
                    <Text style={styles.suggestedItemsTitle}>Suggested Items</Text>
                    {selectedRecommendation.suggestedItems.map((item, index) => (
                      <View key={index} style={styles.suggestedItemCard}>
                        <View style={styles.suggestedItemImageContainer}>
                          {item.imageSource || item.imageUrl ? (
                            <TouchableOpacity
                              onPress={() => handleImagePress(item.imageSource, item.imageUrl)}
                              style={styles.touchableImage}
                            >
                              <Image 
                                source={item.imageSource || { uri: item.imageUrl }} 
                                style={styles.suggestedItemImage}
                                resizeMode="cover"
                                onError={(error) => {
                                  console.log('Suggested item image failed to load:', item.imageUrl || item.imageSource, error);
                                }}
                                onLoadStart={() => console.log('Loading image:', item.imageUrl || item.imageSource)}
                                onLoadEnd={() => console.log('Image loaded successfully:', item.imageUrl || item.imageSource)}
                              />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.suggestedItemPlaceholder}>
                              <Ionicons name="shirt" size={32} color="#4A90E2" />
                              <Text style={styles.suggestedItemPlaceholderText}>{item.category}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.suggestedItemContent}>
                          <Text style={styles.suggestedItemName}>{item.name}</Text>
                          <Text style={styles.suggestedItemDescription}>{item.description}</Text>
                          <Text style={styles.suggestedItemReason}>{item.reason}</Text>
                          {item.size && (
                            <Text style={styles.suggestedItemSize}>Size: {item.size}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {selectedRecommendation.actionable && (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleTakeAction(selectedRecommendation)}
                  >
                    <Text style={styles.actionButtonText}>
                      {selectedRecommendation.type === 'size' || selectedRecommendation.type === 'sizing' 
                        ? 'Get Perfect Fit Now' 
                        : selectedRecommendation.type === 'style' 
                        ? 'Explore These Styles' 
                        : selectedRecommendation.type === 'seasonal'
                        ? 'Shop Seasonal Collection'
                        : selectedRecommendation.type === 'budget'
                        ? 'Find Great Deals'
                        : selectedRecommendation.type === 'maintenance'
                        ? 'Manage My Account'
                        : 'Start Shopping'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* Floating Image Viewer Modal */}
        <Modal
          visible={showImageViewer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('Image viewer close requested');
            setShowImageViewer(false);
          }}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => {
                console.log('Close button pressed');
                setShowImageViewer(false);
              }}
            >
              <Ionicons name="close" size={30} color="#ffffff" />
            </TouchableOpacity>
            
            {selectedImageSource || selectedImage ? (
              <View style={styles.floatingImageContainer}>
                <Image
                  source={selectedImageSource || (selectedImage ? { uri: selectedImage } : null)}
                  style={styles.floatingImage}
                  resizeMode="contain"
                  onError={(error) => {
                    // Don't close the modal, show fallback instead
                  }}
                />
                
              </View>
            ) : (
              <View style={styles.floatingImagePlaceholder}>
                <Ionicons name="image-outline" size={64} color="#ffffff" />
                <Text style={styles.floatingImagePlaceholderText}>No Image Available</Text>
              </View>
            )}
            
            {/* Show special message for catalog images */}
            {selectedImage && selectedImage.includes('dummyimage.com') && selectedImage.includes('Catalog+Image') && (
              <View style={styles.catalogImageMessage}>
                <Text style={styles.catalogImageMessageText}>
                  This is a catalog image from your local assets. 
                  The full-resolution image is available in the product details.
                </Text>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#737373',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recommendationTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#171717',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendationCategory: {
    fontSize: 12,
    color: '#737373',
  },
  actionableBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionableText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom to ensure buttons are visible
  },
  modalContentContainer: {
    flexGrow: 1,
    paddingBottom: 20, // Additional bottom padding for content container
  },
  modalRecommendationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 12,
  },
  modalRecommendationDescription: {
    fontSize: 16,
    color: '#737373',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalRecommendationMeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalMetaLabel: {
    fontSize: 14,
    color: '#737373',
  },
  modalMetaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recommendationImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 12,
  },
  modalRecommendationImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  suggestedItemsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  suggestedItemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 12,
  },
  suggestedItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestedItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  suggestedItemContent: {
    flex: 1,
  },
  suggestedItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 4,
  },
  suggestedItemDescription: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 4,
  },
  suggestedItemReason: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestedItemSize: {
    fontSize: 12,
    color: '#737373',
  },
  suggestedItemImageContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  suggestedItemPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  suggestedItemPlaceholderText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  modalImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  modalImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  modalImagePlaceholderText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  priorityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionableIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionableIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recommendationCardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  touchableImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  floatingImageContainer: {
    width: '90%',
    height: '80%',
    maxWidth: 400,
    maxHeight: 600,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingImage: {
    width: '100%',
    height: '100%',
  },
  floatingImagePlaceholder: {
    width: '90%',
    height: '80%',
    maxWidth: 400,
    maxHeight: 600,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  floatingImagePlaceholderText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  catalogImageMessage: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  catalogImageMessageText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
