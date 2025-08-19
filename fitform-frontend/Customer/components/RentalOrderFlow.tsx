import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList, ScrollView, Dimensions, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

const RENTAL_TYPES = [
  { id: 'gown', label: 'Gown', icon: '👗', description: 'Elegant formal gowns' },
  { id: 'barong', label: 'Barong', icon: '👔', description: 'Traditional Filipino formal wear' },
  { id: 'suit', label: 'Suit', icon: '🤵', description: 'Professional business suits' },
  { id: 'dress', label: 'Dress', icon: '👗', description: 'Casual and formal dresses' },
  { id: 'tuxedo', label: 'Tuxedo', icon: '🎩', description: 'Black tie formal wear' },
  { id: 'uniform', label: 'Uniform', icon: '👮', description: 'Professional uniforms' },
  { id: 'costume', label: 'Costume', icon: '🎭', description: 'Special event costumes' },
  { id: 'other', label: 'Other', icon: '👕', description: 'Other clothing types' }
];

const RENTAL_DURATIONS = [
  { id: '1_day', label: '1 Day', price: '₱500', description: 'Same day return' },
  { id: '3_days', label: '3 Days', price: '₱1,200', description: 'Weekend rental' },
  { id: '1_week', label: '1 Week', price: '₱2,500', description: 'Weekly rental' },
  { id: '2_weeks', label: '2 Weeks', price: '₱4,500', description: 'Extended rental' }
];

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
}

interface RentalForm {
  rentalType: string;
  otherType: string;
  duration: string;
  startDate: string;
  returnDate: string;
  specialRequests: string;
}

