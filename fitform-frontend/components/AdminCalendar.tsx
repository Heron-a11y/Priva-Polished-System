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
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(appointment => 
      appointment.appointment_date.startsWith(dateString)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    const dayAppointments = getAppointmentsForDate(date);
    if (dayAppointments.length > 0) {
      setSelectedAppointment(dayAppointments[0]);
      setShowAppointmentModal(true);
    }
  };

  const handleAppointmentStatusUpdate = async (appointmentId: number, newStatus: 'confirmed' | 'cancelled') => {
    try {
      await apiService.updateAppointmentStatus(appointmentId, newStatus);
      await fetchAppointments(); // Refresh the appointments
      setShowAppointmentModal(false);
      Alert.alert('Success', `Appointment ${newStatus}`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);

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
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#014D40" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{formatDate(currentDate)}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#014D40" />
        </TouchableOpacity>
      </View>

      {/* Days of Week Header */}
      <View style={styles.daysHeader}>
        {daysOfWeek.map(day => (
          <Text key={day} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (!day) {
            return <View key={index} style={styles.emptyDay} />;
          }

          const dayAppointments = getAppointmentsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                isToday && styles.today,
                isSelected && styles.selectedDay,
                dayAppointments.length > 0 && styles.hasAppointment
              ]}
              onPress={() => handleDatePress(day)}
            >
              <Text style={[
                styles.dayText,
                isToday && styles.todayText,
                isSelected && styles.selectedDayText
              ]}>
                {day.getDate()}
              </Text>
              {dayAppointments.length > 0 && (
                <View style={styles.appointmentIndicator}>
                  <Text style={styles.appointmentCount}>{dayAppointments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
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
      </View>

      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                  <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.customer_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedAppointment.appointment_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedAppointment.appointment_date).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.service_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(selectedAppointment.status) }
                      ]} />
                      <Text style={styles.detailValue}>
                        {getStatusText(selectedAppointment.status)}
                      </Text>
                    </View>
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
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  today: {
    backgroundColor: '#E8F5E8',
    borderColor: '#014D40',
  },
  selectedDay: {
    backgroundColor: '#014D40',
  },
  hasAppointment: {
    backgroundColor: '#FFF3E0',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  todayText: {
    color: '#014D40',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    width: 80,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
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
    marginLeft: 4,
  },
});

export default AdminCalendar; 