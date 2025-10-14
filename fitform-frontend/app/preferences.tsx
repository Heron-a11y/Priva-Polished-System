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
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CLOTHING_TYPES } from '../constants/ClothingTypes';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import { CustomerDataAnalyzer, CustomerInsights, Recommendation, MeasurementData, HistoryItem } from '../utils/CustomerDataAnalysis';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

export default function PreferencesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementData[]>([]);
  const [orderHistory, setOrderHistory] = useState<HistoryItem[]>([]);
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadInsights(),
        loadRecommendations(),
        loadMeasurementHistory(),
        loadOrderHistory()
      ]);
    } catch (error) {
      console.error('Error loading preferences data:', error);
      Alert.alert('Error', 'Failed to load preferences data');
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

      // Use the new analyzer
      const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
      const insightsData = analyzer.generateInsights();
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      if (insights) {
        // Load fresh data for recommendations
        const historyResponse = await apiService.getRentalPurchaseHistory();
        const orders = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
        
        const measurementResponse = await apiService.getMeasurementHistory();
        const measurements = Array.isArray(measurementResponse?.data) ? measurementResponse.data : [];

        const profileResponse = await apiService.getProfile();
        const profile = profileResponse?.data?.user || {};

        // Use the analyzer to generate recommendations
        const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
        const recs = analyzer.generateRecommendations(insights);
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const loadMeasurementHistory = async () => {
    try {
      const response = await apiService.getMeasurementHistory();
      if (response.success && response.data) {
        setMeasurementHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading measurement history:', error);
    }
  };

  const loadOrderHistory = async () => {
    try {
      const response = await apiService.getRentalPurchaseHistory();
      if (response.success && response.data) {
        setOrderHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading order history:', error);
    }
  };




  const handleRecommendationPress = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowRecommendationDetails(true);
  };

  const handleInsightsPress = () => {
    router.push('/customer/insights');
  };

  const handleRecommendationsPress = () => {
    router.push('/customer/recommendations');
  };

  // Removed unused tab render functions - using menu interface instead
  const renderInsightsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {insights && (
        <>
          {/* Overview Cards */}
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{insights.totalOrders}</Text>
              <Text style={styles.overviewLabel}>Total Orders</Text>
      </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>${insights.totalSpent.toFixed(0)}</Text>
              <Text style={styles.overviewLabel}>Total Spent</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{insights.satisfactionScore}%</Text>
              <Text style={styles.overviewLabel}>Satisfaction</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{(insights.rentalVsPurchaseRatio * 100).toFixed(0)}%</Text>
              <Text style={styles.overviewLabel}>Rental Ratio</Text>
            </View>
          </View>

          {/* Favorite Clothing Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Style Preferences</Text>
            {insights.favoriteClothingTypes.map((item, index) => (
              <View key={index} style={styles.preferenceItem}>
                <Text style={styles.preferenceName}>{item.type}</Text>
                <View style={styles.preferenceBar}>
                  <View 
                    style={[
                      styles.preferenceBarFill, 
                      { width: `${item.percentage}%` }
                    ]} 
                  />
              </View>
                <Text style={styles.preferenceCount}>{item.count} orders ({item.percentage.toFixed(1)}%)</Text>
              </View>
            ))}
            </View>

          {/* Measurement Trends */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Measurement Insights</Text>
            <View style={styles.measurementCard}>
              <View style={styles.measurementRow}>
                <Ionicons name="body-outline" size={20} color={Colors.primary} />
                <Text style={styles.measurementLabel}>Last Measurement</Text>
                <Text style={styles.measurementValue}>
                  {insights.measurementTrends.lastMeasurementDate === 'Never' 
                    ? 'Never' 
                    : new Date(insights.measurementTrends.lastMeasurementDate).toLocaleDateString()
                  }
                </Text>
              </View>
              <View style={styles.measurementRow}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
                <Text style={styles.measurementLabel}>Size Stability</Text>
                <Text style={styles.measurementValue}>{insights.measurementTrends.sizeStability}</Text>
              </View>
              <View style={styles.measurementRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.measurementLabel}>Accuracy Score</Text>
                <Text style={styles.measurementValue}>{insights.measurementTrends.measurementAccuracy}%</Text>
            </View>
          </View>
        </View>

          {/* Seasonal Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seasonal Preferences</Text>
            {insights.seasonalPreferences.map((season, index) => (
              <View key={index} style={styles.seasonalItem}>
                <Text style={styles.seasonalName}>{season.season}</Text>
                <View style={styles.seasonalBar}>
                  <View 
                    style={[
                      styles.seasonalBarFill, 
                      { width: `${season.percentage}%` }
                    ]} 
              />
            </View>
                <Text style={styles.seasonalCount}>{season.orders} orders</Text>
              </View>
            ))}
          </View>

          {/* Order Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Frequency</Text>
            <View style={styles.frequencyGrid}>
              <View style={styles.frequencyCard}>
                <Text style={styles.frequencyNumber}>{insights.orderFrequency.monthly}</Text>
                <Text style={styles.frequencyLabel}>This Month</Text>
              </View>
              <View style={styles.frequencyCard}>
                <Text style={styles.frequencyNumber}>{insights.orderFrequency.seasonal}</Text>
                <Text style={styles.frequencyLabel}>Last 3 Months</Text>
              </View>
              <View style={styles.frequencyCard}>
                <Text style={styles.frequencyNumber}>{insights.orderFrequency.yearly}</Text>
                <Text style={styles.frequencyLabel}>This Year</Text>
              </View>
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Patterns</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={20} color={Colors.primary} />
                <Text style={styles.priceLabel}>Average Order Value</Text>
                <Text style={styles.priceValue}>${insights.averageOrderValue.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
                <Text style={styles.priceLabel}>Price Range</Text>
                <Text style={styles.priceValue}>
                  ${insights.priceRange.min.toFixed(0)} - ${insights.priceRange.max.toFixed(0)}
              </Text>
            </View>
          </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderRecommendationsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {recommendations.length > 0 ? (
        recommendations.map((recommendation) => (
          <TouchableOpacity
            key={recommendation.id}
            style={styles.recommendationCard}
            onPress={() => handleRecommendationPress(recommendation)}
          >
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
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
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
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={48} color={Colors.neutral[500]} />
          <Text style={styles.emptyStateTitle}>No Recommendations Yet</Text>
          <Text style={styles.emptyStateDescription}>
            Complete some orders and measurements to receive personalized recommendations.
          </Text>
          </View>
      )}
    </ScrollView>
  );

  const renderPreferencesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your preferences...</Text>
          </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="settings" size={24} color={Colors.primary} style={styles.titleIcon} />
            <Text style={styles.headerTitle}>My Preferences</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Data Analysis Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Analysis</Text>
            
          <TouchableOpacity 
              style={styles.menuCard}
              onPress={handleInsightsPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="analytics-outline" size={24} color={Colors.primary} />
            </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Insights</Text>
                  <Text style={styles.menuDescription}>View your personalized data analysis and trends</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>
          
          <TouchableOpacity 
              style={styles.menuCard}
              onPress={handleRecommendationsPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
            </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Recommendations</Text>
                  <Text style={styles.menuDescription}>Get personalized suggestions based on your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#737373" />
          </TouchableOpacity>
        </View>


      </ScrollView>

        {/* Recommendation Details Modal */}
        <Modal
          visible={showRecommendationDetails}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowRecommendationDetails(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.neutral[900]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Recommendation Details</Text>
            </View>
            
            {selectedRecommendation && (
              <ScrollView style={styles.modalContent}>
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
                    <Text style={styles.modalMetaValue}>{selectedRecommendation.priority}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Actionable</Text>
                    <Text style={styles.modalMetaValue}>
                      {selectedRecommendation.actionable ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>

                {selectedRecommendation.actionable && (
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Take Action</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  content: {
    flex: 1,
    padding: 20,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 18,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginRight: '2%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#737373',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
  },
  preferenceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceItemTitle: {
    fontSize: 16,
    color: '#171717',
    marginLeft: 12,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#737373',
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 8,
  },
  preferenceBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 4,
  },
  preferenceBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  preferenceCount: {
    fontSize: 14,
    color: '#737373',
  },
  measurementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  measurementLabel: {
    fontSize: 16,
    color: '#171717',
    marginLeft: 12,
    flex: 1,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
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
  seasonalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
  },
  seasonalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 8,
  },
  seasonalBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 4,
    flex: 1,
    marginHorizontal: 12,
  },
  seasonalBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  seasonalCount: {
    fontSize: 14,
    color: '#737373',
  },
  frequencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequencyCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  frequencyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  frequencyLabel: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: '#171717',
    marginLeft: 12,
    flex: 1,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.error,
    marginLeft: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 8,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  feedbackText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalCloseButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
}); 