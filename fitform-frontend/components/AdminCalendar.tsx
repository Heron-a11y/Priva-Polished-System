import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

const STATUS_COLORS = {
  confirmed: '#4CAF50',
  pending: '#FF9800',
  cancelled: '#F44336',
};

const STATUS_ICONS = {
  confirmed: 'checkmark-circle',
  pending: 'hourglass',
  cancelled: 'close-circle',
};

interface Appointment {
  id: number;
  appointment_date: string;
  service_type: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  customer_name: string;
  notes?: string;
}

interface AdminCalendarProps {
  onAppointmentSelect?: (appointment: Appointment) => void;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({ onAppointmentSelect }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Utility function to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const now = new Date();
    return now.getFullYear() + '-' + 
           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
           String(now.getDate()).padStart(2, '0');
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllAppointments();
      console.log('Fetched appointments data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      // Handle the new API response structure
      const appointmentsData = data?.data?.appointments || data?.appointments || (Array.isArray(data) ? data : []);
      console.log('Processed appointments:', appointmentsData);
      
      // Ensure appointmentsData is an array before filtering
      if (!Array.isArray(appointmentsData)) {
        console.error('Appointments data is not an array:', appointmentsData);
        setAppointments([]);
        return;
      }
      
      // Validate and filter appointments data
      const validatedAppointments = appointmentsData.filter((appointment: any) => {
        // Check if appointment has required fields
        if (!appointment.id || !appointment.appointment_date || !appointment.status) {
          console.warn('Invalid appointment data:', appointment);
          return false;
        }
        
        // Validate appointment date format
        const appointmentDate = new Date(appointment.appointment_date);
        if (isNaN(appointmentDate.getTime())) {
          console.warn('Invalid appointment date:', appointment.appointment_date);
          return false;
        }
        
        // Validate status
        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!validStatuses.includes(appointment.status)) {
          console.warn('Invalid appointment status:', appointment.status);
          return false;
        }
        
        return true;
      });
      
      console.log('Validated appointments:', validatedAppointments);
      setAppointments(validatedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to load appointments';
        if ((error as any).response?.data?.message) {
          errorMessage = (error as any).response.data.message;
        } else if ((error as any).message) {
          errorMessage = (error as any).message;
        }
      
      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: fetchAppointments },
        { text: 'Cancel', style: 'cancel' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePress = (day: any) => {
    const selectedDate = day.dateString;
    const dayAppointments = getAppointmentsForDate(selectedDate);
    
    console.log('Selected date:', selectedDate);
    console.log('Appointments for date:', dayAppointments);
    
    if (dayAppointments.length > 0) {
      console.log('Setting selected appointment:', dayAppointments[0]);
      setSelectedAppointment(dayAppointments[0]);
      setShowAppointmentModal(true);
    }
  };

  const getAppointmentsForDate = (dateString: string) => {
    console.log('Filtering appointments for date:', dateString);
    console.log('All appointments:', appointments);
    
    // Validate input date string format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.warn('Invalid date string format:', dateString);
      return [];
    }
    
    const filteredAppointments = appointments.filter(appointment => {
      console.log('Checking appointment:', appointment);
      console.log('Appointment date:', appointment.appointment_date);
      console.log('Date string:', dateString);
      
      // Handle different date formats with enhanced validation
      let appointmentDate;
      try {
        if (appointment.appointment_date.includes('T')) {
          appointmentDate = appointment.appointment_date.split('T')[0];
        } else {
          appointmentDate = appointment.appointment_date.split(' ')[0];
        }
        
        // Validate the extracted date
        const parsedDate = new Date(appointmentDate);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid appointment date format:', appointment.appointment_date);
          return false;
        }
        
        console.log('Processed appointment date:', appointmentDate);
        console.log('Matches:', appointmentDate === dateString);
        
        return appointmentDate === dateString;
      } catch (error) {
        console.warn('Error processing appointment date:', error);
        return false;
      }
    });
    
    console.log('Filtered appointments:', filteredAppointments);
    return filteredAppointments;
  };

