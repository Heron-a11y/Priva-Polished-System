import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Define the Appointment type
interface Appointment {
  id: number;
  appointment_date: string;
  service_type: string;
  notes?: string;
  status: string;
  customer_name?: string;
}

const AppointmentsScreen = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    appointment_date: '',
    service_type: '',
    notes: '',
  });
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
  }>({});
  const router = useRouter();
  const { register } = useAuth();

  useEffect(() => {
    fetchAppointments();
    fetchBookedDates();
  }, []);

  useEffect(() => {
    console.log('Appointments state changed:', appointments);
    console.log('Marked dates:', getMarkedDates());
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      const response = await apiService.getAppointments();
      console.log('Raw appointments response:', response);
      
      if (Array.isArray(response)) {
        setAppointments(response);
      } else if (response && response.data) {
        setAppointments(response.data);
      } else {
        setAppointments([]);
      }
      
      console.log('Processed appointments:', appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  const fetchBookedDates = async () => {
    try {
      const response = await apiService.getBookedDates();
      if (response.success && response.booked_dates) {
        setBookedDates(response.booked_dates);
      }
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    }
  };

  const handleDateSelect = (date: any) => {
    const selectedDateStr = date.dateString;
    
    // Check if the date is booked
    if (bookedDates.includes(selectedDateStr)) {
      Alert.alert('Date Unavailable', 'This date is already booked. Please choose another date.');
      return;
    }
    
    // Check if there are appointments on this date
    const appointmentsOnDate = appointments.filter(
      appointment => appointment.appointment_date.split('T')[0] === selectedDateStr
    );
    
    if (appointmentsOnDate.length > 0) {
      // Show existing appointments for this date
      const appointmentDetails = appointmentsOnDate.map(app => {
        const appointmentTime = new Date(app.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${app.service_type} at ${appointmentTime} - ${app.status}${app.notes ? `\nNotes: ${app.notes}` : ''}`;
      }).join('\n\n');
      
      Alert.alert(`Appointments on ${selectedDateStr}`, appointmentDetails);
    } else {
      // Create new appointment
      const isoDate = selectedDateStr + 'T00:00:00';
      setSelectedDate(selectedDateStr);
      setNewAppointment({
        ...newAppointment,
        appointment_date: isoDate,
      });
      setModalVisible(true);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      const response = await apiService.createAppointment(newAppointment);
      console.log('Appointment API response:', response);
      if (response && response.id) {
        setModalVisible(false);
        fetchAppointments();
        fetchBookedDates(); // Refresh booked dates
        Alert.alert('Success', 'Appointment created successfully!');
      } else {
        Alert.alert('Error', 'Failed to create appointment');
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      if (error.message && error.message.includes('already booked')) {
        Alert.alert('Date Unavailable', 'This date is already booked. Please choose another date.');
      } else {
        Alert.alert('Error', 'Failed to create appointment');
      }
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiService.deleteAppointment(id);
      fetchAppointments();
      Alert.alert('Success', 'Appointment cancelled.');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setRescheduleDate(appointment.appointment_date.split('T')[0]);
    setRescheduleModalVisible(true);
  };

  const handleReschedule = async () => {
    if (!appointmentToReschedule) return;
    try {
      await apiService.updateAppointment(appointmentToReschedule.id, {
        appointment_date: rescheduleDate + 'T00:00:00',
      });
      setRescheduleModalVisible(false);
      fetchAppointments();
      Alert.alert('Success', 'Appointment rescheduled!');
    } catch (error) {
      Alert.alert('Error', 'Failed to reschedule appointment');
    }
  };

  const getMarkedDates = () => {
    const marked: { [date: string]: any } = {};
    
    console.log('Appointments for calendar marking:', appointments);
    console.log('Booked dates:', bookedDates);
    
    // Mark booked dates as unavailable
    bookedDates.forEach((date) => {
      marked[date] = {
        selected: false,
        disabled: true,
        disableTouchEvent: true,
        textColor: '#ccc',
        backgroundColor: '#f5f5f5',
      };
    });
    
    appointments.forEach((appointment) => {
      // Handle different date formats
      let date;
      if (appointment.appointment_date.includes('T')) {
        date = appointment.appointment_date.split('T')[0];
      } else {
        // If it's already in YYYY-MM-DD format
        date = appointment.appointment_date.split(' ')[0];
      }
      
      console.log(`Processing appointment ${appointment.id} for date: ${date}, status: ${appointment.status}`);
      
      let color = '#FF9800'; // pending
      if (appointment.status === 'confirmed') color = '#4CAF50';
      if (appointment.status === 'cancelled') color = '#F44336';
      
      marked[date] = {
        selected: true,
        selectedColor: color,
        selectedTextColor: '#fff',
        marked: true,
        dotColor: color,
      };
    });
    
    console.log('Marked dates object:', marked);
    return marked;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="calendar" size={24} color="#014D40" style={styles.headerIcon} />
          <Text style={styles.title}>Appointment Calendar</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Calendar Container */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#014D40',
              selectedDayBackgroundColor: '#014D40',
              selectedDayTextColor: '#fff',
              todayTextColor: '#014D40',
              dayTextColor: '#333',
              textDisabledColor: '#d9e1e8',
              dotColor: '#014D40',
              selectedDotColor: '#fff',
              arrowColor: '#014D40',
              monthTextColor: '#014D40',
              indicatorColor: '#014D40',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>
        
        {/* Calendar Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Appointment Status</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Confirmed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Cancelled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ccc' }]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>Your Appointments</Text>
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>Tap the + button to schedule your first appointment</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentDate}>
                      {new Date(appointment.appointment_date).toLocaleDateString()} at {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.serviceType}>{appointment.service_type}</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: appointment.status === 'confirmed' ? '#4CAF50' : appointment.status === 'cancelled' ? '#F44336' : '#FF9800' }
                    ]} />
                    <Text style={[
                      styles.appointmentStatus,
                      { color: appointment.status === 'confirmed' ? '#4CAF50' : appointment.status === 'cancelled' ? '#F44336' : '#FF9800' }
                    ]}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
                {appointment.notes && (
                  <Text style={styles.notes}>{appointment.notes}</Text>
                )}
                <View style={styles.appointmentActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleCancel(appointment.id)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                    <Text style={[styles.actionText, { color: '#F44336' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openRescheduleModal(appointment)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                    <Text style={[styles.actionText, { color: '#007AFF' }]}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Appointment Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Appointment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.label}>Service Type</Text>
              <TextInput
                style={styles.input}
                value={newAppointment.service_type}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, service_type: text })
                }
                placeholder="Enter service type"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newAppointment.notes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, notes: text })
                }
                placeholder="Add any notes (optional)"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleCreateAppointment}
              >
                <Text style={styles.confirmModalButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.label}>New Date</Text>
              <TextInput
                style={styles.input}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setRescheduleModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleReschedule}
              >
                <Text style={styles.confirmModalButtonText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#014D40',
  },
  addButton: {
    backgroundColor: '#014D40',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  legendContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  modalBody: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmModalButton: {
    backgroundColor: '#014D40',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default AppointmentsScreen; 