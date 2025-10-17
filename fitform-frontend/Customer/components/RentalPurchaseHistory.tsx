import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
// Removed static CLOTHING_TYPES import - now using dynamic catalog
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { useCatalogData } from '../../hooks/useCatalogData';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

interface RentalOrder {
  id: number;
  user_id: number;
  item_name: string;
  rental_date: string;
  return_date: string;
  status: string;
  clothing_type: string;
  measurements: {
    bust: number;
    waist: number;
    hips: number;
    shoulder_width: number;
    arm_length: number;
    inseam: number;
  };
  notes: string;
  customer_name: string;
  customer_email: string;
  quotation_amount: number | null;
  quotation_notes: string | null;
  quotation_status: string;
  quotation_sent_at: string | null;
  quotation_responded_at: string | null;
  created_at: string;
  updated_at: string;
  penalty_breakdown?: {
    delay_days: number;
    delay_fee: number;
  };
  total_penalties: number;
  penalty_status: string;
}

interface PurchaseOrder {
  id: number;
  status: string;
  quotation_status?: string;
  quotation_amount?: number;
  quotation_notes?: string;
  quotation_price?: number;
  customer_email?: string;
  purchase_date?: string;
  item_name?: string;
  clothing_type?: string;
  measurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    shoulder_width?: number;
    arm_length?: number;
    inseam?: number;
    [key: string]: number | undefined;
  };
  design?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface HistoryItem {
  id: number;
  type: 'rental' | 'purchase';
  item_name: string;
  status: string;
  date: string;
  amount: number | null | undefined;
  clothing_type: string;
  notes?: string;
  penalty_status?: string;
  total_penalties?: number;
}

interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  placeholder: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onSelect, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          isOpen && styles.dropdownButtonActive
        ]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dropdownButtonText,
          { color: selectedOption ? '#11181C' : '#9CA3AF' }
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 20}
          color={isOpen ? '#014D40' : '#6B7280'}
        />
      </TouchableOpacity>

      {isOpen && (
        <>
            <View style={[
              styles.dropdownMenu,
              isMobile && { 
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 99999999,
              }
            ]}>
            <ScrollView 
              style={styles.dropdownScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              bounces={true}
              indicatorStyle="black"
              alwaysBounceVertical={true}
              contentContainerStyle={{ paddingBottom: 8 }}
              removeClippedSubviews={false}
            >
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    option.value === value && styles.dropdownItemActive,
                    index === 0 && styles.dropdownItemFirst,
                    index === options.length - 1 && styles.dropdownItemLast
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    option.value === value && styles.dropdownItemTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Ionicons name="checkmark" size={isSmallMobile ? 12 : isMediumMobile ? 13 : isMediumMobile ? 14 : 16} color="#014D40" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={() => setIsOpen(false)}
            activeOpacity={1}
          />
        </>
      )}
    </View>
  );
};

