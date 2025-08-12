import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import apiService from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS = {
  confirmed: '#4CAF50',
  pending: '#FFA000',
  cancelled: '#F44336',
};

// Add Appointment type for admin
interface Appointment {
  id: number;
  appointment_date: string;
  service_type: string;
  notes?: string;
  status: string;
  customer_name?: string;
  customer?: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', icon: 'search' },
  { value: 'pending', label: 'Pending', icon: 'hourglass' },
  { value: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle' },
  { value: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
];

const ManageAppointmentsScreen = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [id: number]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAllAppointments();
      setAppointments(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (id: number, status: 'confirmed' | 'cancelled') => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiService.updateAppointmentStatus(id, status);
      fetchAppointments();
      Alert.alert('Success', `Appointment ${status === 'confirmed' ? 'confirmed' : 'cancelled'}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update appointment.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'all': return '🔎';
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'cancelled': return '❌';
      default: return '';
    }
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Appointments</Text>
      
      {/* Filter/Search Row */}
      <View style={styles.filtersColumn}>
        {/* Status Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {getStatusIcon(statusFilter)} {getStatusLabel(statusFilter)}
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
                  <Text style={styles.dropdownItemText}>
                    {getStatusIcon(opt.value)} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {/* Search Input */}
        <View style={[styles.filterGroup, { marginTop: 10 }]}> 
          <View style={styles.searchContainer}>
            <Ionicons 
              name="search" 
              size={18} 
              color="#014D40" 
              style={styles.searchIcon} 
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#014D40" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.tableScroll} horizontal={true} contentContainerStyle={{ minWidth: 900 }}>
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
                <Text style={[styles.cell, { width: 140 }]}>{new Date(a.appointment_date).toLocaleDateString()} {new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.cell, { width: 120 }]}>{a.service_type}</Text>
                <Text style={[styles.cell, { width: 180 }]}>{a.notes || '-'}</Text>
                <Text style={[styles.cell, { width: 90, color: STATUS_COLORS[a.status as keyof typeof STATUS_COLORS] || '#333', fontWeight: 'bold' }]}>
                  {a.status === 'confirmed' && '✅ '}
                  {a.status === 'cancelled' && '❌ '}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#014D40', marginBottom: 18, textAlign: 'center', fontFamily: 'system-ui, sans-serif' },
  tableScroll: { flex: 1 },
  table: { backgroundColor: '#fff', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, minWidth: 900 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#014D40', borderRadius: 8, marginBottom: 6, paddingVertical: 7 },
  headerCell: { color: '#FFD700', fontWeight: 'bold', fontSize: 13, textAlign: 'center', fontFamily: 'system-ui, sans-serif' },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: '#fcfce6', marginBottom: 5, paddingVertical: 7 },
  cell: { fontSize: 12, color: '#014D40', textAlign: 'center', paddingHorizontal: 2, fontFamily: 'system-ui, sans-serif' },
  actionBtn: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, fontFamily: 'system-ui, sans-serif' },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 15,
    color: '#014D40',
    fontWeight: 'bold',
    marginRight: 6,
    fontFamily: 'system-ui, sans-serif',
  },
  filtersColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 0,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#b0bec5',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#014D40',
    fontFamily: 'system-ui, sans-serif',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b0bec5',
    borderRadius: 7,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#014D40',
    fontFamily: 'system-ui, sans-serif',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  searchInput: {
    paddingVertical: 7,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#b0bec5',
    borderRadius: 7,
    fontSize: 15,
    color: '#014D40',
    backgroundColor: '#fff',
    minWidth: 140,
    fontFamily: 'system-ui, sans-serif',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
});

export default ManageAppointmentsScreen; 