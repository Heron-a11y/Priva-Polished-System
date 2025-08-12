import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminCalendar from '../../../components/AdminCalendar';
import apiService from '../../../services/api';

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

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const QuickActionButton = ({ title, icon, onPress, color }: { title: string; icon: string; onPress: () => void; color: string }) => (
    <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color="#fff" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const handleRefreshStats = () => {
    fetchDashboardStats();
  };

  const handleViewAllAppointments = () => {
    // Navigate to appointments screen
    Alert.alert('Info', 'Navigate to appointments screen');
  };

  const handleViewCustomers = () => {
    // Navigate to customers screen
    Alert.alert('Info', 'Navigate to customers screen');
  };

  const handleViewReports = () => {
    // Navigate to reports screen
    Alert.alert('Info', 'Navigate to reports screen');
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
          <Ionicons name="grid-outline" size={28} color="#014D40" />
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleRefreshStats} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#014D40" />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Appointments"
          value={stats.totalAppointments}
          icon="calendar-outline"
          color="#014D40"
        />
        <StatCard
          title="Pending"
          value={stats.pendingAppointments}
          icon="time-outline"
          color="#FF9800"
        />
        <StatCard
          title="Confirmed"
          value={stats.confirmedAppointments}
          icon="checkmark-circle-outline"
          color="#4CAF50"
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelledAppointments}
          icon="close-circle-outline"
          color="#F44336"
        />
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
          />
          <QuickActionButton
            title="View Customers"
            icon="people-outline"
            onPress={handleViewCustomers}
            color="#2196F3"
          />
          <QuickActionButton
            title="View Reports"
            icon="analytics-outline"
            onPress={handleViewReports}
            color="#9C27B0"
          />
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.calendarSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={24} color="#014D40" />
          </View>
          <Text style={styles.sectionTitle}>Appointment Calendar</Text>
        </View>
        <AdminCalendar />
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
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#014D40',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  calendarSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default AdminDashboardScreen; 