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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
}

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const statsData = await apiService.getAppointmentStats();
      
      const stats = {
        totalAppointments: statsData.total_appointments,
        pendingAppointments: statsData.pending_appointments,
        confirmedAppointments: statsData.confirmed_appointments,
        cancelledAppointments: statsData.cancelled_appointments,
        totalCustomers: statsData.total_customers,
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
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
    fetchDashboardStats();
  };

  const handleViewAllAppointments = () => {
    router.push('/admin/appointments');
  };

  const handleViewOrders = () => {
    router.push('/admin/orders');
  };

  const handleViewSizingStandards = () => {
    router.push('/admin/sizing');
  };

  const handleViewReports = () => {
    router.push('/admin/reports');
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Dashboard Title Section */}
      <View style={styles.dashboardTitleSection}>
        <View style={styles.titleContent}>
          <View style={styles.titleIconContainer}>
            <Ionicons name="grid-outline" size={28} color="#014D40" />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back! Here's what's happening today.</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRefreshStats} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#014D40" />
        </TouchableOpacity>
      </View>

      {/* Appointment Calendar Section */}
      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>Appointment Calendar</Text>
        <AdminCalendar />
      </View>

      {/* Statistics Cards - 2x2 Grid */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Overview Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Appointments"
            value={stats.totalAppointments}
            icon="calendar-outline"
            color="#014D40"
            subtitle="All time"
          />
          <StatCard
            title="Pending"
            value={stats.pendingAppointments}
            icon="time-outline"
            color="#FF9800"
            subtitle="Awaiting confirmation"
          />
          <StatCard
            title="Confirmed"
            value={stats.confirmedAppointments}
            icon="checkmark-circle-outline"
            color="#4CAF50"
            subtitle="Ready to proceed"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon="people-outline"
            color="#2196F3"
            subtitle="Registered users"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            title="View All Appointments"
            icon="list-outline"
            onPress={handleViewAllAppointments}
            color="#014D40"
            description="Manage all appointments"
          />
          <QuickActionButton
            title="View Orders"
            icon="file-tray-full-outline"
            onPress={handleViewOrders}
            color="#2196F3"
            description="Manage customer orders"
          />
          <QuickActionButton
            title="Sizing Standards"
            icon="resize-outline"
            onPress={handleViewSizingStandards}
            color="#FF5722"
            description="Manage measurements"
          />
          <QuickActionButton
            title="View Reports"
            icon="analytics-outline"
            onPress={handleViewReports}
            color="#9C27B0"
            description="Analytics & insights"
          />
        </View>
      </View>


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  dashboardTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
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