export default function RentalPurchaseHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [originalRentals, setOriginalRentals] = useState<RentalOrder[]>([]);
  const [originalPurchases, setOriginalPurchases] = useState<PurchaseOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { catalogItems, getItemById, refreshCatalog } = useCatalogData();

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'completed', label: 'Completed' },
    { value: 'declined', label: 'Declined' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'rental', label: 'Rentals' },
    { value: 'purchase', label: 'Purchases' }
  ];

  useEffect(() => {
    if (user) {
      fetchHistory();
      // Refresh catalog data to ensure we have the latest items
      refreshCatalog();
    }
  }, [user, refreshCatalog]);

  useEffect(() => {
    filterHistory();
  }, [searchQuery, statusFilter, typeFilter, originalRentals, originalPurchases]);

  const fetchHistory = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Fetch unified rental and purchase history
      const historyRes = await apiService.getRentalPurchaseHistory();

      // Backend returns {data: [...]}, so we need to extract the data property
      const allHistory = Array.isArray(historyRes?.data) ? historyRes.data : [];

      // Separate rentals and purchases for filtering
      const rentals = allHistory.filter(item => item.order_type === 'rental');
      const purchases = allHistory.filter(item => item.order_type === 'purchase');

      setOriginalRentals(rentals);
      setOriginalPurchases(purchases);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch history data');
      setHistory([]); // Clear history on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchHistory(true);
  };

  const filterHistory = () => {
    let filteredRentals = originalRentals.map(rental => {
      return {
        id: rental.id,
        type: 'rental' as const,
        item_name: rental.item_name,
        status: rental.status,
        date: rental.created_at || rental.rental_date,
        amount: rental.quotation_amount ? Number(rental.quotation_amount) : 0,
        clothing_type: rental.clothing_type,
        notes: rental.notes,
        penalty_status: rental.penalty_status,
        total_penalties: rental.total_penalties
      };
    });

    let filteredPurchases = originalPurchases.map(purchase => {
      return {
        id: purchase.id,
        type: 'purchase' as const,
        item_name: purchase.item_name || 'Custom Garment',
        status: purchase.status,
        date: purchase.created_at || purchase.purchase_date || new Date().toISOString(),
        amount: (purchase.quotation_amount || purchase.quotation_price) ? Number(purchase.quotation_amount || purchase.quotation_price) : 0,
        clothing_type: purchase.clothing_type || 'Custom',
        notes: purchase.notes
      };
    });

    // Apply type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'rental') {
        filteredPurchases = [];
      } else {
        filteredRentals = [];
      }
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredRentals = filteredRentals.filter(item => item.status === statusFilter);
      filteredPurchases = filteredPurchases.filter(item => item.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredRentals = filteredRentals.filter(item =>
        item.item_name.toLowerCase().includes(query) ||
        item.clothing_type.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query))
      );
      filteredPurchases = filteredPurchases.filter(item =>
        item.item_name.toLowerCase().includes(query) ||
        item.clothing_type.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query))
      );
    }

    // Combine and sort by date (newest first)
    const combined = [...filteredRentals, ...filteredPurchases].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setHistory(combined);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'quotation_sent': return '#3b82f6';
      case 'counter_offer_pending': return '#ff9800';
      case 'in_progress': return '#014D40';
      case 'ready_for_pickup': return '#10b981';
      case 'picked_up': return '#059669';
      case 'returned': return '#0d9488';
      case 'declined': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return 'N/A';
    
    // Debug log to see what we're getting
    console.log('Formatting date:', dateString, 'Type:', typeof dateString);
    
    // Try to parse the date string
    let date = new Date(dateString);
    
    // If the first attempt fails, try parsing with different formats
    if (isNaN(date.getTime())) {
      // Try parsing as ISO string with timezone
      date = new Date(dateString.replace(' ', 'T'));
    }
    
    // If still invalid, try parsing as timestamp
    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateString);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }
    
    // Check if the date is valid after all attempts
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Date not available';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    // Ensure amount is a number
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';
    return `₱${numAmount.toLocaleString()}`;
  };

  const handleDeleteItem = (item: HistoryItem) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete this ${item.type} order? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to delete order:', item);
              console.log('Order type:', item.type, 'Order ID:', item.id);
              
              console.log('Calling deleteRentalPurchaseHistory API...');
              await apiService.deleteRentalPurchaseHistory(item.id);
              
              console.log('Delete successful, refreshing history...');
              // Refresh the history after deletion
              await fetchHistory();
              Alert.alert('Success', 'Order deleted successfully');
            } catch (error) {
              console.error('Error deleting order:', error);
              console.error('Error details:', error.message);
              Alert.alert('Error', `Failed to delete order: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // Transaction action handlers
  const handleCancelTransaction = async (item: HistoryItem) => {
    Alert.alert(
      'Cancel Transaction',
      `Are you sure you want to cancel this ${item.type}? This action cannot be undone.`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (item.type === 'rental') {
                await apiService.cancelRentalOrder(item.id);
              } else {
                await apiService.cancelPurchaseOrder(item.id);
              }
              Alert.alert('Success', `${item.type === 'rental' ? 'Rental' : 'Purchase'} has been cancelled successfully.`);
              fetchHistory(); // Refresh the history list
            } catch (error: any) {
              console.error('Error cancelling transaction:', error);
              Alert.alert('Error', `Failed to cancel ${item.type}: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditTransaction = (item: HistoryItem) => {
    Alert.alert(
      'Edit Transaction',
      `This will allow you to modify your ${item.type} details. Do you want to continue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => {
            // Navigate to the appropriate order flow for editing
            // This would typically involve setting up the form with existing data
            Alert.alert('Edit Feature', 'Edit functionality will be implemented based on your specific requirements.');
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        setSelectedItem(item);
        setShowDetails(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTypeContainer}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: item.type === 'rental' ? '#014D40' : '#FFD700' }
          ]}>
            <Ionicons 
              name={item.type === 'rental' ? 'shirt' : 'bag'} 
              size={16} 
              color="#fff" 
            />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.item_name}
            </Text>
            <Text style={styles.itemType}>
              {item.type === 'rental' ? 'Rental' : 'Purchase'}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="shirt-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.clothing_type}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount:</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            <View style={styles.transactionActions}>
              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item);
                }}
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {item.penalty_status && item.penalty_status !== 'none' && (
        <View style={styles.penaltyContainer}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={styles.penaltyText}>
            Penalty: {formatCurrency(item.total_penalties || 0)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailsModal = () => {
    if (!selectedItem) return null;

    const originalItem = selectedItem.type === 'rental' 
      ? originalRentals.find(r => r.id === selectedItem.id)
      : originalPurchases.find(p => p.id === selectedItem.id);

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailCard}>
              {/* Item Image */}
              <View style={styles.itemImageContainer}>
                <View style={[styles.itemImagePlaceholder, { backgroundColor: '#6B7280' }]}>
                  <Ionicons name="shirt-outline" size={48} color="#fff" />
                </View>
              </View>
              
              <View style={styles.orderDetailHeader}>
                <Text style={styles.orderDetailTitle}>{selectedItem.item_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedItem.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedItem.status) }]}>
                    {getStatusText(selectedItem.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.orderDetailItem}>
                <Text style={styles.orderDetailLabel}>Order ID:</Text>
                <Text style={styles.orderDetailValue}>#{selectedItem.id}</Text>
              </View>

              <View style={styles.orderDetailItem}>
                <Text style={styles.orderDetailLabel}>Order Type:</Text>
                <Text style={styles.orderDetailValue}>
                  {selectedItem.type === 'rental' ? 'Rental' : 'Purchase'}
                </Text>
              </View>

              <View style={styles.orderDetailItem}>
                <Text style={styles.orderDetailLabel}>Clothing Type:</Text>
                <Text style={styles.orderDetailValue}>{selectedItem.clothing_type}</Text>
              </View>

              <View style={styles.orderDetailItem}>
                <Text style={styles.orderDetailLabel}>Transaction Date:</Text>
                <Text style={styles.orderDetailValue}>{formatDate(selectedItem.date)}</Text>
              </View>

              <View style={styles.orderDetailItem}>
                <Text style={styles.orderDetailLabel}>Amount:</Text>
                <Text style={styles.orderDetailValue}>{formatCurrency(selectedItem.amount)}</Text>
              </View>

              {selectedItem.notes && (
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Notes:</Text>
                  <Text style={[styles.orderDetailValue, styles.notesValue]}>
                    {selectedItem.notes}
                  </Text>
                </View>
              )}

              {selectedItem.penalty_status && selectedItem.penalty_status !== 'none' && (
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Penalty Status:</Text>
                  <Text style={styles.orderDetailValue}>
                    {selectedItem.penalty_status.toUpperCase()} - Total: {formatCurrency(selectedItem.total_penalties || 0)}
                  </Text>
                </View>
              )}

              {/* Measurement Details */}
              {originalItem && 'measurements' in originalItem && originalItem.measurements && (
                <>
                  <View style={styles.measurementsSpacer} />
                  <View style={styles.measurementsTitleContainer}>
                    <Text style={styles.measurementsTitle}>Measurements</Text>
                  </View>
                  {Object.entries(originalItem.measurements)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '' && key !== 'thigh')
                    .length > 0 ? (
                      Object.entries(originalItem.measurements)
                        .filter(([key, value]) => value !== null && value !== undefined && value !== '' && key !== 'thigh')
                        .map(([key, value]) => (
                          <View key={key} style={styles.orderDetailItem}>
                            <Text style={styles.orderDetailLabel}>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                            </Text>
                            <Text style={styles.orderDetailValue}>
                              {value} cm
                            </Text>
                          </View>
                        ))
                    ) : (
                      <View style={styles.orderDetailItem}>
                        <Text style={styles.orderDetailLabel}>No measurements available</Text>
                        <Text style={styles.orderDetailValue}>-</Text>
                      </View>
                    )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading your history...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingWrapper style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
      bounces={true}
      overScrollMode="never"
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <Ionicons name="time" size={24} color="#014D40" />
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.title}>Rental & Purchase History</Text>
                <Text style={styles.subtitle}>
                  View all your past orders and rentals
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              loading && styles.refreshButtonDisabled
            ]}
            onPress={() => fetchHistory()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={loading ? "sync" : "refresh"} 
              size={20} 
              color={loading ? '#a3a3a3' : '#014D40'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Section */}
      {history.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="list" size={24} color="#014D40" />
              </View>
              <Text style={styles.summaryValue}>{history.length}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="shirt" size={24} color="#014D40" />
              </View>
              <Text style={styles.summaryValue}>
                {history.filter(item => item.type === 'rental').length}
              </Text>
              <Text style={styles.summaryLabel}>Rentals</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="bag" size={24} color="#014D40" />
              </View>
              <Text style={styles.summaryValue}>
                {history.filter(item => item.type === 'purchase').length}
              </Text>
              <Text style={styles.summaryLabel}>Purchases</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="wallet" size={24} color="#014D40" />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  history.reduce((total, item) => {
                    const amount = typeof item.amount === 'string' ? Number(item.amount) : (item.amount || 0);
                    return total + amount;
                  }, 0)
                )}
              </Text>
              <Text style={styles.summaryLabel}>Total Spent</Text>
            </View>
          </View>
        </View>
      )}

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.filterRow}>
          <Dropdown
            label="Type"
            value={typeFilter}
            options={typeOptions}
            onSelect={setTypeFilter}
            placeholder="Select type"
          />
          <Dropdown
            label="Status"
            value={statusFilter}
            options={statusOptions}
            onSelect={setStatusFilter}
            placeholder="Select status"
          />
        </View>
        

      </View>

      {/* History List */}
      <View style={styles.historyContainer}>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No History Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'You haven\'t made any orders or rentals yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.historyListContainer}>
            {history.map((item) => (
              <View key={`${item.type}-${item.id}`}>
                {renderHistoryItem({ item })}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Details Modal */}
      {renderDetailsModal()}
    </ScrollView>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
  },
  titleIcon: {
    width: isSmallMobile ? 40 : isMediumMobile ? 44 : isLargeMobile ? 48 : 56,
    height: isSmallMobile ? 40 : isMediumMobile ? 44 : isLargeMobile ? 48 : 56,
    borderRadius: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 28,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#014D40',
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: isSmallMobile ? 6 : 8,
  },
  subtitle: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#6B7280',
    lineHeight: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 24,
  },
  refreshButton: {
    padding: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    backgroundColor: '#F3F4F6',
    marginLeft: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  filtersContainer: {
    padding: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
    zIndex: 9999999,
    marginBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    paddingVertical: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 16,
    marginBottom: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 16,
    position: 'relative',
    zIndex: 99999999,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 99999999,
  },
  dropdownLabel: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: isSmallMobile ? 4 : isMediumMobile ? 5 : isLargeMobile ? 6 : 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 9 : isLargeMobile ? 10 : 12,
    paddingHorizontal: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: isSmallMobile ? 40 : isMediumMobile ? 42 : isLargeMobile ? 44 : 48,
  },
  dropdownButtonActive: {
    borderColor: '#014D40',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    shadowColor: '#014D40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: isSmallMobile ? 13 : isMediumMobile ? 14 : isLargeMobile ? 15 : 16,
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    borderWidth: isSmallMobile ? 1 : isMediumMobile ? 1 : isLargeMobile ? 2 : 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: isSmallMobile ? 2 : isMediumMobile ? 3 : isLargeMobile ? 4 : 8 },
    shadowOpacity: isSmallMobile ? 0.2 : isMediumMobile ? 0.25 : isLargeMobile ? 0.3 : 0.4,
    shadowRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 20,
    elevation: isSmallMobile ? 15 : isMediumMobile ? 18 : isLargeMobile ? 20 : 30,
    zIndex: 99999999,
    marginTop: 4,
    maxHeight: isSmallMobile ? 320 : isMediumMobile ? 340 : isLargeMobile ? 360 : 400,
    width: '100%',
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: isSmallMobile ? 320 : isMediumMobile ? 340 : isLargeMobile ? 360 : 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 16,
    paddingVertical: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    height: isSmallMobile ? 36 : isMediumMobile ? 40 : isLargeMobile ? 44 : 48,
    backgroundColor: '#fff',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemFirst: {
    borderTopLeftRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    borderTopRightRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
  },
  dropdownItemLast: {
    borderBottomLeftRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    borderBottomRightRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: isSmallMobile ? 13 : isMediumMobile ? 14 : isLargeMobile ? 15 : 16,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#014D40',
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 99999998,
  },
  historyContainer: {
    backgroundColor: '#F9FAFB',
    minHeight: 200,
    position: 'relative',
    zIndex: 1,
  },
  historyListContainer: {
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
  },
  summaryContainer: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCard: {
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
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 20,
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  itemTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  itemDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  penaltyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  penaltyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
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
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  orderDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    flexWrap: 'wrap',
  },
  orderDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
    marginRight: 8,
  },
  orderDetailValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  notesValue: {
    textAlign: 'left',
    fontStyle: 'italic',
  },
  penaltyStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  penaltyAmount: {
    fontSize: 16,
    color: '#6B7280',
  },
  measurementsSection: {
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  measurementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  measurementsGrid: {
    flexDirection: 'column',
  },
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
  },
  measurementLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  measurementValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  measurementsSpacer: {
    height: 20,
  },
  measurementsTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

  // Transaction Action Buttons
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 4,
  },
  // Item Image Styles
  itemImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImageIcon: {
    fontSize: 48,
    opacity: 0.8,
  },
});
