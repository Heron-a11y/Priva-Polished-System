import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import SuccessModal from '../../components/SuccessModal';

const CLOTHING_TYPES = [
  { id: 'gown', label: 'Gown', icon: '👗', description: 'Elegant formal gowns' },
  { id: 'barong', label: 'Barong', icon: '👔', description: 'Traditional Filipino formal wear' },
  { id: 'suit', label: 'Suit', icon: '🤵', description: 'Professional business suits' },
  { id: 'dress', label: 'Dress', icon: '👗', description: 'Casual and formal dresses' },
  { id: 'tuxedo', label: 'Tuxedo', icon: '🎩', description: 'Black tie formal wear' },
  { id: 'uniform', label: 'Uniform', icon: '👮', description: 'Professional uniforms' },
  { id: 'costume', label: 'Costume', icon: '🎭', description: 'Special event costumes' },
  { id: 'other', label: 'Other', icon: '👕', description: 'Other clothing types' }
];

// Measurement requirements for each clothing type
const MEASUREMENT_REQUIREMENTS = {
  gown: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  barong: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  suit: ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
  dress: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  tuxedo: ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
  uniform: ['bust', 'waist', 'shoulder_width', 'arm_length'],
  costume: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
  other: ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length', 'inseam'] // Default to all measurements
};

// Measurement field labels and descriptions
const MEASUREMENT_FIELDS = {
  bust: { label: 'Bust', description: 'Chest circumference at fullest point' },
  waist: { label: 'Waist', description: 'Natural waistline circumference' },
  hips: { label: 'Hips', description: 'Hip circumference at fullest point' },
  shoulder_width: { label: 'Shoulder Width', description: 'Distance across shoulders' },
  arm_length: { label: 'Arm Length', description: 'Shoulder to wrist length' },
  inseam: { label: 'Inseam', description: 'Inner leg length from crotch to ankle' }
};

// Add interfaces for state
interface Measurements {
  bust: string;
  waist: string;
  hips: string;
  shoulder_width: string;
  arm_length: string;
  inseam: string;
}
interface Design {
  style: string;
  color: string;
  notes: string;
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
}
interface Errors {
  [key: string]: string;
}

