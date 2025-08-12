import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList } from 'react-native';
import apiService from '../../services/api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const CLOTHING_TYPES = [
  'Gown', 'Barong', 'Suit', 'Dress', 'Pants', 'Shirt', 'Skirt', 'Blouse', 'Tuxedo', 'Uniform', 'Costume', 'Other'
];

const steps = [
  'Type of Clothes',
  'Body Measurements',
  'Preferred Design/Style',
  'Review & Submit',
  'Await Quotation',
  'Order Status',
];

// Add interfaces for state
interface Details {
  name: string;
  email: string;
}
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
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  // Add missing state for loading and orderStatus
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState('pending');
  // Add state for notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  const { selectedOrderForReview, clearOrderReview } = useNotificationContext();
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiService.request('/purchases');
        setOrders(Array.isArray(res) ? res : res.data || []);
      } catch (e: any) {
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await apiService.request('/purchases');
        const arr = Array.isArray(res) ? res : res.data;
        setPurchaseHistory(arr || []);
      } catch (e: any) {
        setPurchaseHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiService.request('/notifications');
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  // Find new quotation notification
  const newQuotationNotif = notifications.find(n => n.message.includes('quotation') && !n.read);

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
    if (clothingType === 'Other' && !otherClothing.trim()) errs.otherClothing = 'Please specify the type.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  // Remove details state and step
  const validateMeasurements = () => {
    let errs: Errors = {};
    (Object.keys(measurements) as (keyof Measurements)[]).forEach(f => {
      if (!measurements[f]) errs[f] = 'Required';
    });
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

  // Simulate quotation (replace with real fetch if available)
  // Remove local quotation state and fetchQuotation function
  // Remove all references to setQuotation, fetchQuotation, and step 6 (quotation)
  // After submitting, just setStep(5) for 'Await Quotation'.
  // The only way to see a quotation is via the orders list, and only if the backend says so.

  const submitOrder = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Compose payload
      const finalClothingType = clothingType === 'Other' ? otherClothing.trim() : clothingType;
      const payload = {
        item_name: finalClothingType + ' - ' + design.style + (design.color ? ` (${design.color})` : ''),
        purchase_date: new Date().toISOString().slice(0,10),
        measurements: { ...measurements },
        notes: design.notes,
        customer_name: user?.name,
        customer_email: user?.email,
        clothing_type: finalClothingType,
      };
      const res = await apiService.createPurchaseTransaction(payload);
      setStep(4); // Await Quotation (step index adjusted)
      // After submitting, just setStep(5) for 'Await Quotation'.
      // The only way to see a quotation is via the orders list, and only if the backend says so.
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  const acceptQuotation = () => {
    setOrderStatus('in_progress');
    setStep(7);
    setTimeout(() => {
      setOrderStatus('ready_for_pickup');
    }, 3000);
  };

  const rejectQuotation = () => {
    setOrderStatus('cancelled');
    setStep(7);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{steps[step]}</Text>
      {step === 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>What type of clothes do you want to purchase?</Text>
          <View style={styles.choicesRow}>
            {CLOTHING_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.choiceBtn, clothingType === type && styles.choiceBtnActive]}
                onPress={() => { setClothingType(type); if(type !== 'Other') setOtherClothing(''); }}
              >
                <Text style={clothingType === type ? styles.choiceTextActive : styles.choiceText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {clothingType === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={otherClothing}
              onChangeText={setOtherClothing}
              maxLength={40}
            />
          )}
          {errors.clothingType && <Text style={styles.error}>{errors.clothingType}</Text>}
          {errors.otherClothing && <Text style={styles.error}>{errors.otherClothing}</Text>}
          <TouchableOpacity
            style={[styles.nextBtn, !(clothingType && (clothingType !== 'Other' || otherClothing.trim())) && styles.nextBtnDisabled]}
            onPress={() => { if (validateClothingType()) setStep(1); }}
            disabled={!(clothingType && (clothingType !== 'Other' || otherClothing.trim()))}
          >
            <Text style={styles.nextBtnText}>NEXT</Text>
          </TouchableOpacity>
        </View>
      )}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.label}>Body Measurements (cm)</Text>
          <TextInput style={styles.input} placeholder="Bust" value={measurements.bust} onChangeText={v => setMeasurements({ ...measurements, bust: v })} keyboardType="numeric" />
          {errors.bust && <Text style={styles.error}>{errors.bust}</Text>}
          <TextInput style={styles.input} placeholder="Waist" value={measurements.waist} onChangeText={v => setMeasurements({ ...measurements, waist: v })} keyboardType="numeric" />
          {errors.waist && <Text style={styles.error}>{errors.waist}</Text>}
          <TextInput style={styles.input} placeholder="Hips" value={measurements.hips} onChangeText={v => setMeasurements({ ...measurements, hips: v })} keyboardType="numeric" />
          {errors.hips && <Text style={styles.error}>{errors.hips}</Text>}
          <TextInput style={styles.input} placeholder="Shoulder Width" value={measurements.shoulder_width} onChangeText={v => setMeasurements({ ...measurements, shoulder_width: v })} keyboardType="numeric" />
          {errors.shoulder_width && <Text style={styles.error}>{errors.shoulder_width}</Text>}
          <TextInput style={styles.input} placeholder="Arm Length" value={measurements.arm_length} onChangeText={v => setMeasurements({ ...measurements, arm_length: v })} keyboardType="numeric" />
          {errors.arm_length && <Text style={styles.error}>{errors.arm_length}</Text>}
          <TextInput style={styles.input} placeholder="Inseam" value={measurements.inseam} onChangeText={v => setMeasurements({ ...measurements, inseam: v })} keyboardType="numeric" />
          {errors.inseam && <Text style={styles.error}>{errors.inseam}</Text>}
          <View style={styles.rowBtns}>
            <Button title="Back" onPress={() => setStep(0)} />
            <Button title="Next" onPress={() => { if (validateMeasurements()) setStep(3); }} />
          </View>
        </View>
      )}
      {step === 2 && (
        <View style={styles.section}>
          <TextInput style={styles.input} placeholder="Style" value={design.style} onChangeText={v => setDesign({ ...design, style: v })} />
          {errors.style && <Text style={styles.error}>{errors.style}</Text>}
          <TextInput style={styles.input} placeholder="Color" value={design.color} onChangeText={v => setDesign({ ...design, color: v })} />
          {errors.color && <Text style={styles.error}>{errors.color}</Text>}
          <TextInput style={styles.input} placeholder="Notes" value={design.notes} onChangeText={v => setDesign({ ...design, notes: v })} />
          <View style={styles.rowBtns}>
            <Button title="Back" onPress={() => setStep(1)} />
            <Button title="Next" onPress={() => { if (validateDesign()) setStep(3); }} />
          </View>
        </View>
      )}
      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.label}>Review your order:</Text>
          <Text style={styles.reviewText}>Type: {clothingType === 'Other' ? otherClothing.trim() : clothingType}</Text>
          <Text style={styles.reviewText}>Name: {user?.name}</Text>
          <Text style={styles.reviewText}>Email: {user?.email}</Text>
          <Text style={styles.reviewText}>Bust: {measurements.bust} cm</Text>
          <Text style={styles.reviewText}>Waist: {measurements.waist} cm</Text>
          <Text style={styles.reviewText}>Hips: {measurements.hips} cm</Text>
          <Text style={styles.reviewText}>Shoulder Width: {measurements.shoulder_width} cm</Text>
          <Text style={styles.reviewText}>Arm Length: {measurements.arm_length} cm</Text>
          <Text style={styles.reviewText}>Inseam: {measurements.inseam} cm</Text>
          <Text style={styles.reviewText}>Style: {design.style}</Text>
          <Text style={styles.reviewText}>Color: {design.color}</Text>
          <Text style={styles.reviewText}>Notes: {design.notes}</Text>
          <View style={styles.rowBtns}>
            <Button title="Back" onPress={() => setStep(2)} />
            {loading ? <ActivityIndicator /> : <Button title="Submit Order" onPress={submitOrder} />}
          </View>
        </View>
      )}
      {step === 4 && (
        <View style={styles.section}>
          <ActivityIndicator size="large" />
          <Text style={styles.label}>Waiting for quotation & schedule from admin...</Text>
        </View>
      )}
      {step === 5 && (
        <View style={styles.section}>
          {orderStatus === 'in_progress' && (
            <Text style={{ color: 'orange', fontWeight: 'bold', fontSize: 18 }}>Order In Progress...</Text>
          )}
          {orderStatus === 'ready_for_pickup' && (
            <Text style={{ color: 'green', fontWeight: 'bold', fontSize: 18 }}>Order Ready for Pickup!</Text>
          )}
          {orderStatus === 'cancelled' && (
            <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18 }}>Order Cancelled.</Text>
          )}
        </View>
      )}
      {orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>My Purchase Orders</Text>
          {orders
            .filter(order => order.customer_email === user?.email)
            .map(order => (
              <View key={order.id} style={styles.orderCard}>
                <Text>Order ID: {order.id}</Text>
                <Text>Status: {order.status}</Text>
                {/* Only show Review Quotation if status is 'quotation_sent' or quotation_status is 'quoted' */}
                {(order.status === 'quotation_sent' || order.quotation_status === 'quoted') && (order.quotation_amount || order.quotation_price) && (
                  <Button title="Review Quotation" onPress={() => { setSelectedOrder(order); setShowQuotationModal(true); }} />
                )}
              </View>
            ))}
        </View>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && selectedOrder && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Quotation</Text>
            <Text style={styles.quotationAmount}>
              Quotation: ₱{(selectedOrder.quotation_amount ?? selectedOrder.quotation_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.quotationNotes}>Notes: {selectedOrder.quotation_notes || 'No notes provided.'}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.acceptBtn} onPress={async () => { await apiService.request(`/purchases/${selectedOrder.id}/accept-quotation`, { method: 'POST' }); setShowQuotationModal(false); }}>
                <Text style={styles.acceptBtnText}>Accept Quotation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={async () => { await apiService.request(`/purchases/${selectedOrder.id}/reject-quotation`, { method: 'POST' }); setShowQuotationModal(false); }}>
                <Text style={styles.rejectBtnText}>Reject Quotation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowQuotationModal(false); clearOrderReview(); }}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 18, color: '#014D40', textAlign: 'center' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#014D40' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fff', fontSize: 16 },
  error: { color: 'red', marginBottom: 8 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  choicesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, justifyContent: 'center' },
  choiceBtn: { backgroundColor: '#e6f2ef', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18, margin: 4, borderWidth: 1, borderColor: '#014D40' },
  choiceBtnActive: { backgroundColor: '#014D40' },
  choiceText: { color: '#014D40', fontWeight: 'bold' },
  choiceTextActive: { color: '#fff', fontWeight: 'bold' },
  nextBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { backgroundColor: '#b0c4cc' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rowBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  reviewText: { fontSize: 15, marginBottom: 2 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    padding: 8,
    elevation: 1,
  },
  historyRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#014D40',
    borderRadius: 8,
    marginBottom: 6,
    padding: 8,
  },
  historyCell: {
    flex: 1,
    fontSize: 14,
    color: '#014D40',
  },
  historyCellHeader: {
    flex: 1,
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#014D40', marginBottom: 12, textAlign: 'center' },
  quotationAmount: { fontSize: 18, fontWeight: 'bold', color: '#00796B', marginBottom: 8 },
  quotationNotes: { fontSize: 16, color: '#333', marginBottom: 18, textAlign: 'center' },
  modalButtonGroup: { width: '100%', marginTop: 8 },
  acceptBtn: { backgroundColor: '#388E3C', borderRadius: 8, paddingVertical: 12, marginBottom: 10, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rejectBtn: { backgroundColor: '#D32F2F', borderRadius: 8, paddingVertical: 12, marginBottom: 10, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: '#B0BEC5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#014D40', fontWeight: 'bold', fontSize: 16 },
}); 