export default function RentalOrderFlow() {
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [formData, setFormData] = useState<RentalForm>({
    rentalType: '',
    otherType: '',
    duration: '',
    startDate: '',
    returnDate: '',
    specialRequests: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedOrder, setSelectedOrder] = useState<RentalOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { user } = useAuth();
  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData({...formData, startDate: selectedDate.toISOString().split('T')[0]});
    }
  };

  const handleReturnDateChange = (event: any, selectedDate?: Date) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      setFormData({...formData, returnDate: selectedDate.toISOString().split('T')[0]});
    }
  };

  useEffect(() => {
    fetchRentalOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      console.log('Selected Order Data:', selectedOrder);
    }
  }, [selectedOrder]);

  // Listen for notification-triggered review
  useEffect(() => {
    if (selectedOrderForReview && selectedOrderForReview.type === 'Rental') {
      const order = orders.find(o => o.id === selectedOrderForReview.id);
      if (order) {
        setSelectedOrder(order);
        setShowQuotationModal(true);
      }
    }
  }, [selectedOrderForReview, orders]);

  const fetchRentalOrders = async () => {
    try {
      const response = await apiService.getRentals();
      const rentalOrders = Array.isArray(response) ? response : response.data || [];
      setOrders(rentalOrders.filter((order: RentalOrder) => 
        order.customer_email === user?.email
      ));
    } catch (error) {
      console.error('Error fetching rental orders:', error);
      setOrders([]);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.rentalType) newErrors.rentalType = 'Please select a rental type';
    if (formData.rentalType === 'other' && !formData.otherType.trim()) {
      newErrors.otherType = 'Please specify the rental type';
    }
    if (!formData.duration) newErrors.duration = 'Please select rental duration';
    if (!formData.startDate) newErrors.startDate = 'Please select pickup date';
    if (!formData.returnDate) newErrors.returnDate = 'Please select return date';

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.startDate && !dateRegex.test(formData.startDate)) {
      newErrors.startDate = 'Please use YYYY-MM-DD format';
    }
    if (formData.returnDate && !dateRegex.test(formData.returnDate)) {
      newErrors.returnDate = 'Please use YYYY-MM-DD format';
    }

    // Validate that return date is after start date
    if (formData.startDate && formData.returnDate) {
      const startDate = new Date(formData.startDate);
      const returnDate = new Date(formData.returnDate);
      if (returnDate <= startDate) {
        newErrors.returnDate = 'Return date must be after pickup date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitRentalOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        item_name: formData.rentalType === 'other' ? formData.otherType : 
                   RENTAL_TYPES.find(t => t.id === formData.rentalType)?.label,
        rental_type: formData.rentalType,
        rental_duration: formData.duration,
        start_date: formData.startDate,
        return_date: formData.returnDate,
        special_requests: formData.specialRequests,
        customer_name: user?.name,
        customer_email: user?.email,
        status: 'pending',
        // Add missing required fields
        rental_date: formData.startDate, // Use start_date as rental_date
        clothing_type: formData.rentalType === 'other' ? formData.otherType : 
                      RENTAL_TYPES.find(t => t.id === formData.rentalType)?.label,
        measurements: {
          bust: 0,
          waist: 0,
          hips: 0,
          shoulder_width: 0,
          arm_length: 0,
          inseam: 0
        } // Default measurements for rental orders
      };

      console.log('Submitting rental order with payload:', payload);
      await apiService.createRental(payload);

      setShowNewRentalModal(false);
      setShowSuccessModal(true);
      resetForm();
      fetchRentalOrders();
    } catch (error: any) {
      console.error('Rental order submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit rental order';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rentalType: '',
      otherType: '',
      duration: '',
      startDate: '',
      returnDate: '',
      specialRequests: ''
    });
    setErrors({});
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return Colors.warning;
      case 'confirmed': return Colors.info;
      case 'quotation_sent': return Colors.primary;
      case 'ready_for_pickup': return Colors.success;
      case 'rented': return Colors.primary;
      case 'returned': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.neutral[500];
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'ready_for_pickup') {
      return 'READY FOR PICK UP';
    }
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === '1970-01-01') {
      return 'Not specified';
    }
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const calculateDuration = (startDate: string, returnDate: string) => {
    if (!startDate || !returnDate || startDate === 'Invalid Date' || returnDate === 'Invalid Date') {
      return 'N/A';
    }
    try {
      const start = new Date(startDate);
      const end = new Date(returnDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'N/A';
      }
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    } catch (error) {
      return 'N/A';
    }
  };

  const renderRentalTypeCard = (type: any) => (
    <TouchableOpacity
      key={type.id}
      style={[
        styles.rentalTypeCard,
        formData.rentalType === type.id && styles.selectedRentalType
      ]}
      onPress={() => setFormData({...formData, rentalType: type.id})}
      activeOpacity={0.7}
    >
      <Text style={styles.rentalTypeIcon}>{type.icon}</Text>
      <Text style={styles.rentalTypeLabel}>{type.label}</Text>
      <Text style={styles.rentalTypeDescription}>{type.description}</Text>
      {formData.rentalType === type.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDurationCard = (duration: any) => (
    <TouchableOpacity
      key={duration.id}
      style={[
        styles.durationCard,
        formData.duration === duration.id && styles.selectedDuration
      ]}
      onPress={() => setFormData({...formData, duration: duration.id})}
      activeOpacity={0.7}
    >
      <Text style={styles.durationLabel}>{duration.label}</Text>
      <Text style={styles.durationPrice}>{duration.price}</Text>
      <Text style={styles.durationDescription}>{duration.description}</Text>
      {formData.duration === duration.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOrderCard = (order: RentalOrder) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderItemName}>{order.item_name}</Text>
          <Text style={styles.orderType}>🔄 Rental</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.orderDetailText}>
            {formatDate(order.rental_date)} - {formatDate(order.return_date)}
          </Text>
        </View>
        <View style={styles.orderDetailRow}>
          <Ionicons name="time-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.orderDetailText}>
            {calculateDuration(order.rental_date, order.return_date)}
          </Text>
        </View>
        <View style={styles.orderDetailRow}>
          <Ionicons name="cash-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.orderDetailText}>
            {order.quotation_amount ? `₱${order.quotation_amount.toLocaleString()}` : 'TBD'}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        {/* Only show Review Quotation if status is 'quotation_sent' or quotation_status is 'quoted' */}
        {(order.status === 'quotation_sent' || order.quotation_status === 'quoted') && order.quotation_amount && (
          <TouchableOpacity 
            style={styles.reviewQuotationBtn} 
            onPress={(e) => { 
              e.stopPropagation(); // Prevent card click
              setSelectedOrder(order); 
              setShowQuotationModal(true); 
            }}
          >
            <Text style={styles.reviewQuotationBtnText}>Review Quotation</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            console.log('Order data being set:', order);
            setSelectedOrder(order);
            setShowOrderDetails(true);
          }}
        >
          <Ionicons name="eye-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with New Rental Button */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Rental Orders</Text>
          <Text style={styles.sectionSubtitle}>Manage your garment rentals</Text>
        </View>
        <TouchableOpacity
          style={styles.newRentalButton}
          onPress={() => setShowNewRentalModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.text.inverse} />
          <Text style={styles.newRentalButtonText}>New Rental</Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={({ item }) => renderOrderCard(item)}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={64} color={Colors.neutral[400]} />
          <Text style={styles.emptyStateTitle}>No Rental Orders Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start by creating your first rental order for your special event
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setShowNewRentalModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyStateButtonText}>Create First Rental</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* New Rental Modal */}
      <Modal
        visible={showNewRentalModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Rental Order</Text>
            <TouchableOpacity
              onPress={() => setShowNewRentalModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Rental Type Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Select Rental Type</Text>
              <View style={styles.rentalTypesGrid}>
                {RENTAL_TYPES.map(renderRentalTypeCard)}
              </View>
              {formData.rentalType === 'other' && (
                <TextInput
                  style={styles.textInput}
                  placeholder="Specify rental type..."
                  value={formData.otherType}
                  onChangeText={(text) => setFormData({...formData, otherType: text})}
                />
              )}
              {errors.rentalType && <Text style={styles.errorText}>{errors.rentalType}</Text>}
            </View>

            {/* Duration Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Select Rental Duration</Text>
              <View style={styles.durationGrid}>
                {RENTAL_DURATIONS.map(renderDurationCard)}
              </View>
              {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
            </View>

            {/* Date Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Rental Dates</Text>
              
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>Pickup Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color={Colors.primary} />
                    <Text style={styles.datePickerButtonText}>
                      {formData.startDate || 'Select Pickup Date'}
                    </Text>
                  </TouchableOpacity>
                  {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>Return Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowReturnDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color={Colors.primary} />
                    <Text style={styles.datePickerButtonText}>
                      {formData.returnDate || 'Select Return Date'}
                    </Text>
                  </TouchableOpacity>
                  {errors.returnDate && <Text style={styles.errorText}>{errors.returnDate}</Text>}
                </View>
              </View>
            </View>

            {/* Special Requests */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Special Requests</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Any special requirements or notes..."
                value={formData.specialRequests}
                onChangeText={(text) => setFormData({...formData, specialRequests: text})}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowNewRentalModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={submitRentalOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity
                onPress={() => setShowOrderDetails(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.orderDetailCard}>
                <Text style={styles.orderDetailTitle}>{selectedOrder.item_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                    {getStatusText(selectedOrder.status)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.customer_name || 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.customer_email || 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rental Period:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedOrder.rental_date)} - {formatDate(selectedOrder.return_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pickup Date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedOrder.rental_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Return Date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedOrder.return_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {calculateDuration(selectedOrder.rental_date, selectedOrder.return_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Special Requests:</Text>
                  <Text style={[styles.detailValue, styles.notesValue]}>
                    {selectedOrder.notes || 'None'}
                  </Text>
                </View>
                
                {selectedOrder.quotation_status === 'accepted' && selectedOrder.quotation_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quotation Amount:</Text>
                    <Text style={styles.detailValue}>
                      ₱{selectedOrder.quotation_amount.toLocaleString()}
                    </Text>
                  </View>
                )}
                
                {selectedOrder.quotation_status === 'quoted' && selectedOrder.quotation_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quotation Amount:</Text>
                    <Text style={styles.detailValue}>
                      ₱{selectedOrder.quotation_amount.toLocaleString()} (Pending Acceptance)
                    </Text>
                  </View>
                )}
                
                {(!selectedOrder.quotation_amount || selectedOrder.quotation_status === 'pending') && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quotation Amount:</Text>
                    <Text style={styles.detailValue}>
                      Pending
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Quotation Modal */}
      {showQuotationModal && selectedOrder && (
        <View style={styles.modalOverlay}>
          <View style={styles.quotationModalContent}>
            <Text style={styles.modalTitle}>Review Quotation</Text>
            <Text style={styles.quotationAmount}>
              Quotation: ₱{selectedOrder?.quotation_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.quotationNotes}>Notes: {selectedOrder?.quotation_notes || 'No notes provided.'}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.acceptBtn} onPress={async () => { 
                try {
                  await apiService.request(`/rentals/${selectedOrder?.id}/accept-quotation`, { method: 'POST' }); 
                  setShowQuotationModal(false);
                  // Refresh orders after accepting
                  const res = await apiService.getRentals();
                  setOrders(Array.isArray(res) ? res : res.data || []);
                } catch (error) {
                  Alert.alert('Error', 'Failed to accept quotation');
                }
              }}>
                <Text style={styles.acceptBtnText}>Accept Quotation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={async () => { 
                try {
                  await apiService.request(`/rentals/${selectedOrder?.id}/reject-quotation`, { method: 'POST' }); 
                  setShowQuotationModal(false);
                  // Refresh orders after rejecting
                  const res = await apiService.getRentals();
                  setOrders(Array.isArray(res) ? res : res.data || []);
                } catch (error) {
                  Alert.alert('Error', 'Failed to reject quotation');
                }
              }}>
                <Text style={styles.rejectBtnText}>Reject Quotation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowQuotationModal(false); clearOrderReview(); }}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark" size={48} color={Colors.text.inverse} />
            </View>
            
            <Text style={styles.successTitle}>Order Submitted Successfully!</Text>
            <Text style={styles.successMessage}>
              Your rental order has been submitted. We'll send you a quotation soon.
            </Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate ? new Date(formData.startDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showReturnDatePicker && (
        <DateTimePicker
          value={formData.returnDate ? new Date(formData.returnDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleReturnDateChange}
          minimumDate={formData.startDate ? new Date(formData.startDate) : new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 20 : 19,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    color: Colors.text.secondary,
  },
  newRentalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  newRentalButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: Platform.OS === 'ios' ? 13 : 12,
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  orderType: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginTop: -50, // Move up to center better
  },
  emptyStateTitle: {
    fontSize: Platform.OS === 'ios' ? 18 : 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 18,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 14 : 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 32,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  rentalTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rentalTypeCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  selectedRentalType: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  rentalTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rentalTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  rentalTypeDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  durationCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  selectedDuration: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  durationPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  durationDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background.card,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cancelButtonText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: 16,
  },
  orderDetailCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
  },
  successButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotationModalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  quotationAmount: { 
    fontSize: Platform.OS === 'ios' ? 21 : 20, 
    fontWeight: '700', 
    color: Colors.success, 
    marginBottom: 12 
  },
  quotationNotes: { 
    fontSize: Platform.OS === 'ios' ? 17 : 16, 
    color: Colors.text.secondary, 
    marginBottom: 24, 
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 24 : 22
  },
  modalButtonGroup: { 
    width: '100%', 
    marginTop: 8 
  },
  acceptBtn: { 
    backgroundColor: Colors.success, 
    borderRadius: 12, 
    paddingVertical: 16, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  acceptBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16 
  },
  rejectBtn: { 
    backgroundColor: Colors.error, 
    borderRadius: 12, 
    paddingVertical: 16, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  rejectBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16 
  },
  closeBtn: { 
    backgroundColor: Colors.neutral[400], 
    borderRadius: 12, 
    paddingVertical: 16, 
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  closeBtnText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 17 : 16
  },
  reviewQuotationBtn: {
    backgroundColor: Colors.info,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    alignItems: 'center'
  },
  reviewQuotationBtnText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 15 : 14
  },
  notesValue: {
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'left',
    paddingLeft: 8,
  },
});
