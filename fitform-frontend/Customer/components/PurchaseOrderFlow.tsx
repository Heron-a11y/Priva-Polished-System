import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  Image,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '../../services/api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import SuccessModal from '../../components/SuccessModal';
import ARMeasurementScreen from '../screens/ARMeasurementScreen';
import MeasurementValidationWarning from '../../components/MeasurementValidationWarning';
import DynamicClothingTypeCatalog from '../../components/DynamicClothingTypeCatalog';
import { MEASUREMENT_REQUIREMENTS } from '../../constants/ClothingTypes';
import { MeasurementData, CompleteMeasurements, normalizeMeasurementData } from '../../types/measurements';
import { useCatalogData } from '../../hooks/useCatalogData';
import { getLocalImageUrl } from '../../utils/imageUrlHelper';
import { Linking } from 'react-native';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';

// CLOTHING_TYPES moved to constants/ClothingTypes.ts

// MEASUREMENT_REQUIREMENTS moved to constants/ClothingTypes.ts

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
  thigh: number;
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
  quotation_sent_at?: string | null;
  quotation_responded_at?: string | null;
  counter_offer_amount?: number | null;
  counter_offer_notes?: string | null;
  counter_offer_status?: string | null;
  customer_email?: string;
  purchase_date?: string;
  item_name?: string;
  clothing_type?: string;
  notes?: string;
  measurements?: {
    height?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    shoulders?: number;
    inseam?: number;
    armLength?: number;
    arm_length?: number;
    neck?: number;
    thigh?: number;
    [key: string]: any; // Allow other measurement fields
  };
}
interface Errors {
  [key: string]: string;
}