export default function PurchaseOrderFlow() {
  const [step, setStep] = useState(0);
  const [clothingType, setClothingType] = useState('');
  const [otherClothing, setOtherClothing] = useState('');
  const [measurements, setMeasurements] = useState<Measurements>({ bust: '', waist: '', hips: '', shoulder_width: '', arm_length: '', inseam: '' });
  const [design, setDesign] = useState<Design>({ style: '', color: '', notes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);



  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();
  const { user } = useAuth();

  // Helper functions for status display
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return Colors.warning;
      case 'confirmed': return Colors.info;
      case 'quotation_sent': return Colors.primary;
      case 'in_progress': return Colors.success;
      case 'ready_for_pickup': return Colors.success;
      case 'cancelled': return Colors.error;
      case 'declined': return Colors.error;
      default: return Colors.neutral[500];
    }
  };

  const getStatusText = (status: string) => {
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

  // Helper function to get required measurements for selected clothing type
  const getRequiredMeasurements = () => {
    if (!clothingType) return [];
    return MEASUREMENT_REQUIREMENTS[clothingType as keyof typeof MEASUREMENT_REQUIREMENTS] || MEASUREMENT_REQUIREMENTS.other;
  };

  // Helper function to validate measurements based on clothing type
  const validateMeasurements = () => {
    const requiredMeasurements = getRequiredMeasurements();
    const newErrors: Errors = {};
    
    requiredMeasurements.forEach(field => {
      if (!measurements[field as keyof Measurements] || measurements[field as keyof Measurements].trim() === '') {
        newErrors[field] = `${MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].label} is required`;
      } else {
        const value = parseFloat(measurements[field as keyof Measurements]);
        if (isNaN(value) || value <= 0) {
          newErrors[field] = `${MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].label} must be a valid number`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setClothingType('');
    setOtherClothing('');
    setMeasurements({ bust: '', waist: '', hips: '', shoulder_width: '', arm_length: '', inseam: '' });
    setDesign({ style: '', color: '', notes: '' });
    setErrors({});
    setStep(0);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiService.getPurchases();
        setOrders(Array.isArray(res) ? res : res.data || []);
      } catch (e: any) {
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);



  // Listen for notification-triggered review
  useEffect(() => {
    if (selectedOrderForReview && selectedOrderForReview.type === 'Purchase') {
      const order = orders.find(o => o.id === selectedOrderForReview.id);
      if (order) {
        setSelectedOrder(order);
        setShowQuotationModal(true);
      }
    }
  }, [selectedOrderForReview, orders]);

  // Validation helpers
  const validateClothingType = () => {
    let errs: Errors = {};
    if (!clothingType) errs.clothingType = 'Please select a type of clothes.';
    if (clothingType === 'other' && !otherClothing.trim()) errs.otherClothing = 'Please specify the type.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };



  const validateDesign = () => {
    let errs: Errors = {};
    if (!design.style) errs.style = 'Style is required';
    if (!design.color) errs.color = 'Color is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitOrder = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Compose payload
      const finalClothingType = clothingType === 'other' ? otherClothing.trim() : 
                               CLOTHING_TYPES.find(t => t.id === clothingType)?.label || clothingType;
      const payload = {
        item_name: finalClothingType + ' - ' + design.style + (design.color ? ` (${design.color})` : ''),
        purchase_date: new Date().toISOString().slice(0,10),
        measurements: { ...measurements },
        notes: design.notes,
        customer_name: user?.name,
        customer_email: user?.email,
        clothing_type: finalClothingType,
      };
        await apiService.createPurchaseTransaction(payload);
        setShowSuccessModal(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with New Purchase Button */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Purchase Orders</Text>
          <Text style={styles.sectionSubtitle}>Custom made garments for you</Text>
        </View>
        <TouchableOpacity
          style={styles.newPurchaseButton}
          onPress={() => setShowNewPurchaseModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.text.inverse} />
          <Text style={styles.newPurchaseButtonText}>New Purchase</Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {orders.length > 0 ? (
        <FlatList
          data={orders.filter(order => order.customer_email === user?.email)}
          renderItem={({ item }) => (
            <TouchableOpacity
              key={item.id}
              style={styles.orderCard}
              onPress={() => {
                setSelectedOrder(item);
                setShowOrderDetails(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderItemName}>Order #{item.id}</Text>
                  <Text style={styles.orderType}>🛍️ Purchase</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <View style={styles.orderDetailRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
                  <Text style={styles.orderDetailText}>
                    {formatDate(item.purchase_date || '')}
                  </Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <Ionicons name="cash-outline" size={16} color={Colors.text.secondary} />
                  <Text style={styles.orderDetailText}>
                    ₱{item.quotation_price?.toLocaleString() || 'TBD'}
                  </Text>
                </View>
              </View>

              <View style={styles.orderActions}>
                {/* Only show Review Quotation if status is 'quotation_sent' or quotation_status is 'quoted' */}
                {(item.status === 'quotation_sent' || item.quotation_status === 'quoted') && (item.quotation_amount || item.quotation_price) && (
                  <TouchableOpacity 
                    style={styles.reviewQuotationBtn} 
                    onPress={(e) => { 
                      e.stopPropagation(); // Prevent card click
                      setSelectedOrder(item); 
                      setShowQuotationModal(true); 
                    }}
                  >
                    <Text style={styles.reviewQuotationBtnText}>Review Quotation</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent card click
                    setSelectedOrder(item);
                    setShowOrderDetails(true);
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={64} color={Colors.neutral[400]} />
          <Text style={styles.emptyStateTitle}>No Purchase Orders Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start by creating your first custom garment order
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setShowNewPurchaseModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyStateButtonText}>Create First Purchase</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && selectedOrder && (
        <View style={styles.modalOverlay}>
          <View style={styles.quotationModalContent}>
            {/* Header with Close Button */}
            <View style={styles.quotationHeader}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Review Quotation</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButtonX}
                onPress={() => { setShowQuotationModal(false); clearOrderReview(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Quotation Details Card */}
            <View style={styles.quotationDetailsCard}>
              <View style={styles.quotationDetailRow}>
                <View style={styles.quotationDetailIcon}>
                  <Ionicons name="cash" size={20} color={Colors.success} />
                </View>
                <View style={styles.quotationDetailContent}>
                  <Text style={styles.quotationDetailLabel}>Quotation Amount</Text>
                  <Text style={styles.quotationAmount}>
                    ₱{(selectedOrder?.quotation_amount ?? selectedOrder?.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.quotationDetailRow}>
                <View style={styles.quotationDetailIcon}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.info} />
                </View>
                <View style={styles.quotationDetailContent}>
                  <Text style={styles.quotationDetailLabel}>Notes</Text>
                  <Text style={styles.quotationNotes}>
                    {selectedOrder?.quotation_notes || 'No additional notes provided.'}
                  </Text>
                </View>
              </View>

              <View style={styles.quotationDetailRow}>
                <View style={styles.quotationDetailIcon}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.warning} />
                </View>
                <View style={styles.quotationDetailContent}>
                  <Text style={styles.quotationDetailLabel}>Order ID</Text>
                  <Text style={styles.quotationOrderId}>#{selectedOrder?.id}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons - Side by Side */}
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={styles.acceptBtn} 
                onPress={async () => { 
                  try {
                    await apiService.request(`/purchases/${selectedOrder?.id}/accept-quotation`, { method: 'POST' }); 
                    setShowQuotationModal(false);
                    // Refresh orders after accepting
                    const res = await apiService.getPurchases();
                    setOrders(Array.isArray(res) ? res : res.data || []);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to accept quotation');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.text.inverse} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.rejectBtn} 
                onPress={async () => { 
                  try {
                    await apiService.request(`/purchases/${selectedOrder?.id}/reject-quotation`, { method: 'POST' }); 
                    setShowQuotationModal(false);
                    // Refresh orders after rejecting
                    const res = await apiService.getPurchases();
                    setOrders(Array.isArray(res) ? res : res.data || []);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to reject quotation');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color={Colors.text.inverse} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* New Purchase Modal */}
      <Modal
        visible={showNewPurchaseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Purchase Order</Text>
            <TouchableOpacity
              onPress={() => setShowNewPurchaseModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Step 0: Clothing Type Selection */}
      {step === 0 && (
              <View style={styles.formSection}>
          <Text style={styles.label}>What type of clothes do you want to purchase?</Text>
                <Text style={styles.subtitle}>Choose from our selection of custom garments</Text>
                <View style={styles.choicesGrid}>
            {CLOTHING_TYPES.map(type => (
              <TouchableOpacity
                      key={type.id}
                      style={[styles.choiceCard, clothingType === type.id && styles.choiceCardActive]}
                      onPress={() => { setClothingType(type.id); if(type.id !== 'other') setOtherClothing(''); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.choiceIcon}>{type.icon}</Text>
                      <Text style={clothingType === type.id ? styles.choiceTextActive : styles.choiceText}>{type.label}</Text>
                      <Text style={styles.choiceDescription}>{type.description}</Text>
                      {clothingType === type.id && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
                        </View>
                      )}
              </TouchableOpacity>
            ))}
          </View>
                {clothingType === 'other' && (
                  <View style={styles.otherInputContainer}>
                    <Text style={styles.inputLabel}>Specify clothing type:</Text>
            <TextInput
              style={styles.input}
                      placeholder="Enter custom clothing type..."
              value={otherClothing}
              onChangeText={setOtherClothing}
              maxLength={40}
            />
                  </View>
          )}
          {errors.clothingType && <Text style={styles.error}>{errors.clothingType}</Text>}
          {errors.otherClothing && <Text style={styles.error}>{errors.otherClothing}</Text>}
          <TouchableOpacity
                  style={[styles.nextBtn, !(clothingType && (clothingType !== 'other' || otherClothing.trim())) && styles.nextBtnDisabled]}
            onPress={() => { if (validateClothingType()) setStep(1); }}
                  disabled={!(clothingType && (clothingType !== 'other' || otherClothing.trim()))}
          >
                  <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} style={{ marginRight: 8 }} />
                  <Text style={styles.nextBtnText}>Continue to Measurements</Text>
          </TouchableOpacity>
        </View>
      )}

            {/* Step 1: Measurements */}
      {step === 1 && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="resize" size={24} color={Colors.primary} />
                  <Text style={styles.label}>Body Measurements (cm)</Text>
                </View>
          <Text style={styles.subtitle}>
            Required measurements for {clothingType === 'other' ? otherClothing : CLOTHING_TYPES.find(t => t.id === clothingType)?.label}
          </Text>
          
          {getRequiredMeasurements().map(field => (
            <View key={field} style={styles.measurementField}>
              <Text style={styles.inputLabel}>{MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].label}</Text>
              <Text style={styles.inputDescription}>{MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].description}</Text>
              <TextInput 
                style={styles.input} 
                placeholder={`Enter ${MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].label.toLowerCase()} in cm`} 
                value={measurements[field as keyof Measurements]} 
                onChangeText={v => setMeasurements({ ...measurements, [field]: v })} 
                keyboardType="numeric" 
              />
              {errors[field] && <Text style={styles.error}>{errors[field]}</Text>}
            </View>
          ))}
          
          <View style={styles.rowBtns}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
                    <Ionicons name="arrow-back" size={18} color={Colors.text.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => { if (validateMeasurements()) setStep(2); }}>
                    <Text style={styles.nextBtnText}>Next</Text>
                  </TouchableOpacity>
          </View>
        </View>
      )}

            {/* Step 2: Design Preferences */}
      {step === 2 && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="color-palette" size={24} color={Colors.primary} />
                  <Text style={styles.label}>Design Preferences</Text>
                </View>
                <Text style={styles.subtitle}>Tell us about your desired style and preferences</Text>
                
                <View style={styles.designField}>
                  <Text style={styles.inputLabel}>Style Description</Text>
                  <Text style={styles.inputDescription}>Describe the style you want (e.g., modern, classic, vintage)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g., Modern slim-fit, Classic traditional, Vintage retro" 
                    value={design.style} 
                    onChangeText={v => setDesign({ ...design, style: v })} 
                  />
          {errors.style && <Text style={styles.error}>{errors.style}</Text>}
                </View>

                <View style={styles.designField}>
                  <Text style={styles.inputLabel}>Color Preference</Text>
                  <Text style={styles.inputDescription}>Specify your preferred color or color scheme</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g., Navy blue, Black and white, Burgundy" 
                    value={design.color} 
                    onChangeText={v => setDesign({ ...design, color: v })} 
                  />
          {errors.color && <Text style={styles.error}>{errors.color}</Text>}
                </View>

                <View style={styles.designField}>
                  <Text style={styles.inputLabel}>Additional Notes</Text>
                  <Text style={styles.inputDescription}>Any special requests or specific details</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="e.g., Special occasion details, fabric preferences, specific features" 
                    value={design.notes} 
                    onChangeText={v => setDesign({ ...design, notes: v })} 
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

          <View style={styles.rowBtns}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                    <Ionicons name="arrow-back" size={18} color={Colors.text.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => { if (validateDesign()) setStep(3); }}>
                    <Text style={styles.nextBtnText}>Review Order</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
          </View>
        </View>
      )}

            {/* Step 3: Review & Submit */}
      {step === 3 && (
              <View style={styles.formSection}>
                <View style={styles.reviewMainHeader}>
                  <Ionicons name="document-text" size={24} color={Colors.primary} />
                  <Text style={styles.reviewTitle}>Review Your Order</Text>
          </View>
                <Text style={styles.subtitle}>Please review all details before submitting</Text>

                <View style={styles.reviewCard}>
                  {/* Order Type Section */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <Ionicons name="shirt" size={20} color={Colors.primary} />
                      <Text style={styles.reviewSectionTitle}>Order Details</Text>
        </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Type:</Text>
                      <Text style={styles.reviewValue}>
                        {clothingType === 'other' ? otherClothing.trim() : 
                         CLOTHING_TYPES.find(t => t.id === clothingType)?.label || clothingType}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Information Section */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <Ionicons name="person" size={20} color={Colors.primary} />
                      <Text style={styles.reviewSectionTitle}>Customer Information</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Name:</Text>
                      <Text style={styles.reviewValue}>{user?.name}</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Email:</Text>
                      <Text style={styles.reviewValue}>{user?.email}</Text>
                    </View>
                  </View>

                  {/* Measurements Section */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <Ionicons name="resize" size={20} color={Colors.primary} />
                      <Text style={styles.reviewSectionTitle}>Measurements</Text>
                    </View>
                    {getRequiredMeasurements().map(field => (
                      <View key={field} style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>
                          {MEASUREMENT_FIELDS[field as keyof typeof MEASUREMENT_FIELDS].label}:
                        </Text>
                        <Text style={styles.reviewValue}>{measurements[field as keyof Measurements]} cm</Text>
                      </View>
                    ))}
                  </View>

                  {/* Design Preferences Section */}
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewSectionHeader}>
                      <Ionicons name="color-palette" size={20} color={Colors.primary} />
                      <Text style={styles.reviewSectionTitle}>Design Preferences</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Style:</Text>
                      <Text style={styles.reviewValue}>{design.style}</Text>
                    </View>
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Color:</Text>
                      <Text style={styles.reviewValue}>{design.color}</Text>
                    </View>
                    {design.notes && (
                      <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>Notes:</Text>
                        <Text style={styles.reviewValue}>{design.notes}</Text>
        </View>
          )}
        </View>
                </View>

                <View style={styles.rowBtns}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                    <Ionicons name="arrow-back" size={18} color={Colors.text.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color={Colors.primary} size="small" />
                      <Text style={styles.loadingText}>Submitting...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.submitBtn} onPress={submitOrder}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.text.inverse} style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText} numberOfLines={1} adjustsFontSizeToFit={true}>Submit Order</Text>
                    </TouchableOpacity>
                )}
              </View>
        </View>
      )}

          </ScrollView>
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
                <View style={styles.orderDetailHeader}>
                  <Text style={styles.orderDetailTitle}>{selectedOrder.item_name || 'Order Details'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusText(selectedOrder.status)}
                    </Text>
          </View>
                </View>
                
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Order ID:</Text>
                  <Text style={styles.orderDetailValue}>#{selectedOrder.id}</Text>
                </View>
                
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Customer Name:</Text>
                  <Text style={styles.orderDetailValue}>
                    {user?.name || 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Customer Email:</Text>
                  <Text style={styles.orderDetailValue}>
                    {user?.email || 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Purchase Date:</Text>
                  <Text style={styles.orderDetailValue}>
                    {formatDate(selectedOrder.purchase_date || '')}
                  </Text>
                </View>
                
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Quotation Price:</Text>
                  <Text style={styles.orderDetailValue}>
                    ₱{selectedOrder.quotation_price?.toLocaleString() || 'TBD'}
                  </Text>
                </View>
                
                {selectedOrder.quotation_status && (
                  <View style={styles.orderDetailItem}>
                    <Text style={styles.orderDetailLabel}>Quotation Status:</Text>
                    <Text style={styles.orderDetailValue}>
                      {getStatusText(selectedOrder.quotation_status)}
                    </Text>
        </View>
      )}
                
                {selectedOrder.quotation_notes && (
                  <View style={styles.orderDetailItem}>
                    <Text style={styles.orderDetailLabel}>Notes:</Text>
                    <Text style={[styles.orderDetailValue, styles.notesValue]}>{selectedOrder.quotation_notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setShowNewPurchaseModal(false);
          setStep(0);
          resetForm();
        }}
        title="Order Submitted Successfully!"
        message="Your purchase order has been submitted. We'll send you a quotation soon."
        orderType="purchase"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background.light
  },
  label: { 
    fontSize: Platform.OS === 'ios' ? 19 : 18, 
    fontWeight: '600', 
    marginBottom: 8, 
    marginLeft: 8,
    color: Colors.text.primary 
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 22 : 20
  },
  input: { 
    borderWidth: 1, 
    borderColor: Colors.border.light, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 8, 
    backgroundColor: Colors.background.card, 
    fontSize: 16,
    color: Colors.text.primary,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  error: { 
    color: Colors.error, 
    marginBottom: 8, 
    fontSize: 14,
    marginLeft: 4
  },
  section: { 
    backgroundColor: Colors.background.card, 
    borderRadius: 16, 
    padding: 24, 
    marginBottom: 20, 
    shadowColor: Colors.neutral[900], 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4 
  },
  choiceIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  choiceText: { 
    color: Colors.text.primary, 
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    marginBottom: 4,
    textAlign: 'center'
  },
  choiceTextActive: { 
    color: Colors.primary, 
    fontWeight: '700',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    marginBottom: 4,
    textAlign: 'center'
  },
  choiceDescription: {
    color: Colors.text.secondary,
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 18 : 16
  },
  nextBtn: { 
    backgroundColor: Colors.primary, 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    alignSelf: 'center',
    minWidth: 120,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    flex: 0.6,
    marginLeft: 8,
  },
  nextBtnDisabled: { 
    backgroundColor: Colors.neutral[400],
    shadowOpacity: 0
  },
  nextBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16 
  },
  backBtn: { 
    backgroundColor: Colors.background.light, 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    flex: 1,
    marginRight: 8,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 48,
  },
  backBtnText: { 
    color: Colors.text.secondary, 
    fontWeight: '600', 
    fontSize: Platform.OS === 'ios' ? 17 : 16 
  },
  submitBtn: { 
    backgroundColor: Colors.primary, 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    flex: 1,
    marginLeft: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  submitBtnText: { 
    color: Colors.text.inverse, 
    fontWeight: '700', 
    fontSize: Platform.OS === 'ios' ? 17 : 16 
  },
  rowBtns: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'stretch',
    marginTop: 20,
    gap: 12,
  },
  reviewText: { 
    fontSize: Platform.OS === 'ios' ? 17 : 16, 
    marginBottom: 12,
    color: Colors.text.secondary,
    lineHeight: Platform.OS === 'ios' ? 24 : 22
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
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: Platform.OS === 'ios' ? 22 : 20, 
    fontWeight: '700', 
    color: Colors.text.primary, 
    marginLeft: 8,
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
    marginTop: 8,
    alignItems: 'center'
  },
  reviewQuotationBtnText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 15 : 14
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
    gap: 8,
  },
  reviewMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: Platform.OS === 'ios' ? 19 : 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
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
  newPurchaseButton: {
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
    flexShrink: 0,
  },
  newPurchaseButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: Platform.OS === 'ios' ? 13 : 12,
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
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4
  },
  choiceCard: {
    width: (Dimensions.get('window').width - (Platform.OS === 'ios' ? 88 : 80)) / 2,
    backgroundColor: Colors.background.light,
    borderRadius: 16,
    padding: Platform.OS === 'ios' ? 18 : 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: Platform.OS === 'ios' ? 130 : 120,
    position: 'relative',
    marginHorizontal: 2
  },
  choiceCardActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  otherInputContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  scrollContent: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 22 : 20,
    paddingTop: Platform.OS === 'ios' ? 22 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 32,
  },
  ordersList: {
    paddingBottom: 20,
  },
  measurementField: {
    marginBottom: 16,
  },
  inputDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  designField: {
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  reviewCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light + '30',
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
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
  notesValue: {
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'right',
  },
}); 