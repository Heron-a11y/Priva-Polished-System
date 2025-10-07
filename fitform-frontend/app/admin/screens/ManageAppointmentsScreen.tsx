import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  Dimensions,
  RefreshControl,
  Modal,
  Image
} from 'react-native';
import apiService from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

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
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [id: number]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsRes, statsRes] = await Promise.all([
        apiService.getAllAppointments(),
        apiService.getAppointmentStats()
      ]);
      
      console.log('🔍 Admin Appointments API Response:', appointmentsRes);
      console.log('🔍 First appointment data:', appointmentsRes[0]);
      if (appointmentsRes[0]) {
        console.log('🔍 Customer profile image:', appointmentsRes[0].customer_profile_image);
        console.log('🔍 Customer name:', appointmentsRes[0].customer_name);
      }
      
      setAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : appointmentsRes.data || []);
      setStats(statsRes);
      
      // Reset image load errors when fetching new data
      setImageLoadErrors({});
    } catch (e) {
      console.error('Error fetching data:', e);
      setAppointments([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStatus = async (id: number, status: 'pending' | 'confirmed' | 'cancelled') => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiService.updateAppointmentStatus(id, status);
      fetchData();
      Alert.alert('Success', `Appointment ${status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'set to pending'}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update appointment.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
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
      // Extract the time part from the appointment_date string
      const timePart = appointmentDate.split('T')[1];
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;
        return formattedTime;
      }
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

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch =
      search.trim() === '' ||
      (a.customer_name && a.customer_name.toLowerCase().includes(search.trim().toLowerCase())) ||
      (a.service_type && a.service_type.toLowerCase().includes(search.trim().toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(search.trim().toLowerCase()));
    return matchesStatus && matchesSearch;
  });

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
              <Image 
                source={{ 
                  uri: appointment.customer_profile_image.replace('https://fitform-api.ngrok.io', 'http://192.168.1.105:8000'),
                  cache: 'force-cache'
                }} 
                style={styles.customerProfileImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Customer profile image error for appointment', appointment.id, ':', error);
                  setImageLoadErrors(prev => ({ ...prev, [appointment.id]: true }));
                }}
                onLoad={() => console.log('✅ Customer profile image loaded successfully for appointment', appointment.id)}
              />
            ) : (
              <View style={styles.profileIconFallback}>
                <Ionicons name="person-circle" size={20} color="#014D40" />
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
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="calendar" size={28} color="#014D40" />
          <Text style={styles.title}>Manage Appointments</Text>
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
        
        {/* Results Count */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </Text>
        </View>
      </View>
      
      {/* Content */}
      {filteredAppointments.length === 0 ? (
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
        <View style={styles.cardsContainer}>
          {filteredAppointments.map(renderAppointmentCard)}
        </View>
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
                        <Image 
                          source={{ 
                            uri: selectedAppointment.customer_profile_image.replace('https://fitform-api.ngrok.io', 'http://192.168.1.105:8000'),
                            cache: 'force-cache'
                          }} 
                          style={styles.modalCustomerProfileImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('❌ Modal customer profile image error:', error);
                            setImageLoadErrors(prev => ({ ...prev, [selectedAppointment.id]: true }));
                          }}
                        />
                      ) : (
                        <View style={styles.modalProfileIconFallback}>
                          <Ionicons name="person-circle" size={20} color="#014D40" />
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
                    <Text style={styles.detailLabel}>Estimated Wait Time:</Text>
                    <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                      {(() => {
                        // Calculate wait time for this appointment
                        const appointmentDateStr = selectedAppointment.appointment_date;
                        const timeMatch = appointmentDateStr.match(/T(\d{2}):(\d{2}):(\d{2})/);
                        
                        if (timeMatch) {
                          const hours = parseInt(timeMatch[1], 10);
                          const waitTimeHours = hours - 10; // Hours after 10 AM
                          const validWaitTime = Math.max(0, Math.min(waitTimeHours, 6));
                          
                          return validWaitTime === 0 ? 'No wait time (First appointment)' : `${validWaitTime} hours`;
                        }
                        return 'Unable to calculate';
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
    </ScrollView>
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
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerProfileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#014D40',
    backgroundColor: '#f0f0f0',
  },
  profileIconFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#014D40',
  },
  customerDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCustomerProfileImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#014D40',
    backgroundColor: '#f0f0f0',
  },
  modalProfileIconFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#014D40',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
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
});

export default ManageAppointmentsScreen; 