export default function PurchaseOrderFlow() {
  // LayoutAnimation is deprecated in New Architecture - using LayoutAnimation.configureNext instead
  // if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  //   UIManager.setLayoutAnimationEnabledExperimental(true);
  // }

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [counterOfferNotes, setCounterOfferNotes] = useState('');
  const [reviewAgreementAccepted, setReviewAgreementAccepted] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showMeasurementWarning, setShowMeasurementWarning] = useState(false);
  const [missingMeasurementFields, setMissingMeasurementFields] = useState<string[]>([]);

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
  const [latestMeasurements, setLatestMeasurements] = useState<MeasurementData | null>(null);
  const [loadingLatestMeasurements, setLoadingLatestMeasurements] = useState(false);

  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();
  const { user } = useAuth();
  const router = useRouter();
  const { catalogItems, getItemById, refreshCatalog } = useCatalogData();

  // Function to get catalog item by clothing type
  const getCatalogItemByType = (clothingType: string) => {
    return catalogItems.find(item => 
      item.clothing_type.toLowerCase() === clothingType.toLowerCase() ||
      item.name.toLowerCase().includes(clothingType.toLowerCase())
    );
  };

  useEffect(() => {
    if (showQuotationModal) {
      setReviewAgreementAccepted(false);
    }
  }, [showQuotationModal]);

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

  // Load latest measurements for the user
  const loadLatestMeasurements = async () => {
    if (!user) {
      return;
    }
    
    try {
      setLoadingLatestMeasurements(true);
      console.log('🔄 Loading latest measurements for purchase order...');
      const response = await apiService.getLatestMeasurements();
      if (response.success && response.data) {
        console.log('✅ Latest measurements loaded:', response.data);
        setLatestMeasurements(response.data);
      } else {
        console.log('ℹ️ No latest measurements found');
        setLatestMeasurements(null);
      }
    } catch (error) {
      console.error('❌ Error loading latest measurements:', error);
      setLatestMeasurements(null);
    } finally {
      setLoadingLatestMeasurements(false);
    }
  };

  // Use latest measurements to populate the selected measurement method
  const useLatestMeasurements = () => {
    if (!latestMeasurements) {
      Alert.alert('No Latest Measurements', 'No previous measurements found. Please enter your measurements manually.');
      return;
    }

    // Extract actual body measurements without calculations
    const actualMeasurements = latestMeasurements.measurements || latestMeasurements;
    console.log('📏 Using latest measurements (actual body measurements):', actualMeasurements);
    
    // Map the actual measurements directly to measurements
    const newMeasurements: CompleteMeasurements = {
      height: actualMeasurements.height || 0,
      chest: actualMeasurements.chest || 0,
      waist: actualMeasurements.waist || 0,
      hips: actualMeasurements.hips || 0,
      shoulders: actualMeasurements.shoulder_width || actualMeasurements.shoulders || 0,
      inseam: actualMeasurements.inseam || 0,
      armLength: actualMeasurements.arm_length || actualMeasurements.armLength || 0,
      neck: actualMeasurements.neck || 0,
      thigh: actualMeasurements.thigh || 0,
    };
    
    // Populate the appropriate measurement method
    if (measurementMethod === 'ar') {
      setArMeasurements(newMeasurements);
    } else if (measurementMethod === 'manual') {
      setManualMeasurements(newMeasurements);
    } else {
      // If no method selected, populate manual measurements and select manual method
      setManualMeasurements(newMeasurements);
      setMeasurementMethod('manual');
    }
    
    Alert.alert('Success', 'Latest body measurements have been applied to your form!');
  };

  // Load latest measurements when component mounts
  useEffect(() => {
    if (user) {
      loadLatestMeasurements();
    }
  }, [user]);

  // Transaction action handlers
  const handleCancelOrder = async (order: any) => {
    // Check if order is confirmed (quotation accepted or confirmed status)
    const isConfirmed = order.quotation_status === 'accepted' || 
                       order.status === 'confirmed' || 
                       order.status === 'quotation_accepted';
    
    if (isConfirmed) {
      // Show penalty warning for confirmed orders
      Alert.alert(
        '⚠️ Cancellation Penalty',
        'This order has been confirmed. Cancelling will incur a penalty of ₱500.\n\nDo you want to proceed with the cancellation?',
        [
          {
            text: 'No, Keep Order',
            style: 'cancel',
          },
          {
            text: 'Yes, Cancel with ₱500 Penalty',
            style: 'destructive',
            onPress: () => {
              // Show final confirmation
              Alert.alert(
                'Final Confirmation',
                'Are you absolutely sure you want to cancel this confirmed order?\n\nThis will result in a ₱500 penalty charge.',
                [
                  {
                    text: 'No, Keep Order',
                    style: 'cancel',
                  },
                  {
                    text: 'Yes, Cancel Order',
                    style: 'destructive',
                    onPress: () => executeCancellation(order),
                  },
                ]
              );
            },
          },
        ]
      );
    } else {
      // Regular cancellation for non-confirmed orders
      Alert.alert(
        'Cancel Order',
        'Are you sure you want to cancel this order? This action cannot be undone.',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => executeCancellation(order),
          },
        ]
      );
    }
  };

  const executeCancellation = async (order: any) => {
    try {
      setLoading(true);
      await apiService.cancelPurchaseOrder(order.id);
      
      // Show appropriate success message
      const isConfirmed = order.quotation_status === 'accepted' || 
                         order.status === 'confirmed' || 
                         order.status === 'quotation_accepted';
      
      if (isConfirmed) {
        Alert.alert('Success', 'Order has been cancelled successfully.\n\n₱500 penalty has been applied to your account.');
      } else {
        Alert.alert('Success', 'Order has been cancelled successfully.');
      }
      
      fetchPurchaseOrders(1, true); // Refresh the orders list
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', `Failed to cancel order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order: any) => {
    // Check if order can be deleted (only pending or declined orders)
    if (!['pending', 'declined'].includes(order.status)) {
      Alert.alert(
        'Cannot Delete',
        'Only pending or declined orders can be deleted. Orders that are in progress or completed cannot be deleted.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Delete Order',
      `Are you sure you want to permanently delete order #${order.id}? This action cannot be undone.`,
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
              setLoading(true);
              await apiService.deletePurchase(order.id);
              
              Alert.alert('Success', 'Order has been permanently deleted.');
              
              // Refresh the orders list
              fetchPurchaseOrders(1, true);
            } catch (error: any) {
              console.error('Error deleting order:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Failed to delete order';
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditOrder = (order: any) => {
    Alert.alert(
      'Edit Order',
      'This will allow you to modify your order details. Do you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => {
            // Set the form data to the order data for editing
            setFormData({
              clothingType: order.clothing_type || '',
              measurements: order.measurements || '',
              style: order.style || '',
              color: order.color || '',
              notes: order.notes || '',
              counterOfferAmount: order.counter_offer_amount?.toString() || '',
              counterOfferNotes: order.counter_offer_notes || '',
            });
            setArMeasurements(order.ar_measurements || {});
            setStep(0); // Go back to the first step
            setEditingOrderId(order.id);
          },
        },
      ]
    );
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

  // Helper functions for status display
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'quotation_sent': return '#3b82f6';
      case 'counter_offer_pending': return '#ff9800';
      case 'in_progress': return '#014D40';
      case 'ready_for_pickup': return '#10b981';
      case 'picked_up': return '#059669';
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
      case 'declined':
        return 'DECLINED';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  // Helper function to get required measurements for selected clothing type
  const getRequiredMeasurements = () => {
    if (!clothingType) return [];
    
    // Try to get measurements from catalog item
    const catalogItem = getItemById(clothingType);
    if (catalogItem && catalogItem.measurements_required) {
      return catalogItem.measurements_required;
    }
    
    // Fallback to default measurements
    return ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length', 'inseam'];
  };

  // Helper function to validate measurements based on clothing type
  const validateMeasurements = () => {
    const newErrors: Errors = {};
    const warnings: string[] = [];
    
    // Check if measurement method is selected
    if (!measurementMethod) {
      newErrors.measurementMethod = 'Please select a measurement method';
      setErrors(newErrors);
      return false;
    }
    
    // If AR method is selected, check if AR measurements are available
    if (measurementMethod === 'ar' && !arMeasurements) {
      newErrors.measurementMethod = 'Please complete AR measurement';
      setErrors(newErrors);
      return false;
    }
    
    // If manual method is selected, validate manual inputs
    if (measurementMethod === 'manual') {
      // Validate all manual measurement fields
      COMPLETE_MEASUREMENT_FIELDS.forEach(field => {
        const value = manualMeasurements[field.key as keyof CompleteMeasurements];
        if (!value || value <= 0) {
          newErrors[field.key] = `${field.label} is required and must be greater than 0`;
          warnings.push(`${field.label} is missing or invalid`);
        }
      });
    }
    
    setErrors(newErrors);
    
    // If there are errors, show comprehensive warning
    if (Object.keys(newErrors).length > 0) {
      const missingFields = Object.keys(newErrors).filter(key => key !== 'measurementMethod');
      if (missingFields.length > 0) {
        const missingFieldLabels = missingFields.map(field => {
          const fieldInfo = COMPLETE_MEASUREMENT_FIELDS.find(f => f.key === field);
          return fieldInfo?.label || field;
        });
        setMissingMeasurementFields(missingFieldLabels);
        setShowMeasurementWarning(true);
      }
      return false;
    }
    
    return true;
  };

  const resetForm = () => {
    setClothingType('');
    setOtherClothing('');
    setMeasurements({ bust: '', waist: '', hips: '', shoulder_width: '', arm_length: '', inseam: '' });
    setDesign({ style: '', color: '', notes: '' });
    setErrors({});
    setStep(0);
  };

  const fetchPurchaseOrders = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMorePages(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      console.log('🔄 Fetching purchase orders... Page:', page);
      
      // Check if user is authenticated first
      if (!user) {
        console.log('⚠️ User not authenticated, skipping fetch');
        setOrders([]);
        return;
      }
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      
      const response = await apiService.get(`/purchases?${params}`);
      console.log('📥 Purchase orders response:', response);
      
      if (response && response.success) {
        const newOrders = (response.data || []).map((item: any) => ({
          id: item.id,
          status: item.status,
          quotation_status: item.quotation_status,
          quotation_amount: item.quotation_amount,
          quotation_notes: item.quotation_notes,
          quotation_price: item.quotation_price,
          quotation_sent_at: item.quotation_sent_at,
          quotation_responded_at: item.quotation_responded_at,
          counter_offer_amount: item.counter_offer_amount,
          counter_offer_notes: item.counter_offer_notes,
          counter_offer_status: item.counter_offer_status,
          customer_email: item.customer_email,
          purchase_date: item.purchase_date,
          item_name: item.item_name,
          clothing_type: item.clothing_type,
          notes: item.notes,
          measurements: item.measurements,
        }));
        
        // Debug: Log pagination info
        console.log(`[PurchaseOrders] Page ${page}, Received ${newOrders.length} orders, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        if (reset) {
          setOrders(newOrders);
        } else {
          // Deduplicate orders by id to prevent duplicates
          setOrders(prev => {
            const existingIds = new Set(prev.map(order => order.id));
            const uniqueNewOrders = newOrders.filter(order => !existingIds.has(order.id));
            return [...prev, ...uniqueNewOrders];
          });
        }
        
        setHasMorePages(response.pagination?.has_more_pages || false);
        setCurrentPage(page);
      } else {
        // Handle legacy response format (array or data property)
        let purchaseOrders = [];
        if (Array.isArray(response)) {
          purchaseOrders = response;
        } else if (response && response.data) {
          purchaseOrders = Array.isArray(response.data) ? response.data : [];
        }
        
        if (reset) {
          setOrders(purchaseOrders);
        } else {
          setOrders(prev => {
            const existingIds = new Set(prev.map(order => order.id));
            const uniqueNewOrders = purchaseOrders.filter((order: PurchaseOrder) => !existingIds.has(order.id));
            return [...prev, ...uniqueNewOrders];
          });
        }
      }
    } catch (error) {
      console.error('❌ Error fetching purchase orders:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401') || error.message?.includes('Unauthenticated')) {
        console.log('🔐 Authentication required - user needs to log in');
      }
      
      if (reset) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user]);
  
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMorePages) {
      fetchPurchaseOrders(currentPage + 1, false);
    }
  }, [loadingMore, hasMorePages, currentPage, fetchPurchaseOrders]);

  useEffect(() => {
    fetchPurchaseOrders(1, true);
  }, [fetchPurchaseOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPurchaseOrders(1, true).finally(() => setRefreshing(false));
  }, [fetchPurchaseOrders]);

  // Memoize filtered orders to avoid re-filtering on every render
  const filteredOrders = useMemo(() => 
    orders.filter(order => order.status !== 'cancelled'),
    [orders]
  );



  // Listen for notification-triggered review
  useEffect(() => {
    if (selectedOrderForReview && selectedOrderForReview.type === 'Purchase') {
      const order = orders.find(o => o.id === selectedOrderForReview.id);
      if (order) {
        setSelectedOrder(order);
        
        // Only show quotation modal if order is in a state that requires customer action
        // Don't show quotation modal for completed/finalized orders (declined, in_progress, ready_for_pickup, picked_up)
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
      const finalClothingType = clothingType === 'other' ? otherClothing.trim() : clothingType;
      
      // Prepare measurements based on method
      let finalMeasurements = {
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
        finalMeasurements = {
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
        finalMeasurements = {
          height: manualMeasurements.height || 0,
          chest: manualMeasurements.chest || 0,
          waist: manualMeasurements.waist || 0,
          hips: manualMeasurements.hips || 0,
          shoulders: manualMeasurements.shoulders || 0,
          inseam: manualMeasurements.inseam || 0,
          armLength: manualMeasurements.armLength || 0,
          neck: manualMeasurements.neck || 0
        };
      }
      
      const payload = {
        item_name: finalClothingType + ' - ' + design.style + (design.color ? ` (${design.color})` : ''),
        purchase_date: new Date().toISOString().slice(0,10),
        measurements: finalMeasurements,
        measurement_method: measurementMethod, // Track measurement method
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

  const submitCounterOffer = async () => {
    if (!selectedOrder || !counterOfferAmount) {
      Alert.alert('Error', 'Please enter a counter offer amount');
      return;
    }

    const amount = parseFloat(counterOfferAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await apiService.submitCounterOffer(selectedOrder.id, {
        counter_offer_amount: amount,
        counter_offer_notes: counterOfferNotes.trim() || null,
      });

      Alert.alert('Success', 'Counter offer submitted successfully!');
      setShowCounterOfferModal(false);
      setShowQuotationModal(false);
      setCounterOfferAmount('');
      setCounterOfferNotes('');
      
      // Refresh orders
      fetchPurchaseOrders(1, true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit counter offer');
    }
  };

  return (
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
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
          data={filteredOrders}
          renderItem={({ item, index }) => {
            const cardAnim = new Animated.Value(0);
            const scaleAnim = new Animated.Value(1);

            // Start entrance animation immediately
            Animated.timing(cardAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 100,
              useNativeDriver: true,
            }).start();

            const handlePressIn = () => {
              Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
              }).start();
            };

            const handlePressOut = () => {
              Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
              }).start();
            };

            return (
              <Animated.View
                style={[
                  {
                    opacity: cardAnim,
                    transform: [
                      {
                        translateY: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyItem}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedOrder(item);
                    setShowOrderDetails(true);
                  }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.8}
                >
              <View style={styles.itemHeader}>
                <View style={styles.itemTypeContainer}>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: '#FFD700' }
                  ]}>
                    <Ionicons 
                      name="bag" 
                      size={16} 
                      color="#fff" 
                    />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      Order #{item.id}
                    </Text>
                    <Text style={styles.itemType}>
                      Purchase
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
                    <Text style={styles.detailText}>{formatDate(item.purchase_date || '')}</Text>
                  </View>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.amount}>
                      ₱{item.quotation_price?.toLocaleString() || 'TBD'}
                    </Text>
                    <View style={styles.transactionActions}>
                      {/* Delete Button */}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(item);
                        }}
                      >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.orderActions}>
                {/* Transaction Action Buttons */}
                <View style={styles.transactionActions}>
                  {/* Cancel Button - Show for all statuses except completed/declined */}
                  {!['picked_up', 'returned', 'declined'].includes(item.status) && (
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelOrder(item);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {/* Edit Button - Show for pending and quotation_sent statuses */}
                  {['pending', 'quotation_sent'].includes(item.status) && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditOrder(item);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Review Quotation Button - Show below transaction actions */}
                {item.status === 'quotation_sent' && 
                 (item.quotation_amount || item.quotation_price) && 
                 !item.quotation_responded_at && (
            <TouchableOpacity 
              style={styles.reviewQuotationBtn} 
              onPress={(e) => { 
                e.stopPropagation(); // Prevent card click
                setSelectedOrder(item); 
                setShowQuotationModal(true); 
              }}
            >
              <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
              <Text style={styles.reviewQuotationBtnText}>Review Quotation</Text>
            </TouchableOpacity>
                )}
                
                {/* Show Review Quotation for counter offer pending (admin needs to respond) */}
                {item.status === 'counter_offer_pending' && 
                 item.counter_offer_amount && 
                 item.counter_offer_status === 'pending' && (
            <TouchableOpacity 
              style={styles.reviewQuotationBtn} 
              onPress={(e) => { 
                e.stopPropagation(); // Prevent card click
                setSelectedOrder(item); 
                setShowQuotationModal(true); 
              }}
            >
              <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
              <Text style={styles.reviewQuotationBtnText}>Review Counter Offer</Text>
            </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
              </Animated.View>
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadMoreText}>Loading more orders...</Text>
              </View>
            ) : null
          }
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of each item
            offset: 200 * index,
            index,
          })}
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

      {/* Purchase Agreement Full Terms Modal */}
      <Modal
        visible={showAgreementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: 18 }]}>Purchase Agreement & Terms</Text>
            <TouchableOpacity
              onPress={() => setShowAgreementModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailCard}>
              <View style={[styles.orderDetailHeader, { alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }]}>
                <View style={styles.agreementIconContainer}>
                  <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                </View>
                <Text style={[styles.orderDetailTitle, { textAlign: 'center', marginRight: 0 }]}>Purchase Agreement</Text>
                <Text style={styles.agreementSubtitle}>
                  Please read and understand the following terms before proceeding
                </Text>
              </View>

              <View style={styles.agreementTermsContainer}>
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="card" size={20} color={Colors.primary} />
                    <Text style={styles.agreementTermTitle}>Down Payment</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    A 50% down payment is required to secure your order and begin production.
                  </Text>
                </View>

                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="cash" size={20} color={Colors.success} />
                    <Text style={styles.agreementTermTitle}>Final Payment</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Full payment is required upon pickup. No partial payments will be accepted.
                  </Text>
                </View>

                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="person" size={20} color={Colors.primary} />
                    <Text style={styles.agreementTermTitle}>Valid ID Requirement</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Please bring any valid government-issued ID upon pickup.
                  </Text>
                </View>

                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.agreementTermTitle}>Quality Assurance</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    All garments undergo quality inspection before pickup to ensure satisfaction.
                  </Text>
                </View>
              </View>
              
              <View style={styles.agreementFooter}>
                <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                <Text style={styles.agreementFooterText}>
                  Payment terms must be agreed upon before order processing begins.
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

      {/* Enhanced Quotation Modal */}
      {showQuotationModal && selectedOrder && (
        <Modal
          visible={true}
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
                    ₱{(selectedOrder?.quotation_amount ?? selectedOrder?.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  <Text style={styles.enhancedDetailLabel}>Clothing Type</Text>
                  <Text style={styles.enhancedDetailValue}>{selectedOrder?.clothing_type || 'N/A'}</Text>
                </View>
                
                <View style={styles.enhancedDetailRow}>
                  <Text style={styles.enhancedDetailLabel}>Purchase Date</Text>
                  <Text style={styles.enhancedDetailValue}>
                    {selectedOrder?.purchase_date ? new Date(selectedOrder.purchase_date).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.enhancedDetailRow}>
                  <Text style={styles.enhancedDetailLabel}>Notes</Text>
                  <Text style={styles.enhancedDetailValue}>
                    {selectedOrder?.notes && selectedOrder.notes.trim() !== '' ? 
                      selectedOrder.notes : 
                      'No notes provided'
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
                  You can make a counter offer to negotiate the price with our team.
                </Text>
                <TouchableOpacity 
                  style={styles.enhancedCounterOfferButton}
                  onPress={() => {
                    setShowCounterOfferModal(true);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={20} color={Colors.text.primary} />
                  <Text style={styles.enhancedCounterOfferButtonText}>Make Counter Offer</Text>
                </TouchableOpacity>
              </View>

              {/* Purchase Agreement Section */}
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
                        I have read and agree to the <Text style={styles.agreementLink}>terms and conditions</Text> of the purchase agreement
                      </Text>
                      <Text style={styles.agreementNote}>
                        This includes understanding the payment terms and pickup requirements
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
                    await apiService.request(`/purchases/${selectedOrder?.id}/reject-quotation`, { method: 'POST' }); 
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
                    await apiService.request(`/purchases/${selectedOrder?.id}/accept-quotation`, { method: 'POST' }); 
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
      )}

      {/* Enhanced Counter Offer Modal */}
      {showCounterOfferModal && selectedOrder && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { 
            setShowCounterOfferModal(false); 
            setCounterOfferAmount('');
            setCounterOfferNotes('');
          }}
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
                onPress={() => { 
                  setShowCounterOfferModal(false); 
                  setCounterOfferAmount('');
                  setCounterOfferNotes('');
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Enhanced Content */}
            <ScrollView style={styles.enhancedModalContent} showsVerticalScrollIndicator={false}>
              {/* Original Quotation Card */}
              <View style={styles.originalQuotationCard}>
                <View style={styles.originalQuotationHeader}>
                  <Ionicons name="document-text" size={20} color={Colors.primary} />
                  <Text style={styles.originalQuotationTitle}>Original Quotation</Text>
                </View>
                <View style={styles.originalQuotationAmount}>
                  <Text style={styles.originalQuotationLabel}>Quoted Amount</Text>
                  <Text style={styles.originalQuotationValue}>
                    ₱{(selectedOrder?.quotation_amount ?? selectedOrder?.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.originalQuotationDetails}>
                  <View style={styles.originalQuotationDetailsRow}>
                    <Text style={styles.originalQuotationDetail}>Order ID: #{selectedOrder?.id}</Text>
                    <Text style={styles.originalQuotationDetail}>Clothing: {selectedOrder?.clothing_type || 'N/A'}</Text>
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
                      placeholder="5000, 7500"
                      placeholderTextColor="#999"
                      value={counterOfferAmount}
                      onChangeText={setCounterOfferAmount}
                      keyboardType="numeric"
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
                    placeholder="Budget constraints, timeline flexibility"
                    placeholderTextColor="#999"
                    value={counterOfferNotes}
                    onChangeText={setCounterOfferNotes}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Negotiation Tips Card */}
              <View style={styles.negotiationTipsCard}>
                <View style={styles.negotiationTipsHeader}>
                  <Ionicons name="bulb" size={20} color={Colors.info} />
                  <Text style={styles.negotiationTipsTitle}>Negotiation Tips</Text>
                </View>
                <View style={styles.negotiationTipsList}>
                  <View style={styles.negotiationTipItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.negotiationTipText}>Be reasonable with your counter offer</Text>
                  </View>
                  <View style={styles.negotiationTipItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.negotiationTipText}>Explain your reasoning clearly</Text>
                  </View>
                  <View style={styles.negotiationTipItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.negotiationTipText}>Consider the quality and complexity of your order</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Enhanced Action Buttons */}
            <View style={styles.enhancedModalFooter}>
              <TouchableOpacity 
                style={styles.enhancedCancelButton}
                onPress={() => { 
                  setShowCounterOfferModal(false); 
                  setCounterOfferAmount('');
                  setCounterOfferNotes('');
                }}
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
                  const originalAmount = selectedOrder?.quotation_amount ?? selectedOrder?.quotation_price;
                  
                  if (counterAmount >= originalAmount) {
                    Alert.alert('Warning', 'Your counter offer should be less than the original quotation to be effective.');
                    return;
                  }
                  
                  try {
                    await apiService.request(`/purchases/${selectedOrder?.id}/counter-offer`, {
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

          <KeyboardAvoidingWrapper style={{ flex: 1 }}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Step 0: Clothing Type Selection */}
      {step === 0 && (
              <View style={styles.formSection}>
          <Text style={styles.label}>What type of clothes do you want to purchase?</Text>
                <Text style={styles.subtitle}>Choose from our selection of custom garments</Text>
                <DynamicClothingTypeCatalog
                  selectedType={clothingType}
                  onSelectType={(typeId) => { 
                    setClothingType(typeId); 
                    if(typeId !== 'other') setOtherClothing(''); 
                  }}
                  showCategories={true}
                />
                {clothingType === 'other' && (
                  <View style={styles.otherInputContainer}>
                    <Text style={styles.inputLabel}>Specify clothing type:</Text>
            <TextInput
              style={styles.input}
              placeholder="Custom Suit, Wedding Dress, Formal Gown"
              placeholderTextColor="#999"
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
                  <Text style={styles.measurementsTitle}>Body Measurements (cm)</Text>
                </View>
          
          {/* Measurement Method Selection */}
          <View style={styles.measurementMethodSection}>
            <Text style={styles.measurementMethodSubtitle}>Choose Measurement Method</Text>
            
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

            {/* Use Latest Measurements Button - Available for both AR and Manual */}
            {latestMeasurements && (
              <View style={styles.latestMeasurementsContainer}>
                <TouchableOpacity
                  style={styles.useLatestButton}
                  onPress={useLatestMeasurements}
                  disabled={loadingLatestMeasurements}
                >
                  <Ionicons 
                    name="refresh" 
                    size={16} 
                    color={Colors.primary} 
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.useLatestButtonText}>
                    {loadingLatestMeasurements ? 'Loading...' : 'Use Latest Measurements'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.latestMeasurementsHint}>
                  💡 Tap to auto-fill with your most recent body measurements
                </Text>
              </View>
            )}


            {/* Show AR Measurement Results */}
            {measurementMethod === 'ar' && arMeasurements && (
              <View style={styles.arResultsContainer}>
                <Text style={styles.arResultsTitle}>AR Measurement Results</Text>
                <View style={styles.arResultsGrid}>
                  {Object.entries(arMeasurements).map(([key, value]) => {
                    // Only display actual body measurements, not metadata fields
                    const bodyMeasurementKeys = ['height', 'chest', 'waist', 'hips', 'shoulders', 'inseam', 'armLength', 'neck'];
                    const metadataFields = ['timestamp', 'frontScanCompleted', 'sideScanCompleted', 'scanStatus'];
                    
                    if (bodyMeasurementKeys.includes(key) && !metadataFields.includes(key)) {
                      return (
                        <View key={key} style={styles.arResultItem}>
                          <Text style={styles.arResultLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                          <Text style={styles.arResultValue}>{value} cm</Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            )}

              {/* Manual Input Fields */}
              {measurementMethod === 'manual' && (
                <View style={styles.manualInputContainer}>
                  <Text style={styles.manualInputTitle}>Manual Measurement Input</Text>
                  <Text style={styles.manualInputSubtitle}>Enter your measurements in inches</Text>
                  
                  <View style={styles.measurementGrid}>
                    {COMPLETE_MEASUREMENT_FIELDS.map(field => (
                      <View key={field.key} style={styles.measurementGridItem}>
                        <Text style={styles.measurementFieldLabel}>{field.label}</Text>
              <TextInput 
                          style={styles.measurementInput}
                          placeholder="180, 95, 85"
                          placeholderTextColor="#999"
                          value={manualMeasurements[field.key as keyof CompleteMeasurements] > 0 ? 
                                 manualMeasurements[field.key as keyof CompleteMeasurements].toString() : ''}
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


            {/* Measurement Method Error */}
            {errors.measurementMethod && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{errors.measurementMethod}</Text>
              </View>
            )}
          </View>
          
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
                  <Text style={styles.designInputLabel}>Style Description</Text>
                  <Text style={styles.inputDescription}>Describe the style you want (e.g., modern, classic, vintage)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g., Modern slim-fit, Classic traditional, Vintage retro" 
                    placeholderTextColor="#999"
                    value={design.style} 
                    onChangeText={v => setDesign({ ...design, style: v })} 
                  />
          {errors.style && <Text style={styles.error}>{errors.style}</Text>}
                </View>

                <View style={styles.designField}>
                  <Text style={styles.designInputLabel}>Color Preference</Text>
                  <Text style={styles.inputDescription}>Specify your preferred color or color scheme</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g., Navy blue, Black and white, Burgundy" 
                    placeholderTextColor="#999"
                    value={design.color} 
                    onChangeText={v => setDesign({ ...design, color: v })} 
                  />
          {errors.color && <Text style={styles.error}>{errors.color}</Text>}
                </View>

                <View style={styles.designField}>
                  <Text style={styles.designInputLabel}>Additional Notes</Text>
                  <Text style={styles.inputDescription}>Any special requests or specific details</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="e.g., Special occasion details, fabric preferences, specific features" 
                    placeholderTextColor="#999"
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
                        {clothingType === 'other' ? otherClothing.trim() : clothingType}
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
                    {COMPLETE_MEASUREMENT_FIELDS.map(field => (
                      <View key={field.key} style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>
                          {field.label}:
                        </Text>
                        <Text style={styles.reviewValue}>
                          {measurementMethod === 'ar' && arMeasurements 
                            ? `${arMeasurements[field.key as keyof CompleteMeasurements]} cm`
                            : measurementMethod === 'manual' && manualMeasurements
                            ? `${manualMeasurements[field.key as keyof CompleteMeasurements]} cm`
                            : 'N/A'
                          }
                        </Text>
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
          </KeyboardAvoidingWrapper>
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
                {/* Item Image */}
                <View style={styles.itemImageContainer}>
                  {(() => {
                    const catalogItem = getCatalogItemByType(selectedOrder.clothing_type || '');
                    const imageUrl = catalogItem?.image_path ? getLocalImageUrl(catalogItem.image_path) : null;
                    
                    return imageUrl ? (
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.itemImage}
                        resizeMode="cover"
                        onError={() => {
                          console.log('Failed to load image:', imageUrl);
                        }}
                      />
                    ) : (
                      <View style={[styles.itemImagePlaceholder, { backgroundColor: '#6B7280' }]}>
                        <Ionicons name="shirt-outline" size={48} color="#fff" />
                      </View>
                    );
                  })()}
                </View>
                
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
                
                {/* Measurement Details */}
                {selectedOrder.measurements && (
                  <>
                    <View style={styles.measurementsSpacer} />
                    <View style={styles.measurementsTitleContainer}>
                      <Text style={styles.measurementsTitle}>Measurements</Text>
                    </View>
                    {/* Use the same approach as RentalOrderFlow - display all measurements using Object.entries */}
                    {/* But maintain order from COMPLETE_MEASUREMENT_FIELDS */}
                    {(() => {
                      const measurements = selectedOrder.measurements || {};
                      const measurementEntries = Object.entries(measurements).filter(([key]) => key !== 'thigh');
                      
                      // Create a map of field keys to labels for proper labeling
                      const fieldLabelMap: { [key: string]: string } = {
                        'height': 'Height',
                        'chest': 'Chest',
                        'waist': 'Waist',
                        'hips': 'Hips',
                        'shoulders': 'Shoulders',
                        'shoulder_width': 'Shoulders',
                        'shoulderWidth': 'Shoulders',
                        'inseam': 'Inseam',
                        'armLength': 'Arm Length',
                        'arm_length': 'Arm Length',
                        'neck': 'Neck',
                      };
                      
                      // Sort entries to match COMPLETE_MEASUREMENT_FIELDS order
                      const orderedEntries = COMPLETE_MEASUREMENT_FIELDS.map(({ key, label }) => {
                        // Find matching entry (try exact match and variations)
                        const variations: { [key: string]: string[] } = {
                          'height': ['height', 'Height', 'HEIGHT'],
                          'chest': ['chest', 'Chest', 'CHEST'],
                          'waist': ['waist', 'Waist', 'WAIST'],
                          'hips': ['hips', 'Hips', 'HIPS'],
                          'shoulders': ['shoulders', 'shoulder_width', 'shoulderWidth', 'Shoulders', 'SHOULDERS'],
                          'inseam': ['inseam', 'Inseam', 'INSEAM'],
                          'armLength': ['armLength', 'arm_length', 'armlength', 'ArmLength', 'ARM_LENGTH'],
                          'neck': ['neck', 'Neck', 'NECK'],
                        };
                        
                        const fieldVariations = variations[key] || [key];
                        for (const variation of fieldVariations) {
                          const entry = measurementEntries.find(([entryKey]) => 
                            entryKey.toLowerCase() === variation.toLowerCase()
                          );
                          if (entry) {
                            return { key: entry[0], value: entry[1], label };
                          }
                        }
                        return null;
                      }).filter((entry): entry is { key: string; value: any; label: string } => entry !== null);
                      
                      // Add any remaining entries that weren't in COMPLETE_MEASUREMENT_FIELDS
                      const remainingEntries = measurementEntries.filter(([entryKey]) => 
                        !orderedEntries.some(entry => entry.key.toLowerCase() === entryKey.toLowerCase())
                      );
                      
                      return [...orderedEntries, ...remainingEntries.map(([key, value]) => ({
                        key,
                        value,
                        label: fieldLabelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
                      }))].map(({ key, value, label }) => (
                        <View key={key} style={styles.orderDetailItem}>
                          <Text style={styles.orderDetailLabel}>{label}:</Text>
                          <Text style={styles.orderDetailValue}>
                            {value !== undefined && value !== null ? `${value} cm` : 'Not provided'}
                          </Text>
                        </View>
                      ));
                    })()}
                  </>
                )}

                {/* Penalty Information - Only Cancellation Fee for Purchase Orders */}
                {(() => {
                  const isCancelled = selectedOrder.status === 'cancelled';
                  const wasConfirmed = selectedOrder.quotation_status === 'accepted' || 
                                      selectedOrder.status === 'confirmed' || 
                                      selectedOrder.status === 'quotation_accepted';
                  const hasCancellationFee = isCancelled && wasConfirmed;
                  
                  if (!hasCancellationFee) return null;
                  
                  return (
                    <View style={styles.penaltySection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Ionicons name="warning" size={20} color="#ff9800" />
                        <Text style={styles.penaltySectionTitle}>Penalty Information</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Cancellation Fee:</Text>
                        <Text style={[styles.detailValue, styles.penaltyValue]}>
                          ₱500
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* Generate Receipt Button - Only for picked_up status */}
              {selectedOrder.status === 'picked_up' && (
                <View style={styles.receiptButtonContainer}>
                  <TouchableOpacity
                    style={styles.generateReceiptButton}
                    onPress={async () => {
                      try {
                        const receiptUrl = `${apiService.baseURL}/purchases/${selectedOrder.id}/receipt`;
                        console.log('Generating receipt for purchase:', selectedOrder.id, 'URL:', receiptUrl);
                        // Open receipt in browser for download
                        await Linking.openURL(receiptUrl);
                      } catch (error) {
                        console.error('Receipt generation error:', error);
                        Alert.alert('Error', 'Failed to generate receipt. Please make sure the order is completed and try again.');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="receipt-outline" size={20} color="#fff" />
                    <Text style={styles.generateReceiptButtonText}>Generate Receipt</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
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

      {/* Measurement Validation Warning */}
      <MeasurementValidationWarning
        visible={showMeasurementWarning}
        missingFields={missingMeasurementFields}
        onClose={() => setShowMeasurementWarning(false)}
        onFillMeasurements={() => setShowMeasurementWarning(false)}
        title="Incomplete Measurements"
        subtitle="Please fill in all required measurements for accurate sizing"
      />

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
    </KeyboardAvoidingWrapper>
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
  measurementsTitle: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 8,
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
  // Old choice styles removed - now using ClothingTypeCatalog component
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
  // History card styles (matching RentalPurchaseHistory)
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginHorizontal: 16,
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
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
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
  reviewQuotationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3b82f620',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  reviewQuotationBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
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
    flexDirection: 'column',
    gap: 8,
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
  // Old choice card styles removed - now using ClothingTypeCatalog component
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
  designInputLabel: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '700',
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
  // Modal Styles - Matching Admin Design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotationModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  counterOfferModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
    marginTop: 8,
  },
  closeButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalBody: {
    padding: 24,
  },
  quotationInfoSection: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  quotationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quotationInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
  },
  counterOfferInfoSection: {
    backgroundColor: '#fff3e0',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  counterOfferInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  counterOfferInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#014D40',
    minHeight: 48,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014D40',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    gap: 6,
    shadowColor: '#014D40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 40,
  },
  modalActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 0,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#666',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 40,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 0,
    textAlign: 'center',
  },
  sendQuotationButton: {
    backgroundColor: '#014D40',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#014D40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 40,
  },
  sendQuotationText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 0,
    textAlign: 'center',
  },
  counterOfferButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  counterOfferButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flexShrink: 0,
    textAlign: 'center',
  },
  
  // AR Measurement Styles
  measurementMethodSection: {
    marginBottom: 20,
  },
  measurementMethodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  measurementMethodSubtitle: {
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.error + '10',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginLeft: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 2,
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
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  enhancedModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  enhancedModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },

  // Quotation Summary Card
  quotationSummaryCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
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
  },
  quotationAmountLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  quotationAmountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  quotationStatusContainer: {
    alignItems: 'center',
  },
  quotationStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quotationStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: 4,
  },

  // Order Details Card
  orderDetailsCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
  },
  enhancedDetailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'right',
    flex: 1,
  },

  // Quotation Notes Card
  quotationNotesCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quotationNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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

  // Counter Offer Card
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
    borderColor: Colors.warning + '20',
  },
  counterOfferCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginTop: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
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
  },
  originalQuotationLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  originalQuotationValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
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

  // Counter Offer Form Card
  counterOfferFormCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.warning + '20',
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 8,
  },
  enhancedTextInput: {
    flex: 1,
    paddingVertical: 16,
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
  },

  // Negotiation Tips Card
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

  // Penalty Information Styles
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
    marginLeft: 8,
  },
  penaltyValue: {
    fontWeight: '600',
    color: Colors.error,
  },
  // Purchase Agreement Styles
  agreementSection: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border.light + '30',
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
  agreementIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  agreementSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  agreementTermsContainer: {
    gap: 12,
  },
  agreementTermCard: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light + '20',
  },
  agreementTermHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agreementTermTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  agreementTermItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agreementTermText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
  },
  agreementTermDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  agreementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    marginTop: 20,
  },
  agreementFooterText: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
    backgroundColor: Colors.background.light,
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
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxContainerAccepted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agreementTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  agreementCheckboxText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  agreementLink: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  agreementNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Transaction Action Buttons
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: Colors.primary,
    marginLeft: 4,
  },
  // Latest Measurements Button Styles
  latestMeasurementsContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  useLatestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  useLatestButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  latestMeasurementsHint: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
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
  orderDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Generate Receipt Button Styles
  receiptButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
  },
  generateReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateReceiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Pagination styles
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
}); 