import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  FlatList,
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  Dimensions,
  RefreshControl,
  Modal,
  Image,
  Animated
} from 'react-native';
import apiService from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { getLocalImageUrl } from '../../../utils/imageUrlHelper';
import KeyboardAvoidingWrapper from '../../../components/KeyboardAvoidingWrapper';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

const STATUS_COLORS = {
  confirmed: '#4CAF50',
  pending: '#FF9800',
  cancelled: '#F44336',
};

const STATUS_ICONS = {
  confirmed: 'checkmark-circle',
  pending: 'hourglass',
  cancelled: 'close-circle',
};

interface Appointment {
  id: number;
  appointment_date: string;
  service_type: string;
  notes?: string;
  status: string;
  customer_name?: string;
  customer?: string;
  customer_profile_image?: string;
}

interface AppointmentStats {
  total_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  cancelled_appointments: number;
  total_customers: number;
  recent_appointments: Appointment[];
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', icon: 'list', color: '#014D40' },
  { value: 'pending', label: 'Pending', icon: 'time', color: '#FFA000' },
  { value: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle', color: '#4CAF50' },
  { value: 'cancelled', label: 'Cancelled', icon: 'close-circle', color: '#F44336' },
];

const ManageAppointmentsScreen = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [id: number]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<{ [id: number]: boolean }>({});
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  
  // Admin settings state
  const [adminSettings, setAdminSettings] = useState({
    auto_approve_appointments: false,
    max_appointments_per_day: 5,
    business_start_time: '10:00',
    business_end_time: '19:00'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Animation for toggle switch
  const toggleAnimation = useRef(new Animated.Value(0)).current;
  
  // Animation for refresh icon
  const refreshAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData(1, true);
  }, [statusFilter, search]);

