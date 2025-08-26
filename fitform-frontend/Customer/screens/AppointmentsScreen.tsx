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
    preferred_time: '10:00',
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

  // Custom function to format appointment time without timezone conversion
  const formatAppointmentTime = (appointmentDate: string) => {
    try {
      // Extract the time part from the appointment_date string
      const timePart = appointmentDate.split('T')[1];
      console.log('Formatting appointment time:', { appointmentDate, timePart });
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;
        console.log('Time formatting result:', { hours, minutes, hour, ampm, displayHour, formattedTime });
        return formattedTime;
      }
      return '12:00 AM'; // fallback
    } catch (error) {
      console.error('Error formatting appointment time:', error);
      return '12:00 AM'; // fallback
    }
  };

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
    
    // Check if the date is in the past
    const selectedDate = new Date(selectedDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Cannot schedule appointments in the past. Please select a current or future date.');
      return;
    }
    
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
        preferred_time: '10:00', // Reset to default time
      });
      setModalVisible(true);
    }
  };

  const handleCreateAppointment = async () => {
    // Validate required fields
    if (!newAppointment.service_type.trim()) {
      Alert.alert('Required Field', 'Please enter a service type.');
      return;
    }

    if (!newAppointment.preferred_time) {
      Alert.alert('Required Field', 'Please select a preferred time.');
      return;
    }

    try {
      // Combine date and time for the appointment
      // Ensure the time is in the correct format (HH:MM:SS)
      const selectedDate = newAppointment.appointment_date.split('T')[0];
      const selectedTime = newAppointment.preferred_time;
      
      // Create the full datetime string
      const fullDateTime = `${selectedDate}T${selectedTime}:00`;
      
      const appointmentData = {
        ...newAppointment,
        appointment_date: fullDateTime,
      };

      console.log('Original appointment data:', newAppointment);
      console.log('Selected date:', selectedDate);
      console.log('Selected time:', selectedTime);
      console.log('Full datetime string:', fullDateTime);
      console.log('Combined appointment data:', appointmentData);
      console.log('Final appointment_date being sent:', appointmentData.appointment_date);

      const response = await apiService.createAppointment(appointmentData);
      console.log('Appointment API response:', response);
      if (response && response.id) {
        setModalVisible(false);
        
        // Clear the form fields after successful creation
        setNewAppointment({
          appointment_date: '',
          service_type: '',
          preferred_time: '10:00',
          notes: '',
        });
        
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
      } else if (error.message && error.message.includes('past')) {
        Alert.alert('Invalid Date', 'Cannot schedule appointments in the past. Please select a current or future date.');
      } else if (error.message && error.message.includes('business hours')) {
        Alert.alert('Invalid Time', 'Appointments can only be scheduled between 10:00 AM and 5:00 PM. Please select a time within business hours.');
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
    
    // Check if the rescheduled date is in the past
    const selectedDate = new Date(rescheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Cannot reschedule appointments to past dates. Please select a current or future date.');
      return;
    }
    
    try {
      // For rescheduling, we'll use the same time as the original appointment
      const originalTime = appointmentToReschedule.appointment_date.split('T')[1] || '10:00:00';
      const rescheduleDateTime = rescheduleDate + 'T' + originalTime;
      
      console.log('Rescheduling appointment:', {
        originalDate: appointmentToReschedule.appointment_date,
        originalTime: originalTime,
        newDate: rescheduleDate,
        rescheduleDateTime: rescheduleDateTime
      });
      
      await apiService.updateAppointment(appointmentToReschedule.id, {
        appointment_date: rescheduleDateTime,
      });
      setRescheduleModalVisible(false);
      fetchAppointments();
      Alert.alert('Success', 'Appointment rescheduled!');
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      if (error.message && error.message.includes('past dates')) {
        Alert.alert('Invalid Date', 'Cannot reschedule appointments to past dates. Please select a current or future date.');
      } else if (error.message && error.message.includes('business hours')) {
        Alert.alert('Invalid Time', 'Appointments can only be rescheduled between 10:00 AM and 5:00 PM. Please select a time within business hours.');
      } else {
        Alert.alert('Error', 'Failed to reschedule appointment');
      }
    }
  };

  const getMarkedDates = () => {
    const marked: { [date: string]: any } = {};
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Appointments for calendar marking:', appointments);
    console.log('Booked dates:', bookedDates);
    console.log('Today:', today);
    
    // Mark today's date with special highlighting
    marked[today] = {
      selected: true,
      selectedColor: '#007AFF',
      selectedTextColor: '#FFFFFF',
      marked: true,
      dotColor: '#007AFF',
    };
    
    // Mark booked dates as unavailable
    bookedDates.forEach((date) => {
      // If today is also a booked date, merge the properties
      if (date === today) {
        marked[date] = {
          ...marked[date],
          disabled: true,
          disableTouchEvent: true,
          textColor: '#ccc',
          backgroundColor: '#f5f5f5',
        };
      } else {
        marked[date] = {
          selected: false,
          disabled: true,
          disableTouchEvent: true,
          textColor: '#ccc',
          backgroundColor: '#f5f5f5',
        };
      }
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
      
      // If this date already has today's highlighting, merge the properties
      if (date === today && marked[date]) {
        marked[date] = {
          ...marked[date],
          selected: true,
          selectedColor: color,
          selectedTextColor: '#fff',
          marked: true,
          dotColor: color,
        };
      } else {
        marked[date] = {
          selected: true,
          selectedColor: color,
          selectedTextColor: '#fff',
          marked: true,
          dotColor: color,
        };
      }
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
            minDate={new Date().toISOString().split('T')[0]}
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
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#d9e1e8' }]} />
              <Text style={styles.legendText}>Past Dates</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
          
          {/* Business Hours Info */}
          <View style={styles.businessHoursInfo}>
            <Text style={styles.businessHoursTitle}>Business Hours</Text>
            <Text style={styles.businessHoursText}>10:00 AM - 5:00 PM</Text>
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
                      {new Date(appointment.appointment_date).toLocaleDateString()} at {formatAppointmentTime(appointment.appointment_date)}
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
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                // Reset form when modal is closed
                setNewAppointment({
                  appointment_date: '',
                  service_type: '',
                  preferred_time: '10:00',
                  notes: '',
                });
              }}>
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

              <Text style={styles.label}>Preferred Time (10 AM - 5 PM)</Text>
              <View style={styles.timeSelectionContainer}>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '10:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '10:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '10:00' && styles.selectedTimeSlotText]}>10:00 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '11:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '11:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '11:00' && styles.selectedTimeSlotText]}>11:00 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '12:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '12:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '12:00' && styles.selectedTimeSlotText]}>12:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '13:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '13:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '13:00' && styles.selectedTimeSlotText]}>1:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '14:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '14:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '14:00' && styles.selectedTimeSlotText]}>2:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '15:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '15:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '15:00' && styles.selectedTimeSlotText]}>3:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeSlot, newAppointment.preferred_time === '16:00' && styles.selectedTimeSlot]}
                  onPress={() => setNewAppointment({ ...newAppointment, preferred_time: '16:00' })}
                >
                  <Text style={[styles.timeSlotText, newAppointment.preferred_time === '16:00' && styles.selectedTimeSlotText]}>4:00 PM</Text>
                </TouchableOpacity>
              </View>

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
                onPress={() => {
                  setModalVisible(false);
                  // Reset form when cancel is pressed
                  setNewAppointment({
                    appointment_date: '',
                    service_type: '',
                    preferred_time: '10:00',
                    notes: '',
                  });
                }}
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
  timeSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  timeSlot: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  selectedTimeSlot: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  businessHoursInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  businessHoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    textAlign: 'center',
    marginBottom: 5,
  },
  businessHoursText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default AppointmentsScreen; 