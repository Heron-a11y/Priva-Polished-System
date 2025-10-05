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
  Dimensions,
  Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

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
  
  // Helper function to get appointment status color
  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Orange
      case 'confirmed':
        return '#10B981'; // Green
      case 'cancelled':
        return '#EF4444'; // Red
      case 'completed':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentViewDate, setCurrentViewDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [dailyCapacity, setDailyCapacity] = useState<any>(null);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
  }>({});
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [timeError, setTimeError] = useState<string>('');
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

  // Helper functions for admin-style card design
  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-circle';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: formatAppointmentTime(dateString),
      fullDate: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    };
  };

  useEffect(() => {
    fetchAppointments();
    fetchBookedDates();
    fetchDailyCapacity(currentViewDate);
  }, []);

  useEffect(() => {
    // Refetch daily capacity when currentViewDate changes
    if (currentViewDate) {
      fetchDailyCapacity(currentViewDate);
    }
  }, [currentViewDate]);

  useEffect(() => {
    // Only log in development mode to improve performance
    if (__DEV__) {
    console.log('Appointments state changed:', appointments);
    console.log('Marked dates:', getMarkedDates());
    }
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      const response = await apiService.getAppointments();
      console.log('Raw appointments response:', response);
      console.log('Current user:', user);
      
      if (Array.isArray(response)) {
        setAppointments(response);
        console.log('Set appointments (array):', response);
      } else if (response && response.data) {
        setAppointments(response.data);
        console.log('Set appointments (data):', response.data);
      } else {
        setAppointments([]);
        console.log('Set appointments (empty)');
      }
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  // Time picker functions
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setSelectedTime(selectedDate);
      const timeString = selectedDate.toTimeString().slice(0, 5); // Get HH:MM format
      
      // Clear any existing time errors first
      setTimeError('');
      
      // Validate the selected time
      validateSelectedTime(timeString);
      
      // Always update the appointment with the selected time
      setNewAppointment({ ...newAppointment, preferred_time: timeString });
    }
  };

  const openTimePicker = () => {
    // Set initial time based on current preferred_time or default to 10:00
    const currentTime = newAppointment.preferred_time || '10:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setSelectedTime(date);
    setShowTimePicker(true);
  };

  const isTimeWithinBusinessHours = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const businessStart = 10 * 60; // 10:00 AM in minutes
    const businessEnd = 18 * 60; // 6:00 PM in minutes
    return totalMinutes >= businessStart && totalMinutes <= businessEnd;
  };

  const isTimeAlreadyTaken = (timeString: string) => {
    return takenTimes.includes(timeString);
  };

  const validateSelectedTime = (timeString: string) => {
    setTimeError('');
    
    if (!isTimeWithinBusinessHours(timeString)) {
      setTimeError('Time must be between 10:00 AM and 6:00 PM');
      return false;
    }
    
    if (isTimeAlreadyTaken(timeString)) {
      setTimeError('This time slot is already taken. Please select another time.');
      return false;
    }
    
    return true;
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

  const fetchDailyCapacity = async (date?: string) => {
    try {
      const response = await apiService.getDailyCapacity(date);
      if (response.success) {
        setDailyCapacity(response);
        
        // Get taken times for this date from backend response
        if (date && response.taken_times) {
          setTakenTimes(response.taken_times);
        }
      }
    } catch (error) {
      console.error('Error fetching daily capacity:', error);
    }
  };

  const handleDateSelect = async (date: any) => {
    const selectedDateStr = date.dateString;
    
    // Set the current view date for wait time calculation
    setCurrentViewDate(selectedDateStr);
    
    // Check if the date is in the past
    const selectedDate = new Date(selectedDateStr);
    const today = new Date();
    // Use local timezone for accurate date comparison
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    const selectedDateStrOnly = selectedDateStr.split('T')[0];
    
    if (selectedDateStrOnly < todayStr) {
      Alert.alert('Invalid Date', 'Cannot schedule appointments in the past. Please select a current or future date.');
      return;
    }
    
    // Open modal immediately for better UX
      setSelectedDate(selectedDateStr);
      setNewAppointment({
        ...newAppointment,
        appointment_date: selectedDateStr, // Store just the date string
        preferred_time: '10:00', // Reset to default time
      });
      setModalVisible(true);
    
    // Perform validation in background without blocking UI
    Promise.all([
      fetchDailyCapacity(selectedDateStr),
      fetchAppointments()
    ]).then(() => {
      // Validation completed, no need to do anything else
      // The modal is already open and user can proceed
    }).catch((error) => {
      console.error('Error during background validation:', error);
      // Keep modal open for user to try again
    });
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

    // Validate business hours and check for time errors
    if (!isTimeWithinBusinessHours(newAppointment.preferred_time)) {
      setTimeError('Time must be between 10:00 AM and 6:00 PM');
      return;
    }

    // Check if time is already taken (this will be handled by UI validation)
    if (isTimeAlreadyTaken(newAppointment.preferred_time)) {
      setTimeError('This time slot is already taken. Please select another time.');
      return;
    }

    // Validate that service_type is not a username
    if (newAppointment.service_type.trim().toLowerCase() === 'plengskie' || 
        newAppointment.service_type.trim().toLowerCase() === user?.name?.toLowerCase()) {
      Alert.alert('Invalid Service Type', 'Please enter a valid service type (e.g., "Fitting", "Consultation", "Measurement").');
      return;
    }

    // Validate that preferred time is not taken
    if (takenTimes.includes(newAppointment.preferred_time)) {
      setTimeError('This time slot is already taken. Please select another time.');
      return;
    }

    try {
      // Combine date and time for the appointment
      const selectedDate = newAppointment.appointment_date; // This is now just the date string (YYYY-MM-DD)
      const selectedTime = newAppointment.preferred_time;
      
      // Create a proper Date object and convert to the format the backend expects
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Validate the date is valid
      if (isNaN(appointmentDateTime.getTime())) {
        Alert.alert('Invalid Date', 'The selected date and time combination is invalid. Please try again.');
        return;
      }
      
      // Convert to the format the backend expects: YYYY-MM-DD HH:MM:SS (local time, no timezone)
      const fullDateTime = appointmentDateTime.getFullYear() + '-' +
        String(appointmentDateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(appointmentDateTime.getDate()).padStart(2, '0') + ' ' +
        String(appointmentDateTime.getHours()).padStart(2, '0') + ':' +
        String(appointmentDateTime.getMinutes()).padStart(2, '0') + ':00';
      
      const appointmentData = {
        ...newAppointment,
        appointment_date: fullDateTime,
      };

      console.log('Original appointment data:', newAppointment);
      console.log('Selected date:', selectedDate);
      console.log('Selected time:', selectedTime);
      console.log('Appointment DateTime object:', appointmentDateTime);
      console.log('Full datetime string (Backend format):', fullDateTime);
      console.log('Combined appointment data:', appointmentData);
      console.log('Final appointment_date being sent:', appointmentData.appointment_date);
      console.log('Current user:', user);

      const response = await apiService.createAppointment(appointmentData);
      console.log('Appointment API response:', response);
      if (response && response.id) {
        setModalVisible(false);
        
        // Clear the form fields after successful creation
        setTimeError(''); // Clear time error
        setNewAppointment({
          appointment_date: '',
          service_type: '',
          preferred_time: '10:00',
          notes: '',
        });
        
        // Immediately refresh appointments to prevent duplicate bookings
        await fetchAppointments();
        await fetchBookedDates(); // Refresh booked dates
        await fetchDailyCapacity(currentViewDate); // Refresh daily capacity
        
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
        setTimeError('Appointments can only be scheduled between 10:00 AM and 6:00 PM. Please select a time within business hours.');
      } else if (error.message && error.message.includes('user already has appointment')) {
        Alert.alert('Booked', 'You already have an appointment on this date. Only 1 appointment per customer per day is allowed.');
      } else if (error.message && error.message.includes('time slot taken')) {
        setTimeError('This time slot is already taken by another customer. Please select a different time.');
      } else if (error.message && error.message.includes('daily limit reached')) {
        Alert.alert('Daily Limit Reached', 'Maximum 5 appointments per day allowed. Please select another date.');
      } else {
        Alert.alert('Error', 'Failed to create appointment');
      }
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiService.deleteAppointment(id);
      fetchAppointments();
      fetchDailyCapacity(); // Refresh daily capacity
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
      let originalTime = '10:00:00';
      
      // Handle different date formats from the database
      if (appointmentToReschedule.appointment_date.includes('T')) {
        originalTime = appointmentToReschedule.appointment_date.split('T')[1];
      } else if (appointmentToReschedule.appointment_date.includes(' ')) {
        originalTime = appointmentToReschedule.appointment_date.split(' ')[1];
      }
      
      // Create the reschedule datetime in the format the backend expects
      const rescheduleDateTime = rescheduleDate + ' ' + originalTime;
      
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
      fetchDailyCapacity(); // Refresh daily capacity
      Alert.alert('Success', 'Appointment rescheduled!');
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      if (error.message && error.message.includes('past dates')) {
        Alert.alert('Invalid Date', 'Cannot reschedule appointments to past dates. Please select a current or future date.');
      } else if (error.message && error.message.includes('business hours')) {
        Alert.alert('Invalid Time', 'Appointments can only be rescheduled between 10:00 AM and 6:00 PM. Please select a time within business hours.');
      } else {
        Alert.alert('Error', 'Failed to reschedule appointment');
      }
    }
  };

  const getMarkedDates = () => {
    const marked: { [date: string]: any } = {};
    // Get current date in local timezone to avoid timezone issues
    const now = new Date();
    const today = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    
    // Only log in development mode
    if (__DEV__) {
    console.log('Appointments for calendar marking:', appointments);
    console.log('Booked dates:', bookedDates);
    console.log('Today:', today);
    }
    
    // Mark booked dates as unavailable (but allow today to be tappable if not fully booked)
    bookedDates.forEach((date) => {
      // Only disable dates that are fully booked (5 appointments) and not today
      if (date !== today) {
        marked[date] = {
          selected: false,
          disabled: true,
          disableTouchEvent: true,
          textColor: '#ccc',
          backgroundColor: '#f5f5f5',
        };
      }
    });
    
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
      
      let color = '#FF9800'; // pending
      if (appointment.status === 'confirmed') color = '#4CAF50';
      if (appointment.status === 'cancelled') color = '#F44336';
      
      // Mark appointment dates with status colors
      marked[date] = {
        selected: true,
        selectedColor: color,
        selectedTextColor: '#fff',
        marked: true,
        dotColor: color,
        // Allow today to be tappable even if it has appointments
        disabled: date === today ? false : false,
        disableTouchEvent: date === today ? false : false,
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
      // If today has appointments, merge with today highlighting
      marked[today] = {
        ...marked[today],
        selected: true,
        selectedColor: marked[today].selectedColor || '#007AFF',
        selectedTextColor: '#FFFFFF',
        marked: true,
        dotColor: marked[today].dotColor || '#007AFF',
        disabled: false,
        disableTouchEvent: false,
      };
    }
    
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
            minDate={(() => {
              const now = new Date();
              return now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                String(now.getDate()).padStart(2, '0');
            })()}
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
              <Text style={styles.legendText}>Booked</Text>
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
          
          {/* Policy Button */}
          <TouchableOpacity
            style={styles.policyButtonContainer}
            onPress={() => setShowPolicyModal(true)}
          >
            <Ionicons name="information-circle" size={20} color="#014D40" />
            <Text style={styles.policyButtonText}>View Appointment Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#014D40" />
          </TouchableOpacity>
          
          {/* Business Hours Info */}
          <View style={styles.businessHoursInfo}>
            <Text style={styles.businessHoursTitle}>Business Hours</Text>
            <Text style={styles.businessHoursText}>10:00 AM - 6:00 PM</Text>
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
            appointments.map((appointment) => {
              const dateInfo = formatDate(appointment.appointment_date);
              
              return (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.customerInfo}>
                      {user?.profile_image ? (
                        <Image 
                          source={{ 
                            uri: user.profile_image.replace('https://fitform-api.ngrok.io', 'http://192.168.1.105:8000'),
                            cache: 'force-cache'
                          }} 
                          style={styles.customerProfileImage}
                          resizeMode="cover"
                          onError={(error) => console.log('❌ Profile image error:', error)}
                        />
                      ) : (
                        <Ionicons name="person-circle" size={20} color="#014D40" />
                      )}
                      <Text style={styles.customerName}>
                        {user?.name || 'Your Appointment'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS] }]}>
                      <Ionicons name={getStatusIcon(appointment.status)} size={16} color="#fff" />
                      <Text style={styles.statusText}>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={18} color="#666" />
                      <Text style={styles.infoText}>{dateInfo.fullDate}</Text>
                      <Text style={styles.timeText}>{dateInfo.time}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="briefcase-outline" size={18} color="#666" />
                      <Text style={styles.infoText}>{appointment.service_type}</Text>
                    </View>
                    
                    {appointment.notes && (
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={18} color="#666" />
                        <Text style={styles.infoText} numberOfLines={2}>{appointment.notes}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewDetailsButton]}
                      onPress={() => {
                        setSelectedAppointmentDetails(appointment);
                        setShowAppointmentDetails(true);
                      }}
                    >
                      <Ionicons name="eye" size={18} color="#014D40" />
                      <Text style={styles.viewDetailsText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Appointment Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.scheduleModalContainer}>
          <View style={styles.scheduleModalHeader}>
            <View style={styles.scheduleModalHeaderContent}>
              <View style={styles.scheduleModalIconContainer}>
                <Ionicons name="calendar" size={24} color={Colors.primary} />
              </View>
               <View style={styles.scheduleModalTitleContainer}>
                 <Text style={styles.scheduleModalTitle} numberOfLines={1}>
                   Schedule Appointment
                 </Text>
               </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setTimeError(''); // Clear time error
                // Reset form when modal is closed
                setNewAppointment({
                  appointment_date: '',
                  service_type: '',
                  preferred_time: '10:00',
                  notes: '',
                });
              }}
              style={styles.scheduleModalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
          <ScrollView style={styles.scheduleModalContent} showsVerticalScrollIndicator={false}>
            {/* Service Type Card */}
            <View style={styles.scheduleModalCard}>
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="shirt" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Service Type</Text>
              </View>
              <TextInput
                style={styles.scheduleModalInput}
                value={newAppointment.service_type}
                onChangeText={(text) => {
                  console.log('Service type changed to:', text);
                  setNewAppointment({ ...newAppointment, service_type: text });
                }}
                placeholder="Enter service type (e.g., Fitting, Consultation, Measurement)"
                placeholderTextColor={Colors.text.secondary}
              />
            </View>

            {/* Time Selection Card */}
            <View style={styles.scheduleModalCard}>
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="time" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Preferred Time</Text>
              </View>
              <Text style={styles.scheduleModalCardSubtitle}>Select time between 10 AM - 6 PM</Text>
              
              {/* Time Picker Button */}
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openTimePicker}
              >
                <View style={styles.timePickerContent}>
                  <Ionicons name="time" size={20} color={Colors.primary} />
                  <View style={styles.timePickerTextContainer}>
                    <Text style={styles.timePickerLabel}>Selected Time</Text>
                    <Text style={styles.timePickerValue}>
                      {newAppointment.preferred_time ? 
                        (() => {
                          const [hours, minutes] = newAppointment.preferred_time.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          return `${displayHour}:${minutes} ${ampm}`;
                        })() : 
                        '10:00 AM'
                      }
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
                </View>
              </TouchableOpacity>

              {/* Time Validation Error */}
              {timeError && (
                <View style={styles.timeValidationError}>
                  <Ionicons name="warning" size={16} color={Colors.error} />
                  <Text style={styles.timeValidationText}>
                    {timeError}
                  </Text>
                </View>
              )}

              {/* Time Picker Modal */}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
              </View>

            {/* Notes Card */}
            <View style={styles.scheduleModalCard}>
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Additional Notes</Text>
              </View>
              <TextInput
                style={styles.scheduleModalTextArea}
                value={newAppointment.notes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, notes: text })
                }
                placeholder="Add any special requirements or notes (optional)"
                placeholderTextColor={Colors.text.secondary}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          <View style={styles.scheduleModalFooter}>
              <TouchableOpacity
              style={styles.scheduleModalCancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setTimeError(''); // Clear time error
                  // Reset form when cancel is pressed
                  setNewAppointment({
                    appointment_date: '',
                    service_type: '',
                    preferred_time: '10:00',
                    notes: '',
                  });
                }}
              >
                <Ionicons name="close-circle" size={20} color={Colors.text.primary} />
                <Text style={styles.scheduleModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
              style={styles.scheduleModalConfirmButton}
                onPress={handleCreateAppointment}
              >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.scheduleModalConfirmButtonText}>Schedule</Text>
              </TouchableOpacity>
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

      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAppointmentDetails(false)}
      >
        {selectedAppointmentDetails && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity
                onPress={() => setShowAppointmentDetails(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.orderDetailCard}>
                <View style={styles.orderDetailHeader}>
                  <Text style={styles.orderDetailTitle}>
                    {selectedAppointmentDetails.service_type} Appointment
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getAppointmentStatusColor(selectedAppointmentDetails.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getAppointmentStatusColor(selectedAppointmentDetails.status) }]}>
                      {selectedAppointmentDetails.status.charAt(0).toUpperCase() + selectedAppointmentDetails.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Appointment ID:</Text>
                  <Text style={styles.detailValue}>#{selectedAppointmentDetails.id}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointmentDetails.customer_name || user?.name || 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointmentDetails.appointment_date).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {formatAppointmentTime(selectedAppointmentDetails.appointment_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service Type:</Text>
                  <Text style={styles.detailValue}>{selectedAppointmentDetails.service_type}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estimated Wait Time:</Text>
                  <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                    {(() => {
                      // Calculate wait time for this appointment
                      const appointmentDateStr = selectedAppointmentDetails.appointment_date;
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
                
                {selectedAppointmentDetails.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.notesValue}>{selectedAppointmentDetails.notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedAppointmentDetails.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rescheduleButton]}
                    onPress={() => {
                      setShowAppointmentDetails(false);
                      openRescheduleModal(selectedAppointmentDetails);
                    }}
                  >
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAppointmentDetails(false);
                      handleCancel(selectedAppointmentDetails.id);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.text.primary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {selectedAppointmentDetails.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, styles.fullWidthButton]}
                  onPress={() => {
                    setShowAppointmentDetails(false);
                    handleCancel(selectedAppointmentDetails.id);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.text.primary} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {selectedAppointmentDetails.status === 'cancelled' && (
                <View style={styles.cancelledStatusModal}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.cancelledStatusText}>This appointment has been cancelled</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* Appointment Policy Modal */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appointment Policy</Text>
            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailCard}>
              <View style={styles.orderDetailHeader}>
                <View style={styles.agreementIconContainer}>
                  <Ionicons name="business" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.orderDetailTitle}>Appointment Policy & Guidelines</Text>
                <Text style={styles.agreementSubtitle}>
                  Please read and understand our appointment policies
                </Text>
              </View>
              
              <View style={styles.agreementTermsContainer}>
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="people" size={20} color={Colors.primary} />
                    <Text style={styles.agreementTermTitle}>Daily Capacity</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    The business caters to a maximum of 5 clients per day (both online appointments and walk-ins). Each customer can schedule only 1 appointment per day.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="time" size={20} color={Colors.warning} />
                    <Text style={styles.agreementTermTitle}>Service Duration</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Each appointment has an estimated wait time of 1 hour per client.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="calendar" size={20} color={Colors.success} />
                    <Text style={styles.agreementTermTitle}>Priority System</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Reserved customers have priority. Walk-ins are accommodated if reserved customers are late.
                  </Text>
                </View>
                
                <View style={styles.agreementTermCard}>
                  <View style={styles.agreementTermHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.info} />
                    <Text style={styles.agreementTermTitle}>Service Availability</Text>
                  </View>
                  <Text style={styles.agreementTermDescription}>
                    Both reserved customers and walk-ins can be served simultaneously when there are no customers waiting in line.
                  </Text>
                </View>
              </View>
              
              <View style={styles.agreementFooter}>
                <Ionicons name="information-circle" size={18} color={Colors.warning} />
                <Text style={styles.agreementFooterText}>
                  Please arrive on time for your appointment to ensure smooth service.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowPolicyModal(false)}
            >
              <Text style={styles.saveButtonText}>Got It</Text>
            </TouchableOpacity>
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
  policyButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#014D40',
    marginTop: 20,
    marginBottom: 10,
  },
  policyButtonText: {
    color: '#014D40',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerProfileImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#014D40',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardContent: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewDetailsButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  viewDetailsText: {
    color: '#014D40',
    fontSize: 14,
    fontWeight: '600',
  },
  // Appointment Details Modal Styles
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
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#014D40',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#014D40',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  cancelledStatusModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  cancelledStatusText: {
    color: '#666',
    fontSize: 16,
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
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  confirmModalButton: {
    backgroundColor: '#014D40',
  },
  cancelModalButtonText: {
    color: Colors.text.primary,
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
  disabledTimeSlot: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    opacity: 0.6,
  },
  disabledTimeSlotText: {
    color: '#999',
    textDecorationLine: 'line-through',
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
  capacityInfo: {
    marginTop: 16,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    textAlign: 'center',
    marginBottom: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  capacityLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
    flexWrap: 'wrap',
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  
  // New modal styles matching order details modal
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  orderDetailCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  orderDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  orderDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
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
  notesValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minHeight: 48,
  },
  rescheduleButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidthButton: {
    flex: 1,
    width: '100%',
  },
  cancelledStatusModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  cancelledStatusText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Policy Modal Styles
  agreementIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  agreementSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  agreementTermsContainer: {
    marginTop: 20,
  },
  agreementTermCard: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  agreementTermHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agreementTermTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  agreementFooterText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  // Enhanced Schedule Modal Styles
  scheduleModalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  scheduleModalHeader: {
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
  scheduleModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  scheduleModalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scheduleModalTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  scheduleModalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  scheduleModalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  scheduleModalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  scheduleModalContent: {
    flex: 1,
    padding: 20,
  },
  scheduleModalCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  scheduleModalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleModalCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  scheduleModalCardSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  scheduleModalInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.light,
  },
  scheduleModalTextArea: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.light,
    height: 100,
    textAlignVertical: 'top',
  },
  scheduleModalTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  scheduleModalTimeSlot: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '30%',
    alignItems: 'center',
    minHeight: 44,
  },
  scheduleModalSelectedTimeSlot: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scheduleModalDisabledTimeSlot: {
    backgroundColor: Colors.background.disabled,
    borderColor: Colors.border.disabled,
  },
  scheduleModalTimeSlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  scheduleModalSelectedTimeSlotText: {
    color: Colors.text.inverse,
  },
  scheduleModalDisabledTimeSlotText: {
    color: Colors.text.disabled,
  },
  scheduleModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    gap: 12,
  },
  scheduleModalCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  scheduleModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scheduleModalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scheduleModalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Time Picker Styles
  timePickerButton: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginVertical: 8,
  },
  timePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  timePickerTextContainer: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  timePickerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeValidationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  timeValidationText: {
    fontSize: 14,
    color: Colors.error,
    flex: 1,
  },
});

export default AppointmentsScreen; 