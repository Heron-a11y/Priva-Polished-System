import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Dimensions, ScrollView, Modal } from 'react-native';
import apiService from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface Order {
  id: number;
  type: string;
  customer: string;
  status: string;
  details: string;
  quotation_amount?: number;
  quotation_price?: number;
  quotation_notes?: string;
  quotation_schedule?: string;
  penalty_status?: 'paid' | 'pending'; // Added for penalty status
}

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  // Add state for quotation form
  const [quotationAmount, setQuotationAmount] = useState('');
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationLoading, setQuotationLoading] = useState(false);
  // Add state for quotation error
  const [quotationError, setQuotationError] = useState('');
  // Add state for quotation schedule
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quotationSchedule, setQuotationSchedule] = useState('');
  const [quotationScheduleDate, setQuotationScheduleDate] = useState<Date | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  // Add penalty management state
  const [penaltyDamageLevel, setPenaltyDamageLevel] = useState<'none' | 'minor' | 'major' | 'severe'>('none');
  const [penaltyNotes, setPenaltyNotes] = useState('');
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const isMobile = SCREEN_WIDTH < 600;
  const isIOS = Platform.OS === 'ios';
  
  // FlatList render function for mobile table
  const renderFlatListItem = ({ item }: { item: Order }) => {
    return (
      <View style={styles.orderRowClassic2}>
        <View style={[styles.dataCell, { width: 60 }]}><Text style={styles.orderCellClassic2}>{item.id}</Text></View>
        <View style={[styles.dataCell, { width: 80 }]}><Text style={styles.orderCellClassic2}>{item.type}</Text></View>
        <View style={[styles.dataCell, { width: 120 }]}><Text style={styles.orderCellClassic2}>{item.customer}</Text></View>
        <View style={[styles.dataCell, { width: 100 }]}><Text style={styles.orderCellClassic2}>{item.status}</Text></View>
        <View style={[styles.dataCell, { width: 80 }]}>
          <TouchableOpacity style={styles.actionButtonClassic2} onPress={() => handleViewDetails(item)}>
            <Text style={styles.actionButtonTextClassic2}>View</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.dataCell, { width: 100 }]}>
          {item.type === 'Rental' ? (
            <Text style={[
              styles.orderCellClassic2,
              { 
                color: item.penalty_status === 'paid' ? '#388e3c' : 
                       item.penalty_status === 'pending' ? '#ff9800' : '#666'
              }
            ]}>
              {item.penalty_status === 'paid' ? '✅ Paid' : 
               item.penalty_status === 'pending' ? '⚠️ Pending' : '—'}
            </Text>
          ) : (
            <Text style={[styles.orderCellClassic2, { color: '#ccc' }]}>—</Text>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const rentalsRes = await apiService.request('/rentals');
        const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
        const rentals = (rentalsArr || []).map((r: any) => ({
          id: r.id,
          type: 'Rental',
          customer: r.customer_name || r.customer_email || 'N/A',
          status: r.status || 'N/A',
          details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
          quotation_amount: r.quotation_amount,
          quotation_notes: r.quotation_notes,
          quotation_schedule: r.quotation_schedule,
          penalty_status: r.penalty_status,
        }));
        const purchasesRes = await apiService.request('/purchases');
        const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
        const purchases = (purchasesArr || []).map((p: any) => ({
          id: p.id,
          type: 'Purchase',
          customer: p.customer_name || p.customer_email || 'N/A',
          status: p.status || 'N/A',
          details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
          quotation_price: p.quotation_price,
          quotation_notes: p.quotation_notes,
          quotation_schedule: p.quotation_schedule,
        }));
        setOrders([...rentals, ...purchases]);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setQuotationError(''); // Clear any previous errors
  };

  const clearQuotationForm = () => {
    setQuotationAmount('');
    setQuotationNotes('');
    setQuotationSchedule('');
    setQuotationScheduleDate(null);
    setQuotationError('');
    setShowDatePicker(false);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
    clearQuotationForm();
  };

  // Action handlers
  const handleOrderAction = async (action: 'approve' | 'decline' | 'cancel') => {
    if (!selectedOrder) return;
    const endpoint =
      selectedOrder.type === 'Rental'
        ? `/rentals/${selectedOrder.id}/${action}`
        : `/purchases/${selectedOrder.id}/${action}`;
    try {
      await apiService.request(endpoint, { method: 'POST' });
      Alert.alert('Success', `Order ${action}d!`);
      handleCloseDetails();
      // Refresh orders
      setLoading(true);
      const rentalsRes = await apiService.request('/rentals');
      const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
      const rentals = (rentalsArr || []).map((r: any) => ({
        id: r.id,
        type: 'Rental',
        customer: r.customer_name || r.customer_email || 'N/A',
        status: r.status || 'N/A',
        details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
        quotation_amount: r.quotation_amount,
        quotation_notes: r.quotation_notes,
        quotation_schedule: r.quotation_schedule,
        penalty_status: r.penalty_status,
      }));
      const purchasesRes = await apiService.request('/purchases');
      const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
      const purchases = (purchasesArr || []).map((p: any) => ({
        id: p.id,
        type: 'Purchase',
        customer: p.customer_name || p.customer_email || 'N/A',
        status: p.status || 'N/A',
        details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
        quotation_price: p.quotation_price,
        quotation_notes: p.quotation_notes,
        quotation_schedule: p.quotation_schedule,
      }));
      setOrders([...rentals, ...purchases]);
    } catch (err) {
      Alert.alert('Error', `Failed to ${action} order.`);
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  const filteredOrders = orders.filter(order => {
    const matchesType = typeFilter === 'All' || order.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const matchesSearch =
      search.trim() === '' ||
      order.customer.toLowerCase().includes(search.trim().toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Unique status options
  const statusOptions = Array.from(new Set(orders.map(o => o.status)));

  const handleSendQuotation = async () => {
    if (!quotationAmount || isNaN(Number(quotationAmount))) {
      setQuotationError('Please enter a valid number for the quotation price.');
      return;
    }
    // Only require schedule for purchase orders, not rental orders
    if (selectedOrder?.type === 'Purchase' && !quotationSchedule) {
      setQuotationError('Please select a schedule date.');
      return;
    }
    setQuotationLoading(true);
    try {
      const endpoint = selectedOrder?.type === 'Rental'
        ? `/rentals/${selectedOrder?.id}/set-quotation`
        : `/purchases/${selectedOrder?.id}/set-quotation`;
      const payload = selectedOrder?.type === 'Rental'
        ? {
            quotation_amount: Number(quotationAmount),
            quotation_notes: quotationNotes,
          }
        : {
            quotation_price: Number(quotationAmount),
            quotation_notes: quotationNotes,
            quotation_schedule: quotationScheduleDate ? quotationScheduleDate.toISOString().split('T')[0] : quotationSchedule,
          };
      await apiService.request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      Alert.alert('Success', 'Quotation sent!');
      
      // Update the specific order's status locally without reloading the entire table
      if (selectedOrder) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === selectedOrder.id 
              ? { 
                  ...order, 
                  status: selectedOrder.type === 'Rental' ? 'quotation_sent' : 'in_progress' 
                }
              : order
          )
        );
      }
      
      clearQuotationForm();
      handleCloseDetails();
    } catch (err: any) {
      console.error('Quotation error:', err);
      const errorMessage = err?.message || 'Failed to send quotation.';
      setQuotationError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setQuotationLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="file-tray-full" size={28} color={Colors.primary} />
          <Text style={styles.title}>Manage Orders</Text>
        </View>
      </View>
      {/* Filters */}
      <TouchableOpacity 
        style={styles.filtersRow}
        activeOpacity={1}
        onPress={() => {
          setShowTypeDropdown(false);
          setShowStatusDropdown(false);
        }}
      >
        {/* Type Filter */}
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Type:</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => {
                setShowTypeDropdown(!showTypeDropdown);
                if (!showTypeDropdown) {
                  setShowStatusDropdown(false);
                }
              }}
            >
            <Text style={styles.dropdownButtonText}>
              {typeFilter}
            </Text>
            <Ionicons 
              name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
          
          {/* Type Dropdown Menu */}
          {showTypeDropdown && (
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 99999, left: 0 }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('All');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('Rental');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Rental</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('Purchase');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Purchase</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Status Filter */}
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Status:</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => {
                setShowStatusDropdown(!showStatusDropdown);
                if (!showStatusDropdown) {
                  setShowTypeDropdown(false);
                }
              }}
            >
            <Text style={styles.dropdownButtonText}>
              {statusFilter}
            </Text>
            <Ionicons 
              name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
          
          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 99999, left: 0 }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('All');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('pending');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('in_progress');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('quotation_sent');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Quotation Sent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('ready_for_pickup');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Ready for Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setStatusFilter('cancelled');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Cancelled</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Search Bar - Below the filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer..."
          value={search}
          onChangeText={setSearch}
          onFocus={() => {
            setShowTypeDropdown(false);
            setShowStatusDropdown(false);
          }}
        />
      </View>

      {/* Spacing between filters and table */}
      <View style={styles.tableSpacing} />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No orders found</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.tableWrapper}>
          <ScrollView 
            style={styles.tableScroll} 
            horizontal={true} 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.tableScrollContent}
            bounces={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tableContainerClassic}>
              <View style={styles.orderRowHeaderClassic}>
                <View style={[styles.headerCell, { width: 60 }]}><Text style={styles.orderCellHeaderClassic}>ID</Text></View>
                <View style={[styles.headerCell, { width: 80 }]}><Text style={styles.orderCellHeaderClassic}>Type</Text></View>
                <View style={[styles.headerCell, { width: 120 }]}><Text style={styles.orderCellHeaderClassic}>Customer</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Status</Text></View>
                <View style={[styles.headerCell, { width: 80 }]}><Text style={styles.orderCellHeaderClassic}>Actions</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Penalty</Text></View>
              </View>
              <FlatList
                data={filteredOrders}
                renderItem={renderFlatListItem}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 20 }}
                style={{ height: 400 }}
                nestedScrollEnabled={true}
              />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <ScrollView 
            style={styles.tableScroll} 
            horizontal={true} 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.tableScrollContent}
            bounces={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tableContainerClassic}> 
              <View style={styles.orderRowHeaderClassic}> 
                <View style={[styles.headerCell, { width: 80 }]}><Text style={styles.orderCellHeaderClassic}>Order ID</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Type</Text></View>
                <View style={[styles.headerCell, { width: 140 }]}><Text style={styles.orderCellHeaderClassic}>Customer</Text></View>
                <View style={[styles.headerCell, { width: 120 }]}><Text style={styles.orderCellHeaderClassic}>Status</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Actions</Text></View>
                <View style={[styles.headerCell, { width: 120 }]}><Text style={styles.orderCellHeaderClassic}>Penalty Status</Text></View>
              </View>
              <FlatList
                data={filteredOrders}
                renderItem={({ item }) => (
                  <View style={styles.orderRowClassic2}>
                    <View style={[styles.dataCell, { width: 80 }]}><Text style={styles.orderCellClassic2}>{item.id}</Text></View>
                    <View style={[styles.dataCell, { width: 100 }]}><Text style={styles.orderCellClassic2}>{item.type}</Text></View>
                    <View style={[styles.dataCell, { width: 140 }]}><Text style={styles.orderCellClassic2}>{item.customer}</Text></View>
                    <View style={[styles.dataCell, { width: 120 }]}><Text style={styles.orderCellClassic2}>{item.status}</Text></View>
                    <View style={[styles.dataCell, { width: 100 }]}>
                      <TouchableOpacity style={styles.actionButtonClassic2} onPress={() => handleViewDetails(item)}>
                        <Text style={styles.actionButtonTextClassic2}>View</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Add penalty status column for all orders - show data for rentals, empty for others */}
                    <View style={[styles.dataCell, { width: 120 }]}>
                      {item.type === 'Rental' ? (
                        <Text style={[
                          styles.orderCellClassic2,
                          { 
                            color: item.penalty_status === 'paid' ? '#388e3c' : 
                                   item.penalty_status === 'pending' ? '#ff9800' : '#666'
                          }
                        ]}>
                          {item.penalty_status === 'paid' ? '✅ Paid' : 
                           item.penalty_status === 'pending' ? '⚠️ Pending' : '—'}
                        </Text>
                      ) : (
                        <Text style={[styles.orderCellClassic2, { color: '#ccc' }]}>—</Text>
                      )}
                    </View>
                  </View>
                )}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 20 }}
                style={{ height: 400 }}
                nestedScrollEnabled={true}
              />
            </View>
          </ScrollView>
        </View>
      )}
      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseDetails}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: '#fff', 
              borderRadius: 16, 
              padding: 20, 
              elevation: 20, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 8 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 20, 
              maxHeight: '95%', 
              width: '90%', 
              minHeight: (selectedOrder?.status === 'ready_for_pickup' || selectedOrder?.status === 'quotation_sent' || selectedOrder?.status === 'cancelled') ? 400 : 600 
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="document-text-outline" size={24} color="#014D40" />
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#014D40' }}>Order Details</Text>
                </View>
                <TouchableOpacity style={{ padding: 8, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' }} onPress={handleCloseDetails}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Order Details Content */}
              <ScrollView 
                style={{ flex: 1, minHeight: (selectedOrder?.status === 'ready_for_pickup' || selectedOrder?.status === 'quotation_sent' || selectedOrder?.status === 'cancelled') ? 300 : 500 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
              >
                {/* Order Information */}
                <View style={{ backgroundColor: '#e8f5e8', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#c8e6c9' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Ionicons name="information-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Order Information</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: '600' }}>Order ID:</Text>
                    <Text style={{ fontSize: 16, color: '#014D40', fontWeight: '600' }}>{selectedOrder.id}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: '600' }}>Order Type:</Text>
                    <Text style={{ fontSize: 16, color: '#014D40', fontWeight: '600' }}>{selectedOrder.type}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: '600' }}>Customer Name:</Text>
                    <Text style={{ fontSize: 16, color: '#014D40', fontWeight: '600' }}>{selectedOrder.customer}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: '600' }}>Status:</Text>
                    <Text style={{ fontSize: 16, color: '#014D40', fontWeight: '600' }}>{selectedOrder.status}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: '600', flex: 1, marginRight: 10 }}>Details:</Text>
                    <Text style={{ fontSize: 16, color: '#014D40', fontWeight: '600', flex: 2, textAlign: 'right' }}>{selectedOrder.details}</Text>
                  </View>
                </View>

                {/* Quotation Section */}
                {selectedOrder.status === 'in_progress' && (
                  <View style={{ backgroundColor: '#f9fbe7', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#cddc39' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Quotation Accepted</Text>
                    </View>
                    
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="cash-outline" size={20} color="#388e3c" />
                        <Text style={{ fontSize: 16, color: '#666', marginLeft: 8, fontWeight: '600' }}>Amount:</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#388e3c', fontWeight: 'bold', marginLeft: 28 }}>
                        ₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#388e3c" />
                        <Text style={{ fontSize: 16, color: '#666', marginLeft: 8, fontWeight: '600' }}>Notes:</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#388e3c', fontWeight: 'bold', marginLeft: 28 }}>{selectedOrder.quotation_notes || '—'}</Text>
                    </View>
                    
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="person-circle-outline" size={20} color="#388e3c" />
                        <Text style={{ fontSize: 16, color: '#666', marginLeft: 8, fontWeight: '600' }}>Customer Response:</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#388e3c', fontWeight: 'bold', marginLeft: 28 }}>Accepted</Text>
                    </View>

                    {/* Mark as Ready for Pickup button */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          const endpoint = selectedOrder.type === 'Purchase' 
                            ? `/purchases/${selectedOrder.id}/ready-for-pickup`
                            : `/rentals/${selectedOrder.id}/ready-for-pickup`;
                          
                          await apiService.request(endpoint, { method: 'POST' });
                          Alert.alert('Success', 'Order marked as ready for pickup!');
                          handleCloseDetails();
                          
                          // Refresh orders
                          setLoading(true);
                          const rentalsRes = await apiService.request('/rentals');
                          const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
                          const rentals = (rentalsArr || []).map((r: any) => ({
                            id: r.id,
                            type: 'Rental',
                            customer: r.customer_name || r.customer_email || 'N/A',
                            status: r.status || 'N/A',
                            details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
                            quotation_amount: r.quotation_amount,
                            quotation_notes: r.quotation_notes,
                            quotation_schedule: r.quotation_schedule,
                            penalty_status: r.penalty_status,
                          }));
                          const purchasesRes = await apiService.request('/purchases');
                          const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
                          const purchases = (purchasesArr || []).map((p: any) => ({
                            id: p.id,
                            type: 'Purchase',
                            customer: p.customer_name || p.customer_email || 'N/A',
                            status: p.status || 'N/A',
                            details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
                            quotation_price: p.quotation_price,
                            quotation_notes: p.quotation_notes,
                            quotation_schedule: p.quotation_schedule,
                          }));
                          setOrders([...rentals, ...purchases]);
                          setLoading(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to mark order as ready for pickup.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                      <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Mark as Ready for Pickup</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Set Quotation Section */}
                {(selectedOrder.status as string) === 'pending' && (
                  <View style={{ backgroundColor: '#fff3e0', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#ffb74d' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="calculator" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Set Quotation</Text>
                    </View>
                    
                    {/* Error Display */}
                    {quotationError ? (
                      <View style={{ backgroundColor: '#ffebee', borderColor: '#f44336', borderWidth: 1, borderRadius: 6, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#f44336', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{quotationError}</Text>
                      </View>
                    ) : null}
                    
                    {/* Amount Input */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 16, color: '#666', marginBottom: 8, fontWeight: '600' }}>Amount (₱)</Text>
                      <TextInput
                        style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 16, color: '#014D40', minHeight: 48 }}
                        value={quotationAmount}
                        onChangeText={(text) => {
                          setQuotationAmount(text);
                          if (quotationError) setQuotationError('');
                        }}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Schedule Input - Only for Purchase Orders */}
                    {selectedOrder?.type === 'Purchase' && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, color: '#666', marginBottom: 8, fontWeight: '600' }}>Schedule</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 }}>
                          <TextInput
                            style={{ flex: 1, marginRight: 8, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 16, color: '#014D40' }}
                            value={quotationSchedule}
                            onChangeText={(text) => {
                              setQuotationSchedule(text);
                              if (quotationError) setQuotationError('');
                            }}
                            placeholder="DD/MM/YYYY"
                          />
                          <TouchableOpacity
                            style={{ padding: 8, borderRadius: 6, backgroundColor: '#014D40' }}
                            onPress={() => setShowDatePicker(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color="#FFD700" />
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Select the date for the order schedule</Text>
                      </View>
                    )}

                    {/* Notes Input */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 16, color: '#666', marginBottom: 8, fontWeight: '600' }}>Notes (optional)</Text>
                      <TextInput
                        style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 16, color: '#014D40', height: 100, textAlignVertical: 'top' }}
                        value={quotationNotes}
                        onChangeText={setQuotationNotes}
                        placeholder="Add any notes for the customer"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 0 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 }}
                        onPress={handleSendQuotation}
                        disabled={quotationLoading}
                      >
                        <Ionicons name="paper-plane" size={18} color="#FFD700" />
                        <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 13, flexShrink: 0 }}>Send Quotation</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{ backgroundColor: '#666', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 }}
                        onPress={() => {
                          clearQuotationForm();
                          handleCloseDetails();
                        }}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, flexShrink: 0 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Date Picker Modal */}
              {showDatePicker && (
                <DateTimePicker
                  value={quotationScheduleDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setQuotationScheduleDate(selectedDate);
                      setQuotationSchedule(selectedDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }));
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.light,
  },
  header: {
    marginBottom: 20,
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
    color: Colors.primary,
  },
  tableContainer: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 640,
  },
  tableContainerMobile: {
    minWidth: 0,
    width: '100%',
    padding: 4,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fbe7',
    borderRadius: 8,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    elevation: 1,
    minWidth: 600,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderRowMobile: {
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 6,
    borderRadius: 6,
  },
  orderRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#014D40',
    borderRadius: 8,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 10,
    minWidth: 600,
  },
  orderRowHeaderMobile: {
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  orderCell: {
    flex: 1,
    fontSize: 18,
    color: '#014D40',
    minWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderCellMobile: {
    minWidth: 60,
    fontSize: 15,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
  },
  orderCellHeader: {
    flex: 1,
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    minWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderCellHeaderMobile: {
    minWidth: 60,
    fontSize: 15,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10, // reduced from 16
    backgroundColor: '#757575',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    minWidth: 120, // ensure not too wide
    maxWidth: 180,
  },
  cancelButton: {
    backgroundColor: Colors.neutral[500],
    borderWidth: 0,
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  cancelButtonText: {
    color: Colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014D40',
    borderRadius: 12,
    paddingVertical: 10, // reduced from 16
    minWidth: 180,
    maxWidth: 180,
    alignSelf: 'center',
    shadowColor: '#014D40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 0,
  },
  enhancedCloseButton: {
    backgroundColor: '#014D40',
  },
  closeButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8, // Minimal spacing below filters
    gap: 20, // Space between Type and Status filters
    position: 'relative',
    overflow: 'visible', // Allow dropdowns to extend beyond container
    zIndex: 99999,
  },
  filterItem: {
    position: 'relative',
    zIndex: 99999,
    minHeight: 60, // Ensure consistent height for filter items
    flex: 1, // Make filters take equal width
    maxWidth: '48%', // Ensure they don't get too wide
    overflow: 'visible', // Allow dropdown to extend beyond container
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    zIndex: 9999,
    minHeight: 40,
  },
  filterLabel: {
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 4,
  },
  filterButton: {
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: Colors.secondary,
  },
  filterButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    width: '100%',
    color: Colors.text.primary,
    fontSize: 15,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1, // Lower z-index to ensure dropdowns appear above
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 8,
    color: '#014D40',
  },
  actionButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardsContainer: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#f9fbe7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    color: '#014D40',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 2,
  },
  cardValue: {
    color: '#014D40',
    fontSize: 16,
    marginBottom: 2,
    marginLeft: 4,
  },
  orderRowClassic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fcfce6',
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  orderCellClassic: {
    flex: 1,
    fontSize: 15,
    color: '#014D40',
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexWrap: 'wrap',
  },
  actionButtonClassic: {
    backgroundColor: '#014D40',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  actionButtonTextClassic: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 15,
  },
  tableContainerClassic: {
    minWidth: 540, // Total width: 60 + 80 + 120 + 100 + 80 + 100 = 540
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    flex: 1,
    maxHeight: 600,
  },
  orderRowHeaderClassic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 540, // Total width: 60 + 80 + 120 + 100 + 80 + 100 = 540
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCellHeaderClassic: { 
    fontSize: 14, 
    color: '#ffffff', 
    fontWeight: 'bold', 
    paddingHorizontal: 4, 
    paddingVertical: 4, 
    flexWrap: 'wrap', 
    letterSpacing: 0.2, 
    textAlign: 'center' 
  },
  orderRowClassic2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 540, // Total width: 60 + 80 + 120 + 100 + 80 + 100 = 540
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderCellClassic2: { 
    fontSize: 14, 
    color: Colors.text.primary, 
    paddingHorizontal: 4, 
    paddingVertical: 4, 
    flexWrap: 'wrap', 
    letterSpacing: 0.1, 
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtonClassic2: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 36,
    marginLeft: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonTextClassic2: { 
    color: Colors.secondary, 
    fontWeight: 'bold', 
    fontSize: 13, 
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  detailsModal: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 0,
    elevation: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    zIndex: 10000,
    maxHeight: '85%',
    width: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderInfoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#014D40',
    fontWeight: 'bold',
  },
  detailsText: {
    flex: 1,
    flexWrap: 'wrap',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  quotationSection: {
    backgroundColor: '#f9fbe7',
    borderRadius: 8,
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#cddc39',
  },
  quotationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 8,
  },
  quotationInfo: {
    gap: 6,
  },
  quotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotationLabel: {
    fontSize: 14,
    color: '#388e3c',
    fontWeight: '500',
  },
  quotationValue: {
    fontSize: 14,
    color: '#388e3c',
    fontWeight: 'bold',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  readyButtonText: {
    color: Colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  setQuotationSection: {
    marginBottom: 15,
  },
  quotationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  sendQuotationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flex: 1,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  sendQuotationText: {
    color: Colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
    flexShrink: 0,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 48,
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  scheduleInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 15,
    color: Colors.text.primary,
  },
  calendarButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 6,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    minHeight: 40,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 99999,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1001,
    minWidth: 120,
    marginTop: 2,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  dropdownMenuAbsolute: {
    position: 'absolute',
    left: 0,
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 25,
    zIndex: 99999,
    minWidth: 120,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 400,
    overflow: 'visible',
    width: '100%',
  },
  tableSpacing: {
    height: 2, // Minimal spacing between filters and table
  },
  tableWrapper: {
    width: '100%',
    backgroundColor: '#f8f9fa', // Light background to make table visible
    borderRadius: 14,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 1, // Lower z-index to ensure dropdowns appear above
  },
  tableScroll: {
    width: '100%',
    flexGrow: 1,
  },
  tableScrollContent: {
    minWidth: 540, // Total width: 60 + 80 + 120 + 100 + 80 + 100 = 540
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dataCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  searchContainer: {
    marginTop: 8, // Space between filters and search bar
    zIndex: 1, // Lower z-index to ensure dropdowns appear above
  },
  // Modal styles
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 32,
  },

});

export default OrdersScreen; 