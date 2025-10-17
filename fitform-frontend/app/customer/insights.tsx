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
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { CustomerDataAnalyzer, CustomerInsights, MeasurementData, HistoryItem } from '../../utils/CustomerDataAnalysis';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

export default function InsightsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<CustomerInsights | null>(null);

  // Helper function to safely convert to number and handle NaN
  const safeNumber = (value: any, fallback: number = 0): number => {
    if (value === null || value === undefined) return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading insights for user:', user?.id);
      console.log('🔍 Debug: User object:', user);
      
      // Test API connection first
      const connectionTest = await apiService.testConnection();
      console.log('🔍 Debug: Connection test result:', connectionTest);
      
      // Check authentication
      const isAuth = await apiService.isAuthenticated();
      console.log('🔍 Debug: Authentication status:', isAuth);
      
      if (!isAuth) {
        console.log('❌ User is not authenticated, cannot load data');
        Alert.alert('Session Expired', 'Your login session has expired. Please log in again to view your data.');
        return;
      }
      
      // Load order history for insights
      const historyResponse = await apiService.getRentalPurchaseHistory();
      console.log('🔍 Debug: History API response:', historyResponse);
      const orders = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
      
      // Debug: Check if we have any orders
      if (orders.length === 0) {
        console.log('⚠️ Warning: No orders found in API response');
        console.log('🔍 Debug: Full API response:', historyResponse);
        console.log('🔍 Debug: Response success:', historyResponse?.success);
        console.log('🔍 Debug: Response data type:', typeof historyResponse?.data);
      } else {
        console.log('✅ Found orders:', orders.length);
        console.log('🔍 Debug: First order:', orders[0]);
      }
      
      // Load measurement history
      const measurementResponse = await apiService.getMeasurementHistory();
      console.log('🔍 Debug: Measurement API response:', measurementResponse);
      const measurements = Array.isArray(measurementResponse?.data) ? measurementResponse.data : [];
      console.log('🔍 Debug: Measurements count:', measurements.length);

      // Load profile data
      const profileResponse = await apiService.getProfile();
      console.log('🔍 Debug: Profile API response:', profileResponse);
      const profile = profileResponse?.data?.user || {};
      console.log('🔍 Debug: Profile data:', profile);

      // Debug: Log the data structure
      console.log('🔍 Debug: Orders data:', orders.slice(0, 2));
      console.log('🔍 Debug: Orders length:', orders.length);
      console.log('🔍 Debug: First order amount field:', orders[0]?.amount);
      console.log('🔍 Debug: First order quotation_amount field:', orders[0]?.quotation_amount);
      console.log('🔍 Debug: First order total_amount field:', orders[0]?.total_amount);
      
      // Use the analyzer
      const analyzer = new CustomerDataAnalyzer(orders, measurements, profile);
      const insightsData = analyzer.generateInsights();
      
      // Debug: Log the insights data
      console.log('🔍 Debug: Insights data:', {
        totalSpent: insightsData.totalSpent,
        averageOrderValue: insightsData.averageOrderValue,
        priceRange: insightsData.priceRange,
        purchaseInsights: insightsData.purchaseInsights,
        seasonalSpending: insightsData.behavioralPatterns?.seasonalSpending
      });
      
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading insights:', error);
      Alert.alert('Data Loading Failed', 'Unable to load your insights data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your insights...</Text>
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
            <Ionicons name="analytics" size={24} color={Colors.primary} style={styles.titleIcon} />
            <Text style={styles.headerTitle}>Data Insights</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {insights && insights.totalSpent !== undefined && (
            <>
              {/* Overview Cards */}
              <View style={styles.overviewGrid}>
                <View style={styles.overviewRow}>
                  <View style={styles.overviewCard}>
                    <View style={styles.overviewIcon}>
                      <Ionicons name="list" size={24} color="#014D40" />
                    </View>
                    <Text style={styles.overviewNumber}>{insights.totalOrders}</Text>
                    <Text style={styles.overviewLabel}>Total Orders</Text>
                  </View>
                  <View style={styles.overviewCard}>
                    <View style={styles.overviewIcon}>
                      <Ionicons name="wallet" size={24} color="#014D40" />
                    </View>
                    <Text style={styles.overviewNumber}>₱{safeNumber(insights.totalSpent).toFixed(0)}</Text>
                    <Text style={styles.overviewLabel}>Total Spent</Text>
                  </View>
                </View>
                <View style={styles.overviewRow}>
                  <View style={styles.overviewCard}>
                    <View style={styles.overviewIcon}>
                      <Ionicons name="heart" size={24} color="#014D40" />
                    </View>
                    <Text style={styles.overviewNumber}>{(insights.satisfactionScore || 0)}%</Text>
                    <Text style={styles.overviewLabel}>Satisfaction</Text>
                  </View>
                  <View style={styles.overviewCard}>
                    <View style={styles.overviewIcon}>
                      <Ionicons name="shirt" size={24} color="#014D40" />
                    </View>
                    <Text style={styles.overviewNumber}>{safeNumber(insights.rentalVsPurchaseRatio * 100).toFixed(0)}%</Text>
                    <Text style={styles.overviewLabel}>Rental Ratio</Text>
                  </View>
                </View>
              </View>

              {/* Style Analysis Section */}
              <View style={styles.styleSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="shirt-outline" size={24} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Style Analysis</Text>
                </View>
                
                {/* Style Preferences */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Your Style Preferences</Text>
                  {insights.favoriteClothingTypes.map((item, index) => (
                    <View key={index} style={styles.preferenceItem}>
                      <View style={styles.preferenceHeader}>
                        <Text style={styles.preferenceName}>{item.type}</Text>
                        <Text style={styles.preferencePercentage}>{safeNumber(item.percentage).toFixed(1)}%</Text>
                      </View>
                      <View style={styles.preferenceBar}>
                        <View 
                          style={[
                            styles.preferenceBarFill, 
                            { width: `${item.percentage || 0}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.preferenceCount}>{item.count || 0} orders</Text>
                    </View>
                  ))}
                </View>

                {/* Seasonal Preferences */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Seasonal Preferences</Text>
                  {(() => {
                    // Group seasons by Philippine seasons
                    const groupedSeasons = insights.seasonalPreferences.reduce((acc, season) => {
                      const philippineSeason = season.season === 'Summer' || season.season === 'Spring' ? 'Dry Season' : 
                                            season.season === 'Fall' || season.season === 'Winter' ? 'Wet Season' : 
                                            season.season;
                      
                      if (!acc[philippineSeason]) {
                        acc[philippineSeason] = {
                          season: philippineSeason,
                          orders: 0,
                          percentage: 0
                        };
                      }
                      
                      acc[philippineSeason].orders += season.orders;
                      acc[philippineSeason].percentage += season.percentage;
                      
                      return acc;
                    }, {});
                    
                    // Convert to array and sort by percentage
                    const philippineSeasons = Object.values(groupedSeasons).sort((a, b) => b.percentage - a.percentage);
                    
                    return philippineSeasons.map((season, index) => (
                      <View key={index} style={styles.seasonalItem}>
                        <View style={styles.seasonalHeader}>
                          <Text style={styles.seasonalName}>{season.season}</Text>
                          <Text style={styles.seasonalPercentage}>{safeNumber(season.percentage).toFixed(1)}%</Text>
                        </View>
                        <View style={styles.seasonalBar}>
                          <View 
                            style={[
                              styles.seasonalBarFill, 
                              { width: `${season.percentage || 0}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.seasonalCount}>{season.orders} orders</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>

              {/* Measurement Analysis Section */}
              <View style={styles.measurementSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="body-outline" size={24} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Measurement Analysis</Text>
                </View>
                
                <View style={styles.measurementCard}>
                  <View style={styles.measurementRow}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
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

              {/* Order Analysis Section */}
              <View style={styles.orderSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="stats-chart-outline" size={24} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Order Analysis</Text>
                </View>
                
                {/* Order Frequency */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Order Frequency</Text>
                  <View style={styles.frequencyGrid}>
                    <View style={styles.frequencyCard}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                      <Text style={styles.frequencyNumber}>{insights.orderFrequency.monthly}</Text>
                      <Text style={styles.frequencyLabel}>This Month</Text>
                    </View>
                    <View style={styles.frequencyCard}>
                      <Ionicons name="time-outline" size={20} color={Colors.primary} />
                      <Text style={styles.frequencyNumber}>{insights.orderFrequency.seasonal}</Text>
                      <Text style={styles.frequencyLabel}>Last 3 Months</Text>
                    </View>
                    <View style={styles.frequencyCard}>
                      <Ionicons name="stats-chart-outline" size={20} color={Colors.primary} />
                      <Text style={styles.frequencyNumber}>{insights.orderFrequency.yearly}</Text>
                      <Text style={styles.frequencyLabel}>This Year</Text>
                    </View>
                  </View>
                </View>

                {/* Spending Patterns */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Spending Patterns</Text>
                  <View style={styles.priceCard}>
                    <View style={styles.priceRow}>
                      <Ionicons name="cash-outline" size={20} color={Colors.primary} />
                      <Text style={styles.priceLabel}>Average Order Value</Text>
                      <Text style={styles.priceValue}>₱{safeNumber(insights.averageOrderValue).toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
                      <Text style={styles.priceLabel}>Price Range</Text>
                      <Text style={styles.priceValue}>
                        ₱{safeNumber(insights.priceRange?.min).toFixed(0)} - ₱{safeNumber(insights.priceRange?.max).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Business Analysis Section */}
              <View style={styles.businessSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business-outline" size={24} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Business Analysis</Text>
                </View>
                
                {/* Rental Insights */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Rental Analysis</Text>
                  <View style={styles.insightCard}>
                    <View style={styles.insightRow}>
                      <Ionicons name="shirt-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Total Rentals</Text>
                      <Text style={styles.insightValue}>{insights.rentalInsights.totalRentals}</Text>
                    </View>
                    <View style={styles.insightRow}>
                      <Ionicons name="time-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Return Timeliness</Text>
                      <Text style={styles.insightValue}>{safeNumber(insights.rentalInsights?.returnTimeliness).toFixed(0)}%</Text>
                    </View>
                    <View style={styles.insightRow}>
                      <Ionicons name="warning-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Penalty Rate</Text>
                      <Text style={styles.insightValue}>{safeNumber(insights.rentalInsights?.penaltyRate).toFixed(0)}%</Text>
                    </View>
                  </View>
                  
                  {insights.rentalInsights.mostRentedTypes.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Most Rented Types</Text>
                      {insights.rentalInsights.mostRentedTypes.map((item, index) => (
                        <View key={index} style={styles.typeItem}>
                          <Text style={styles.typeName}>{item.type}</Text>
                          <Text style={styles.typeCount}>{item.count || 0} times</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Purchase Insights */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Purchase Analysis</Text>
                  <View style={styles.insightCard}>
                    <View style={styles.insightRow}>
                      <Ionicons name="card-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Total Purchases</Text>
                      <Text style={styles.insightValue}>{insights.purchaseInsights.totalPurchases}</Text>
                    </View>
                    <View style={styles.insightRow}>
                      <Ionicons name="cash-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Avg Purchase Value</Text>
                      <Text style={styles.insightValue}>₱{safeNumber(insights.purchaseInsights?.averagePurchaseValue).toFixed(0)}</Text>
                    </View>
                    <View style={styles.insightRow}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Purchase Frequency</Text>
                      <Text style={styles.insightValue}>{safeNumber(insights.purchaseInsights?.purchaseFrequency).toFixed(1)}/month</Text>
                    </View>
                  </View>
                  
                  {insights.purchaseInsights.mostPurchasedTypes.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Most Purchased Types</Text>
                      {insights.purchaseInsights.mostPurchasedTypes.map((item, index) => (
                        <View key={index} style={styles.typeItem}>
                          <Text style={styles.typeName}>{item.type}</Text>
                          <Text style={styles.typeCount}>{item.count || 0} times</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Personal Analysis Section */}
              <View style={styles.personalSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={24} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Personal Analysis</Text>
                </View>
                
                {/* Body Analysis */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Body Analysis</Text>
                  <View style={styles.insightCard}>
                    <View style={styles.bodyTypeRow}>
                      <View style={styles.bodyTypeLabelContainer}>
                        <Ionicons name="body-outline" size={20} color={Colors.primary} />
                        <Text style={styles.insightLabel}>Body Type</Text>
                      </View>
                      <View style={styles.bodyTypeValueContainer}>
                        <Text style={styles.bodyTypeValue}>{insights.measurementInsights.bodyTypeAnalysis}</Text>
                      </View>
                    </View>
                    <View style={styles.insightRow}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Measurement Consistency</Text>
                      <Text style={styles.insightValue}>{insights.measurementInsights.measurementConsistency}%</Text>
                    </View>
                  </View>
                  
                  {insights.measurementInsights.sizeRecommendations.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Size Recommendations</Text>
                      {insights.measurementInsights.sizeRecommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                          <Text style={styles.recommendationType}>{rec.clothingType}</Text>
                          <Text style={styles.recommendationSize}>{rec.recommendedSize}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {insights.measurementInsights.growthPatterns.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Recent Changes</Text>
                      {insights.measurementInsights.growthPatterns.map((pattern, index) => (
                        <View key={index} style={styles.patternItem}>
                          <Text style={styles.patternMeasurement}>{pattern.measurement}</Text>
                          <Text style={styles.patternChange}>
                            {pattern.change > 0 ? '+' : ''}{pattern.change}"
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Behavioral Patterns */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Behavioral Patterns</Text>
                  <View style={styles.insightCard}>
                    <View style={styles.insightRow}>
                      <Ionicons name="heart-outline" size={20} color={Colors.primary} />
                      <Text style={styles.insightLabel}>Loyalty Score</Text>
                      <Text style={styles.insightValue}>{safeNumber(insights.behavioralPatterns?.loyaltyScore).toFixed(0)}%</Text>
                    </View>
                  </View>
                  
                  {insights.behavioralPatterns.preferredOrderDays.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Preferred Order Days</Text>
                      {insights.behavioralPatterns.preferredOrderDays.slice(0, 3).map((day, index) => (
                        <View key={index} style={styles.dayItem}>
                          <Text style={styles.dayName}>{day.day}</Text>
                          <Text style={styles.dayCount}>{day.count || 0} orders</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {insights.behavioralPatterns.seasonalSpending.length > 0 && (
                    <View style={styles.typeList}>
                      <Text style={styles.typeListTitle}>Seasonal Spending</Text>
                      {insights.behavioralPatterns.seasonalSpending.slice(0, 3).map((month, index) => (
                        <View key={index} style={styles.monthItem}>
                          <Text style={styles.monthName}>{month.month}</Text>
                          <Text style={styles.monthAmount}>₱{safeNumber(month.amount).toFixed(0)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewGrid: {
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    textAlign: 'center',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  styleSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  measurementSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  businessSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f9ff',
  },
  subsection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  typeList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  typeListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  preferenceItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: 0.2,
    flex: 1,
  },
  preferencePercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  preferenceBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  preferenceBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  preferenceCount: {
    fontSize: 14,
    color: '#737373',
    letterSpacing: 0.1,
    textAlign: 'left',
  },
  seasonalItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
  },
  seasonalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seasonalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: 0.2,
    flex: 1,
  },
  seasonalPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  seasonalBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  seasonalBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  seasonalCount: {
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
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
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
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  frequencyLabel: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
    letterSpacing: 0.2,
    fontWeight: '500',
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
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 16,
    color: '#171717',
    marginLeft: 12,
    flex: 1,
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  subsection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 4,
  },
  typeName: {
    fontSize: 14,
    color: '#171717',
    letterSpacing: 0.2,
    fontWeight: '500',
    flex: 1,
  },
  typeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 4,
  },
  recommendationType: {
    fontSize: 14,
    color: '#171717',
    letterSpacing: 0.2,
    fontWeight: '500',
    flex: 1,
  },
  recommendationSize: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  patternItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 4,
  },
  patternMeasurement: {
    fontSize: 14,
    color: '#171717',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    fontWeight: '500',
    flex: 1,
  },
  patternChange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
    letterSpacing: 0.3,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 14,
    color: '#171717',
    letterSpacing: 0.2,
    fontWeight: '500',
    flex: 1,
  },
  dayCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
    letterSpacing: 0.3,
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fdf2f8',
    borderRadius: 8,
    marginBottom: 4,
  },
  monthName: {
    fontSize: 14,
    color: '#171717',
    letterSpacing: 0.2,
    fontWeight: '500',
    flex: 1,
  },
  monthAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#be185d',
    letterSpacing: 0.3,
  },
  bodyTypeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bodyTypeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
    minWidth: 120,
    marginRight: 16,
  },
  bodyTypeValueContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bodyTypeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
});
