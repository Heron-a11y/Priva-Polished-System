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

interface RentalForm {
  rentalType: string;
  otherType: string;
  startDate: string;
  specialRequests: string;
  agreementAccepted: boolean;
}

export default function RentalOrderFlow() {
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [formData, setFormData] = useState<RentalForm>({
    rentalType: '',
    otherType: '',
    startDate: '',
    specialRequests: '',
    agreementAccepted: false
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedOrder, setSelectedOrder] = useState<RentalOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const { user } = useAuth();
  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData({...formData, startDate: selectedDate.toISOString().split('T')[0]});
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
    if (!formData.startDate) newErrors.startDate = 'Please select pickup date';
    if (!formData.agreementAccepted) newErrors.agreementAccepted = 'You must accept the rental agreement';

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.startDate && !dateRegex.test(formData.startDate)) {
      newErrors.startDate = 'Please use YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitRentalOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Calculate return date (5 days from start date)
      const startDate = new Date(formData.startDate);
      const returnDate = new Date(startDate);
      returnDate.setDate(startDate.getDate() + 5);

      const payload = {
        item_name: formData.rentalType === 'other' ? formData.otherType : 
                   RENTAL_TYPES.find(t => t.id === formData.rentalType)?.label,
        rental_type: formData.rentalType,
        start_date: formData.startDate,
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
        }, // Default measurements for rental orders
        agreement_accepted: formData.agreementAccepted // Add agreement_accepted
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
      startDate: '',
      specialRequests: '',
      agreementAccepted: false
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



            {/* Date Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Rental Date</Text>
              
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
              </View>
              
              <View style={styles.rentalInfoBox}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.rentalInfoText}>
                  <Text style={styles.rentalInfoBold}>Rental Period:</Text> 5 days from pickup date
                </Text>
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

            {/* User Agreement */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Rental Agreement</Text>
              
              <View style={styles.agreementContainer}>
                <View style={styles.agreementHeader}>
                  <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                  <Text style={styles.agreementHeaderText}>Terms & Conditions</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.viewAgreementButton}
                  onPress={() => setShowAgreementModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                  <Text style={styles.viewAgreementButtonText}>View Complete Terms</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
                
                <View style={styles.agreementSummary}>
                  <View style={styles.agreementItem}>
                    <Ionicons name="time" size={16} color={Colors.warning} />
                    <Text style={styles.agreementItemText}>5-day rental period</Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Ionicons name="cash" size={16} color={Colors.success} />
                    <Text style={styles.agreementItemText}>₱500 rental fee</Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Ionicons name="warning" size={16} color={Colors.error} />
                    <Text style={styles.agreementItemText}>Penalties apply for delays/damage</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.agreementCheckbox,
                    formData.agreementAccepted && styles.agreementCheckboxAccepted
                  ]}
                  onPress={() => setFormData({...formData, agreementAccepted: !formData.agreementAccepted})}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.checkboxContainer,
                    formData.agreementAccepted && styles.checkboxContainerAccepted
                  ]}>
                    {formData.agreementAccepted && (
                      <Ionicons name="checkmark" size={18} color={Colors.text.inverse} />
                    )}
                  </View>
                  <View style={styles.agreementTextContainer}>
                    <Text style={styles.agreementCheckboxText}>
                      I have read and agree to the{' '}
                      <Text style={styles.agreementLink}>terms and conditions</Text>
                      {' '}of the rental agreement
                    </Text>
                    <Text style={styles.agreementNote}>
                      This includes understanding all penalty fees and return requirements
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {errors.agreementAccepted && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.errorText}>{errors.agreementAccepted}</Text>
                  </View>
                )}
              </View>
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

                {/* Penalty Information */}
                {selectedOrder.penalty_breakdown && (
                  <View style={styles.penaltySection}>
                    <Text style={styles.penaltySectionTitle}>Penalty Information</Text>
                    
                    {selectedOrder.penalty_breakdown.delay_days > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Delay Penalty:</Text>
                        <Text style={[styles.detailValue, styles.penaltyValue]}>
                          ₱{selectedOrder.penalty_breakdown.delay_fee} ({selectedOrder.penalty_breakdown.delay_days} days)
                        </Text>
                      </View>
                    )}
                    
                    {selectedOrder.total_penalties > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Penalties:</Text>
                        <Text style={[styles.detailValue, styles.penaltyValue]}>
                          ₱{selectedOrder.total_penalties}
                        </Text>
                      </View>
                    )}
                    
                    {selectedOrder.penalty_status !== 'none' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Penalty Status:</Text>
                        <Text style={[styles.detailValue, 
                          selectedOrder.penalty_status === 'paid' ? styles.paidStatus : styles.pendingStatus
                        ]}>
                          {selectedOrder.penalty_status === 'paid' ? 'Paid' : 'Pending Payment'}
                        </Text>
                      </View>
                    )}
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

      {/* User Agreement Modal */}
      <Modal
        visible={showAgreementModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.agreementModalOverlay}>
          <View style={styles.agreementModalContent}>
            <View style={styles.agreementModalHeader}>
              <Text style={styles.agreementModalTitle}>Rental Agreement & Penalties</Text>
              <TouchableOpacity
                onPress={() => setShowAgreementModal(false)}
                style={styles.agreementCloseButton}
              >
                <Text style={styles.agreementCloseButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.agreementFormContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.agreementScrollContent}
                style={styles.agreementScrollView}
              >
                <View style={styles.agreementHeaderSection}>
                  <View style={styles.agreementIconContainer}>
                    <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.enhancedAgreementTitle}>Rental Agreement & Terms</Text>
                  <Text style={styles.enhancedAgreementSubtitle}>
                    Please read and understand the following terms before proceeding
                  </Text>
                </View>
                
                <View style={styles.enhancedTermsContainer}>
                  <View style={styles.enhancedTermCard}>
                    <View style={styles.enhancedTermHeader}>
                      <Ionicons name="information-circle" size={20} color={Colors.primary} />
                      <Text style={styles.enhancedTermTitle}>Cancellation Policy</Text>
                    </View>
                    <Text style={styles.enhancedTermDescription}>
                      A cancellation fee of ₱500 will be applied to cancelled orders.
                    </Text>
                  </View>
                  
                  <View style={styles.enhancedTermCard}>
                    <View style={styles.enhancedTermHeader}>
                      <Ionicons name="time" size={20} color={Colors.warning} />
                      <Text style={styles.enhancedTermTitle}>Return Policy</Text>
                    </View>
                    <Text style={styles.enhancedTermDescription}>
                      Late returns incur a penalty of ₱100 per day beyond the 5-day rental period.
                    </Text>
                  </View>
                  
                  <View style={styles.enhancedTermCard}>
                    <View style={styles.enhancedTermHeader}>
                      <Ionicons name="warning" size={20} color={Colors.error} />
                      <Text style={styles.enhancedTermTitle}>Damage Assessment</Text>
                    </View>
                    <Text style={styles.enhancedTermDescription}>
                      Damage fees range from ₱200 (minor) to full rental cost (severe damage).
                    </Text>
                  </View>
                  
                  <View style={styles.enhancedTermCard}>
                    <View style={styles.enhancedTermHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                      <Text style={styles.enhancedTermTitle}>Care Requirements</Text>
                    </View>
                    <Text style={styles.enhancedTermDescription}>
                      Handle garments with care and return in original condition to avoid penalties.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.enhancedAgreementFooter}>
                  <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                  <Text style={styles.enhancedAgreementFooterText}>
                    All penalties must be settled before future rentals can be processed.
                  </Text>
                </View>
              </ScrollView>
            </View>

            <View style={styles.agreementModalFooter}>
              <TouchableOpacity
                style={styles.agreementModalButton}
                onPress={() => setShowAgreementModal(false)}
              >
                <Text style={styles.agreementModalButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  formSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    position: 'relative',
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,

  },
  selectedRentalType: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  rentalTypeIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  rentalTypeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  rentalTypeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background.card,
    paddingVertical: 18,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
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
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  agreementCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  agreementCheckboxAccepted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxContainerAccepted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  agreementTextContainer: {
    flex: 1,
  },
  agreementCheckboxText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 10,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  agreementLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  agreementNote: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
  penaltySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  penaltySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  penaltyValue: {
    fontWeight: '600',
    color: Colors.error,
  },
  paidStatus: {
    color: Colors.success,
  },
  pendingStatus: {
    color: Colors.warning,
  },
  agreementContainer: {
    marginTop: 16,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agreementHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  viewAgreementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  viewAgreementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  agreementSummary: {
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  agreementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agreementItemText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.error + '10',
  },
  rentalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  rentalInfoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  rentalInfoBold: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  enhancedAgreementContent: {
    padding: 20,
    paddingBottom: 20,
  },
  agreementHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  agreementIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  enhancedAgreementTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  enhancedAgreementSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  enhancedTermsContainer: {
    marginBottom: 20,
  },
  enhancedTermCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedTermHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  enhancedTermTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  enhancedTermDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginLeft: 32,
  },
  enhancedAgreementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    marginBottom: 20,
  },
  enhancedAgreementFooterText: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },


  agreementCloseButtonText: {
    fontSize: 20,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  agreementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreementModalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '92%',
    minHeight: 550,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  agreementModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  agreementModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  agreementCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  agreementFormContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
    paddingBottom: 0,
    minHeight: 450,
  },
  agreementScrollContent: {
    paddingBottom: 40,
  },
  agreementScrollView: {
    flex: 1,
  },

  agreementModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  agreementModalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  agreementModalButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

