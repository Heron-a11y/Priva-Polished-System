import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Dimensions, ScrollView, Modal, Image } from 'react-native';
import apiService from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { CLOTHING_TYPES } from '../../constants/ClothingTypes';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';

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
  counter_offer_amount?: number;
  counter_offer_notes?: string;
  counter_offer_status?: 'none' | 'pending' | 'accepted' | 'rejected';
}

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const isMobile = SCREEN_WIDTH < 600;
  const isIOS = Platform.OS === 'ios';
  
  // Helper functions for status display
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'quotation_sent': return '#3b82f6';
      case 'quotation_accepted': return '#10b981';
      case 'counter_offer_pending': return '#ff9800';
      case 'in_progress': return '#014D40';
      case 'ready_for_pickup': return '#10b981';
      case 'picked_up': return '#059669';
      case 'returned': return '#0d9488';
      case 'quotation_rejected': return '#ef4444';
      case 'declined': return '#dc2626';
      case 'cancelled': return '#991b1b';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'PENDING';
      case 'quotation_sent':
        return 'QUOTATION SENT';
      case 'quotation_accepted':
        return 'QUOTATION ACCEPTED';
      case 'counter_offer_pending':
        return 'COUNTER OFFER PENDING';
      case 'in_progress':
        return 'IN PROGRESS';
      case 'ready_for_pickup':
        return 'READY FOR PICKUP';
      case 'picked_up':
        return 'PICKED UP';
      case 'returned':
        return 'RETURNED';
      case 'quotation_rejected':
        return 'QUOTATION REJECTED';
      case 'declined':
        return 'DECLINED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getStatusFilterDisplayText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'all':
        return 'All';
      case 'pending':
        return 'Pending';
      case 'quotation_sent':
        return 'Quotation Sent';
      case 'counter_offer_pending':
        return 'Counter Offer\nPending';
      case 'in_progress':
        return 'In Progress';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'picked_up':
        return 'Picked Up';
      case 'returned':
        return 'Returned';
      case 'declined':
        return 'Declined';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  // Transform orders into grouped structure with headers for FlatList
  const getGroupedOrdersData = () => {
    // First, deduplicate orders by type and id
    const uniqueOrders = orders.filter((order, index, self) => 
      index === self.findIndex((o) => o.type === order.type && o.id === order.id)
    );
    
    // Group orders by status
    const groupedOrders = uniqueOrders.reduce((groups, order) => {
      const status = order.status.toLowerCase();
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(order);
      return groups;
    }, {} as Record<string, Order[]>);

    // Define status order: pending at top, cancelled at bottom
    const statusOrder = [
      'pending',
      'quotation_sent',
      'quotation_accepted',
      'counter_offer_pending',
      'in_progress',
      'ready_for_pickup',
      'picked_up',
      'returned',
      'quotation_rejected',
      'declined',
      'cancelled'
    ];

    // Sort status groups by priority
    const sortedStatusGroups = Object.keys(groupedOrders).sort((a, b) => {
      const aIndex = statusOrder.indexOf(a);
      const bIndex = statusOrder.indexOf(b);
      // If status not in order list, put it at the end
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Flatten into array with group headers and items
    const flatData: Array<{ type: 'header' | 'order'; status?: string; count?: number; order?: Order }> = [];
    
    sortedStatusGroups.forEach((status) => {
      const statusOrders = groupedOrders[status];
      if (statusOrders.length > 0) {
        // Add header
        flatData.push({
          type: 'header',
          status: status,
          count: statusOrders.length
        });
        // Add orders
        statusOrders.forEach(order => {
          flatData.push({
            type: 'order',
            order: order
          });
        });
      }
    });

    return flatData;
  };

  // FlatList render function for mobile table
  const renderFlatListItem = ({ item }: { item: Order }) => {
    return (
      <View style={styles.orderRowClassic2}>
        <View style={[styles.dataCell, { width: 60 }]}><Text style={styles.orderCellClassic2}>{item.id}</Text></View>
        <View style={[styles.dataCell, { width: 80 }]}><Text style={styles.orderCellClassic2}>{item.type}</Text></View>
        <View style={[styles.dataCell, { width: 120 }]}><Text style={styles.orderCellClassic2}>{item.customer}</Text></View>
        <View style={[styles.dataCell, { width: 100, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
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

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'pending': return 'time';
        case 'quotation_sent': return 'mail';
        case 'quotation_accepted': return 'checkmark-circle';
        case 'quotation_rejected': return 'close-circle';
        case 'picked_up': return 'car';
        case 'returned': return 'checkmark-done';
        case 'declined': return 'close';
        default: return 'help-circle';
      }
    };

    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <Text style={styles.orderType}>{order.type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Ionicons name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{order.customer}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={18} color="#666" />
            <Text style={styles.infoText} numberOfLines={2}>{order.details}</Text>
          </View>

          {order.quotation_amount && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={18} color="#666" />
              <Text style={styles.infoText}>₱{order.quotation_amount.toLocaleString()}</Text>
            </View>
          )}

          {order.type === 'Rental' && order.penalty_status && (
            <View style={styles.infoRow}>
              <Ionicons name="warning-outline" size={18} color="#666" />
              <Text style={[
                styles.infoText,
                { 
                  color: order.penalty_status === 'paid' ? '#388e3c' : 
                         order.penalty_status === 'pending' ? '#ff9800' : '#666'
                }
              ]}>
                Penalty: {order.penalty_status === 'paid' ? '✅ Paid' : 
                         order.penalty_status === 'pending' ? '⚠️ Pending' : '—'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewDetails(order)}
          >
            <Ionicons name="eye" size={18} color="#014D40" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>

          {/* Cancel Button - Show for all statuses except completed/declined */}
          {!['picked_up', 'returned', 'declined'].includes(order.status) && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelOrder(order)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* Remove Button - Show for cancelled orders */}
          {order.status === 'cancelled' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemoveOrder(order)}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}

          {/* Edit Button - Show for pending and quotation_sent statuses */}
          {['pending', 'quotation_sent'].includes(order.status) && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditOrder(order)}
            >
              <Ionicons name="create-outline" size={18} color="#014D40" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderOrderGroups = () => {
    // Group orders by status
    const groupedOrders = filteredOrders.reduce((groups, order) => {
      const status = order.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(order);
      return groups;
    }, {} as Record<string, Order[]>);

    // Sort status groups by business priority (most important first)
    const statusOrder = ['pending', 'quotation_sent', 'quotation_accepted', 'picked_up', 'returned', 'quotation_rejected', 'declined', 'cancelled'];
    const sortedStatusGroups = Object.keys(groupedOrders).sort((a, b) => {
      const aIndex = statusOrder.indexOf(a);
      const bIndex = statusOrder.indexOf(b);
      return aIndex - bIndex;
    });

    return sortedStatusGroups.map((status) => (
      <View key={status}>
        {renderStatusGroupHeader(status, groupedOrders[status].length)}
        {groupedOrders[status].map(renderOrderCard)}
      </View>
    ));
  };

  const renderStatusGroupHeader = (status: string, count: number) => {
    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase();
      switch (statusLower) {
        case 'pending': return 'time';
        case 'quotation_sent': return 'mail';
        case 'quotation_accepted': return 'checkmark-circle';
        case 'quotation_rejected': return 'close-circle';
        case 'counter_offer_pending': return 'hourglass';
        case 'in_progress': return 'construct';
        case 'ready_for_pickup': return 'cube';
        case 'picked_up': return 'car';
        case 'returned': return 'checkmark-done';
        case 'declined': return 'close';
        case 'cancelled': return 'close-circle';
        default: return 'help-circle';
      }
    };

    return (
      <View style={styles.statusGroupHeader}>
        <View style={[styles.statusGroupTitle, { borderLeftColor: getStatusColor(status) }]}>
          <Ionicons 
            name={getStatusIcon(status) as any} 
            size={20} 
            color={getStatusColor(status)} 
          />
          <Text style={[styles.statusGroupTitleText, { color: getStatusColor(status) }]}>
            {getStatusText(status)} ({count})
          </Text>
        </View>
      </View>
    );
  };

  const fetchOrders = async (page = 1, reset = false) => {
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
      if (typeFilter !== 'All') params.append('filters[order_type]', typeFilter.toLowerCase());
      if (statusFilter !== 'All') params.append('filters[status]', statusFilter.toLowerCase());
      if (search) params.append('search', search);

      const response = await apiService.get(`/admin/orders?${params}`);
      
      if (response.success && response.data) {
        // Debug: Log pagination info
        console.log(`[Orders] Page ${page}, Received ${response.data.length} orders, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        const newOrders = response.data.map((item: any) => ({
          id: item.id,
          type: item.order_type === 'rental' ? 'Rental' : 'Purchase',
          customer: item.customer_name || item.customer_email || 'N/A',
          status: item.status || 'N/A',
          details: item.item_name + (item.notes ? ` - ${item.notes}` : ''),
          quotation_amount: item.quotation_amount,
          quotation_price: item.quotation_price,
          quotation_notes: item.quotation_notes,
          quotation_schedule: item.order_date,
          penalty_status: item.penalty_status,
          counter_offer_amount: item.counter_offer_amount,
          counter_offer_notes: item.counter_offer_notes,
          counter_offer_status: item.counter_offer_status,
        }));

        if (reset) {
          setOrders(newOrders);
        } else {
          // Deduplicate orders by id and order_type to prevent duplicates
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => `${o.type}-${o.id}`));
            const uniqueNewOrders = newOrders.filter(o => !existingIds.has(`${o.type}-${o.id}`));
            return [...prev, ...uniqueNewOrders];
          });
        }

        setHasMorePages(response.pagination?.has_more_pages || false);
        setCurrentPage(page);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (reset) {
        Alert.alert('Error', 'Failed to fetch orders.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, true);
  }, [typeFilter, statusFilter, search]);

  const loadMore = () => {
    if (!loadingMore && hasMorePages) {
      fetchOrders(currentPage + 1, false);
    }
  };

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
  const handleOrderAction = async (action: 'approve' | 'decline') => {
    if (!selectedOrder) return;
    const endpoint =
      selectedOrder.type === 'Rental'
        ? `/rentals/${selectedOrder.id}/${action}`
        : `/purchases/${selectedOrder.id}/${action}`;
    try {
      await apiService.request(endpoint, { method: 'POST' });
      handleCloseDetails();
      // Orders will be automatically refreshed by the real-time polling
    } catch (err) {
      Alert.alert('Error', `Failed to ${action} order.`);
    }
  };

  // Transaction action handlers
  const handleCancelOrder = async (order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel this ${order.type.toLowerCase()}? This action cannot be undone.`,
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
              const endpoint = order.type === 'Rental' 
                ? `/rentals/${order.id}/cancel`
                : `/purchases/${order.id}/cancel`;
              await apiService.request(endpoint, { method: 'POST' });
              Alert.alert('Success', `${order.type} has been cancelled successfully.`);
              // Orders will be automatically refreshed by the real-time polling
            } catch (error: any) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', `Failed to cancel ${order.type.toLowerCase()}: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditOrder = (order: Order) => {
    Alert.alert(
      'Edit Order',
      `This will allow you to modify this ${order.type.toLowerCase()} details. Do you want to continue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => {
            // Navigate to the appropriate order management screen for editing
            Alert.alert('Edit Feature', 'Edit functionality will be implemented based on your specific requirements.');
          },
        },
      ]
    );
  };

  const handleRemoveOrder = async (order: Order) => {
    Alert.alert(
      'Remove Order',
      `Are you sure you want to permanently remove this cancelled ${order.type.toLowerCase()}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const endpoint = order.type === 'Rental' 
                ? `/rentals/${order.id}/remove`
                : `/purchases/${order.id}/remove`;
              await apiService.request(endpoint, { method: 'DELETE' });
              Alert.alert('Success', `${order.type} has been removed successfully.`);
              // Orders will be automatically refreshed by the real-time polling
            } catch (error: any) {
              console.error('Error removing order:', error);
              Alert.alert('Error', `Failed to remove ${order.type.toLowerCase()}: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async () => {
    try {
      const { Linking } = require('react-native');
      const reportUrl = `http://192.168.1.54:8000/api/admin/orders/generate-report`;
      await Linking.openURL(reportUrl);
      Alert.alert('Success', 'Report opened in browser');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const handleRemoveAllCancelled = async () => {
    const cancelledOrders = orders.filter(order => order.status === 'cancelled');
    Alert.alert(
      'Remove All Cancelled Orders',
      `Are you sure you want to permanently remove all ${cancelledOrders.length} cancelled orders? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Remove all cancelled orders
              const removePromises = cancelledOrders.map(order => {
                const endpoint = order.type === 'Rental' 
                  ? `/rentals/${order.id}/remove`
                  : `/purchases/${order.id}/remove`;
                return apiService.request(endpoint, { method: 'DELETE' });
              });
              
              await Promise.all(removePromises);
              Alert.alert('Success', `All ${cancelledOrders.length} cancelled orders have been removed successfully.`);
              // Orders will be automatically refreshed by the real-time polling
            } catch (error: any) {
              console.error('Error removing cancelled orders:', error);
              Alert.alert('Error', `Failed to remove some cancelled orders: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Filtering logic
  const filteredOrders = orders.filter(order => {
    const matchesType = typeFilter === 'All' || order.type === typeFilter;
    let matchesStatus = false;
    
    if (statusFilter === 'All') {
      matchesStatus = true;
    } else if (statusFilter === 'counter_offer_pending') {
      matchesStatus = order.status === 'counter_offer_pending';
    } else {
      matchesStatus = order.status === statusFilter;
    }
    
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
    <KeyboardAvoidingWrapper style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="file-tray-full" size={28} color={Colors.primary} />
          <Text style={styles.title}>Manage Orders</Text>
          <View style={styles.realtimeIndicator}>
            <View style={styles.realtimeDot} />
            <Text style={styles.realtimeText}>Live</Text>
          </View>
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
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 999999, left: 0 }]}>
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
              {getStatusFilterDisplayText(statusFilter)}
            </Text>
            <Ionicons 
              name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
          
          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <View style={[styles.dropdownMenuAbsolute, { top: 45, zIndex: 999999, left: 0 }]}>
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
                    setStatusFilter('quotation_sent');
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Quotation Sent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                onPress={() => {
                    setStatusFilter('counter_offer_pending');
                    setShowStatusDropdown(false);
                  }}
                >
                <Text style={styles.dropdownItemText}>Counter Offer{'\n'}Pending</Text>
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
                    setStatusFilter('ready_for_pickup');
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Ready for Pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                onPress={() => {
                    setStatusFilter('picked_up');
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Picked Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                onPress={() => {
                    setStatusFilter('returned');
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Returned</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                onPress={() => {
                    setStatusFilter('declined');
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Declined</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Search Bar - Below the filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="John Doe, Jane Smith"
          value={search}
          placeholderTextColor="#999"
          onChangeText={setSearch}
          onFocus={() => {
            setShowTypeDropdown(false);
            setShowStatusDropdown(false);
          }}
        />
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
        
        {orders.some(order => order.status === 'cancelled') && (
          <TouchableOpacity
            style={styles.removeAllButton}
            onPress={handleRemoveAllCancelled}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.removeAllButtonText}>
              Remove All Cancelled ({orders.filter(order => order.status === 'cancelled').length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Spacing between filters and table */}
      <View style={styles.tableSpacing} />

      {/* Transactions Monitoring */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Transactions Monitoring</Text>
            <Text style={styles.sectionSubtitle}>
              {orders.length} transactions • {orders.filter(o => o.type === 'Rental').length} rentals, {orders.filter(o => o.type === 'Purchase').length} purchases
            </Text>
          </View>
          <View style={styles.sectionHeaderRight}>
            <Text style={styles.transactionCount}>{orders.length} transactions</Text>
          </View>
        </View>
        
        <View style={styles.transactionsContent}>
          {loading && orders.length === 0 ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No orders found</Text>
            </View>
          ) : (
            <FlatList
              data={getGroupedOrdersData()}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return renderStatusGroupHeader(item.status || '', item.count || 0);
                } else {
                  return renderOrderCard({ item: item.order! });
                }
              }}
              keyExtractor={(item, index) => {
                if (item.type === 'header') {
                  return `header-${item.status}`;
                } else {
                  return `order-${item.order?.type}-${item.order?.id}`;
                }
              }}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more orders...</Text>
                  </View>
                ) : null
              }
              contentContainerStyle={styles.cardsContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseDetails}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity
                onPress={handleCloseDetails}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.orderDetailCard}>
                {/* Item Image */}
                {(() => {
                  // Extract clothing type from details (e.g., "Suit Marty - Badly needed..." -> "Suit Marty")
                  const detailsText = selectedOrder.details || '';
                  const clothingTypeName = detailsText.split(' - ')[0] || detailsText.split(',')[0] || detailsText;
                  
                  const clothingType = CLOTHING_TYPES.find(type => 
                    type.label === clothingTypeName || 
                    type.label === selectedOrder.details ||
                    detailsText.includes(type.label)
                  );
                  
                  return clothingType ? (
                    <View style={styles.itemImageContainer}>
                      {clothingType.image ? (
                        <Image 
                          source={clothingType.image} 
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : clothingType.imageUrl ? (
                        <Image 
                          source={{ uri: clothingType.imageUrl }} 
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.itemImagePlaceholder, { backgroundColor: clothingType.color }]}>
                          <Text style={styles.itemImageIcon}>{clothingType.icon}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    // Fallback image if no clothing type found
                    <View style={styles.itemImageContainer}>
                      <View style={[styles.itemImagePlaceholder, { backgroundColor: '#6B7280' }]}>
                        <Ionicons name="shirt-outline" size={48} color="#fff" />
                      </View>
                    </View>
                  );
                })()}
                
                <View style={styles.orderDetailHeader}>
                  <Text style={styles.orderDetailTitle}>
                    {(() => {
                      // Extract clean clothing type name (e.g., "Suit Marty - Badly needed..." -> "Suit Marty")
                      const detailsText = selectedOrder.details || '';
                      return detailsText.split(' - ')[0] || detailsText.split(',')[0] || detailsText;
                    })()}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusText(selectedOrder.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order ID:</Text>
                  <Text style={styles.detailValue}>#{selectedOrder.id}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Type:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.type}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Name:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.customer}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{getStatusText(selectedOrder.status)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Details:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.details}</Text>
                </View>

                {/* Quotation Section - for quotation_sent orders */}
                {selectedOrder.status === 'quotation_sent' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quotation Amount:</Text>
                      <Text style={styles.detailValue}>
                        ₱{((selectedOrder.quotation_amount || selectedOrder.quotation_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    {selectedOrder.quotation_schedule && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Schedule:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.quotation_schedule}</Text>
                      </View>
                    )}
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={[styles.detailValue, styles.notesValue]}>
                        {selectedOrder.quotation_notes || '—'}
                      </Text>
                    </View>
                  </>
                )}

                {/* Counter Offer Section */}
                {selectedOrder.status === 'counter_offer_pending' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Counter Offer Amount:</Text>
                      <Text style={styles.detailValue}>
                        ₱{selectedOrder.counter_offer_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Counter Offer Notes:</Text>
                      <Text style={[styles.detailValue, styles.notesValue]}>
                        {selectedOrder.counter_offer_notes || '—'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Original Quotation:</Text>
                      <Text style={styles.detailValue}>
                        ₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Counter Offer Action Buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 0 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 }}
                        onPress={async () => {
                          try {
                            const endpoint = selectedOrder.type === 'Purchase' 
                              ? `/purchases/${selectedOrder.id}/accept-counter-offer`
                              : `/rentals/${selectedOrder.id}/accept-counter-offer`;
                            
                            await apiService.request(endpoint, { method: 'POST' });
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
                              counter_offer_amount: r.counter_offer_amount,
                              counter_offer_notes: r.counter_offer_notes,
                              counter_offer_status: r.counter_offer_status,
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
                              counter_offer_amount: p.counter_offer_amount,
                              counter_offer_notes: p.counter_offer_notes,
                              counter_offer_status: p.counter_offer_status,
                            }));
                            setOrders([...rentals, ...purchases]);
                            setLoading(false);
                          } catch (error) {
                            Alert.alert('Error', 'Failed to accept counter offer.');
                          }
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, flexShrink: 0 }}>Accept</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.background.light, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderWidth: 1, borderColor: Colors.border.light, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}
                        onPress={async () => {
                          try {
                            const endpoint = selectedOrder.type === 'Purchase' 
                              ? `/purchases/${selectedOrder.id}/reject-counter-offer`
                              : `/rentals/${selectedOrder.id}/reject-counter-offer`;
                            
                            await apiService.request(endpoint, { method: 'POST' });
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
                              counter_offer_amount: r.counter_offer_amount,
                              counter_offer_notes: r.counter_offer_notes,
                              counter_offer_status: r.counter_offer_status,
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
                              counter_offer_amount: p.counter_offer_amount,
                              counter_offer_notes: p.counter_offer_notes,
                              counter_offer_status: p.counter_offer_status,
                            }));
                            setOrders([...rentals, ...purchases]);
                            setLoading(false);
                          } catch (error) {
                            Alert.alert('Error', 'Failed to reject counter offer.');
                          }
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={Colors.text.primary} />
                        <Text style={{ color: Colors.text.primary, fontWeight: 'bold', fontSize: 15, flexShrink: 0 }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Purchase In Progress Section */}
                {selectedOrder.status === 'in_progress' && selectedOrder.type === 'Purchase' && (
                  <View style={{ backgroundColor: '#f9fbe7', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#cddc39' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Quotation Accepted - In Progress</Text>
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
                          const endpoint = `/purchases/${selectedOrder.id}/ready-for-pickup`;
                          
                          await apiService.request(endpoint, { method: 'POST' });
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
                            counter_offer_amount: r.counter_offer_amount,
                            counter_offer_notes: r.counter_offer_notes,
                            counter_offer_status: r.counter_offer_status,
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
                            counter_offer_amount: p.counter_offer_amount,
                            counter_offer_notes: p.counter_offer_notes,
                            counter_offer_status: p.counter_offer_status,
                          }));
                          setOrders([...rentals, ...purchases]);
                          setLoading(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to mark purchase as ready for pickup.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                      <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Mark as Ready for Pickup</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Purchase Ready for Pickup Section */}
                {selectedOrder.status === 'ready_for_pickup' && selectedOrder.type === 'Purchase' && (
                  <View style={{ backgroundColor: '#e8f5e8', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#4caf50' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Ready for Pickup</Text>
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

                    {/* Mark as Picked Up button for Purchase */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          await apiService.markPurchaseAsPickedUp(selectedOrder.id);
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
                            counter_offer_amount: r.counter_offer_amount,
                            counter_offer_notes: r.counter_offer_notes,
                            counter_offer_status: r.counter_offer_status,
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
                            counter_offer_amount: p.counter_offer_amount,
                            counter_offer_notes: p.counter_offer_notes,
                            counter_offer_status: p.counter_offer_status,
                          }));
                          setOrders([...rentals, ...purchases]);
                          setLoading(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to mark purchase as picked up.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                      <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Mark as Picked Up</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Purchase Picked Up Section */}
                {selectedOrder.status === 'picked_up' && selectedOrder.type === 'Purchase' && (
                  <View style={{ backgroundColor: '#e8f5e8', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#4caf50' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-done-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Picked Up - Transaction Complete</Text>
                    </View>
                    
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="cash-outline" size={20} color="#388e3c" />
                        <Text style={{ fontSize: 16, color: '#666', marginLeft: 8, fontWeight: '600' }}>Final Amount:</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#388e3c', fontWeight: 'bold', marginLeft: 28 }}>
                        ₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    <View style={{ backgroundColor: '#c8e6c9', padding: 12, borderRadius: 8, marginTop: 16 }}>
                      <Text style={{ color: '#2e7d32', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                        ✅ Purchase transaction completed successfully!
                      </Text>
                    </View>

                    {/* Receipt Button */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          const { Linking } = require('react-native');
                          const receiptUrl = `${apiService.baseURL}/purchases/${selectedOrder.id}/receipt`;
                          // Open receipt in browser for download
                          await Linking.openURL(receiptUrl);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to generate receipt.');
                        }
                      }}
                    >
                      <Ionicons name="receipt-outline" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Generate Receipt</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Rental Ready for Pickup Section */}
                {selectedOrder.status === 'ready_for_pickup' && selectedOrder.type === 'Rental' && (
                  <View style={{ backgroundColor: '#e8f5e8', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#4caf50' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Ready for Pickup</Text>
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

                    {/* Mark as Picked Up button */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          const endpoint = selectedOrder.type === 'Purchase' 
                            ? `/purchases/${selectedOrder.id}/mark-picked-up`
                            : `/rentals/${selectedOrder.id}/mark-picked-up`;
                          
                          await apiService.request(endpoint, { method: 'POST' });
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
                            counter_offer_amount: r.counter_offer_amount,
                            counter_offer_notes: r.counter_offer_notes,
                            counter_offer_status: r.counter_offer_status,
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
                            counter_offer_amount: p.counter_offer_amount,
                            counter_offer_notes: p.counter_offer_notes,
                            counter_offer_status: p.counter_offer_status,
                          }));
                          setOrders([...rentals, ...purchases]);
                          setLoading(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to mark order as picked up.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                      <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Mark as Picked Up</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Rental Picked Up Section */}
                {selectedOrder.status === 'picked_up' && selectedOrder.type === 'Rental' && (
                  <View style={{ backgroundColor: '#e3f2fd', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#2196f3' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="bag-check" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Picked Up</Text>
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


                    {/* Mark as Returned button */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          const endpoint = selectedOrder.type === 'Purchase' 
                            ? `/purchases/${selectedOrder.id}/mark-returned`
                            : `/rentals/${selectedOrder.id}/mark-returned`;
                          
                          await apiService.request(endpoint, { method: 'POST' });
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
                            counter_offer_amount: r.counter_offer_amount,
                            counter_offer_notes: r.counter_offer_notes,
                            counter_offer_status: r.counter_offer_status,
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
                            counter_offer_amount: p.counter_offer_amount,
                            counter_offer_notes: p.counter_offer_notes,
                            counter_offer_status: p.counter_offer_status,
                          }));
                          setOrders([...rentals, ...purchases]);
                          setLoading(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to mark order as returned.');
                        }
                      }}
                    >
                      <Ionicons name="return-up-back" size={20} color="#FFD700" />
                      <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Mark as Returned</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Rental Returned Section */}
                {selectedOrder.status === 'returned' && selectedOrder.type === 'Rental' && (
                  <View style={{ backgroundColor: '#e8f5e8', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#4caf50' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-done-circle" size={24} color="#014D40" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#014D40' }}>Returned - Transaction Complete</Text>
                    </View>
                    
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="cash-outline" size={20} color="#388e3c" />
                        <Text style={{ fontSize: 16, color: '#666', marginLeft: 8, fontWeight: '600' }}>Final Amount:</Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#388e3c', fontWeight: 'bold', marginLeft: 28 }}>
                        ₱{(selectedOrder.quotation_amount || selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    <View style={{ backgroundColor: '#c8e6c9', padding: 12, borderRadius: 8, marginTop: 16 }}>
                      <Text style={{ color: '#2e7d32', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                        ✅ Rental transaction completed successfully!
                      </Text>
                    </View>

                    {/* Receipt Button */}
                    <TouchableOpacity
                      style={{ backgroundColor: '#014D40', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
                      onPress={async () => {
                        try {
                          const { Linking } = require('react-native');
                          const receiptUrl = `${apiService.baseURL}/rentals/${selectedOrder.id}/receipt`;
                          // Open receipt in browser for download
                          await Linking.openURL(receiptUrl);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to generate receipt.');
                        }
                      }}
                    >
                      <Ionicons name="receipt-outline" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Generate Receipt</Text>
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
                        placeholder="5000, 7500, 10000"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          setQuotationAmount(text);
                          if (quotationError) setQuotationError('');
                        }}
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
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor="#999"
                            onChangeText={(text) => {
                              setQuotationSchedule(text);
                              if (quotationError) setQuotationError('');
                            }}
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
                        placeholder="Special requirements, timeline, materials needed"
                        placeholderTextColor="#999"
                        multiline={true}
                        onChangeText={setQuotationNotes}
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
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

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
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.light,
    zIndex: 1,
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
    zIndex: 999999,
  },
  filterItem: {
    position: 'relative',
    zIndex: 999999,
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
    zIndex: 999999,
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
    zIndex: 999999,
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
    elevation: 9999,
    zIndex: 9999999,
    minWidth: 120,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    maxHeight: 450, // Limit table height for better scrolling
  },
  tableScroll: {
    width: '100%',
    flexGrow: 1,
    maxHeight: 430, // Slightly less than wrapper to account for padding
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
    marginTop: 2, // Space between filters and search bar
    zIndex: 1, // Lower z-index to ensure dropdowns appear above
  },
  // Modal styles
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 32,
  },


  // Real-time indicator styles
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  realtimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#014D40',
  },
  // Modal styles to match customer side
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
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

  // Transaction Action Buttons
  transactionActions: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 2,
  },
  // Section Styles
  transactionsSection: {
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sectionHeader: {
    padding: 16,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  transactionsContent: {
    padding: 8,
    backgroundColor: Colors.background.light,
  },
  // Card layout styles
  cardsContainer: {
    paddingVertical: 8,
  },
  orderCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  orderType: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    minWidth: 100,
  },
  viewButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#014D40',
  },
  viewButtonText: {
    color: '#014D40',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#014D40',
  },
  editButtonText: {
    color: '#014D40',
    fontSize: 12,
    fontWeight: '600',
  },
  // Remove button styles
  removeButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  // Action buttons container
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
    paddingHorizontal: 0,
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
  // Remove all cancelled orders button styles
  removeAllContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  removeAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Status group styles
  statusGroupHeader: {
    marginBottom: 8,
    marginTop: 16,
  },
  statusGroupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 8,
  },
  statusGroupTitleText: {
    fontSize: 16,
    fontWeight: '600',
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

export default OrdersScreen; 