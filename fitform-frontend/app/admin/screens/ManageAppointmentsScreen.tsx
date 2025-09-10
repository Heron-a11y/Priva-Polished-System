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
  Modal
} from 'react-native';
import apiService from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

const STATUS_COLORS = {
  confirmed: '#4CAF50',
  pending: '#FFA000',
  cancelled: '#F44336',
};

const STATUS_ICONS = {
  confirmed: 'checkmark-circle',
  pending: 'time',
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsRes, statsRes] = await Promise.all([
        apiService.getAllAppointments(),
        apiService.getAppointmentStats()
      ]);
      
      setAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : appointmentsRes.data || []);
      setStats(statsRes);
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

  const handleStatus = async (id: number, status: 'confirmed' | 'cancelled') => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiService.updateAppointmentStatus(id, status);
      fetchData();
      Alert.alert('Success', `Appointment ${status === 'confirmed' ? 'confirmed' : 'cancelled'}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update appointment.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-circle';
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            <Ionicons name="person-circle" size={20} color="#014D40" />
            <Text style={styles.customerName}>
              {appointment.customer_name || appointment.customer || 'Unknown Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS] }]}>
            <Ionicons name={getStatusIcon(appointment.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{appointment.status}</Text>
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
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderTableView = () => (
    <ScrollView 
      style={styles.tableScroll} 
      horizontal={true} 
      contentContainerStyle={{ minWidth: isTablet ? 900 : 700 }}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { width: 50 }]}>ID</Text>
          <Text style={[styles.headerCell, { width: 120 }]}>Customer</Text>
          <Text style={[styles.headerCell, { width: 140 }]}>Date</Text>
          <Text style={[styles.headerCell, { width: 120 }]}>Service</Text>
          <Text style={[styles.headerCell, { width: 180 }]}>Notes</Text>
          <Text style={[styles.headerCell, { width: 90 }]}>Status</Text>
          <Text style={[styles.headerCell, { width: 120 }]}>Actions</Text>
        </View>
        {filteredAppointments.map((a) => (
          <View key={a.id} style={styles.tableRow}>
            <Text style={[styles.cell, { width: 50 }]}>{a.id}</Text>
            <Text style={[styles.cell, { width: 120 }]}>{a.customer_name || a.customer || '-'}</Text>
            <Text style={[styles.cell, { width: 140 }]}>
              {formatDate(a.appointment_date).date} {formatDate(a.appointment_date).time}
            </Text>
            <Text style={[styles.cell, { width: 120 }]}>{a.service_type}</Text>
            <Text style={[styles.cell, { width: 180 }]}>{a.notes || '-'}</Text>
            <Text style={[styles.cell, { width: 90, color: STATUS_COLORS[a.status as keyof typeof STATUS_COLORS] || '#333', fontWeight: 'bold' }]}>
              {a.status}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 120 }}>
              {a.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                    disabled={actionLoading[a.id]}
                    onPress={() => handleStatus(a.id, 'confirmed')}
                  >
                    <Text style={styles.actionBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F44336', marginLeft: 6 }]}
                    disabled={actionLoading[a.id]}
                    onPress={() => handleStatus(a.id, 'cancelled')}
                  >
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

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
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'cards' && styles.toggleButtonActive]}
            onPress={() => setViewMode('cards')}
          >
            <Ionicons name="grid" size={20} color={viewMode === 'cards' ? '#fff' : '#014D40'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'table' && styles.toggleButtonActive]}
            onPress={() => setViewMode('table')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'table' ? '#fff' : '#014D40'} />
          </TouchableOpacity>
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
      ) : viewMode === 'cards' ? (
        <View style={styles.cardsContainer}>
          {filteredAppointments.map(renderAppointmentCard)}
        </View>
      ) : (
        renderTableView()
      )}
      
      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#014D40" />
                    <Text style={styles.modalTitle}>Appointment Details</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowAppointmentModal(false)}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.customer_name || selectedAppointment.customer || 'Unknown Customer'}
                    </Text>
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
                      {new Date(selectedAppointment.appointment_date).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.service_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: STATUS_COLORS[selectedAppointment.status as keyof typeof STATUS_COLORS] }
                      ]} />
                      <Text style={styles.detailValue}>
                        {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {selectedAppointment.notes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                {selectedAppointment.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.confirmButton]}
                      onPress={() => {
                        handleStatus(selectedAppointment.id, 'confirmed');
                        setShowAppointmentModal(false);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.cancelButton]}
                      onPress={() => {
                        handleStatus(selectedAppointment.id, 'cancelled');
                        setShowAppointmentModal(false);
                      }}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#014D40',
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
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  // Table styles (existing)
  tableScroll: { 
    flex: 1,
    marginHorizontal: 20,
  },
  table: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 4, 
    elevation: 1, 
    minWidth: isTablet ? 900 : 700 
  },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#014D40', 
    borderRadius: 8, 
    marginBottom: 6, 
    paddingVertical: 7 
  },
  headerCell: { 
    color: '#FFD700', 
    fontWeight: 'bold', 
    fontSize: 13, 
    textAlign: 'center' 
  },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 8, 
    backgroundColor: '#fcfce6', 
    marginBottom: 5, 
    paddingVertical: 7 
  },
  cell: { 
    fontSize: 12, 
    color: '#014D40', 
    textAlign: 'center', 
    paddingHorizontal: 2 
  },
  actionBtn: { 
    borderRadius: 6, 
    paddingVertical: 4, 
    paddingHorizontal: 10, 
    minWidth: 60, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  actionBtnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12 
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
  },
  closeButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalBody: {
    padding: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    width: 100,
    marginTop: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageAppointmentsScreen; 