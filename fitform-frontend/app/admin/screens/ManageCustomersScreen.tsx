import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { KeyboardAvoidingWrapper } from '../../../components/KeyboardAvoidingWrapper';
// import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../../../services/api.js';


interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'customer';
  is_super_admin?: boolean;
  account_status: 'active' | 'suspended' | 'banned';
  last_activity: string;
  created_at: string;
  updated_at?: string;
  suspension_start?: string;
  suspension_end?: string;
  suspension_reason?: string;
  ban_reason?: string;
  total_orders: number;
  total_appointments: number;
  total_transactions: number;
  appointment_count?: number;
  rental_count?: number;
  purchase_count?: number;
  order_count?: number;
  profile_image?: string;
}

interface CustomerStats {
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  banned_customers: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', icon: 'list', color: '#014D40' },
  { value: 'active', label: 'Active', icon: 'checkmark-circle', color: '#4CAF50' },
  { value: 'suspended', label: 'Suspended', icon: 'pause-circle', color: '#FFA000' },
  { value: 'banned', label: 'Banned', icon: 'close-circle', color: '#F44336' },
];

const ManageCustomersScreen = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [id: number]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [categoryDetails, setCategoryDetails] = useState<{[key: string]: any}>({});
  
  // Role management state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');

  // Edit customer form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Suspend customer form state
  const [suspendForm, setSuspendForm] = useState({
    start_date: new Date(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    reason: '',
  });

  // Ban customer form state
  const [banForm, setBanForm] = useState({
    reason: '',
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await apiService.get(`/admin/customers?${params}`);
      
      console.log('API Response:', response);
      console.log('Customers from API:', response.customers);
      
      if (response.success) {
        // Ensure all customer objects have the required properties with safe defaults
        const safeCustomers = (response.customers || []).map((customer: any, index: number) => {
          console.log(`Processing customer ${index}:`, customer);
          
          const safeCustomer = {
            id: customer.id || 0,
            name: String(customer.name || 'Unknown'),
            email: String(customer.email || ''),
            phone: customer.phone ? String(customer.phone) : '',
            role: customer.role || 'customer',
            is_super_admin: Boolean(customer.is_super_admin),
            account_status: customer.account_status || 'active',
            last_activity: customer.last_activity || '',
            created_at: customer.created_at || '',
            updated_at: customer.updated_at || null,
            suspension_start: customer.suspension_start || null,
            suspension_end: customer.suspension_end || null,
            suspension_reason: customer.suspension_reason || null,
            ban_reason: customer.ban_reason || null,
            total_orders: Number(customer.total_orders || customer.order_count || 0),
            total_appointments: Number(customer.total_appointments || customer.appointment_count || 0),
            total_transactions: Number(customer.total_transactions || 0),
            appointment_count: Number(customer.appointment_count || 0),
            rental_count: Number(customer.rental_count || 0),
            purchase_count: Number(customer.purchase_count || 0),
            order_count: Number(customer.order_count || 0),
            profile_image: customer.profile_image || null,
          };
          
          console.log(`Safe customer ${index}:`, safeCustomer);
          return safeCustomer;
        });
        
        console.log('All customers from API:', safeCustomers.map(c => ({ email: c.email, role: c.role, name: c.name })));
        
        // Check specifically for bonikobonik@gmail.com
        const bonikoUser = safeCustomers.find(c => c.email === 'bonikobonik@gmail.com');
        console.log('Boniko user found:', bonikoUser);
        
        setCustomers(safeCustomers);
        
        // Use stats from backend (already excludes super admin)
        setStats(response.stats || null);
      } else {
        throw new Error(response.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      showNotification('Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };


  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fetchCategoryDetails = async (customerId: number, category: string) => {
    try {
      let endpoint = '';
      switch (category) {
        case 'orders':
          endpoint = `/admin/customers/${customerId}/orders`;
          break;
        case 'appointments':
          endpoint = `/admin/customers/${customerId}/appointments`;
          break;
        case 'rentals':
          endpoint = `/admin/customers/${customerId}/rentals`;
          break;
        case 'purchases':
          endpoint = `/admin/customers/${customerId}/purchases`;
          break;
        default:
          return;
      }

      const response = await apiService.get(endpoint);
      console.log(`API Response for ${category}:`, response);
      if (response.success) {
        setCategoryDetails(prev => ({
          ...prev,
          [`${customerId}_${category}`]: response.data || []
        }));
      }
    } catch (error) {
      console.error(`Error fetching ${category} details:`, error);
      // For now, show mock data
      setCategoryDetails(prev => ({
        ...prev,
        [`${customerId}_${category}`]: getMockCategoryData(category)
      }));
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₱0.00';
    }
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMockCategoryData = (category: string) => {
    switch (category) {
      case 'orders':
        return [
          { id: 1, order_date: '2025-10-10', status: 'completed', total_amount: 150.00, items: 2 },
          { id: 2, order_date: '2025-10-08', status: 'pending', total_amount: 75.50, items: 1 },
          { id: 3, order_date: '2025-10-05', status: 'completed', total_amount: 200.00, items: 3 },
          { id: 4, order_date: '2025-10-03', status: 'cancelled', total_amount: 120.00, items: 1 },
          { id: 5, order_date: '2025-09-28', status: 'completed', total_amount: 300.00, items: 2 },
          { id: 6, order_date: '2025-09-25', status: 'pending', total_amount: 85.00, items: 1 },
          { id: 7, order_date: '2025-09-20', status: 'completed', total_amount: 180.00, items: 4 },
          { id: 8, order_date: '2025-09-15', status: 'cancelled', total_amount: 95.00, items: 1 }
        ];
      case 'appointments':
        return [
          { id: 1, appointment_date: '2025-10-15', service_type: 'fitting', status: 'confirmed', notes: 'First fitting' },
          { id: 2, appointment_date: '2025-10-12', service_type: 'consultation', status: 'completed', notes: 'Initial consultation' },
          { id: 3, appointment_date: '2025-10-08', service_type: 'alteration', status: 'cancelled', notes: 'Customer cancelled' },
          { id: 4, appointment_date: '2025-10-05', service_type: 'fitting', status: 'completed', notes: 'Final fitting' },
          { id: 5, appointment_date: '2025-09-30', service_type: 'consultation', status: 'completed', notes: 'Style consultation' },
          { id: 6, appointment_date: '2025-09-25', service_type: 'alteration', status: 'cancelled', notes: 'No show' },
          { id: 7, appointment_date: '2025-09-20', service_type: 'fitting', status: 'completed', notes: 'Wedding dress fitting' },
          { id: 8, appointment_date: '2025-09-15', service_type: 'consultation', status: 'completed', notes: 'Bridal consultation' }
        ];
      case 'rentals':
        return [
          { id: 1, item_name: 'Evening Gown', rental_date: '2025-10-10', return_date: '2025-10-17', status: 'active', total_amount: 200.00 },
          { id: 2, item_name: 'Business Suit', rental_date: '2025-10-05', return_date: '2025-10-12', status: 'returned', total_amount: 150.00 },
          { id: 3, item_name: 'Wedding Dress', rental_date: '2025-09-28', return_date: '2025-10-05', status: 'returned', total_amount: 500.00 },
          { id: 4, item_name: 'Cocktail Dress', rental_date: '2025-09-25', return_date: '2025-10-02', status: 'overdue', total_amount: 120.00 },
          { id: 5, item_name: 'Tuxedo', rental_date: '2025-09-20', return_date: '2025-09-27', status: 'returned', total_amount: 180.00 },
          { id: 6, item_name: 'Formal Dress', rental_date: '2025-09-15', return_date: '2025-09-22', status: 'returned', total_amount: 160.00 },
          { id: 7, item_name: 'Party Dress', rental_date: '2025-09-10', return_date: '2025-09-17', status: 'returned', total_amount: 90.00 },
          { id: 8, item_name: 'Evening Suit', rental_date: '2025-09-05', return_date: '2025-09-12', status: 'returned', total_amount: 140.00 }
        ];
      case 'purchases':
        return [
          { id: 1, item_name: 'Custom Suit', purchase_date: '2025-10-10', status: 'completed', total_amount: 500.00 },
          { id: 2, item_name: 'Dress Alteration', purchase_date: '2025-10-08', status: 'in_progress', total_amount: 75.00 },
          { id: 3, item_name: 'Wedding Dress', purchase_date: '2025-10-05', status: 'completed', total_amount: 1200.00 },
          { id: 4, item_name: 'Bridal Accessories', purchase_date: '2025-10-03', status: 'pending', total_amount: 150.00 },
          { id: 5, item_name: 'Custom Tuxedo', purchase_date: '2025-09-28', status: 'completed', total_amount: 800.00 },
          { id: 6, item_name: 'Dress Fitting', purchase_date: '2025-09-25', status: 'cancelled', total_amount: 50.00 },
          { id: 7, item_name: 'Formal Wear', purchase_date: '2025-09-20', status: 'completed', total_amount: 600.00 },
          { id: 8, item_name: 'Alteration Service', purchase_date: '2025-09-15', status: 'completed', total_amount: 100.00 }
        ];
      default:
        return [];
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });
    setShowEditModal(true);
  };

  const handleSuspendCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSuspendForm({
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: '',
    });
    setShowSuspendModal(true);
  };

  const handleBanCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBanForm({ reason: '' });
    setShowBanModal(true);
  };

  const handleLiftSuspension = async (customer: Customer) => {
    try {
      setActionLoading(prev => ({ ...prev, [customer.id]: true }));

      const response = await apiService.post(`/admin/customers/${customer.id}/lift-suspension`);

      if (response.success) {
        showNotification('Suspension lifted successfully', 'success');
        await fetchData();
      } else {
        throw new Error(response.message || 'Failed to lift suspension');
      }
    } catch (error) {
      console.error('Error lifting suspension:', error);
      showNotification('Failed to lift suspension', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [customer.id]: false }));
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: true }));

      const response = await apiService.put(`/admin/customers/${selectedCustomer.id}`, editForm);

      if (response.success) {
        showNotification('Customer updated successfully', 'success');
        setShowEditModal(false);
        await fetchData();
      } else {
        throw new Error(response.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      showNotification('Failed to update customer', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: false }));
    }
  };

  const handleSuspendCustomerSubmit = async () => {
    if (!selectedCustomer) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: true }));

      const response = await apiService.post(`/admin/customers/${selectedCustomer.id}/suspend`, suspendForm);

      if (response.success) {
        showNotification('Customer suspended successfully', 'success');
        setShowSuspendModal(false);
        await fetchData();
      } else {
        throw new Error(response.message || 'Failed to suspend customer');
      }
    } catch (error) {
      console.error('Error suspending customer:', error);
      showNotification('Failed to suspend customer', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: false }));
    }
  };

  const handleBanCustomerSubmit = async () => {
    if (!selectedCustomer) return;

    Alert.alert(
      'Confirm Ban',
      'Are you sure you want to permanently ban this customer? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban Customer',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: true }));

              const response = await apiService.post(`/admin/customers/${selectedCustomer.id}/ban`, banForm);

              if (response.success) {
                showNotification('Customer banned successfully', 'success');
                setShowBanModal(false);
                await fetchData();
              } else {
                throw new Error(response.message || 'Failed to ban customer');
              }
            } catch (error) {
              console.error('Error banning customer:', error);
              showNotification('Failed to ban customer', 'error');
            } finally {
              setActionLoading(prev => ({ ...prev, [selectedCustomer.id]: false }));
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async (customer: Customer) => {
    try {
      setActionLoading(prev => ({ ...prev, [customer.id]: true }));

      // For React Native, we'll use Linking to open the PDF URL
      const { Linking } = require('react-native');
      
      // The backend now returns a PDF file directly, so we can open the URL directly
      const pdfUrl = `http://192.168.1.56:8000/api/admin/customers/${customer.id}/generate-report`;
      
      // Open the PDF in the browser
      await Linking.openURL(pdfUrl);
      showNotification('Report opened in browser', 'success');
      
    } catch (error) {
      console.error('Error generating report:', error);
      showNotification('Failed to generate report', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [customer.id]: false }));
    }
  };

  const handleRoleChange = (customer: Customer) => {
    // Check if trying to change super admin role
    if (customer.is_super_admin) {
      Alert.alert(
        'Super Admin Protection',
        'This user is a super admin and cannot have their role changed. Super admin status is permanent.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedUser(customer);
    setNewRole(customer.role === 'admin' ? 'customer' : 'admin');
    setShowRoleModal(true);
  };

  const handleRemoveAdmin = (customer: Customer) => {
    // Check if trying to remove super admin
    if (customer.email === 'admin@fitform.com') {
      Alert.alert(
        'Super Admin Protection',
        'Cannot remove admin capabilities from the super admin. Super admin status is permanent.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Admin Capabilities',
      `Are you sure you want to remove admin capabilities from ${customer.name}? They will become a regular customer.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove Admin',
          style: 'destructive',
          onPress: () => confirmRemoveAdmin(customer)
        }
      ]
    );
  };

  const confirmRemoveAdmin = async (customer: Customer) => {
    try {
      setActionLoading(prev => ({ ...prev, [customer.id]: true }));

      const response = await apiService.put(`/admin/users/${customer.id}/role`, {
        role: 'customer'
      });

      if (response.success) {
        showNotification('Admin capabilities removed successfully', 'success');
        fetchData(); // Refresh the data
      } else {
        throw new Error(response.message || 'Failed to remove admin capabilities');
      }
    } catch (error) {
      console.error('Error removing admin capabilities:', error);
      showNotification('Failed to remove admin capabilities', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [customer.id]: false }));
    }
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedUser.id]: true }));

      const response = await apiService.updateUserRole(selectedUser.id, newRole);

      if (response.success) {
        Alert.alert('Success', `User role updated to ${newRole}`);
        setShowRoleModal(false);
        await fetchData();
      } else {
        throw new Error(response.message || 'Failed to update user role');
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', error.message || 'Failed to update user role');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedUser.id]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'suspended': return '#FFA000';
      case 'banned': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'suspended': return 'pause-circle';
      case 'banned': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const validateCustomer = (customer: any): boolean => {
    return customer && 
           typeof customer === 'object' && 
           customer.id && 
           customer.name && 
           customer.email;
  };

  const filteredCustomers = customers.filter(customer => {
    // First validate the customer object
    if (!validateCustomer(customer)) {
      console.warn('Invalid customer object:', customer);
      return false;
    }
    
    const matchesStatus = statusFilter === 'all' || customer.account_status === statusFilter;
    const matchesSearch = !search || 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search);
    
    const shouldInclude = matchesStatus && matchesSearch;
    console.log(`Customer ${customer.email} (${customer.role}): status=${matchesStatus}, search=${matchesSearch}, include=${shouldInclude}`);
    
    return shouldInclude;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Notification */}
      {notification && (
        <View style={[styles.notification, notification.type === 'success' ? styles.successNotification : styles.errorNotification]}>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="people" size={28} color="#014D40" />
            <Text style={styles.title}>User Management</Text>
          </View>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={24} color="#014D40" />
                </View>
                <Text style={styles.statValue}>{stats.total_customers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E8' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.statValue}>{stats.active_customers}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="pause-circle" size={24} color="#FFA000" />
                </View>
                <Text style={styles.statValue}>{stats.suspended_customers}</Text>
                <Text style={styles.statLabel}>Suspended</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </View>
                <Text style={styles.statValue}>{stats.banned_customers}</Text>
                <Text style={styles.statLabel}>Banned</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            {/* Status Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label || 'All'}
                </Text>
                <Ionicons 
                  name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#014D40" 
                />
              </TouchableOpacity>
              
              {showStatusDropdown && (
                <View style={styles.dropdownMenu}>
                  {STATUS_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStatusFilter(option.value);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Ionicons name={option.icon as any} size={16} color={option.color} />
                      <Text style={styles.dropdownItemText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Search */}
            <View style={styles.searchItem}>
              <Text style={styles.searchLabel}>Search:</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Customer List */}
        <View style={styles.customersContainer}>
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No users found</Text>
              <Text style={styles.emptyStateText}>
                {search ? 'Try adjusting your search criteria' : 'No users match the current filters'}
              </Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => {
              try {
                return (
                  <View key={customer.id} style={styles.customerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerInfo}>
                    <View style={styles.customerAvatar}>
                      {customer.profile_image ? (
                        <Image 
                          source={{ uri: customer.profile_image }} 
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Ionicons name="person" size={24} color="#014D40" />
                      )}
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{String(customer.name || 'Unknown')}</Text>
                      <Text style={styles.customerEmail}>{String(customer.email || '')}</Text>
                      <Text style={styles.customerPhone}>{customer.phone ? String(customer.phone) : 'No phone'}</Text>
                    </View>
                  </View>
                  <View style={styles.customerStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(customer.account_status) + '20' }]}>
                      <Ionicons 
                        name={getStatusIcon(customer.account_status) as any} 
                        size={16} 
                        color={getStatusColor(customer.account_status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(customer.account_status) }]}>
                        {String(customer.account_status || 'active').charAt(0).toUpperCase() + String(customer.account_status || 'active').slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.customerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{String(customer.total_orders || 0)}</Text>
                    <Text style={styles.statItemLabel}>Orders</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{String(customer.total_appointments || 0)}</Text>
                    <Text style={styles.statItemLabel}>Appointments</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{String(customer.total_transactions || 0)}</Text>
                    <Text style={styles.statItemLabel}>Transactions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>
                      {customer.last_activity ? String(new Date(customer.last_activity).toLocaleDateString()) : 'Never'}
                    </Text>
                    <Text style={styles.statItemLabel}>Last Activity</Text>
                  </View>
                </View>

                <View style={styles.customerActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(true);
                    }}
                  >
                    <Ionicons name="eye" size={16} color="#014D40" />
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>
                  
                  {/* Role Management */}
                  
                  {customer.role === 'admin' && !customer.is_super_admin && (
                    <View style={[styles.actionButton, styles.adminBadge]}>
                      <Ionicons name="person" size={16} color="#4CAF50" />
                      <Text style={styles.actionButtonText}>Admin</Text>
                    </View>
                  )}
                  
                  {customer.is_super_admin && (
                    <View style={[styles.actionButton, styles.superAdminBadge]}>
                      <Ionicons name="shield" size={16} color="#FF6B35" />
                      <Text style={styles.actionButtonText}>Super Admin</Text>
                    </View>
                  )}
                </View>
              </View>
                );
              } catch (error) {
                console.error('Error rendering customer card:', error, customer);
                return (
                  <View key={customer.id} style={styles.customerCard}>
                    <Text style={styles.customerName}>Error loading user data</Text>
                  </View>
                );
              }
            })
          )}
        </View>
      </ScrollView>

      {/* Customer Details Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Ionicons name="close" size={24} color="#014D40" />
            </TouchableOpacity>
          </View>
          
          {selectedCustomer && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Personal Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCustomer.account_status) + '20' }]}>
                    <Ionicons 
                      name={getStatusIcon(selectedCustomer.account_status) as any} 
                      size={16} 
                      color={getStatusColor(selectedCustomer.account_status)} 
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(selectedCustomer.account_status) }]}>
                      {selectedCustomer.account_status.charAt(0).toUpperCase() + selectedCustomer.account_status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Account Management Actions */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Account Management</Text>
                <View style={styles.accountActions}>
                  {selectedCustomer.account_status === 'active' && (
                    <TouchableOpacity 
                      style={[styles.accountActionButton, styles.suspendButton]}
                      onPress={() => {
                        setShowCustomerModal(false);
                        handleSuspendCustomer(selectedCustomer);
                      }}
                    >
                      <Ionicons name="pause" size={18} color="#fff" />
                      <Text style={[styles.accountActionButtonText, { color: '#fff' }]}>Suspend Account</Text>
                    </TouchableOpacity>
                  )}

                  {selectedCustomer.account_status !== 'banned' && (
                    <TouchableOpacity 
                      style={[styles.accountActionButton, styles.banButton]}
                      onPress={() => {
                        setShowCustomerModal(false);
                        handleBanCustomer(selectedCustomer);
                      }}
                    >
                      <Ionicons name="ban" size={18} color="#fff" />
                      <Text style={[styles.accountActionButtonText, { color: '#fff' }]}>Ban Account</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Account Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account ID:</Text>
                  <Text style={styles.detailValue}>#{selectedCustomer.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedCustomer.created_at).toLocaleDateString()} at {new Date(selectedCustomer.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedCustomer.updated_at || selectedCustomer.created_at).toLocaleDateString()} at {new Date(selectedCustomer.updated_at || selectedCustomer.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Activity:</Text>
                  <Text style={styles.detailValue}>
                    {selectedCustomer.last_activity ? new Date(selectedCustomer.last_activity).toLocaleDateString() : 'Never'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Age:</Text>
                  <Text style={styles.detailValue}>
                    {Math.floor((new Date().getTime() - new Date(selectedCustomer.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                  </Text>
                </View>
                {selectedCustomer.suspension_start && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Suspension Period:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedCustomer.suspension_start).toLocaleDateString()} - {selectedCustomer.suspension_end ? new Date(selectedCustomer.suspension_end).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                )}
                {selectedCustomer.suspension_reason && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Suspension Reason:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.suspension_reason}</Text>
                  </View>
                )}
                {selectedCustomer.ban_reason && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ban Reason:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.ban_reason}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Activity Summary</Text>
                

                {/* Appointments Category */}
                <View style={styles.activityCard}>
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => {
                      const categoryKey = `appointments_${selectedCustomer.id}`;
                      toggleSection(categoryKey);
                      if (!expandedSections[categoryKey]) {
                        fetchCategoryDetails(selectedCustomer.id, 'appointments');
                      }
                    }}
                  >
                    <View style={styles.categoryInfo}>
                      <Ionicons name="calendar" size={20} color="#FFA000" />
                      <Text style={styles.categoryTitle}>Appointments</Text>
                      <Text style={styles.categoryCount}>{selectedCustomer.appointment_count || 0}</Text>
                    </View>
                    <Ionicons 
                      name={expandedSections[`appointments_${selectedCustomer.id}`] ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#FFA000" 
                    />
                  </TouchableOpacity>
                  
                  {expandedSections[`appointments_${selectedCustomer.id}`] && (
                    <View style={styles.categoryDetails}>
                      {(() => {
                        const appointments = categoryDetails[`${selectedCustomer.id}_appointments`] || [];
                        const statusCounts = appointments.reduce((acc: any, appointment: any) => {
                          acc[appointment.status] = (acc[appointment.status] || 0) + 1;
                          return acc;
                        }, {});
                        
                        return (
                          <>
                            <View style={styles.statusSummary}>
                              <Text style={styles.statusSummaryTitle}>Status Breakdown:</Text>
                              {Object.entries(statusCounts).map(([status, count]) => (
                                <Text key={status} style={styles.statusSummaryText}>
                                  {status}: {count}
                                </Text>
                              ))}
                            </View>
                            {appointments.map((appointment: any, index: number) => (
                              <View key={index} style={styles.detailItem}>
                                <Text style={styles.detailItemTitle}>Appointment #{appointment.id}</Text>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Date:</Text>
                                  <Text style={styles.detailItemValue}>{new Date(appointment.appointment_date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Service:</Text>
                                  <Text style={styles.detailItemValue}>{appointment.service_type}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Status:</Text>
                                  <Text style={[styles.detailItemValue, styles[`status_${appointment.status}`]]}>{appointment.status}</Text>
                                </View>
                                {appointment.notes && (
                                  <View style={styles.detailItemText}>
                                    <Text style={styles.detailItemLabel}>Notes:</Text>
                                    <Text style={styles.detailItemValue}>{appointment.notes}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </>
                        );
                      })()}
                    </View>
                  )}
                </View>

                {/* Rentals Category */}
                <View style={styles.activityCard}>
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => {
                      const categoryKey = `rentals_${selectedCustomer.id}`;
                      toggleSection(categoryKey);
                      if (!expandedSections[categoryKey]) {
                        fetchCategoryDetails(selectedCustomer.id, 'rentals');
                      }
                    }}
                  >
                    <View style={styles.categoryInfo}>
                      <Ionicons name="shirt" size={20} color="#4CAF50" />
                      <Text style={styles.categoryTitle}>Rentals</Text>
                      <Text style={styles.categoryCount}>{selectedCustomer.rental_count || 0}</Text>
                    </View>
                    <Ionicons 
                      name={expandedSections[`rentals_${selectedCustomer.id}`] ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#4CAF50" 
                    />
                  </TouchableOpacity>
                  
                  {expandedSections[`rentals_${selectedCustomer.id}`] && (
                    <View style={styles.categoryDetails}>
                      {(() => {
                        const rentals = categoryDetails[`${selectedCustomer.id}_rentals`] || [];
                        const statusCounts = rentals.reduce((acc: any, rental: any) => {
                          acc[rental.status] = (acc[rental.status] || 0) + 1;
                          return acc;
                        }, {});
                        
                        return (
                          <>
                            <View style={styles.statusSummary}>
                              <Text style={styles.statusSummaryTitle}>Status Breakdown:</Text>
                              {Object.entries(statusCounts).map(([status, count]) => (
                                <Text key={status} style={styles.statusSummaryText}>
                                  {status}: {count}
                                </Text>
                              ))}
                              <Text style={styles.statusSummaryTitle}>Financial Summary:</Text>
                              <Text style={styles.statusSummaryText}>
                                Total Quotation: {formatCurrency(rentals.reduce((sum, rental) => sum + parseFloat(rental.quotation_amount || 0), 0))}
                              </Text>
                              <Text style={styles.statusSummaryText}>
                                Total Penalties: {formatCurrency(rentals.reduce((sum, rental) => sum + parseFloat(rental.total_penalties || 0), 0))}
                              </Text>
                            </View>
                            {rentals.map((rental: any, index: number) => (
                              <View key={index} style={styles.detailItem}>
                                <Text style={styles.detailItemTitle}>Rental #{rental.id}</Text>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Item:</Text>
                                  <Text style={styles.detailItemValue}>{rental.item_name}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Clothing Type:</Text>
                                  <Text style={styles.detailItemValue}>{rental.clothing_type}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Rental Date:</Text>
                                  <Text style={styles.detailItemValue}>{new Date(rental.rental_date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Return Date:</Text>
                                  <Text style={styles.detailItemValue}>{rental.return_date ? new Date(rental.return_date).toLocaleDateString() : 'Not returned'}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Status:</Text>
                                  <Text style={[styles.detailItemValue, styles[`status_${rental.status}`]]}>{rental.status}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Quotation Amount:</Text>
                                  <Text style={styles.detailItemValue}>{formatCurrency(parseFloat(rental.quotation_amount || 0))}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Total Penalties:</Text>
                                  <Text style={styles.detailItemValue}>{formatCurrency(parseFloat(rental.total_penalties || 0))}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Penalty Status:</Text>
                                  <Text style={[styles.detailItemValue, styles[`penalty_${rental.penalty_status}`]]}>{rental.penalty_status}</Text>
                                </View>
                                {rental.penalty_notes && (
                                  <View style={styles.detailItemText}>
                                    <Text style={styles.detailItemLabel}>Penalty Notes:</Text>
                                    <Text style={styles.detailItemValue}>{rental.penalty_notes}</Text>
                                  </View>
                                )}
                                {rental.notes && (
                                  <View style={styles.detailItemText}>
                                    <Text style={styles.detailItemLabel}>Notes:</Text>
                                    <Text style={styles.detailItemValue}>{rental.notes}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </>
                        );
                      })()}
                    </View>
                  )}
                </View>

                {/* Purchases Category */}
                <View style={styles.activityCard}>
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => {
                      const categoryKey = `purchases_${selectedCustomer.id}`;
                      toggleSection(categoryKey);
                      if (!expandedSections[categoryKey]) {
                        fetchCategoryDetails(selectedCustomer.id, 'purchases');
                      }
                    }}
                  >
                    <View style={styles.categoryInfo}>
                      <Ionicons name="card" size={20} color="#2196F3" />
                      <Text style={styles.categoryTitle}>Purchases</Text>
                      <Text style={styles.categoryCount}>{selectedCustomer.purchase_count || 0}</Text>
                    </View>
                    <Ionicons 
                      name={expandedSections[`purchases_${selectedCustomer.id}`] ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#2196F3" 
                    />
                  </TouchableOpacity>
                  
                  {expandedSections[`purchases_${selectedCustomer.id}`] && (
                    <View style={styles.categoryDetails}>
                      {(() => {
                        const purchases = categoryDetails[`${selectedCustomer.id}_purchases`] || [];
                        const statusCounts = purchases.reduce((acc: any, purchase: any) => {
                          acc[purchase.status] = (acc[purchase.status] || 0) + 1;
                          return acc;
                        }, {});
                        
                        return (
                          <>
                            <View style={styles.statusSummary}>
                              <Text style={styles.statusSummaryTitle}>Status Breakdown:</Text>
                              {Object.entries(statusCounts).map(([status, count]) => (
                                <Text key={status} style={styles.statusSummaryText}>
                                  {status}: {count}
                                </Text>
                              ))}
                              <Text style={styles.statusSummaryTitle}>Financial Summary:</Text>
                              <Text style={styles.statusSummaryText}>
                                Total Quotation: {formatCurrency(purchases.reduce((sum, purchase) => sum + parseFloat(purchase.quotation_price || 0), 0))}
                              </Text>
                            </View>
                            {purchases.map((purchase: any, index: number) => (
                              <View key={index} style={styles.detailItem}>
                                <Text style={styles.detailItemTitle}>Purchase #{purchase.id}</Text>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Item:</Text>
                                  <Text style={styles.detailItemValue}>{purchase.item_name}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Clothing Type:</Text>
                                  <Text style={styles.detailItemValue}>{purchase.clothing_type}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Date:</Text>
                                  <Text style={styles.detailItemValue}>{new Date(purchase.purchase_date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Status:</Text>
                                  <Text style={[styles.detailItemValue, styles[`status_${purchase.status}`]]}>{purchase.status}</Text>
                                </View>
                                <View style={styles.detailItemText}>
                                  <Text style={styles.detailItemLabel}>Quotation Price:</Text>
                                  <Text style={styles.detailItemValue}>{formatCurrency(parseFloat(purchase.quotation_price || 0))}</Text>
                                </View>
                                {purchase.notes && (
                                  <View style={styles.detailItemText}>
                                    <Text style={styles.detailItemLabel}>Notes:</Text>
                                    <Text style={styles.detailItemValue}>{purchase.notes}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </>
                        );
                      })()}
                    </View>
                  )}
                </View>

                {/* Total Transactions Summary */}
                <View style={[styles.activityCard, styles.totalActivityCard]}>
                  <View style={styles.categoryInfo}>
                    <Ionicons name="analytics" size={20} color="#014D40" />
                    <Text style={styles.categoryTitle}>Total Transactions</Text>
                    <Text style={[styles.categoryCount, styles.totalCount]}>
                      {selectedCustomer.total_transactions || 0}
                    </Text>
                  </View>
                  <Text style={styles.activityDescription}>
                    Combined total of all customer activities
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.editButton]}
                  onPress={() => {
                    setShowCustomerModal(false);
                    handleEditCustomer(selectedCustomer);
                  }}
                >
                  <Ionicons name="create" size={20} color="#fff" />
                  <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>Edit User</Text>
                </TouchableOpacity>

                {selectedCustomer.role === 'customer' && (
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.roleButton]}
                    onPress={() => {
                      setShowCustomerModal(false);
                      handleRoleChange(selectedCustomer);
                    }}
                  >
                    <Ionicons name="shield" size={20} color="#fff" />
                    <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>Make Admin</Text>
                  </TouchableOpacity>
                )}

                {selectedCustomer.role === 'admin' && selectedCustomer.email !== 'admin@fitform.com' && (
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.removeAdminButton]}
                    onPress={() => {
                      setShowCustomerModal(false);
                      handleRemoveAdmin(selectedCustomer);
                    }}
                  >
                    <Ionicons name="person-remove" size={20} color="#fff" />
                    <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>Remove Admin</Text>
                  </TouchableOpacity>
                )}

                {selectedCustomer.account_status === 'suspended' && (
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.liftButton]}
                    onPress={() => {
                      setShowCustomerModal(false);
                      handleLiftSuspension(selectedCustomer);
                    }}
                    disabled={actionLoading[selectedCustomer.id]}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>
                      {actionLoading[selectedCustomer.id] ? 'Lifting...' : 'Lift Suspension'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.reportButton]}
                  onPress={() => {
                    setShowCustomerModal(false);
                    handleGenerateReport(selectedCustomer);
                  }}
                >
                  <Ionicons name="document-text" size={20} color="#014D40" />
                  <Text style={styles.modalActionButtonText}>Generate Report</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Customer</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
            >
              <Ionicons name="close" size={24} color="#014D40" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter customer name"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, actionLoading[selectedCustomer?.id || 0] && styles.submitButtonDisabled]}
              onPress={handleUpdateCustomer}
              disabled={actionLoading[selectedCustomer?.id || 0]}
            >
              <Text style={styles.submitButtonText}>
                {actionLoading[selectedCustomer?.id || 0] ? 'Updating...' : 'Update Customer'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Suspend Customer Modal */}
      <Modal
        visible={showSuspendModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Suspend Customer</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSuspendModal(false)}
            >
              <Ionicons name="close" size={24} color="#014D40" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Suspension Start Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {suspendForm.start_date.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar" size={20} color="#014D40" />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Suspension End Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {suspendForm.end_date.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar" size={20} color="#014D40" />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Reason for Suspension</Text>
              <TextInput
                style={[styles.formInput, styles.textAreaInput]}
                value={suspendForm.reason}
                onChangeText={(text) => setSuspendForm(prev => ({ ...prev, reason: text }))}
                placeholder="Enter reason for suspension"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, styles.suspendButton, actionLoading[selectedCustomer?.id || 0] && styles.submitButtonDisabled]}
              onPress={handleSuspendCustomerSubmit}
              disabled={actionLoading[selectedCustomer?.id || 0]}
            >
              <Text style={[styles.submitButtonText, { color: '#fff' }]}>
                {actionLoading[selectedCustomer?.id || 0] ? 'Suspending...' : 'Suspend Customer'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Ban Customer Modal */}
      <Modal
        visible={showBanModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ban Customer</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBanModal(false)}
            >
              <Ionicons name="close" size={24} color="#014D40" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#F44336" />
              <Text style={styles.warningText}>
                This action will permanently ban the customer. They will not be able to log in or access their account. This action cannot be undone.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Reason for Ban</Text>
              <TextInput
                style={[styles.formInput, styles.textAreaInput]}
                value={banForm.reason}
                onChangeText={(text) => setBanForm(prev => ({ ...prev, reason: text }))}
                placeholder="Enter reason for ban"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, styles.banButton, actionLoading[selectedCustomer?.id || 0] && styles.submitButtonDisabled]}
              onPress={handleBanCustomerSubmit}
              disabled={actionLoading[selectedCustomer?.id || 0]}
            >
              <Text style={[styles.submitButtonText, { color: '#fff' }]}>
                {actionLoading[selectedCustomer?.id || 0] ? 'Banning...' : 'Ban Customer'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.roleModalContainer}>
            <View style={styles.roleModalHeader}>
              <Text style={styles.roleModalTitle}>Change User Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Change role for <Text style={styles.boldText}>{selectedUser?.name}</Text> ({selectedUser?.email})
              </Text>
              
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'admin' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewRole('admin')}
                >
                  <Ionicons name="person" size={20} color={newRole === 'admin' ? 'white' : '#4CAF50'} />
                  <Text style={[
                    styles.roleOptionText,
                    newRole === 'admin' && styles.roleOptionTextSelected
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    newRole === 'customer' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewRole('customer')}
                >
                  <Ionicons name="person-outline" size={20} color={newRole === 'customer' ? 'white' : '#2196F3'} />
                  <Text style={[
                    styles.roleOptionText,
                    newRole === 'customer' && styles.roleOptionTextSelected
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.roleModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmRoleChange}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers - Temporarily disabled */}
      {/* {showStartDatePicker && (
        <DateTimePicker
          value={suspendForm.start_date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setSuspendForm(prev => ({ ...prev, start_date: selectedDate }));
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={suspendForm.end_date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setSuspendForm(prev => ({ ...prev, end_date: selectedDate }));
            }
          }}
        />
      )} */}
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    flex: 1,
    flexWrap: 'wrap',
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
    alignItems: 'flex-end', // Align to bottom to match heights
    gap: 16,
    flexWrap: 'wrap', // Allow wrapping on smaller screens
  },
  filterItem: {
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    minWidth: 140, // Ensure minimum width for dropdown
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 12, // Increased padding for better alignment
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 120,
    height: 44, // Fixed height for consistency
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  searchItem: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 12,
    height: 44, // Fixed height to match dropdown
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12, // Match dropdown padding
    fontSize: 14,
    color: '#014D40',
  },
  customersContainer: {
    padding: 20,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 2,
  },
  statItemLabel: {
    fontSize: 12,
    color: '#666',
  },
  customerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 4,
  },
  editButton: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  suspendButton: {
    backgroundColor: '#FFA000',
    borderColor: '#FFA000',
  },
  liftButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  banButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  reportButton: {
    backgroundColor: '#fff',
    borderColor: '#014D40',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#014D40',
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
  notification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 1000,
  },
  successNotification: {
    backgroundColor: '#4CAF50',
  },
  errorNotification: {
    backgroundColor: '#F44336',
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#014D40',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    flex: 1,
    padding: 24,
    paddingBottom: 100,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#014D40',
    flex: 2,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    marginBottom: 60,
    paddingHorizontal: 0,
  },
  modalActionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  accountActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  accountActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#014D40',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#014D40',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#F44336',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#014D40',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  totalTransactionsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  collapsibleContent: {
    marginTop: 12,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalActivityCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#014D40',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 8,
    flex: 1,
  },
  activityCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
  },
  totalCount: {
    fontSize: 18,
    color: '#014D40',
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 28,
    lineHeight: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 8,
    flex: 1,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
  },
  categoryDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailItemText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  detailItemValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  statusSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 8,
  },
  statusSummaryText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  status_completed: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  status_pending: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  status_cancelled: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  status_active: {
    color: '#17a2b8',
    fontWeight: 'bold',
  },
  status_returned: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  status_overdue: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  status_in_progress: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  status_confirmed: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  penalty_paid: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  penalty_pending: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  penalty_none: {
    color: '#6c757d',
    fontWeight: 'bold',
  },
  // Role Management Styles
  roleButton: {
    backgroundColor: '#4CAF50',
  },
  removeAdminButton: {
    backgroundColor: '#F44336',
  },
  adminBadge: {
    backgroundColor: '#4CAF50',
  },
  superAdminBadge: {
    backgroundColor: '#FF6B35',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  roleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  roleModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  roleOptionSelected: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roleOptionTextSelected: {
    color: 'white',
  },
  roleModalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#014D40',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageCustomersScreen;