  // Custom function to format appointment time without timezone conversion
  const formatAppointmentTime = (appointmentDate: string) => {
    try {
      // Extract the time part from the appointment_date string
      const timePart = appointmentDate.split('T')[1];
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;
        return formattedTime;
      }
      return '12:00 AM'; // fallback
    } catch (error) {
      console.error('Error formatting appointment time:', error);
      return '12:00 AM'; // fallback
    }
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-circle';
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#9E9E9E';
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleAppointmentStatusUpdate = async (appointmentId: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      // Validate appointment date before status update
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        const appointmentDate = new Date(appointment.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Also set appointment date to start of day for accurate comparison
        appointmentDate.setHours(0, 0, 0, 0);
        
        console.log('📅 Comparing dates:', {
          appointmentDate: appointmentDate.toISOString(),
          today: today.toISOString(),
          isPast: appointmentDate < today
        });
        
        // Check if appointment is in the past and trying to confirm
        if (appointmentDate < today && newStatus === 'confirmed') {
          Alert.alert(
            'Cannot Confirm Past Appointment',
            'This appointment is in the past and cannot be confirmed. Please contact the customer to reschedule.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Check if appointment is too far in the future for cancellation
        const maxFutureDays = 30;
        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + maxFutureDays);
        
        if (appointmentDate > maxFutureDate && newStatus === 'cancelled') {
          Alert.alert(
            'Future Appointment Cancellation',
            'This appointment is more than 30 days in the future. Please contact the customer directly for cancellation.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      await apiService.updateAdminAppointmentStatus(appointmentId, newStatus);
      await fetchAppointments(); // Refresh the appointments
      setShowAppointmentModal(false);
      
      // Enhanced success message with appointment details
      const statusMessage = newStatus === 'confirmed' 
        ? 'confirmed successfully' 
        : newStatus === 'cancelled' 
        ? 'cancelled successfully' 
        : 'set to pending';
      
      Alert.alert('Success', `Appointment ${statusMessage}.`, [
        { text: 'OK', onPress: () => {
          // Optional: Trigger any additional actions after status update
          console.log(`Appointment ${appointmentId} status updated to ${newStatus}`);
        }}
      ]);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to update appointment status';
      
        if ((error as any).response?.data?.message) {
          errorMessage = (error as any).response.data.message;
        } else if ((error as any).message) {
          errorMessage = (error as any).message;
        }
      
      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: () => handleAppointmentStatusUpdate(appointmentId, newStatus) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const getMarkedDates = () => {
    const marked: { [date: string]: any } = {};
    
    // Get today's date using utility function
    const today = getTodayString();
    
    console.log('📅 Today date for calendar:', today);
    console.log('📅 Current date object:', new Date());
    console.log('📅 Appointments for marking:', appointments);
    
    // Mark past dates as disabled (but allow today to be tappable)
    const todayDate = new Date();
    const pastDates: string[] = [];
    
    // Generate past dates for the last 30 days
    for (let i = 1; i <= 30; i++) {
      const pastDate = new Date(todayDate);
      pastDate.setDate(todayDate.getDate() - i);
      const pastDateString = pastDate.getFullYear() + '-' + 
                            String(pastDate.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(pastDate.getDate()).padStart(2, '0');
      pastDates.push(pastDateString);
    }
    
    // Track booked dates (dates with appointments)
    const bookedDates: string[] = [];
    
    // Mark past dates as disabled
    pastDates.forEach((date) => {
      marked[date] = {
        selected: false,
        disabled: true,
        disableTouchEvent: true,
        textColor: '#ccc',
        backgroundColor: '#f5f5f5',
      };
    });
    
    // Mark today with special highlighting (but keep it tappable)
    if (!marked[today]) {
      marked[today] = {
        selected: true,
        selectedColor: '#007AFF',
        selectedTextColor: '#FFFFFF',
        marked: true,
        dotColor: '#007AFF',
        disabled: false,
        disableTouchEvent: false,
      };
    } else {
      // If today already has appointments, keep the appointment styling but ensure it's tappable
      marked[today] = {
        ...marked[today],
        disabled: false,
        disableTouchEvent: false,
      };
    }
    
    // Mark appointments with their status colors
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
      
      // Track this date as booked
      if (!bookedDates.includes(date)) {
        bookedDates.push(date);
      }
      
      let color = '#FF9800'; // pending
      if (appointment.status === 'confirmed') color = '#4CAF50';
      if (appointment.status === 'cancelled') color = '#F44336';
      
      // Check if this date is in the past
      const isPastDate = pastDates.includes(date);
      
      // Mark appointment dates with status colors
      marked[date] = {
        selected: true,
        selectedColor: color,
        selectedTextColor: '#fff',
        marked: true,
        dotColor: color,
        // Disable past dates, but keep today tappable
        disabled: isPastDate ? true : (date === today ? false : false),
        disableTouchEvent: isPastDate ? true : (date === today ? false : false),
        // For past dates, use muted colors
        textColor: isPastDate ? '#999' : undefined,
        backgroundColor: isPastDate ? '#f8f8f8' : undefined,
      };
    });
    
    // Mark booked dates that don't have appointments with a special indicator
    // This helps admin see which dates are already booked
    bookedDates.forEach((date) => {
      if (!marked[date]) {
        // This date has appointments but no specific status marking
        marked[date] = {
          selected: true,
          selectedColor: '#9C27B0', // Purple for booked
          selectedTextColor: '#fff',
          marked: true,
          dotColor: '#9C27B0',
          disabled: false,
          disableTouchEvent: false,
        };
      }
    });
    
    console.log('📅 Booked dates:', bookedDates);
    
    return marked;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={handleDatePress}
          markedDates={getMarkedDates()}
          minDate={getTodayString()}
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

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Appointment Status</Text>
        <View style={styles.legendItems}>
          {/* First Row: Today, Confirmed, Pending */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Confirmed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
          </View>
          {/* Second Row: Cancelled, Booked, Past Dates */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Cancelled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ccc' }]} />
              <Text style={styles.legendText}>Past Dates</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentModal && selectedAppointment !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAppointmentModal(false);
          setSelectedAppointment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#014D40" />
                    <Text style={styles.modalTitle}>Appointment Details</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setShowAppointmentModal(false);
                      setSelectedAppointment(null);
                    }}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.customer_name || 'Unknown Customer'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.appointment_date ? 
                        new Date(selectedAppointment.appointment_date).toLocaleDateString() : 
                        'Date not available'
                      }
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.appointment_date ? 
                        formatAppointmentTime(selectedAppointment.appointment_date) : 
                        'Time not available'
                      }
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.service_type || 'Service not specified'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedAppointment.status as keyof typeof STATUS_COLORS] || '#9E9E9E' }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(selectedAppointment.status || 'unknown')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estimated Service Completion Time:</Text>
                    <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                      {(() => {
                        // Calculate service completion time based on service type
                        const serviceType = selectedAppointment.service_type?.toLowerCase();
                        
                        // Service duration mapping
                        const serviceDurations = {
                          'measurement': '15-20 minutes',
                          'consultation': '20-30 minutes', 
                          'fitting': '30-45 minutes',
                          'alteration': '45-60 minutes'
                        };
                        
                        // Get duration based on service type, default to fitting if not found
                        const duration = serviceDurations[serviceType as keyof typeof serviceDurations] || serviceDurations['fitting'];
                        
                        return duration;
                      })()}
                    </Text>
                  </View>
                  {selectedAppointment.notes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  {selectedAppointment.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleAppointmentStatusUpdate(selectedAppointment.id, 'confirmed')}
                      >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleAppointmentStatusUpdate(selectedAppointment.id, 'cancelled')}
                      >
                        <Ionicons name="close" size={20} color="#014D40" />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedAppointment.status === 'confirmed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleAppointmentStatusUpdate(selectedAppointment.id, 'cancelled')}
                    >
                      <Ionicons name="close" size={20} color="#014D40" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.errorText}>No appointment data available</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setShowAppointmentModal(false);
                    setSelectedAppointment(null);
                  }}
                >
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#014D40',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  legendContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 16,
  },
  legendItems: {
    gap: 16,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
    padding: 24,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButton: {
    backgroundColor: '#014D40',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: '#014D40',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default AdminCalendar; 