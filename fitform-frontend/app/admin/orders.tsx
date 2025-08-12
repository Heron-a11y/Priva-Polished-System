import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Dimensions, ScrollView, Modal } from 'react-native';
import apiService from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

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

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const isMobile = SCREEN_WIDTH < 600;

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
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
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
      }));
      const purchasesRes = await apiService.request('/purchases');
      const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
      const purchases = (purchasesArr || []).map((p: any) => ({
        id: p.id,
        type: 'Purchase',
        customer: p.customer_name || p.customer_email || 'N/A',
        status: p.status || 'N/A',
        details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Orders</Text>
      {/* Filters */}
      <View style={styles.filtersRow}>
        {/* Type Filter */}
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Type:</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {typeFilter}
            </Text>
            <Ionicons 
              name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#014D40" 
            />
          </TouchableOpacity>
          
          {/* Type Dropdown Menu */}
          {showTypeDropdown && (
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 1002 }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('All');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>🔎 All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('Rental');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>📦 Rental</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setTypeFilter('Purchase');
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>🛍️ Purchase</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Status Filter */}
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Status:</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {statusFilter}
            </Text>
            <Ionicons 
              name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#014D40" 
            />
          </TouchableOpacity>
          
          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 1001 }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('All');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>🔎 All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('in_progress');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>⏳ In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('cancelled');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>❌ Cancelled</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setStatusFilter('ready_for_pickup');
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>✅ Ready for Pickup</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Search Bar - Below the filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Spacing between filters and table */}
      <View style={styles.tableSpacing} />

      {loading ? (
        <ActivityIndicator size="large" color="#014D40" />
      ) : (
        <View style={styles.tableWrapper}>
          <ScrollView style={styles.tableScroll} horizontal={true} contentContainerStyle={styles.tableScrollContent}>
            <View style={styles.tableContainerClassic}> 
              <View style={styles.orderRowHeaderClassic}> 
                <View style={[styles.headerCell, { width: 80 }]}><Text style={styles.orderCellHeaderClassic}>Order ID</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Type</Text></View>
                <View style={[styles.headerCell, { width: 140 }]}><Text style={styles.orderCellHeaderClassic}>Customer</Text></View>
                <View style={[styles.headerCell, { width: 120 }]}><Text style={styles.orderCellHeaderClassic}>Status</Text></View>
                <View style={[styles.headerCell, { width: 100 }]}><Text style={styles.orderCellHeaderClassic}>Actions</Text></View>
              </View>
              {filteredOrders.map((item) => (
                <View key={`${item.type}-${item.id}`} style={styles.orderRowClassic2}>
                  <View style={[styles.dataCell, { width: 80 }]}><Text style={styles.orderCellClassic2}>{item.id}</Text></View>
                  <View style={[styles.dataCell, { width: 100 }]}><Text style={styles.orderCellClassic2}>{item.type}</Text></View>
                  <View style={[styles.dataCell, { width: 140 }]}><Text style={styles.orderCellClassic2}>{item.customer}</Text></View>
                  <View style={[styles.dataCell, { width: 120 }]}><Text style={styles.orderCellClassic2}>{item.status}</Text></View>
                  <View style={[styles.dataCell, { width: 100 }]}>
                    <TouchableOpacity style={styles.actionButtonClassic2} onPress={() => handleViewDetails(item)}>
                      <Text style={styles.actionButtonTextClassic2}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      {/* Order Details Modal (simple inline for now) */}
      {selectedOrder && (
        <View style={styles.detailsModal}>
          <Text style={styles.detailsTitle}>Order Details</Text>
          <View style={{ marginBottom: 10, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pricetag-outline" size={18} color="#388e3c" />
              <Text>ID: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.id}</Text></Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cube-outline" size={18} color="#388e3c" />
              <Text>Type: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.type}</Text></Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="person-outline" size={18} color="#388e3c" />
              <Text>Customer: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.customer}</Text></Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="information-circle-outline" size={18} color="#388e3c" />
              <Text>Status: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.status}</Text></Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Ionicons name="document-text-outline" size={18} color="#388e3c" />
              <Text style={{ flex: 1 }}>Details: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.details}</Text></Text>
            </View>
          </View>
          <View style={{ borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginVertical: 10 }} />
          {/* Quotation Accepted Section */}
          {selectedOrder.status === 'in_progress' && (
            <>
              <View style={{ backgroundColor: '#e8f5e9', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#388e3c', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#388e3c" style={{ marginRight: 6 }} />
                  <Text style={{ fontWeight: 'bold', color: '#388e3c', fontSize: 16 }}>Quotation Accepted</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cash-outline" size={18} color="#388e3c" />
                  <Text>Amount: <Text style={{ fontWeight: 'bold', color: '#388e3c' }}>₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#388e3c" />
                  <Text>Notes: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.quotation_notes || '—'}</Text></Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="person-circle-outline" size={18} color="#388e3c" />
                  <Text>Customer Response: <Text style={{ fontWeight: 'bold', color: '#388e3c' }}>Accepted</Text></Text>
                </View>
              </View>
              {/* Mark as Ready for Pickup button for purchase orders */}
              {selectedOrder.type === 'Purchase' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FFD700', marginBottom: 12 }]}
                  onPress={async () => {
                    try {
                      await apiService.request(`/purchases/${selectedOrder.id}/ready-for-pickup`, { method: 'POST' });
                      Alert.alert('Success', 'Order marked as ready for pickup!');
                      handleCloseDetails();
                      setLoading(true);
                      const rentalsRes = await apiService.request('/rentals');
                      const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
                      const rentals = (rentalsArr || []).map((r: any) => ({
                        id: r.id,
                        type: 'Rental',
                        customer: r.customer_name || r.customer_email || 'N/A',
                        status: r.status || 'N/A',
                        details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
                      }));
                      const purchasesRes = await apiService.request('/purchases');
                      const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
                      const purchases = (purchasesArr || []).map((p: any) => ({
                        id: p.id,
                        type: 'Purchase',
                        customer: p.customer_name || p.customer_email || 'N/A',
                        status: p.status || 'N/A',
                        details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
                      }));
                      setOrders([...rentals, ...purchases]);
                    } catch (err) {
                      Alert.alert('Error', 'Failed to mark as ready for pickup.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={20} color="#014D40" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#014D40', fontWeight: 'bold', fontSize: 16 }}>Mark as Ready for Pickup</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Only show the yellow Quotation Details box if no status-specific section is shown */}
          {!(selectedOrder.status === 'in_progress' || selectedOrder.status === 'cancelled' || selectedOrder.status === 'quotation_sent') &&
            (selectedOrder.quotation_amount || selectedOrder.quotation_price || selectedOrder.quotation_notes || selectedOrder.quotation_schedule) && (
              <View style={{ marginTop: 18, marginBottom: 8, padding: 12, backgroundColor: '#f9fbe7', borderRadius: 8, borderWidth: 1, borderColor: '#cddc39' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#014D40', marginBottom: 6 }}>Quotation Details</Text>
                <Text style={{ fontSize: 15, marginBottom: 2 }}>
                  Amount: <Text style={{ fontWeight: 'bold', color: '#388e3c' }}>₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}</Text>
                </Text>
                {selectedOrder.quotation_schedule && (
                  <Text style={{ fontSize: 15, marginBottom: 2 }}>
                    Schedule: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.quotation_schedule}</Text>
                  </Text>
                )}
                <Text style={{ fontSize: 15, marginBottom: 2 }}>
                  Notes: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.quotation_notes || '—'}</Text>
                </Text>
              </View>
          )}

          {/* Existing status-based sections remain below */}
          {selectedOrder.status === 'pending' && (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Admin Action</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#388e3c', flex: 1, marginRight: 6 }]} onPress={async () => {
                  // Accept order
                  try {
                    const endpoint = selectedOrder.type === 'Rental'
                      ? `/rentals/${selectedOrder.id}/accept-order`
                      : `/purchases/${selectedOrder.id}/accept-order`;
                    await apiService.request(endpoint, { method: 'POST' });
                    Alert.alert('Success', 'Order accepted!');
                    handleCloseDetails();
                    setLoading(true);
                    const rentalsRes = await apiService.request('/rentals');
                    const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
                    const rentals = (rentalsArr || []).map((r: any) => ({
                      id: r.id,
                      type: 'Rental',
                      customer: r.customer_name || r.customer_email || 'N/A',
                      status: r.status || 'N/A',
                      details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
                    }));
                    const purchasesRes = await apiService.request('/purchases');
                    const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
                    const purchases = (purchasesArr || []).map((p: any) => ({
                      id: p.id,
                      type: 'Purchase',
                      customer: p.customer_name || p.customer_email || 'N/A',
                      status: p.status || 'N/A',
                      details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
                    }));
                    setOrders([...rentals, ...purchases]);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to accept order.');
                  } finally {
                    setLoading(false);
                  }
                }}>
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#d32f2f', flex: 1, marginLeft: 6 }]} onPress={async () => {
                  // Decline order
                  try {
                    const endpoint = selectedOrder.type === 'Rental'
                      ? `/rentals/${selectedOrder.id}/decline-order`
                      : `/purchases/${selectedOrder.id}/decline-order`;
                    await apiService.request(endpoint, { method: 'POST' });
                    Alert.alert('Success', 'Order declined!');
                    handleCloseDetails();
                    setLoading(true);
                    const rentalsRes = await apiService.request('/rentals');
                    const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
                    const rentals = (rentalsArr || []).map((r: any) => ({
                      id: r.id,
                      type: 'Rental',
                      customer: r.customer_name || r.customer_email || 'N/A',
                      status: r.status || 'N/A',
                      details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
                    }));
                    const purchasesRes = await apiService.request('/purchases');
                    const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
                    const purchases = (purchasesArr || []).map((p: any) => ({
                      id: p.id,
                      type: 'Purchase',
                      customer: p.customer_name || p.customer_email || 'N/A',
                      status: p.status || 'N/A',
                      details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
                    }));
                    setOrders([...rentals, ...purchases]);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to decline order.');
                  } finally {
                    setLoading(false);
                  }
                }}>
                  <Text style={styles.actionButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {selectedOrder.status === 'confirmed' && (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Set Quotation</Text>
              <Text style={{ marginBottom: 2 }}>Amount (₱)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 4 }]}
                placeholder="Enter amount"
                value={quotationAmount}
                onChangeText={text => {
                  setQuotationAmount(text);
                  setQuotationError('');
                }}
                keyboardType="numeric"
              />
              <View style={{ marginBottom: 4 }}>
                <Text style={{ marginBottom: 2 }}>Schedule</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={{
                      width: '100%',
                      height: 40,
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      padding: '0 10px',
                      fontSize: 16,
                      color: '#014D40',
                      marginBottom: 4,
                    }}
                    value={quotationSchedule}
                    onChange={e => {
                      setQuotationSchedule(e.target.value);
                      setQuotationScheduleDate(e.target.value ? new Date(e.target.value) : null);
                      setQuotationError('');
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: 'center', height: 40 }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: quotationSchedule ? '#014D40' : '#888' }}>
                        {quotationSchedule ? new Date(quotationSchedule).toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={quotationScheduleDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setQuotationScheduleDate(selectedDate);
                            setQuotationSchedule(selectedDate.toISOString().split('T')[0]);
                            setQuotationError('');
                          }
                        }}
                      />
                    )}
                  </>
                )}
                <Text style={{ fontSize: 12, color: '#888' }}>Select the date for the order schedule.</Text>
              </View>
              <Text style={{ marginBottom: 2 }}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 4 }]}
                placeholder="Add any notes for the customer"
                value={quotationNotes}
                onChangeText={setQuotationNotes}
                multiline
                numberOfLines={2}
              />
              {quotationError ? (
                <Text style={{ color: 'red', marginTop: 4 }}>{quotationError}</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#388e3c', marginTop: 8, minHeight: 40, justifyContent: 'center' }]}
                disabled={quotationLoading}
                onPress={async () => {
                  if (!quotationAmount || isNaN(Number(quotationAmount))) {
                    setQuotationError('Please enter a valid number for the quotation price.');
                    return;
                  }
                  if (!quotationSchedule) {
                    setQuotationError('Please select a schedule date.');
                    return;
                  }
                  setQuotationLoading(true);
                  try {
                    const endpoint = selectedOrder.type === 'Rental'
                      ? `/rentals/${selectedOrder.id}/set-quotation`
                      : `/purchases/${selectedOrder.id}/set-quotation`;
                    const payload = selectedOrder.type === 'Rental'
                      ? {
                          quotation_amount: Number(quotationAmount),
                          quotation_notes: quotationNotes,
                          quotation_schedule: quotationSchedule,
                        }
                      : {
                          quotation_price: Number(quotationAmount),
                          quotation_notes: quotationNotes,
                          quotation_schedule: quotationSchedule,
                        };
                    await apiService.request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
                    Alert.alert('Success', 'Quotation sent!');
                    setQuotationAmount('');
                    setQuotationNotes('');
                    setQuotationSchedule('');
                    setQuotationScheduleDate(null);
                    setQuotationError('');
                    handleCloseDetails();
                    setLoading(true);
                    const rentalsRes = await apiService.request('/rentals');
                    const rentalsArr = Array.isArray(rentalsRes) ? rentalsRes : rentalsRes.data;
                    const rentals = (rentalsArr || []).map((r: any) => ({
                      id: r.id,
                      type: 'Rental',
                      customer: r.customer_name || r.customer_email || 'N/A',
                      status: r.status || 'N/A',
                      details: r.item_name + (r.notes ? ` - ${r.notes}` : ''),
                    }));
                    const purchasesRes = await apiService.request('/purchases');
                    const purchasesArr = Array.isArray(purchasesRes) ? purchasesRes : purchasesRes.data;
                    const purchases = (purchasesArr || []).map((p: any) => ({
                      id: p.id,
                      type: 'Purchase',
                      customer: p.customer_name || p.customer_email || 'N/A',
                      status: p.status || 'N/A',
                      details: p.item_name + (p.notes ? ` - ${p.notes}` : ''),
                    }));
                    setOrders([...rentals, ...purchases]);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to send quotation.');
                  } finally {
                    setQuotationLoading(false);
                  }
                }}
              >
                <Text style={styles.actionButtonText}>Send Quotation</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Show quotation details if available */}
          {selectedOrder.status === 'quotation_sent' && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: 'bold' }}>Quotation Details</Text>
              <Text>Amount: ₱{selectedOrder.quotation_amount || selectedOrder.quotation_price}</Text>
              <Text>Notes: {selectedOrder.quotation_notes}</Text>
              <Text>Customer Response: Waiting</Text>
            </View>
          )}
          {selectedOrder.status === 'cancelled' && (
            <View style={{ backgroundColor: '#ffebee', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d32f2f', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="close-circle" size={20} color="#d32f2f" style={{ marginRight: 6 }} />
                <Text style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: 16 }}>Quotation Rejected</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cash-outline" size={18} color="#d32f2f" />
                <Text>Amount: <Text style={{ fontWeight: 'bold', color: '#d32f2f' }}>₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#d32f2f" />
                <Text>Notes: <Text style={{ fontWeight: 'bold' }}>{selectedOrder.quotation_notes || '—'}</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-circle-outline" size={18} color="#d32f2f" />
                <Text>Customer Response: <Text style={{ fontWeight: 'bold', color: '#d32f2f' }}>Rejected</Text></Text>
              </View>
            </View>
          )}
          {/* Existing action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              activeOpacity={0.85}
              onPress={() => handleOrderAction('cancel')}
            >
              <Ionicons name="close-circle-outline" size={20} color="#FFD700" style={{ marginRight: 8 }} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, styles.enhancedCloseButton]}
            activeOpacity={0.85}
            onPress={handleCloseDetails}
          >
            <Ionicons name="arrow-back-circle-outline" size={22} color="#FFD700" style={{ marginRight: 8 }} />
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#014D40' },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#757575',
    borderWidth: 0,
    minWidth: 180,
    maxWidth: 180,
    alignSelf: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
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
    marginBottom: 8, // Very small spacing below filters
    gap: 20, // Space between Type and Status filters
    position: 'relative',
  },
  filterItem: {
    position: 'relative',
    zIndex: 1000,
    minHeight: 60, // Ensure consistent height for filter items
    flex: 1, // Make filters take equal width
    maxWidth: '48%', // Ensure they don't get too wide
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    zIndex: 1000,
    minHeight: 40,
  },
  filterLabel: {
    fontWeight: 'bold',
    color: '#014D40',
    marginRight: 4,
  },
  filterButton: {
    backgroundColor: '#eee',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: '#FFD700',
  },
  filterButtonText: {
    color: '#014D40',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    width: '100%',
    color: '#014D40',
    fontSize: 15,
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
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderRowHeaderClassic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014D40',
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: '#014D40',
  },
  orderCellHeaderClassic: { 
    fontSize: 13, 
    color: '#FFD700', 
    fontWeight: 'bold', 
    paddingHorizontal: 2, 
    paddingVertical: 2, 
    flexWrap: 'wrap', 
    letterSpacing: 0.1, 
    textAlign: 'center' 
  },
  orderRowClassic2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcfce6',
    borderRadius: 8,
    marginBottom: 6,
    paddingVertical: 7,
    paddingHorizontal: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  orderCellClassic2: { 
    fontSize: 12, 
    color: '#014D40', 
    paddingHorizontal: 2, 
    paddingVertical: 2, 
    flexWrap: 'wrap', 
    letterSpacing: 0.05, 
    textAlign: 'center' 
  },
  actionButtonClassic2: {
    backgroundColor: '#014D40',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    height: 28,
    marginLeft: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
    textAlign: 'center',
  },
  actionButtonTextClassic2: { color: '#FFD700', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.1, fontFamily: 'system-ui, sans-serif' },
  detailsModal: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 10,
    zIndex: 1000,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#014D40',
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
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#014D40',
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
    color: '#014D40',
  },
  dropdownMenuAbsolute: {
    position: 'absolute',
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
    paddingVertical: 5,
    paddingHorizontal: 10,
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
  },
  tableScroll: {
    width: '100%',
  },
  tableScrollContent: {
    minWidth: 540, // Total width: 80 + 100 + 140 + 120 + 100 = 540
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
  },
});

export default OrdersScreen; 