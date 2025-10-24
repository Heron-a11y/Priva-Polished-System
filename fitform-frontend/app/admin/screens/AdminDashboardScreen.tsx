import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import AdminCalendar from '../../../components/AdminCalendar';
import apiService from '../../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH > 768;

interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalMeasurements: number;
  recentMeasurements: number;
  totalCatalogItems: number;
  activeCatalogItems: number;
}

const AdminDashboardScreen = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    totalCustomers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalMeasurements: 0,
    recentMeasurements: 0,
    totalCatalogItems: 0,
    activeCatalogItems: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data sources in parallel with proper error handling
      const [appointmentStats, customerStats, orderStats, measurementStats, catalogStats, activitiesData] = await Promise.allSettled([
        apiService.getAppointmentStats(),
        apiService.getCustomerStats(),
        apiService.getOrderStats(),
        apiService.getMeasurementStats(),
        apiService.getCatalogStats(),
        apiService.getRecentActivities()
      ]);
      
      // Extract data with fallbacks
      const appointmentData = appointmentStats.status === 'fulfilled' ? appointmentStats.value : {};
      const customerData = customerStats.status === 'fulfilled' ? customerStats.value : {};
      const orderData = orderStats.status === 'fulfilled' ? orderStats.value : {};
      const measurementData = measurementStats.status === 'fulfilled' ? measurementStats.value : {};
      const catalogData = catalogStats.status === 'fulfilled' ? catalogStats.value : {};
      const activities = activitiesData.status === 'fulfilled' ? activitiesData.value : {};
      
      console.log('📊 Dashboard Data:', {
        appointments: appointmentData,
        customers: customerData,
        orders: orderData,
        measurements: measurementData,
        catalog: catalogData,
        activities: activities
      });
      
      const stats = {
        // Appointment data
        totalAppointments: appointmentData.data?.total_appointments || appointmentData.total_appointments || 0,
        pendingAppointments: appointmentData.data?.pending_appointments || appointmentData.pending_appointments || 0,
        confirmedAppointments: appointmentData.data?.confirmed_appointments || appointmentData.confirmed_appointments || 0,
        cancelledAppointments: appointmentData.data?.cancelled_appointments || appointmentData.cancelled_appointments || 0,
        
        // Customer data
        totalCustomers: customerData.data?.total_customers || customerData.total_customers || 0,
        
        // Order data (from order stats endpoint)
        totalOrders: orderData.data?.total_orders || orderData.total_orders || 0,
        pendingOrders: orderData.data?.pending_orders || orderData.pending_orders || 0,
        completedOrders: orderData.data?.completed_orders || orderData.completed_orders || 0,
        
        // Measurement data
        totalMeasurements: measurementData.data?.total_measurements || measurementData.total_measurements || measurementData.total || 0,
        recentMeasurements: measurementData.data?.recent_measurements || measurementData.recent_measurements || measurementData.this_week || 0,
        
        // Catalog data
        totalCatalogItems: catalogData.data?.total_items || catalogData.total_items || catalogData.total || 0,
        activeCatalogItems: catalogData.data?.active_items || catalogData.active_items || catalogData.active || 0,
      };
      
      setStats(stats);
      
      // Set recent activities
      const activitiesList = activities.data || activities || [];
      setRecentActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }: { 
    title: string; 
    value: number; 
    icon: string; 
    color: string;
    subtitle: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const QuickActionButton = ({ title, icon, onPress, color, description }: { 
    title: string; 
    icon: string; 
    onPress: () => void; 
    color: string;
    description: string;
  }) => (
    <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.actionIconContainer}>
        <Ionicons name={icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.quickActionText}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleRefreshStats = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  // Navigation handlers for all sidebar items
  const handleViewAppointments = () => {
    router.push('/admin/appointments');
  };

  const handleViewARMeasurements = () => {
    router.push('/admin/ar-measurements');
  };

  const handleViewOrders = () => {
    router.push('/admin/orders');
  };

  const handleViewCustomers = () => {
    router.push('/admin/customers');
  };

  const handleViewCatalog = () => {
    router.push('/admin/catalog');
  };

  const handleViewMeasurementHistory = () => {
    router.push('/admin/measurement-history');
  };

  const handleViewSizingStandards = () => {
    router.push('/admin/sizing');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Dashboard Header */}
      <View style={styles.dashboardHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="speedometer" size={32} color="#014D40" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {user?.name || user?.email || 'Admin'}! Here's your business overview.
            </Text>
          </View>
        </View>
      </View>

      {/* Appointment Calendar */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Appointment Calendar</Text>
        <View style={styles.calendarContainer}>
          <AdminCalendar />
        </View>
      </View>

      {/* Key Metrics Overview */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Key Metrics Overview</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            title="Total Appointments"
            value={stats.totalAppointments}
            icon="calendar-outline"
            color="#014D40"
            subtitle="All time"
          />
          <StatCard
            title="Pending Appointments"
            value={stats.pendingAppointments}
            icon="time-outline"
            color="#FF9800"
            subtitle="Awaiting confirmation"
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon="file-tray-full-outline"
            color="#2196F3"
            subtitle="All orders"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon="people-outline"
            color="#4CAF50"
            subtitle="Registered users"
          />
          <StatCard
            title="AR Measurements"
            value={stats.totalMeasurements}
            icon="scan-outline"
            color="#9C27B0"
            subtitle="Total measurements"
          />
          <StatCard
            title="Catalog Items"
            value={stats.totalCatalogItems}
            icon="shirt-outline"
            color="#FF5722"
            subtitle="Available items"
          />
        </View>
      </View>


      {/* Quick Actions Grid */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            title="Manage Appointments"
            icon="calendar"
            onPress={handleViewAppointments}
            color="#014D40"
            description="View and manage all appointments"
          />
          <QuickActionButton
            title="AR Measurements"
            icon="scan"
            onPress={handleViewARMeasurements}
            color="#9C27B0"
            description="Manage AR body measurements"
          />
          <QuickActionButton
            title="Manage Orders"
            icon="file-tray-full"
            onPress={handleViewOrders}
            color="#2196F3"
            description="Process customer orders"
          />
          <QuickActionButton
            title="Manage Customers"
            icon="people"
            onPress={handleViewCustomers}
            color="#4CAF50"
            description="View customer information"
          />
          <QuickActionButton
            title="Catalog Management"
            icon="shirt"
            onPress={handleViewCatalog}
            color="#FF5722"
            description="Manage product catalog"
          />
          <QuickActionButton
            title="Measurement History"
            icon="analytics"
            onPress={handleViewMeasurementHistory}
            color="#FF9800"
            description="View measurement analytics"
          />
          <QuickActionButton
            title="Sizing Standards"
            icon="resize"
            onPress={handleViewSizingStandards}
            color="#607D8B"
            description="Manage sizing standards"
          />
        </View>
      </View>

      {/* Recent Activity Summary */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity Summary</Text>
        <View style={styles.activityCards}>
          {recentActivities.length > 0 ? (
            recentActivities.slice(0, 6).map((activity, index) => (
              <View key={activity.id || index} style={styles.activityCard}>
                <View style={[styles.activityIconContainer, { backgroundColor: activity.color + '20' }]}>
                  <Ionicons name={activity.icon || 'ellipse-outline'} size={20} color={activity.color || '#6B7280'} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.description}</Text>
                  <Text style={styles.activityValue}>
                    {activity.user_name} • {activity.time_ago}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.activityCard}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>No recent activities</Text>
                <Text style={styles.activityValue}>Activity will appear here as users interact with the system</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Dashboard Header
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f8f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Sections
  metricsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  calendarSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  activitySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  titleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f8f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  refreshButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8f5',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 16,
  },
  // Grid layouts
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: isTablet ? '31%' : '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 4,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 33,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#014D40',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 100,
    position: 'relative',
  },
  actionIconContainer: {
    marginBottom: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
  // Activity Section
  activityCards: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#014D40',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 2,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default AdminDashboardScreen; 