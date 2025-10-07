import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList, ScrollView, Dimensions, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Colors } from '../../constants/Colors';
import SuccessModal from '../../components/SuccessModal';
import ARMeasurementScreen from '../screens/RealARMeasurementScreen';

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
  counter_offer_amount: number | null;
  counter_offer_notes: string | null;
  counter_offer_status: string | null;
  created_at: string;
  updated_at: string;
  penalty_breakdown?: {
    delay_days: number;
    delay_fee: number;
  };
  total_penalties?: number;
  penalty_status: string;
  penalty_notes?: string;
  penalty_calculated_at?: string;
}

interface RentalForm {
  rentalType: string;
  otherType: string;
  startDate: string;
  specialRequests: string;
}

// Complete measurements interface for AR and manual input
interface CompleteMeasurements {
  height: number;
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  inseam: number;
  armLength: number;
  neck: number;
  thigh?: number;
}

export default function RentalOrderFlow() {
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [formData, setFormData] = useState<RentalForm>({
    rentalType: '',
    otherType: '',
    startDate: '',
    specialRequests: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedOrder, setSelectedOrder] = useState<RentalOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferNotes, setCounterOfferNotes] = useState('');
  const [reviewAgreementAccepted, setReviewAgreementAccepted] = useState(false);
  
  // AR Measurement states
  const [showARMeasurement, setShowARMeasurement] = useState(false);
  const [measurementMethod, setMeasurementMethod] = useState<'ar' | 'manual' | null>(null);
  const [arMeasurements, setArMeasurements] = useState<CompleteMeasurements | null>(null);
  const [manualMeasurements, setManualMeasurements] = useState<CompleteMeasurements>({
    height: 0,
    chest: 0,
    waist: 0,
    hips: 0,
    shoulders: 0,
    inseam: 0,
    armLength: 0,
    neck: 0
  });

  useEffect(() => {
    if (showQuotationModal) {
      setReviewAgreementAccepted(false);
    }
  }, [showQuotationModal]);

  const { user } = useAuth();
  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();
  const router = useRouter();

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData({...formData, startDate: selectedDate.toISOString().split('T')[0]});
    }
  };

  // AR Measurement handlers
  const handleARMeasurementComplete = (measurements: any) => {
    setArMeasurements(measurements);
    setShowARMeasurement(false);
    setMeasurementMethod('ar');
    console.log('AR Measurements received:', measurements);
  };

  const handleARMeasurementCancel = () => {
    setShowARMeasurement(false);
    setMeasurementMethod(null);
  };

  const handleMeasurementMethodSelect = (method: 'ar' | 'manual') => {
    setMeasurementMethod(method);
    if (method === 'ar') {
      setShowARMeasurement(true);
    }
  };

  // Complete measurement fields for manual input
  const COMPLETE_MEASUREMENT_FIELDS = [
    { key: 'height', label: 'Height' },
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'hips', label: 'Hips' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'inseam', label: 'Inseam' },
    { key: 'armLength', label: 'Arm Length' },
    { key: 'neck', label: 'Neck' }
  ];



  useEffect(() => {
    fetchRentalOrders();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRentalOrders(false);
  }, []);

  // Memoize filtered orders to avoid re-filtering on every render
  const filteredOrders = useMemo(() => 
    orders.filter(order => order.customer_email === user?.email),
    [orders, user?.email]
  );

  useEffect(() => {
    if (selectedOrder && __DEV__) {
      console.log('Selected Order Data:', selectedOrder);
    }
  }, [selectedOrder]);

  // Listen for notification-triggered review
  useEffect(() => {
    if (selectedOrderForReview && selectedOrderForReview.type === 'Rental') {
      const order = orders.find(o => o.id === selectedOrderForReview.id);
      if (order) {
        setSelectedOrder(order);
        
        // Only show quotation modal if order is in a state that requires customer action
        // Don't show quotation modal for completed/finalized orders (declined, in_progress, ready_for_pickup, picked_up, returned)
        const shouldShowQuotation = order.status === 'quotation_sent' || 
                                   order.status === 'counter_offer_pending';
        
        if (shouldShowQuotation) {
          setShowQuotationModal(true);
        } else {
          // For completed/finalized orders, just show order details
          setShowOrderDetails(true);
        }
      }
    }
  }, [selectedOrderForReview, orders]);

  const fetchRentalOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await apiService.getRentals();
      const rentalOrders = Array.isArray(response) ? response : response.data || [];
      const filteredOrders = rentalOrders.filter((order: RentalOrder) => 
        order.customer_email === user?.email
      );
      setOrders(filteredOrders);
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching rental orders:', error);
      }
      setOrders([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.rentalType) newErrors.rentalType = 'Please select a rental type';
    if (formData.rentalType === 'other' && !formData.otherType.trim()) {
      newErrors.otherType = 'Please specify the rental type';
    }
    if (!formData.startDate) newErrors.startDate = 'Please select pickup date';
    if (!measurementMethod) newErrors.measurementMethod = 'Please select a measurement method';
    if (measurementMethod === 'ar' && !arMeasurements) {
      newErrors.measurementMethod = 'Please complete AR measurement';
    }
    if (measurementMethod === 'manual') {
      // Validate all manual measurement fields
      COMPLETE_MEASUREMENT_FIELDS.forEach(field => {
        const value = manualMeasurements[field.key as keyof CompleteMeasurements];
        if (!value || value <= 0) {
          newErrors[field.key] = `${field.label} is required and must be greater than 0`;
        }
      });
    }
    // Agreement validation moved to review quotation modal

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

      // Prepare measurements based on method
      let measurements = {
        height: 0,
        chest: 0,
        waist: 0,
        hips: 0,
        shoulders: 0,
        inseam: 0,
        armLength: 0,
        neck: 0,
        thigh: 0
      };

      if (measurementMethod === 'ar' && arMeasurements) {
        measurements = {
          height: arMeasurements.height || 0,
          chest: arMeasurements.chest || 0,
          waist: arMeasurements.waist || 0,
          hips: arMeasurements.hips || 0,
          shoulders: arMeasurements.shoulders || 0,
          inseam: arMeasurements.inseam || 0,
          armLength: arMeasurements.armLength || 0,
          neck: arMeasurements.neck || 0,
          thigh: arMeasurements.thigh || 0
        };
      } else if (measurementMethod === 'manual') {
        measurements = {
          height: manualMeasurements.height || 0,
          chest: manualMeasurements.chest || 0,
          waist: manualMeasurements.waist || 0,
          hips: manualMeasurements.hips || 0,
          shoulders: manualMeasurements.shoulders || 0,
          inseam: manualMeasurements.inseam || 0,
          armLength: manualMeasurements.armLength || 0,
          neck: manualMeasurements.neck || 0,
          thigh: manualMeasurements.thigh || 0
        };
      }

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
        measurements: measurements,
        measurement_method: measurementMethod // Track measurement method
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
      specialRequests: ''
    });
    setErrors({});
  };

  const submitCounterOffer = async () => {
    if (!selectedOrder || !counterOfferAmount) {
      Alert.alert('Error', 'Please enter a counter offer amount');
      return;
    }

    try {
      await apiService.submitRentalCounterOffer(selectedOrder.id, {
        counter_offer_amount: parseFloat(counterOfferAmount),
        counter_offer_notes: counterOfferNotes || null,
      });

      Alert.alert('Success', 'Counter offer submitted successfully');
      setShowCounterOfferModal(false);
      setCounterOfferAmount('');
      setCounterOfferNotes('');
      fetchRentalOrders();
    } catch (error: any) {
      console.error('Counter offer error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit counter offer');
    }
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
    switch (status.toLowerCase()) {
      case 'pending':
        return 'PENDING';
      case 'quotation_sent':
        return 'QUOTATION SENT';
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
      case 'declined':
        return 'DECLINED';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Helper functions for penalty status display
  const getPenaltyStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'none': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getPenaltyStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'PAID';
      case 'pending': return 'PENDING';
      case 'none': return 'NONE';
      default: return 'NONE';
    }
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
        {/* Only show Review Quotation if quotation is sent and customer hasn't responded yet */}
        {order.status === 'quotation_sent' && 
         order.quotation_amount && 
         !order.quotation_responded_at && (
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
        
        {/* Show Review Quotation for counter offer pending (admin needs to respond) */}
        {order.status === 'counter_offer_pending' && 
         order.counter_offer_amount && 
         order.counter_offer_status === 'pending' && (
          <TouchableOpacity 
            style={styles.reviewQuotationBtn} 
            onPress={(e) => { 
              e.stopPropagation(); // Prevent card click
              setSelectedOrder(order); 
              setShowQuotationModal(true); 
            }}
          >
            <Text style={styles.reviewQuotationBtnText}>Review Counter Offer</Text>
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
          data={filteredOrders}
          renderItem={({ item }) => renderOrderCard(item)}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
          refreshing={refreshing}
          onRefresh={onRefresh}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of each item
            offset: 200 * index,
            index,
          })}
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
            <View style={styles.styledSection}>
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
            </View>


            {/* Special Requests */}
            <View style={styles.styledSection}>
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
            </View>

            {/* Measurement Method Selection */}
            <View style={styles.styledSection}>
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Measurement Method</Text>
                <Text style={styles.formSectionSubtitle}>Choose how you'd like to provide your measurements</Text>
                
                <View style={styles.measurementMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.measurementMethodCard,
                      measurementMethod === 'ar' && styles.selectedMeasurementMethod
                    ]}
                    onPress={() => handleMeasurementMethodSelect('ar')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.measurementMethodIcon}>
                      <Ionicons name="scan" size={32} color={measurementMethod === 'ar' ? Colors.primary : Colors.text.secondary} />
                    </View>
                    <Text style={[styles.measurementMethodTitle, measurementMethod === 'ar' && styles.selectedMeasurementMethodText]}>
                      AR Measurement
                    </Text>
                    <Text style={styles.measurementMethodDescription}>
                      Use your camera for accurate body measurements
                    </Text>
                    {measurementMethod === 'ar' && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.measurementMethodCard,
                      measurementMethod === 'manual' && styles.selectedMeasurementMethod
                    ]}
                    onPress={() => handleMeasurementMethodSelect('manual')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.measurementMethodIcon}>
                      <Ionicons name="create-outline" size={32} color={measurementMethod === 'manual' ? Colors.primary : Colors.text.secondary} />
                    </View>
                    <Text style={[styles.measurementMethodTitle, measurementMethod === 'manual' && styles.selectedMeasurementMethodText]}>
                      Manual Input
                    </Text>
                    <Text style={styles.measurementMethodDescription}>
                      Enter measurements manually
                    </Text>
                    {measurementMethod === 'manual' && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Show AR Measurement Results */}
                {measurementMethod === 'ar' && arMeasurements && (
                  <View style={styles.arResultsContainer}>
                    <Text style={styles.arResultsTitle}>AR Measurement Results</Text>
                    <View style={styles.arResultsGrid}>
                      {Object.entries(arMeasurements).map(([key, value]) => (
                        <View key={key} style={styles.arResultItem}>
                          <Text style={styles.arResultLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                          <Text style={styles.arResultValue}>{value} cm</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Manual Input Fields */}
                {measurementMethod === 'manual' && (
                  <View style={styles.manualInputContainer}>
                    <Text style={styles.manualInputTitle}>Manual Measurement Input</Text>
                    <Text style={styles.manualInputSubtitle}>Enter your measurements in centimeters</Text>
                    
                    <View style={styles.measurementGrid}>
                      {COMPLETE_MEASUREMENT_FIELDS.map(field => (
                        <View key={field.key} style={styles.measurementGridItem}>
                          <Text style={styles.measurementFieldLabel}>{field.label}</Text>
                          <TextInput
                            style={styles.measurementInput}
                            placeholder={`${field.label} (cm)`}
                            value={manualMeasurements[field.key as keyof CompleteMeasurements] && manualMeasurements[field.key as keyof CompleteMeasurements]! > 0 ? 
                                   manualMeasurements[field.key as keyof CompleteMeasurements]!.toString() : ''}
                            onChangeText={(text) => {
                              const value = parseFloat(text) || 0;
                              setManualMeasurements(prev => ({
                                ...prev,
                                [field.key]: value
                              }));
                            }}
                            keyboardType="numeric"
                          />
                          {errors[field.key] && (
                            <Text style={styles.measurementError}>{errors[field.key]}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Change Measurement Method Button */}
                {measurementMethod && (
                  <TouchableOpacity
                    style={styles.changeMethodButton}
                    onPress={() => {
                      setMeasurementMethod(null);
                      setArMeasurements(null);
                      setManualMeasurements({
                        height: 0,
                        chest: 0,
                        waist: 0,
                        hips: 0,
                        shoulders: 0,
                        inseam: 0,
                        armLength: 0,
                        neck: 0
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                    <Text style={styles.changeMethodButtonText}>Change Measurement Method</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Rental Agreement moved to Review Quotation modal */}

            {/* Measurement Method Error */}
            {errors.measurementMethod && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{errors.measurementMethod}</Text>
              </View>
            )}
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
                
                {/* Measurement Details */}
                {selectedOrder.measurements && (
                  <>
                    <View style={styles.measurementsSpacer} />
                    <View style={styles.measurementsTitleContainer}>
                      <Text style={styles.measurementsTitle}>Measurements</Text>
                    </View>
                    {Object.entries(selectedOrder.measurements).map(([key, value]) => (
                      <View key={key} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                        </Text>
                        <Text style={styles.detailValue}>
                          {value} cm
                        </Text>
                      </View>
                    ))}
                  </>
                )}
                
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

                {/* Enhanced Penalty Information */}
                {(selectedOrder.penalty_breakdown || selectedOrder.penalty_status !== 'none' || selectedOrder.total_penalties > 0) && (
                  <View style={styles.penaltySection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="warning" size={20} color="#ff9800" />
                      <Text style={styles.penaltySectionTitle}>Penalty Information</Text>
                    </View>
                    
                    {selectedOrder.penalty_breakdown && selectedOrder.penalty_breakdown.delay_days > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Delay Penalty:</Text>
                        <Text style={[styles.detailValue, styles.penaltyValue]}>
                          ₱{selectedOrder.penalty_breakdown.delay_fee} ({selectedOrder.penalty_breakdown.delay_days} days)
                        </Text>
                      </View>
                    )}
                    
                    {selectedOrder.total_penalties && selectedOrder.total_penalties > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Penalties:</Text>
                        <Text style={[styles.detailValue, styles.penaltyValue]}>
                          ₱{(selectedOrder.total_penalties || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    )}
                    
                    {selectedOrder.penalty_status && selectedOrder.penalty_status !== 'none' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Penalty Status:</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getPenaltyStatusColor(selectedOrder.penalty_status) + '20', alignSelf: 'flex-start' }]}>
                          <Text style={[styles.statusText, { color: getPenaltyStatusColor(selectedOrder.penalty_status) }]}>
                            {getPenaltyStatusText(selectedOrder.penalty_status)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedOrder.penalty_notes && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Penalty Notes:</Text>
                        <Text style={[styles.detailValue, { fontStyle: 'italic', color: '#666' }]}>
                          {selectedOrder.penalty_notes}
                        </Text>
                      </View>
                    )}

                    {selectedOrder.penalty_calculated_at && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Calculated On:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOrder.penalty_calculated_at).toLocaleDateString()}
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

      {/* Enhanced Review Quotation Modal */}
      <Modal
        visible={showQuotationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowQuotationModal(false); clearOrderReview(); }}
      >
        <View style={styles.enhancedModalContainer}>
          {/* Enhanced Header */}
          <View style={styles.enhancedModalHeader}>
            <View style={styles.enhancedModalHeaderContent}>
              <View style={styles.enhancedModalIconContainer}>
                <Ionicons name="document-text" size={24} color={Colors.primary} />
              </View>
              <View style={styles.enhancedModalTitleContainer}>
                <Text style={styles.enhancedModalTitle}>Review Quotation</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.enhancedCloseButton}
              onPress={() => { setShowQuotationModal(false); clearOrderReview(); }}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Enhanced Content */}
          <ScrollView 
            style={styles.enhancedModalContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.enhancedModalScrollContent}
          >
            {/* Quotation Summary Card */}
            <View style={styles.quotationSummaryCard}>
              <View style={styles.quotationSummaryHeader}>
                <Ionicons name="cash" size={20} color={Colors.primary} />
                <Text style={styles.quotationSummaryTitle}>Quotation Summary</Text>
              </View>
              <View style={styles.quotationAmountContainer}>
                <Text style={styles.quotationAmountLabel}>Total Amount</Text>
                <Text style={styles.quotationAmountValue}>
                  ₱{selectedOrder?.quotation_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.quotationStatusContainer}>
                <View style={styles.quotationStatusBadge}>
                  <Ionicons name="time" size={16} color={Colors.warning} />
                  <Text style={styles.quotationStatusText}>Pending Your Response</Text>
                </View>
              </View>
            </View>

            {/* Order Details Card */}
            <View style={styles.orderDetailsCard}>
              <View style={styles.orderDetailsHeader}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.orderDetailsTitle}>Order Details</Text>
              </View>
              
              <View style={styles.enhancedDetailRow}>
                <Text style={styles.enhancedDetailLabel}>Order ID</Text>
                <Text style={styles.enhancedDetailValue}>#{selectedOrder?.id}</Text>
              </View>
              
              <View style={styles.enhancedDetailRow}>
                <Text style={styles.enhancedDetailLabel}>Rental Type</Text>
                <Text style={styles.enhancedDetailValue}>
                  {selectedOrder?.item_name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.enhancedDetailRow}>
                <Text style={styles.enhancedDetailLabel}>Start Date</Text>
                <Text style={styles.enhancedDetailValue}>
      {selectedOrder?.rental_date ? 
        new Date(selectedOrder.rental_date).toLocaleDateString() : 
        'N/A'
      }
                </Text>
              </View>
              
              <View style={styles.enhancedDetailRow}>
                <Text style={styles.enhancedDetailLabel}>Special Requests</Text>
                <Text style={styles.enhancedDetailValue}>
                  {selectedOrder?.notes && selectedOrder.notes.trim() !== '' ? 
                    selectedOrder.notes : 
                    'No special requests'
                  }
                </Text>
              </View>
            </View>

            {/* Quotation Notes Card */}
            {selectedOrder?.quotation_notes && (
              <View style={styles.quotationNotesCard}>
                <View style={styles.quotationNotesHeader}>
                  <Ionicons name="document-text" size={20} color={Colors.primary} />
                  <Text style={styles.quotationNotesTitle}>Additional Notes</Text>
                </View>
                <Text style={styles.quotationNotesText}>{selectedOrder?.quotation_notes}</Text>
              </View>
            )}

            {/* Counter Offer Card */}
            <View style={styles.counterOfferCard}>
              <View style={styles.counterOfferCardHeader}>
                <Ionicons name="swap-horizontal" size={20} color={Colors.warning} />
                <Text style={styles.counterOfferCardTitle}>Not Satisfied with the Price?</Text>
              </View>
              <Text style={styles.counterOfferCardDescription}>
                You can make a counter offer to negotiate the rental price with our team.
              </Text>
            <TouchableOpacity 
              style={styles.enhancedCounterOfferButton}
              onPress={() => {
                setShowQuotationModal(false);
                setShowCounterOfferModal(true);
              }}
            >
                <Ionicons name="swap-horizontal" size={20} color={Colors.text.primary} />
                <Text style={styles.enhancedCounterOfferButtonText}>Make Counter Offer</Text>
              </TouchableOpacity>
            </View>

            {/* Agreement Section moved here */}
            <View style={styles.agreementSection}>
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

                <TouchableOpacity
                  style={[styles.agreementCheckbox, reviewAgreementAccepted && styles.agreementCheckboxAccepted]}
                  onPress={() => setReviewAgreementAccepted(!reviewAgreementAccepted)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkboxContainer, reviewAgreementAccepted && styles.checkboxContainerAccepted]}>
                    {reviewAgreementAccepted && (
                      <Ionicons name="checkmark" size={18} color={Colors.text.inverse} />
                    )}
                  </View>
                  <View style={styles.agreementTextContainer}>
                    <Text style={styles.agreementCheckboxText}>
                      I have read and agree to the <Text style={styles.agreementLink}>terms and conditions</Text> of the rental agreement
                    </Text>
                    <Text style={styles.agreementNote}>
                      This includes understanding all penalty fees and return requirements
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Enhanced Action Buttons */}
          <View style={styles.enhancedModalFooter}>
            <TouchableOpacity 
              style={styles.enhancedRejectButton}
              onPress={async () => { 
                try {
                  await apiService.request(`/rentals/${selectedOrder?.id}/reject-quotation`, { method: 'POST' }); 
                  setShowQuotationModal(false);
                  // Optimize: Update local state instead of full refresh
                  setOrders(prevOrders => 
                    prevOrders.map(order => 
                      order.id === selectedOrder?.id 
                        ? { ...order, status: 'quotation_rejected', quotation_status: 'rejected' }
                        : order
                    )
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to reject quotation');
                }
              }}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.primary} />
              <Text style={styles.enhancedRejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.enhancedAcceptButton, !reviewAgreementAccepted && { opacity: 0.6 }]}
              disabled={!reviewAgreementAccepted}
              onPress={async () => { 
                try {
                  await apiService.request(`/rentals/${selectedOrder?.id}/accept-quotation`, { method: 'POST' }); 
                  setShowQuotationModal(false);
                  // Optimize: Update local state instead of full refresh
                  setOrders(prevOrders => 
                    prevOrders.map(order => 
                      order.id === selectedOrder?.id 
                        ? { ...order, status: 'quotation_accepted', quotation_status: 'accepted' }
                        : order
                    )
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to accept quotation');
                }
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.enhancedAcceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Counter Offer Modal */}
      <Modal
        visible={showCounterOfferModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCounterOfferModal(false)}
      >
        <View style={styles.enhancedModalContainer}>
          {/* Enhanced Header */}
          <View style={styles.enhancedModalHeader}>
            <View style={styles.enhancedModalHeaderContent}>
              <View style={styles.enhancedModalIconContainer}>
                <Ionicons name="swap-horizontal" size={24} color={Colors.warning} />
              </View>
              <View style={styles.enhancedModalTitleContainer}>
                <Text style={styles.enhancedModalTitle}>Make Counter Offer</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.enhancedCloseButton}
              onPress={() => { setShowCounterOfferModal(false); setShowQuotationModal(true); }}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Enhanced Content */}
          <ScrollView 
            style={styles.enhancedModalContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.enhancedModalScrollContent}
          >
            {/* Original Quotation Card */}
            <View style={styles.originalQuotationCard}>
              <View style={styles.originalQuotationHeader}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
                <Text style={styles.originalQuotationTitle}>Original Quotation</Text>
              </View>
              <View style={styles.originalQuotationAmount}>
                <Text style={styles.originalQuotationLabel}>Quoted Amount</Text>
                <Text style={styles.originalQuotationValue}>
                  ₱{selectedOrder?.quotation_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.originalQuotationDetails}>
                <View style={styles.originalQuotationDetailsRow}>
                  <Text style={styles.originalQuotationDetail}>Order ID: #{selectedOrder?.id}</Text>
                  <Text style={styles.originalQuotationDetail}>Type: {selectedOrder?.item_name || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Counter Offer Form Card */}
            <View style={styles.counterOfferFormCard}>
              <View style={styles.counterOfferFormHeader}>
                <Ionicons name="create" size={20} color={Colors.warning} />
                <Text style={styles.counterOfferFormTitle}>Your Counter Offer</Text>
              </View>
              
              <View style={styles.enhancedInputGroup}>
                <Text style={styles.enhancedInputLabel}>Counter Offer Amount (₱)</Text>
                <View style={styles.enhancedInputContainer}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.enhancedTextInput}
                    placeholder="Enter your counter offer amount"
                    value={counterOfferAmount}
                    onChangeText={setCounterOfferAmount}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.text.secondary}
                  />
                </View>
                <Text style={styles.inputHelperText}>
                  Suggested: 10-20% less than original quotation
                </Text>
              </View>
              
              <View style={styles.enhancedInputGroup}>
                <Text style={styles.enhancedInputLabel}>Reason for Counter Offer (Optional)</Text>
                <TextInput
                  style={styles.enhancedNotesInput}
                  placeholder="Explain why you're making a counter offer or any special requests..."
                  value={counterOfferNotes}
                  onChangeText={setCounterOfferNotes}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={Colors.text.secondary}
                />
              </View>
            </View>

            {/* Rental Tips Card */}
            <View style={styles.negotiationTipsCard}>
              <View style={styles.negotiationTipsHeader}>
                <Ionicons name="bulb" size={20} color={Colors.info} />
                <Text style={styles.negotiationTipsTitle}>Rental Negotiation Tips</Text>
              </View>
              <View style={styles.negotiationTipsList}>
                <View style={styles.negotiationTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.negotiationTipText}>Consider the rental duration and complexity</Text>
                </View>
                <View style={styles.negotiationTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.negotiationTipText}>Be reasonable with your counter offer</Text>
                </View>
                <View style={styles.negotiationTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.negotiationTipText}>Explain your reasoning clearly</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Enhanced Action Buttons */}
          <View style={styles.enhancedModalFooter}>
            <TouchableOpacity 
              style={styles.enhancedCancelButton}
              onPress={() => { setShowCounterOfferModal(false); setShowQuotationModal(true); }}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.primary} />
              <Text style={styles.enhancedCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.enhancedSubmitButton}
              onPress={async () => {
                if (!counterOfferAmount || isNaN(Number(counterOfferAmount))) {
                  Alert.alert('Error', 'Please enter a valid counter offer amount');
                  return;
                }
                
                const counterAmount = parseFloat(counterOfferAmount);
                  const originalAmount = selectedOrder?.quotation_amount || 0;
                
                if (counterAmount >= originalAmount) {
                  Alert.alert('Warning', 'Your counter offer should be less than the original quotation to be effective.');
                  return;
                }
                
                try {
                  await apiService.request(`/rentals/${selectedOrder?.id}/counter-offer`, {
                    method: 'POST',
                    body: JSON.stringify({
                      counter_offer_amount: counterAmount,
                      counter_offer_notes: counterOfferNotes
                    })
                  });
                  
                  setShowCounterOfferModal(false);
                  setCounterOfferAmount('');
                  setCounterOfferNotes('');
                  
                  // Optimize: Update local state instead of full refresh
                  setOrders(prevOrders => 
                    prevOrders.map(order => 
                      order.id === selectedOrder?.id 
                        ? { ...order, status: 'counter_offer_pending', counter_offer_status: 'pending' }
                        : order
                    )
                  );
                  
                  Alert.alert('Success', 'Counter offer submitted successfully! Our team will review it and respond soon.');
                } catch (error) {
                  Alert.alert('Error', 'Failed to submit counter offer');
                }
              }}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.enhancedSubmitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Order Submitted Successfully!"
        message="Your rental order has been submitted. We'll send you a quotation soon."
        orderType="rental"
      />

      {/* User Agreement Modal */}
      <Modal
        visible={showAgreementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rental Agreement & Penalties</Text>
            <TouchableOpacity
              onPress={() => setShowAgreementModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailCard}>
              <View style={styles.orderDetailHeader}>
                <View style={styles.agreementIconContainer}>
                  <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.orderDetailTitle}>Rental Agreement & Terms</Text>
                <Text style={styles.agreementSubtitle}>
                  Please read and understand the following terms before proceeding
                </Text>
              </View>
              
              <View style={styles.agreementTermsContainer}>
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="information-circle" size={20} color={Colors.primary} />
                    <Text style={styles.agreementTermTitle}>Cancellation Policy</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    A cancellation fee of ₱500 will be applied to cancelled orders.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="time" size={20} color={Colors.warning} />
                    <Text style={styles.agreementTermTitle}>Return Policy</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Late returns incur a penalty of ₱100 per day beyond the 5-day rental period.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="warning" size={20} color={Colors.error} />
                    <Text style={styles.agreementTermTitle}>Damage Assessment</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Damage fees range from ₱200 (minor) to full rental cost (severe damage).
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="card" size={20} color={Colors.primary} />
                    <Text style={styles.agreementTermTitle}>Payment Requirements</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Settle rent fee to reserve item. Security deposit fee or valid ID required upon pickup.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.agreementTermTitle}>Care Requirements</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Handle garments with care and return in original condition to avoid penalties.
                  </Text>
                </View>
              </View>
              
              <View style={styles.agreementFooter}>
                <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                <Text style={styles.agreementFooterText}>
                  All penalties must be settled before future rentals can be processed.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowAgreementModal(false)}
            >
              <Text style={styles.saveButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AR Measurement Modal */}
      {showARMeasurement && (
        <Modal
          visible={showARMeasurement}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <ARMeasurementScreen
            onComplete={handleARMeasurementComplete}
            onCancel={handleARMeasurementCancel}
          />
        </Modal>
      )}

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
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingTop: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
    marginTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  styledSection: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginRight: 12,
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
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
    borderRadius: 24,
    padding: 0,
    width: '92%',
    maxWidth: 420,
    minHeight: 500,
    maxHeight: '85%',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light + '20',
  },
  quotationHeader: {
    backgroundColor: Colors.primary + '08',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light + '30',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeButtonX: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  quotationIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
  },
  quotationDetailsCard: {
    padding: 24,
    backgroundColor: Colors.background.light,
    flex: 1,
    justifyContent: 'space-between',
  },
  quotationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light + '20',
    marginBottom: 4,
  },
  quotationDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light + '40',
  },
  quotationDetailContent: {
    flex: 1,
  },
  quotationDetailLabel: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quotationAmount: { 
    fontSize: Platform.OS === 'ios' ? 22 : 20, 
    fontWeight: '700', 
    color: Colors.success,
  },
  quotationNotes: { 
    fontSize: Platform.OS === 'ios' ? 16 : 15, 
    color: Colors.text.primary,
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '500',
  },
  quotationOrderId: {
    fontSize: Platform.OS === 'ios' ? 18 : 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalButtonGroup: { 
    padding: 20,
    backgroundColor: Colors.background.card,
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light + '20',
  },
  acceptBtn: { 
    backgroundColor: Colors.primary, 
    borderRadius: 16, 
    paddingVertical: 18, 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    marginLeft: 8,
  },
  rejectBtn: { 
    backgroundColor: Colors.error, 
    borderRadius: 16, 
    paddingVertical: 18, 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  rejectBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    marginLeft: 8,
  },
  reviewQuotationBtn: {
    backgroundColor: Colors.info,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    textAlign: 'right',
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
    marginBottom: 20,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  agreementHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
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
  agreementSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  agreementTermsContainer: {
    marginTop: 20,
    gap: 16,
  },
  agreementTermCard: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  agreementTermHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  agreementTermTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  agreementTermDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  agreementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: 20,
    gap: 8,
  },
  agreementFooterText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  
  // AR Measurement Styles
  formSectionSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  measurementMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  measurementMethodCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  selectedMeasurementMethod: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  measurementMethodIcon: {
    marginBottom: 12,
  },
  measurementMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  selectedMeasurementMethodText: {
    color: Colors.primary,
  },
  measurementMethodDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  arResultsContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  arResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  arResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  arResultItem: {
    width: '48%',
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  arResultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  arResultValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  
  // Manual Input Styles
  manualInputContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  manualInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  manualInputSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  measurementField: {
    marginBottom: 16,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  measurementGridItem: {
    width: '48%',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  measurementFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  measurementFieldDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  measurementInput: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text.primary,
  },
  measurementError: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  changeMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  changeMethodButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  measurementsSpacer: {
    height: 20,
  },
  measurementsTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  measurementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
  },

  // Enhanced Modal Styles
  enhancedModalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  enhancedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 28,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  enhancedModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  enhancedModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 8,
  },
  enhancedModalTitleContainer: {
    flex: 1,
  },
  enhancedModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 8,
  },
  enhancedModalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  enhancedCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  enhancedModalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 120,
  },
  enhancedModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 130,
  },
  quotationSummaryCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quotationSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quotationSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },
  quotationAmountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  quotationAmountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  quotationAmountLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  orderDetailsCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },
  enhancedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  enhancedDetailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
    flex: 1,
  },
  enhancedDetailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  quotationNotesCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quotationNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quotationNotesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },
  quotationNotesText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
  },
  counterOfferCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  counterOfferCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterOfferCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.warning,
    marginLeft: 8,
  },
  counterOfferCardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  enhancedCounterOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  enhancedCounterOfferButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Enhanced Action Buttons
  enhancedAcceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  enhancedAcceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  enhancedRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  enhancedRejectButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Counter Offer Modal Styles
  originalQuotationCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  originalQuotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalQuotationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },
  originalQuotationAmount: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  originalQuotationValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  originalQuotationLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  counterOfferFormCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  counterOfferFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterOfferFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.warning,
    marginLeft: 8,
  },
  enhancedInputGroup: {
    marginBottom: 20,
  },
  enhancedInputLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  enhancedInput: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  enhancedTextArea: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  negotiationTipsCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.info + '20',
  },
  negotiationTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  negotiationTipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.info,
    marginLeft: 8,
  },
  negotiationTipsList: {
    gap: 12,
  },
  negotiationTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  negotiationTipText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },

  // Enhanced Footer Buttons
  enhancedCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  enhancedCancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  enhancedSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  enhancedSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Missing styles for enhanced modals
  enhancedModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  quotationStatusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  quotationStatusBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  agreementSection: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
  },
  quotationStatusText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  originalQuotationDetails: {
    gap: 12,
  },
  originalQuotationDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  originalQuotationDetail: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  enhancedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  enhancedTextInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  inputHelperText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  enhancedNotesInput: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  orderDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