  // Update toggle animation when setting changes
  useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: adminSettings.auto_approve_appointments ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [adminSettings.auto_approve_appointments]);

  const fetchData = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMorePages(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      if (statusFilter !== 'all') params.append('filters[status]', statusFilter);
      if (search) params.append('search', search);

      const response = await apiService.get(`/admin/appointments?${params}`);
      
      if (response.success) {
        // Debug: Log pagination info
        console.log(`[ManageAppointments] Page ${page}, Received ${(response.data || []).length} appointments, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        const newAppointments = (response.data || []).map((item: any) => ({
          id: item.id,
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time,
          service_type: item.service_type,
          status: item.status,
          notes: item.notes,
          customer_name: item.customer_name || 'N/A',
          customer_email: item.customer_email || 'N/A',
          customer_profile_image: item.customer_profile_image || null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        
        if (reset) {
          setAppointments(newAppointments);
        } else {
          // Deduplicate appointments by id to prevent duplicates
          setAppointments(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const uniqueNewAppointments = newAppointments.filter(a => !existingIds.has(a.id));
            return [...prev, ...uniqueNewAppointments];
          });
        }

        setHasMorePages(response.pagination?.has_more_pages || false);
        setCurrentPage(page);
        
        // Use stats from backend
        if (reset) {
          setStats(response.stats || null);
        }
        
        // Fetch admin settings separately (only on reset)
        if (reset) {
          try {
            const settingsRes = await apiService.getAdminSettings();
            if (settingsRes && settingsRes.settings) {
              setAdminSettings(settingsRes.settings);
            }
          } catch (error) {
            console.warn('Failed to fetch admin settings:', error);
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      if (reset) {
        Alert.alert('Error', 'Failed to fetch appointments');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);
  
  const loadMore = () => {
    if (!loadingMore && hasMorePages) {
      fetchData(currentPage + 1, false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
  };

  const handleGenerateReport = async () => {
    try {
      const { Linking } = require('react-native');
      const reportUrl = `http://192.168.1.54:8000/api/admin/appointments/generate-report`;
      await Linking.openURL(reportUrl);
      Alert.alert('Success', 'Report opened in browser');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const handleToggleAutoApproval = async () => {
    setSettingsLoading(true);
    try {
      const newValue = !adminSettings.auto_approve_appointments;
      await apiService.toggleAutoApproval(newValue);
      setAdminSettings(prev => ({ ...prev, auto_approve_appointments: newValue }));
      
      if (newValue) {
        Alert.alert(
          'Auto-Approval Enabled', 
          'New appointments will be automatically approved if they meet all conditions.\n\nNote: Existing pending appointments will be processed automatically within 1 minute.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          'Auto-Approval Disabled', 
          'All new appointments will require manual approval.'
        );
      }
    } catch (error) {
      console.error('Error toggling auto-approval:', error);
      Alert.alert('Error', 'Failed to update auto-approval setting.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleStatus = async (id: number, status: 'pending' | 'confirmed' | 'cancelled') => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiService.updateAdminAppointmentStatus(id, status);
      fetchData(1, true); // Reset to page 1 and refresh
      Alert.alert('Success', `Appointment ${status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'set to pending'}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update appointment.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRemoveAppointment = async (id: number) => {
    Alert.alert(
      'Remove Appointment',
      'Are you sure you want to permanently remove this cancelled appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(prev => ({ ...prev, [id]: true }));
            try {
              await apiService.deleteAppointment(id);
              
              // Remove the appointment from local state
              setAppointments(prev => prev.filter(app => app.id !== id));
              
              // Update stats
              const newStats = await apiService.getAppointmentStats();
              setStats(newStats);
              
              Alert.alert('Success', 'Appointment removed successfully!');
            } catch (error) {
              console.error('Error removing appointment:', error);
              Alert.alert('Error', 'Failed to remove appointment');
            } finally {
              setActionLoading(prev => ({ ...prev, [id]: false }));
            }
          }
        }
      ]
    );
  };

  const handleRemoveAllCancelled = async () => {
    // This function should be updated to work with pagination
    // For now, it will refresh the data after removal
    const cancelledAppointments = appointments.filter(app => app.status === 'cancelled');
    
    if (cancelledAppointments.length === 0) {
      Alert.alert('No Cancelled Appointments', 'There are no cancelled appointments to remove.');
      return;
    }

    Alert.alert(
      'Remove All Cancelled Appointments',
      `Are you sure you want to permanently remove all ${cancelledAppointments.length} cancelled appointments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove All', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove all cancelled appointments
              const deletePromises = cancelledAppointments.map(app => 
                apiService.deleteAppointment(app.id)
              );
              
              await Promise.all(deletePromises);
              
              // Refresh data from server
              fetchData(1, true); // Reset to page 1 and refresh
              
              Alert.alert('Success', `${cancelledAppointments.length} cancelled appointments removed successfully!`);
            } catch (error) {
              console.error('Error removing cancelled appointments:', error);
              Alert.alert('Error', 'Failed to remove some appointments');
            }
          }
        }
      ]
    );
  };

  // Test image URL accessibility
  const testImageUrl = async (imageUrl: string) => {
    try {
      console.log('🧪 Testing image URL accessibility:', imageUrl);
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log('🧪 Image URL test result:', {
        url: imageUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response.ok;
    } catch (error) {
      console.log('🧪 Image URL test failed:', error);
      return false;
    }
  };

  // Enhanced image component with multiple fallback strategies
  const renderProfileImage = (imageUrl: string, appointmentId: number, isModal: boolean = false) => {
    const processedUrl = getLocalImageUrl(imageUrl);
    const imageStyle = isModal ? styles.modalCustomerProfileImage : styles.customerProfileImage;
    const fallbackStyle = isModal ? styles.modalProfileIconFallback : styles.profileIconFallback;
    const iconSize = isModal ? 18 : 24;

    // Check if image URL is valid
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('⚠️ No profile image URL provided for appointment:', appointmentId);
      return (
        <View style={fallbackStyle}>
          <Ionicons name="person-circle" size={iconSize} color="#014D40" />
        </View>
      );
    }

    return (
      <Image 
        key={`${appointmentId}-${imageRefreshKey}`}
        source={{ 
          uri: processedUrl,
          cache: 'reload'
        }} 
        style={imageStyle}
        resizeMode="cover"
        onError={(error) => {
          console.log('❌ Profile image error occurred');
          console.log('❌ Original URL:', imageUrl);
          console.log('❌ Processed URL:', processedUrl);
          console.log('❌ Error type:', typeof error);
          console.log('❌ Error details:', error);
          setImageLoadErrors(prev => ({ ...prev, [appointmentId]: true }));
        }}
        onLoad={() => {
          console.log('✅ Profile image loaded successfully');
          console.log('✅ Image URL:', processedUrl);
          // Clear any previous error for this appointment
          setImageLoadErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[appointmentId];
            return newErrors;
          });
        }}
        onLoadStart={() => {
          console.log('🔄 Starting to load profile image for appointment:', appointmentId);
          console.log('🔄 Image URL:', processedUrl);
        }}
        onLoadEnd={() => {
          console.log('🏁 Finished loading profile image for appointment:', appointmentId);
        }}
      />
    );
  };

  // Force refresh all images and data
  const refreshAllImages = () => {
    console.log('🔄 Refreshing all images and data...');
    
    // Animate the refresh icon
    refreshAnimation.setValue(0);
    Animated.timing(refreshAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    setImageLoadErrors({});
    setImageRefreshKey(prev => prev + 1);
    // Also refresh the data for complete refresh
    setRefreshing(true);
    fetchData(true);
  };

  const getStatusIcon = (status: string): any => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-circle';
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Orange
      case 'confirmed':
        return '#10B981'; // Green
      case 'cancelled':
        return '#EF4444'; // Red
      case 'completed':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };


  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Custom function to format appointment time without timezone conversion
  const formatAppointmentTime = (appointmentDate: string) => {
    try {
      console.log('Formatting appointment time:', { appointmentDate });
      
      // Handle different date formats
      let timePart = '';
      
      // Check if it's in ISO format with T separator
      if (appointmentDate.includes('T')) {
        timePart = appointmentDate.split('T')[1];
      }
      // Check if it's in format like "2025-10-31 10:00:00"
      else if (appointmentDate.includes(' ')) {
        timePart = appointmentDate.split(' ')[1];
      }
      // Check if it's a Date object or can be parsed as one
      else {
        const date = new Date(appointmentDate);
        if (!isNaN(date.getTime())) {
          // Extract time from Date object
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          timePart = `${hours}:${minutes}:00`;
        }
      }
      
      console.log('Extracted time part:', timePart);
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;
        console.log('Time formatting result:', { hours, minutes, hour, ampm, displayHour, formattedTime });
        return formattedTime;
      }
      
      console.warn('No time part found, using fallback');
      return '12:00 AM'; // fallback
    } catch (error) {
      console.error('Error formatting appointment time:', error);
      return '12:00 AM'; // fallback
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: formatAppointmentTime(dateString),
      fullDate: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  // Transform appointments into grouped structure with headers for FlatList
  const getGroupedAppointmentsData = () => {
    // First, deduplicate appointments by id
    const uniqueAppointments = appointments.filter((appointment, index, self) => 
      index === self.findIndex((a) => a.id === appointment.id)
    );
    
    // Group appointments by status
    const groupedAppointments = uniqueAppointments.reduce((groups, appointment) => {
      const status = appointment.status.toLowerCase();
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(appointment);
      return groups;
    }, {} as Record<string, Appointment[]>);

    // Sort status groups by business priority (most important first)
    const statusOrder = ['pending', 'confirmed', 'cancelled'];
    const sortedStatusGroups = Object.keys(groupedAppointments).sort((a, b) => {
      const aIndex = statusOrder.indexOf(a);
      const bIndex = statusOrder.indexOf(b);
      // If status not in order list, put it at the end
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Flatten into array with group headers and items
    const flatData: Array<{ type: 'header' | 'appointment'; status?: string; count?: number; appointment?: Appointment }> = [];
    
    sortedStatusGroups.forEach((status) => {
      const statusAppointments = groupedAppointments[status];
      if (statusAppointments.length > 0) {
        // Add header
        flatData.push({
          type: 'header',
          status: status,
          count: statusAppointments.length
        });
        // Add appointments
        statusAppointments.forEach(appointment => {
          flatData.push({
            type: 'appointment',
            appointment: appointment
          });
        });
      }
    });

    return flatData;
  };

  const renderStatusGroupHeader = (status: string, count: number) => (
    <View style={styles.statusGroupHeader}>
      <View style={[styles.statusGroupTitle, { borderLeftColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }]}>
        <Ionicons 
          name={getStatusIcon(status)} 
          size={20} 
          color={STATUS_COLORS[status as keyof typeof STATUS_COLORS]} 
        />
        <Text style={[styles.statusGroupTitleText, { color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
        </Text>
      </View>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar" size={24} color="#014D40" />
          </View>
          <Text style={styles.statValue}>{stats?.total_appointments || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="time" size={24} color="#FFA000" />
          </View>
          <Text style={styles.statValue}>{stats?.pending_appointments || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E8' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{stats?.confirmed_appointments || 0}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
          </View>
          <Text style={styles.statValue}>{stats?.cancelled_appointments || 0}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>
    </View>
  );

  const renderAppointmentCard = (appointment: Appointment) => {
    const dateInfo = formatDate(appointment.appointment_date);
    
    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            {appointment.customer_profile_image && !imageLoadErrors[appointment.id] ? (
              renderProfileImage(appointment.customer_profile_image, appointment.id, false)
            ) : (
              <View style={styles.profileIconFallback}>
                <Ionicons name="person-circle" size={24} color="#014D40" />
              </View>
            )}
            <Text style={styles.customerName}>
              {appointment.customer_name || appointment.customer || 'Unknown Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS] }]}>
            <Ionicons name={getStatusIcon(appointment.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{dateInfo.fullDate}</Text>
            <Text style={styles.timeText}>{dateInfo.time}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{appointment.service_type}</Text>
          </View>
          
          {appointment.notes && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color="#666" />
              <Text style={styles.infoText} numberOfLines={2}>{appointment.notes}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardActions}>
          {/* Only show View Details button for non-pending appointments */}
          {appointment.status !== 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewDetailsButton]}
              onPress={() => {
                setSelectedAppointment(appointment);
                setShowAppointmentModal(true);
              }}
            >
              <Ionicons name="eye" size={18} color="#014D40" />
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          )}
          
          {appointment.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                disabled={actionLoading[appointment.id]}
                onPress={() => handleStatus(appointment.id, 'confirmed')}
              >
                {actionLoading[appointment.id] ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                disabled={actionLoading[appointment.id]}
                onPress={() => handleStatus(appointment.id, 'cancelled')}
              >
                {actionLoading[appointment.id] ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close" size={18} color={Colors.text.primary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {appointment.status === 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              disabled={actionLoading[appointment.id]}
              onPress={() => handleRemoveAppointment(appointment.id)}
            >
              {actionLoading[appointment.id] ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#DC2626" />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      {/* Content */}
      {loading && appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No appointments found</Text>
          <Text style={styles.emptyStateText}>
            {search || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No appointments have been scheduled yet'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={getGroupedAppointmentsData()}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderStatusGroupHeader(item.status || '', item.count || 0);
            } else {
              return renderAppointmentCard(item.appointment!);
            }
          }}
          keyExtractor={(item, index) => {
            if (item.type === 'header') {
              return `header-${item.status}`;
            } else {
              return `appointment-${item.appointment?.id}`;
            }
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Ionicons name="calendar" size={28} color="#014D40" />
                  <Text style={styles.title} numberOfLines={1}>Manage Appointments</Text>
                  <TouchableOpacity 
                    style={styles.refreshIconButton}
                    onPress={refreshAllImages}
                  >
                    <Animated.View
                      style={{
                        transform: [{
                          rotate: refreshAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          })
                        }]
                      }}
                    >
                      <Ionicons name="refresh" size={24} color="#014D40" />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Auto-Approval Settings Card */}
              <View style={styles.autoApprovalContainer}>
                <View style={styles.autoApprovalHeader}>
                  <View style={styles.autoApprovalTitleContainer}>
                    <Ionicons name="settings" size={20} color="#014D40" />
                    <Text style={styles.autoApprovalTitle}>Auto-Approval Settings</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.autoApprovalToggleSwitch,
                      adminSettings.auto_approve_appointments && styles.autoApprovalToggleSwitchActive
                    ]}
                    onPress={handleToggleAutoApproval}
                    disabled={settingsLoading}
                    activeOpacity={0.7}
                  >
                    <Animated.View 
                      style={[
                        styles.autoApprovalToggleThumb,
                        {
                          transform: [{
                            translateX: toggleAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 20],
                            })
                          }]
                        }
                      ]} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.autoApprovalContent}>
                  <Text style={styles.autoApprovalDescription}>
                    Automatically approve appointments that meet all conditions (including existing pending ones):
                  </Text>
                  <View style={styles.autoApprovalConditionsList}>
                    <Text style={styles.autoApprovalConditions}>
                      • Within business hours ({adminSettings.business_start_time} - {adminSettings.business_end_time})
                    </Text>
                    <Text style={styles.autoApprovalConditions}>
                      • Daily limit not exceeded ({adminSettings.max_appointments_per_day} appointments/day)
                    </Text>
                    <Text style={styles.autoApprovalConditions}>
                      • First-come-first-served priority for time slots
                    </Text>
                    <Text style={styles.autoApprovalConditions}>
                      • Later appointments automatically cancelled if time slot taken
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Statistics Cards */}
              {stats && renderStatsCards()}
              
              {/* Filters and Search */}
              <View style={styles.filtersContainer}>
                {/* Search Input - Moved to top */}
                <View style={styles.searchContainer}>
                  <Ionicons 
                    name="search" 
                    size={18} 
                    color="#014D40" 
                    style={styles.searchIcon} 
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search customers, services, notes..."
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                
                <View style={styles.filtersRow}>
                  {/* Status Filter */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Status:</Text>
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity 
                        style={styles.dropdownButton}
                        onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                      >
                        <Text style={styles.dropdownButtonText}>
                          {getStatusLabel(statusFilter)}
                        </Text>
                        <Ionicons 
                          name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color="#014D40" 
                        />
                      </TouchableOpacity>
                      
                      {showStatusDropdown && (
                        <View style={styles.dropdownMenu}>
                          {STATUS_OPTIONS.map(opt => (
                            <TouchableOpacity
                              key={opt.value}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setStatusFilter(opt.value);
                                setShowStatusDropdown(false);
                              }}
                            >
                              <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                              <Text style={styles.dropdownItemText}>{opt.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.reportButton}
                    onPress={handleGenerateReport}
                  >
                    <Ionicons name="document-text" size={18} color="#014D40" />
                    <Text style={styles.reportButtonText}>Generate Report</Text>
                  </TouchableOpacity>
                  
                  {appointments.some(app => app.status === 'cancelled') && (
                    <TouchableOpacity
                      style={styles.removeAllButton}
                      onPress={handleRemoveAllCancelled}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.removeAllButtonText}>
                        Remove All Cancelled ({appointments.filter(app => app.status === 'cancelled').length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Results Count */}
              <View style={styles.resultsInfo}>
                <Text style={styles.resultsText}>
                  Showing {appointments.length} appointments
                </Text>
              </View>
            </>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadMoreText}>Loading more appointments...</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        {selectedAppointment && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity
                onPress={() => setShowAppointmentModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.orderDetailCard}>
                <View style={styles.orderDetailHeader}>
                  <Text style={styles.orderDetailTitle}>
                    {selectedAppointment.service_type} Appointment
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getAppointmentStatusColor(selectedAppointment.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getAppointmentStatusColor(selectedAppointment.status) }]}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer:</Text>
                    <View style={styles.customerDetailContainer}>
                      {selectedAppointment.customer_profile_image && !imageLoadErrors[selectedAppointment.id] ? (
                        renderProfileImage(selectedAppointment.customer_profile_image, selectedAppointment.id, true)
                      ) : (
                        <View style={styles.modalProfileIconFallback}>
                          <Ionicons name="person-circle" size={18} color="#014D40" />
                        </View>
                      )}
                      <Text style={styles.detailValue}>
                        {selectedAppointment.customer_name || selectedAppointment.customer || 'Unknown Customer'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedAppointment.appointment_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {formatAppointmentTime(selectedAppointment.appointment_date)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.service_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estimated Service Completion Time:</Text>
                    <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                      {(() => {
                        // Calculate service completion time based on service type
                        const serviceType = selectedAppointment.service_type?.toLowerCase();
                        
                        // Service duration mapping
                        const serviceDurations = {
                          'measurement': '15-20 minutes',
                          'consultation': '20-30 minutes', 
                          'fitting': '30-45 minutes',
                          'alteration': '45-60 minutes'
                        };
                        
                        // Get duration based on service type, default to fitting if not found
                        const duration = serviceDurations[serviceType as keyof typeof serviceDurations] || serviceDurations['fitting'];
                        
                        return duration;
                      })()}
                    </Text>
                  </View>
                  {selectedAppointment.notes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                    </View>
                  )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedAppointment.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => {
                      handleStatus(selectedAppointment.id, 'confirmed');
                      setShowAppointmentModal(false);
                    }}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      handleStatus(selectedAppointment.id, 'cancelled');
                      setShowAppointmentModal(false);
                    }}
                  >
                    <Ionicons name="close" size={20} color={Colors.text.primary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {selectedAppointment.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, styles.fullWidthButton]}
                  onPress={() => {
                    handleStatus(selectedAppointment.id, 'cancelled');
                    setShowAppointmentModal(false);
                  }}
                >
                  <Ionicons name="close" size={20} color={Colors.text.primary} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              
              {selectedAppointment.status === 'cancelled' && (
                <View style={styles.cancelledStatusModal}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.cancelledStatusText}>This appointment has been cancelled</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#014D40',
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'flex-start',
  },
  statCard: {
    width: '48%',
    maxWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 12,
    minHeight: 120,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    marginTop: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownContainer: {
    position: 'relative',
  },
  filterLabel: {
    fontSize: 15,
    color: '#014D40',
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#b0bec5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 150,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b0bec5',
    borderRadius: 8,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  searchContainer: {
    width: '100%',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderWidth: 1.5,
    borderColor: '#b0bec5',
    borderRadius: 8,
    fontSize: 14,
    color: '#014D40',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  resultsInfo: {
    alignItems: 'flex-start',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },

  cardsContainer: {
    padding: 20,
    gap: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  customerProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#014D40', // Green border consistent with app palette
    backgroundColor: '#f8f9fa',
    marginTop: 2, // Slight offset to align with first line of text
  },
  profileIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#014D40', // Green border consistent with app palette
    marginTop: 2, // Slight offset to align with first line of text
  },
  customerDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  modalCustomerProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#014D40', // Green border consistent with app palette
    backgroundColor: '#f8f9fa',
  },
  modalProfileIconFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#014D40', // Green border consistent with app palette
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    flex: 1,
    flexWrap: 'wrap',
    maxWidth: '80%', // Limit width to leave space for status badge
  },
  cardContent: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // View Details Button
  viewDetailsButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  viewDetailsText: {
    color: '#014D40',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles - Matching Customer Side
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  orderDetailCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginLeft: 12, // Add margin to prevent overlap
    flexShrink: 0, // Prevent badge from shrinking
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  notesValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minHeight: 48,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidthButton: {
    flex: 1,
    width: '100%',
  },
  cancelledStatusModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  cancelledStatusText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Status group header styles
  statusGroupHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statusGroupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  statusGroupTitleText: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Remove button styles
  removeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#DC2626',
    flex: 1,
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  // Remove all cancelled button styles
  removeAllContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  removeAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  removeAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Refresh icon button styles
  refreshIconButton: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Auto-Approval Settings Card Styles
  autoApprovalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  autoApprovalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  autoApprovalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  autoApprovalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#014D40',
    marginLeft: 8,
  },
  autoApprovalContent: {
    marginTop: 4,
  },
  autoApprovalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
    fontWeight: '500',
  },
  autoApprovalConditionsList: {
    marginTop: 4,
  },
  autoApprovalConditions: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  // Toggle Switch Styles
  autoApprovalToggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  autoApprovalToggleSwitchActive: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  autoApprovalToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderColor: '#014D40',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
  },
});

export default ManageAppointmentsScreen; 