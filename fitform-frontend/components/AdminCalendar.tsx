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
  pending: '#FFA000',
  cancelled: '#F44336',
};

const STATUS_ICONS = {
  confirmed: 'checkmark-circle',
  pending: 'time',
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
      
      // Handle different response formats
      const appointmentsData = Array.isArray(data) ? data : (data?.data || []);
      console.log('Processed appointments:', appointmentsData);
      
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
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
    
    const filteredAppointments = appointments.filter(appointment => {
      console.log('Checking appointment:', appointment);
      console.log('Appointment date:', appointment.appointment_date);
      console.log('Date string:', dateString);
      
      // Handle different date formats
      let appointmentDate;
      if (appointment.appointment_date.includes('T')) {
        appointmentDate = appointment.appointment_date.split('T')[0];
      } else {
        appointmentDate = appointment.appointment_date.split(' ')[0];
      }
      
      console.log('Processed appointment date:', appointmentDate);
      console.log('Matches:', appointmentDate === dateString);
      
      return appointmentDate === dateString;
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
      await apiService.updateAppointmentStatus(appointmentId, newStatus);
      await fetchAppointments(); // Refresh the appointments
      setShowAppointmentModal(false);
      Alert.alert('Success', `Appointment ${newStatus === 'confirmed' ? 'confirmed' : newStatus === 'cancelled' ? 'cancelled' : 'set to pending'}.`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const getMarkedDates = () => {
    const marked: { [date: string]: any } = {};
    const today = new Date().toISOString().split('T')[0];
    
    // Mark today's date with special highlighting
    marked[today] = {
      selected: true,
      selectedColor: '#007AFF',
      selectedTextColor: '#FFFFFF',
      marked: true,
      dotColor: '#007AFF',
    };
    
    appointments.forEach((appointment) => {
      // Handle different date formats
      let date;
      if (appointment.appointment_date.includes('T')) {
        date = appointment.appointment_date.split('T')[0];
      } else {
        // If it's already in YYYY-MM-DD format
        date = appointment.appointment_date.split(' ')[0];
      }
      
      let color = getStatusColor(appointment.status);
      
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
          {/* Second Row: Cancelled */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Cancelled</Text>
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
            {console.log('Modal rendering - selectedAppointment:', selectedAppointment)}
            {console.log('Modal visible:', showAppointmentModal)}
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
                    <Text style={styles.detailValue}>
                      {getStatusText(selectedAppointment.status || 'unknown')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estimated Wait Time:</Text>
                    <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                      {(() => {
                        // Calculate wait time for this appointment
                        const appointmentDateStr = selectedAppointment.appointment_date;
                        const timeMatch = appointmentDateStr.match(/T(\d{2}):(\d{2}):(\d{2})/);
                        
                        if (timeMatch) {
                          const hours = parseInt(timeMatch[1], 10);
                          const waitTimeHours = hours - 10; // Hours after 10 AM
                          const validWaitTime = Math.max(0, Math.min(waitTimeHours, 6));
                          
                          return validWaitTime === 0 ? 'No wait time (First appointment)' : `${validWaitTime} hours`;
                        }
                        return 'Unable to calculate';
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
                        <Ionicons name="close" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedAppointment.status === 'confirmed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleAppointmentStatusUpdate(selectedAppointment.id, 'cancelled')}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Cancel</Text>
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
                  <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
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
});

export default AdminCalendar; 