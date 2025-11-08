import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { useScrollOnError } from '../../hooks/useScrollOnError';
import CollapsibleSortButton from '../../components/CollapsibleSortButton';
import { getLocalImageUrl } from '../../utils/imageUrlHelper';

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
  const [imageError, setImageError] = useState(false);
  const scheduleScrollRef = useRef<ScrollView>(null);
  const serviceTypeSectionRef = useRef<View>(null);
  const timeSectionRef = useRef<View>(null);
  const scrollContentRef = useRef<View>(null);

  // Reset image error when user or profile image changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profile_image]);
  const [serviceTypeSectionY, setServiceTypeSectionY] = useState(0);
  const [timeSectionY, setTimeSectionY] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ serviceType?: string }>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Adopt admin scroll-on-error utility
  const { scrollToElement: scrollToErrorElement } = useScrollOnError({
    scrollViewRef: scheduleScrollRef,
    offset: 100,
    animated: true,
    delay: 150
  });

  
  // Sort options state
  const [sortOption, setSortOption] = useState('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort options configuration
  const sortOptions = [
    { key: 'status', label: 'Status', icon: 'flag' },
    { key: 'date', label: 'Appointment Date', icon: 'calendar' },
    { key: 'service', label: 'Service Type', icon: 'construct' },
    { key: 'created', label: 'Date Created', icon: 'time' },
  ];
  
  // Memoize sorted appointments
  const sortedAppointments = useMemo(() => {
    const sorted = [...appointments];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption) {
        case 'status':
          // Priority order: pending, confirmed, completed
          const statusPriority = {
            'pending': 1,
            'confirmed': 2,
            'completed': 3
          };
          const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 4;
          const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 4;
          comparison = aPriority - bPriority;
          break;
          
        case 'date':
          const aDate = new Date(a.appointment_date).getTime();
          const bDate = new Date(b.appointment_date).getTime();
          comparison = aDate - bDate;
          break;
          
        case 'service':
          const aService = a.service_type.toLowerCase();
          const bService = b.service_type.toLowerCase();
          comparison = aService.localeCompare(bService);
          break;
          
        case 'created':
          // Assuming appointments have a created_at field, fallback to appointment_date
          const aCreated = new Date(a.created_at || a.appointment_date).getTime();
          const bCreated = new Date(b.created_at || b.appointment_date).getTime();
          comparison = aCreated - bCreated;
          break;
          
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [appointments, sortOption, sortDirection]);

  // Handle sort change
  const handleSortChange = (option: string, direction: 'asc' | 'desc') => {
    setSortOption(option);
    setSortDirection(direction);
  };
  
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
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
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
  const [appointmentErrors, setAppointmentErrors] = useState<{
    dailyLimit?: string;
    timeSlot?: string;
    capacity?: string;
    general?: string;
  }>({});
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [timeError, setTimeError] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateForPicker, setSelectedDateForPicker] = useState(new Date());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteOption, setSelectedDeleteOption] = useState<'all' | 'cancelled' | null>(null);
  const router = useRouter();
  const { register } = useAuth();

  // Custom function to format appointment time without timezone conversion
  const formatAppointmentTime = (appointmentDate: string) => {
    try {
      console.log('Formatting appointment time:', { appointmentDate });
      
      // Handle different date formats
      let timePart = '';
      
      // Check if it's in ISO format with T separator
      if (appointmentDate.includes('T')) {
        timePart = appointmentDate.split('T')[1];
        console.log('Extracted from T format:', timePart);
      }
      // Check if it's in format like "2025-10-31 10:00:00"
      else if (appointmentDate.includes(' ')) {
        timePart = appointmentDate.split(' ')[1];
        console.log('Extracted from space format:', timePart);
      }
      // Check if it's a Date object or can be parsed as one
      else {
        const date = new Date(appointmentDate);
        if (!isNaN(date.getTime())) {
          // Extract time from Date object
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          timePart = `${hours}:${minutes}:00`;
          console.log('Extracted from Date object:', timePart);
        }
      }
      
      console.log('Final time part:', timePart);
      
      if (timePart && timePart !== 'undefined') {
        const timeComponents = timePart.split(':');
        if (timeComponents.length >= 2) {
          const hours = timeComponents[0];
          const minutes = timeComponents[1];
          const hour = parseInt(hours);
          
          if (!isNaN(hour) && hour >= 0 && hour <= 23) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const formattedTime = `${displayHour}:${minutes} ${ampm}`;
            console.log('Time formatting result:', { hours, minutes, hour, ampm, displayHour, formattedTime });
            return formattedTime;
          }
        }
      }
      
      console.warn('No valid time part found, using fallback');
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

  // Render appointment card for FlatList
  const renderAppointmentCard = useCallback(({ item: appointment }: { item: Appointment }) => {
    const dateInfo = formatDate(appointment.appointment_date);
    
    return (
      <TouchableOpacity 
        style={styles.appointmentCard}
        onPress={() => {
          setSelectedAppointmentDetails(appointment);
          setShowAppointmentDetails(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            {user?.profile_image && !imageError ? (
              <Image 
                source={{ 
                  uri: getLocalImageUrl(user.profile_image),
                  cache: 'reload'
                }} 
                style={styles.customerProfileImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Appointments Card Profile image error:', error);
                  console.log('🔍 Attempted URL:', getLocalImageUrl(user.profile_image));
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('✅ Appointments Card Profile image loaded:', getLocalImageUrl(user.profile_image));
                  setImageError(false);
                }}
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
          {/* Transaction Action Buttons */}
          <View style={styles.transactionActions}>
            {/* Cancel Button - Show for all statuses except completed/cancelled - LEFT SIDE */}
            {!['completed', 'cancelled'].includes(appointment.status) && (
              <TouchableOpacity 
                style={[
                  styles.cancelButton,
                  !['pending', 'confirmed'].includes(appointment.status) && styles.singleButton
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancelAppointment(appointment);
                }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Edit Button - Show for pending and confirmed statuses - RIGHT SIDE */}
            {['pending', 'confirmed'].includes(appointment.status) && (
              <TouchableOpacity 
                style={[
                  styles.editButton,
                  !['completed', 'cancelled'].includes(appointment.status) ? null : styles.singleButton
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditAppointment(appointment);
                }}
              >
                <Ionicons name="create-outline" size={16} color="#014D40" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [user, handleCancelAppointment, handleEditAppointment]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (user) {
      fetchAppointments(1, true);
      fetchBookedDates();
      fetchDailyCapacity(currentViewDate);
    }
  }, [user, fetchAppointments]);

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

  const fetchAppointments = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMorePages(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      console.log('🔄 Fetching appointments for user:', user?.id, 'Page:', page);
      
      // Check if user is authenticated before making the request
      if (!user) {
        console.log('⚠️ No user authenticated, skipping appointments fetch');
        setAppointments([]);
        return;
      }
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      
      const response = await apiService.get(`/appointments?${params}`);
      console.log('📅 Raw appointments response:', response);
      
      if (response && response.success) {
        const newAppointments = (response.data || []).map((item: any) => ({
          id: item.id,
          appointment_date: item.appointment_date,
          service_type: item.service_type,
          status: item.status,
          notes: item.notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        
        // Debug: Log pagination info
        console.log(`[Appointments] Page ${page}, Received ${newAppointments.length} appointments, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        if (reset) {
          setAppointments(newAppointments);
        } else {
          // Deduplicate appointments by id to prevent duplicates
          setAppointments(prev => {
            const existingIds = new Set(prev.map(apt => apt.id));
            const uniqueNewAppointments = newAppointments.filter(apt => !existingIds.has(apt.id));
            return [...prev, ...uniqueNewAppointments];
          });
        }
        
        setHasMorePages(response.pagination?.has_more_pages || false);
        setCurrentPage(page);
      } else {
        // Handle legacy response format (array or data property)
      let appointmentsData = [];
      if (Array.isArray(response)) {
        appointmentsData = response;
      } else if (response && response.data) {
        appointmentsData = response.data;
      }
      
        if (reset) {
      setAppointments(appointmentsData);
        } else {
          setAppointments(prev => {
            const existingIds = new Set(prev.map(apt => apt.id));
            const uniqueNewAppointments = appointmentsData.filter((apt: Appointment) => !existingIds.has(apt.id));
            return [...prev, ...uniqueNewAppointments];
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      
      // Handle specific error cases
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        console.log('🔐 Authentication required - user may need to login again');
      } else if (error instanceof Error && error.message?.includes('Network error')) {
        console.log('🌐 Network error - check backend server connection');
      }
      
      if (reset) {
      setAppointments([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);
  
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMorePages) {
      fetchAppointments(currentPage + 1, false);
    }
  }, [loadingMore, hasMorePages, currentPage, fetchAppointments]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments(1, true).finally(() => setRefreshing(false));
  }, [fetchAppointments]);

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
    // Clear any existing time errors when opening the picker
    setTimeError('');
    
    // Set initial time based on current preferred_time or default to 10:00
    const currentTime = newAppointment.preferred_time || '10:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    const date = new Date();
    
    // Ensure time is within business hours (10:00 AM to 7:00 PM)
    let validHours = hours;
    if (hours < 10) {
      validHours = 10;
    } else if (hours > 19) {
      validHours = 19;
    }
    
    date.setHours(validHours, minutes, 0, 0);
    setSelectedTime(date);
    setShowTimePicker(true);
  };

  const isTimeWithinBusinessHours = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const businessStart = 10 * 60; // 10:00 AM in minutes (600 minutes)
    const businessEnd = 19 * 60; // 7:00 PM in minutes (1140 minutes)
    
    // Debug logging to help identify the issue
    console.log('🕐 Time validation:', {
      timeString,
      hours,
      minutes,
      totalMinutes,
      businessStart,
      businessEnd,
      isValid: totalMinutes >= businessStart && totalMinutes <= businessEnd
    });
    
    return totalMinutes >= businessStart && totalMinutes <= businessEnd;
  };

  const isTimeOnHourOrHalfHour = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return minutes === 0 || minutes === 30;
  };

  const isTimeAlreadyTaken = (timeString: string) => {
    return takenTimes.includes(timeString);
  };

  const validateSelectedTime = (timeString: string) => {
    setTimeError('');
    setAppointmentErrors(prev => ({ ...prev, timeSlot: undefined }));
    
    // Check if time is on the hour or half-hour
    if (!isTimeOnHourOrHalfHour(timeString)) {
      setTimeError('Appointments can only be scheduled on the hour or half-hour (e.g., 2:00 PM or 2:30 PM)');
      return false;
    }
    
    if (!isTimeWithinBusinessHours(timeString)) {
      setTimeError('Time must be between 10:00 AM and 7:00 PM');
      return false;
    }
    
    // Check if time slot is already taken (considering editing mode)
    if (newAppointment.appointment_date) {
      const selectedDate = newAppointment.appointment_date;
      const conflictingAppointment = appointments.find(apt => {
        const aptDateTime = apt.appointment_date;
        const aptDate = aptDateTime.split('T')[0];
        const aptTime = aptDateTime.split('T')[1]?.split(':')[0] + ':' + aptDateTime.split('T')[1]?.split(':')[1];
        
        return aptDate === selectedDate && 
               aptTime === timeString && 
               (!editingAppointmentId || apt.id !== editingAppointmentId);
      });

      if (conflictingAppointment) {
        setTimeError('This time slot is already taken. Please select another time.');
        return false;
      }
    }
    
    return true;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDateForPicker(selectedDate);
      // Format the date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Update the appointment with the selected date
      setNewAppointment({ ...newAppointment, appointment_date: dateString });
      
      // Also update the selectedDate state for calendar synchronization
      setSelectedDate(dateString);
    }
  };

  const openDatePicker = () => {
    // Set initial date based on current appointment_date or today
    let initialDate = new Date();
    if (newAppointment.appointment_date) {
      initialDate = new Date(newAppointment.appointment_date);
    }
    setSelectedDateForPicker(initialDate);
    setShowDatePicker(true);
  };

  const fetchBookedDates = async () => {
    try {
      const response = await apiService.getBookedDates();
      console.log('📅 Fetched booked dates response:', response);
      if (response.success && response.booked_dates) {
        setBookedDates(response.booked_dates);
        console.log('📅 Set booked dates:', response.booked_dates);
      }
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    }
  };

  const fetchDailyCapacity = async (date?: string) => {
    try {
      const response = await apiService.getDailyCapacity(date);
      if (response.success) {
        // Support both legacy shape and new shape
        setDailyCapacity(response.data ? response.data : response);

        // Get taken times for this date from backend response
        const times = response.taken_times || response.data?.taken_times;
        if (date && times) {
          setTakenTimes(Array.isArray(times) ? times : []);
        }
      }
    } catch (error) {
      console.error('Error fetching daily capacity:', error);
    }
  };

  const handleDateSelect = async (date: any) => {
    const selectedDateStr = date.dateString;
    
    // Set the current view date for service completion time calculation
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
    
    // Clear any existing errors only after basic validation passes
    setTimeError('');
    setAppointmentErrors({});
    
    // Check for existing appointment on the same date (one appointment per day limit)
    const existingAppointmentOnDate = appointments.find(apt => 
      apt.appointment_date.split('T')[0] === selectedDateStrOnly && 
      (!editingAppointmentId || apt.id !== editingAppointmentId)
    );

    if (existingAppointmentOnDate) {
      console.log('🚫 User already has appointment on this date:', selectedDateStrOnly, 'Existing appointment:', existingAppointmentOnDate);
      setAppointmentErrors({
        dailyLimit: 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.'
      });
      return;
    }

    // Check if date is already booked (reached daily capacity)
    const isDateBooked = bookedDates.includes(selectedDateStrOnly);
    if (isDateBooked) {
      console.log('🚫 Selected date is booked:', selectedDateStrOnly, 'Booked dates:', bookedDates);
      setAppointmentErrors({
        booked: 'This date is already booked and has reached its daily capacity. Please select another date.'
      });
      return;
    }

    // Check daily capacity limit (5 appointments per day)
    const appointmentsOnSelectedDate = appointments.filter(apt => 
      apt.appointment_date.split('T')[0] === selectedDateStrOnly &&
      (!editingAppointmentId || apt.id !== editingAppointmentId)
    );

    if (appointmentsOnSelectedDate.length >= 5) {
      setAppointmentErrors({
        capacity: 'This date has reached its daily capacity of 5 appointments. Please select another date.'
      });
      return;
    }
    
    // Only open modal if all validations pass
    setSelectedDate(selectedDateStr);
    setNewAppointment({
      ...newAppointment,
      appointment_date: selectedDateStr, // Store just the date string
      preferred_time: editingAppointmentId ? newAppointment.preferred_time : '10:00', // Preserve existing time when editing
    });
    setModalVisible(true);
    
    // Perform validation in background without blocking UI
    Promise.all([
      fetchDailyCapacity(selectedDateStr),
      fetchAppointments(1, true)
    ]).then(() => {
      // Validation completed, no need to do anything else
      // The modal is already open and user can proceed
    }).catch((error) => {
      console.error('Error during background validation:', error);
      // Keep modal open for user to try again
    });
  };

  const handleAddAppointment = async () => {
    // Clear any existing time errors when opening the modal
    setTimeError('');
    
    // Get today's date
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    let selectedDateStr = todayStr;
    
    // Check if today is a weekend
    if (today.getDay() === 0 || today.getDay() === 6) {
      // If today is weekend, find the next weekday
      let nextWeekday = new Date(today);
      do {
        nextWeekday.setDate(nextWeekday.getDate() + 1);
      } while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6);
      
      selectedDateStr = nextWeekday.getFullYear() + '-' + 
        String(nextWeekday.getMonth() + 1).padStart(2, '0') + '-' + 
        String(nextWeekday.getDate()).padStart(2, '0');
    } else {
      // Check if it's after business hours (after 7 PM)
      const currentHour = today.getHours();
      if (currentHour >= 19) {
        // If after business hours, set tomorrow as default
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // If tomorrow is weekend, find next weekday
        if (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
          do {
            tomorrow.setDate(tomorrow.getDate() + 1);
          } while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6);
        }
        
        selectedDateStr = tomorrow.getFullYear() + '-' + 
          String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
          String(tomorrow.getDate()).padStart(2, '0');
      }
    }
    
    // Set the selected date and appointment data
    setSelectedDate(selectedDateStr);
    setCurrentViewDate(selectedDateStr);
    setNewAppointment({
      appointment_date: selectedDateStr,
      service_type: '',
      preferred_time: '10:00',
      notes: '',
    });
    
    // Open the modal
    setModalVisible(true);
    
    // Fetch daily capacity for the selected date in the background
    try {
      await fetchDailyCapacity(selectedDateStr);
    } catch (error) {
      console.error('Error fetching daily capacity:', error);
    }
  };

  const handleCreateAppointment = async () => {
    // Clear previous errors
    setTimeError('');
    setAppointmentErrors({});

    // Validate required fields
    if (!newAppointment.service_type.trim()) {
      console.log('🚨 Service type validation failed, scrolling to service type section');
      setFieldErrors({ serviceType: 'Please select a service type.' });
      // Use same util as admin to scroll to element
      scrollToErrorElement(serviceTypeSectionRef, 'serviceType');
      return;
    } else if (fieldErrors.serviceType) {
      setFieldErrors({});
    }

    if (!newAppointment.preferred_time) {
      console.log('🚨 Time validation failed, scrolling to time section');
      setTimeError('Please select a preferred time.');
      scrollToErrorElement(timeSectionRef, 'time');
      return;
    }

    if (!newAppointment.appointment_date) {
      console.log('🚨 Date validation failed, scrolling to top');
      setAppointmentErrors({ general: 'Please select an appointment date.' });
      scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Validate time format (hour or half-hour only)
    if (!isTimeOnHourOrHalfHour(newAppointment.preferred_time)) {
      console.log('🚨 Time format validation failed, scrolling to time section');
      setTimeError('Appointments can only be scheduled on the hour or half-hour (e.g., 2:00 PM or 2:30 PM)');
      scrollToErrorElement(timeSectionRef, 'time');
      return;
    }

    // Validate business hours and check for time errors
    if (!isTimeWithinBusinessHours(newAppointment.preferred_time)) {
      console.log('🚨 Business hours validation failed, scrolling to time section');
      setTimeError('Time must be between 10:00 AM and 7:00 PM');
      scrollToErrorElement(timeSectionRef, 'time');
      return;
    }

    // Validate that service_type is not a username
    if (newAppointment.service_type.trim().toLowerCase() === 'plengskie' || 
        newAppointment.service_type.trim().toLowerCase() === user?.name?.toLowerCase()) {
      Alert.alert('Invalid Service Type', 'Please enter a valid service type (e.g., "Fitting", "Consultation", "Measurement").');
      return;
    }

    // Check for existing appointment on the same date (one appointment per day limit)
    const selectedDate = newAppointment.appointment_date;
    const existingAppointmentOnDate = appointments.find(apt => 
      apt.appointment_date.split('T')[0] === selectedDate && 
      (!editingAppointmentId || apt.id !== editingAppointmentId)
    );

    if (existingAppointmentOnDate) {
      console.log('🚫 Create appointment - user already has appointment on this date:', selectedDate, 'Existing appointment:', existingAppointmentOnDate);
      setAppointmentErrors({
        dailyLimit: 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.'
      });
      scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Check if date is already booked (reached daily capacity)
    const isDateBooked = bookedDates.includes(selectedDate);
    if (isDateBooked) {
      console.log('🚫 Create appointment - date is booked:', selectedDate, 'Booked dates:', bookedDates);
      setAppointmentErrors({
        booked: 'This date is already booked and has reached its daily capacity. Please select another date.'
      });
      scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Check if time slot is already taken
    const conflictingAppointment = appointments.find(apt => {
      const aptDateTime = apt.appointment_date;
      const aptDate = aptDateTime.split('T')[0];
      const aptTime = aptDateTime.split('T')[1]?.split(':')[0] + ':' + aptDateTime.split('T')[1]?.split(':')[1];
      
      return aptDate === selectedDate && 
             aptTime === newAppointment.preferred_time && 
             (!editingAppointmentId || apt.id !== editingAppointmentId);
    });

    if (conflictingAppointment) {
      console.log('🚨 Time slot conflict validation failed, scrolling to time section');
      setTimeError('This time slot is already taken. Please select another time.');
      scrollToErrorElement(timeSectionRef, 'time');
      return;
    }

    // Check daily capacity limit (5 appointments per day)
    const appointmentsOnSelectedDate = appointments.filter(apt => 
      apt.appointment_date.split('T')[0] === selectedDate &&
      (!editingAppointmentId || apt.id !== editingAppointmentId)
    );

    if (appointmentsOnSelectedDate.length >= 5) {
      setAppointmentErrors({
        capacity: 'This date has reached its daily capacity of 5 appointments. Please select another date.'
      });
      scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
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
      
      // Convert to the format the backend expects: separate date and time fields
      const appointmentDate = appointmentDateTime.getFullYear() + '-' +
        String(appointmentDateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(appointmentDateTime.getDate()).padStart(2, '0');
      
      const appointmentTime = String(appointmentDateTime.getHours()).padStart(2, '0') + ':' +
        String(appointmentDateTime.getMinutes()).padStart(2, '0');
      
      // Final guard: block scheduling if date is booked (frontend safety net)
      if (bookedDates.includes(appointmentDate)) {
        console.log('🚫 Final guard - date is booked:', appointmentDate, 'Booked dates:', bookedDates);
        setAppointmentErrors({
          booked: 'This date is already booked and has reached its daily capacity. Please select another date.'
        });
        return;
      }

      const appointmentData = {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        service_type: newAppointment.service_type,
        notes: newAppointment.notes || null,
      };

      // If editing a confirmed appointment, change status to pending for reconfirmation
      if (editingAppointmentId) {
        const originalAppointment = appointments.find(apt => apt.id === editingAppointmentId);
        if (originalAppointment && originalAppointment.status === 'confirmed') {
          // Check if any critical fields have changed
          const originalDate = originalAppointment.appointment_date.split('T')[0];
          const originalTime = originalAppointment.appointment_date.split('T')[1]?.split(':')[0] + ':' + 
                               originalAppointment.appointment_date.split('T')[1]?.split(':')[1];
          
          const hasDateChanged = appointmentDate !== originalDate;
          const hasTimeChanged = appointmentTime !== originalTime;
          const hasServiceChanged = newAppointment.service_type !== originalAppointment.service_type;
          
          if (hasDateChanged || hasTimeChanged || hasServiceChanged) {
            appointmentData.status = 'pending';
            console.log('🔄 Confirmed appointment modified - changing status to pending for reconfirmation');
          }
        }
      }

      console.log('Original appointment data:', newAppointment);
      console.log('Selected date:', selectedDate);
      console.log('Selected time:', selectedTime);
      console.log('Appointment DateTime object:', appointmentDateTime);
      console.log('Appointment date (Backend format):', appointmentDate);
      console.log('Appointment time (Backend format):', appointmentTime);
      console.log('Combined appointment data:', appointmentData);
      console.log('Final appointment_date being sent:', appointmentData.appointment_date);
      console.log('Final appointment_time being sent:', appointmentData.appointment_time);
      console.log('Current user:', user);

      let response;
      if (editingAppointmentId) {
        // Update existing appointment
        console.log('🔄 Updating appointment with ID:', editingAppointmentId);
        console.log('📤 Update data being sent:', appointmentData);
        response = await apiService.updateAppointment(editingAppointmentId, appointmentData);
        console.log('📥 Appointment update API response:', response);
      } else {
        // Create new appointment
        console.log('🆕 Creating new appointment');
        console.log('📤 Create data being sent:', appointmentData);
        response = await apiService.createAppointment(appointmentData);
        console.log('📥 Appointment create API response:', response);
      }
      
      if (response && (response.id || response.success)) {
        setModalVisible(false);
        
        // Clear the form fields after successful creation/update
        setTimeError(''); // Clear time error
        setNewAppointment({
          appointment_date: '',
          service_type: '',
          preferred_time: '10:00',
          notes: '',
        });
        setEditingAppointmentId(null); // Clear editing state
        
        // Immediately refresh appointments to prevent duplicate bookings
        await fetchAppointments();
        await fetchBookedDates(); // Refresh booked dates
        await fetchDailyCapacity(currentViewDate); // Refresh daily capacity
        
        let successMessage = editingAppointmentId ? 'Appointment updated successfully!' : 'Appointment created successfully!';
        
        // Check if status was changed to pending for reconfirmation
        if (editingAppointmentId && appointmentData.status === 'pending') {
          successMessage = 'Appointment updated successfully! Since you modified a confirmed appointment, it has been changed to "Pending" status for reconfirmation.';
        }
        
        Alert.alert('Success', successMessage);
      } else {
        const errorMessage = editingAppointmentId ? 'Failed to update appointment' : 'Failed to create appointment';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      const operation = editingAppointmentId ? 'updating' : 'creating';
      console.error(`❌ Error ${operation} appointment:`, error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Log the specific error type and message for debugging
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        console.log('🔍 Error type:', error.response.data.error);
        console.log('🔍 Error message:', error.response.data.message);
      }
      
      // Clear previous errors
      setAppointmentErrors({});
      
      // Handle specific backend validation errors
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        console.log('🔍 Backend error response:', errorData);
        
        // Check for error type in different possible locations
        const errorType = errorData.error || errorData.type || errorData.code;
        const errorMessage = errorData.message || errorData.error_message;
        
        if (errorType === 'daily_limit_exceeded' || errorMessage?.includes('already have an appointment') || errorMessage?.includes('Only one appointment per day')) {
          setAppointmentErrors({
            dailyLimit: 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.'
          });
          scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        
        if (errorType === 'time_slot_taken' || errorMessage?.includes('time slot is already taken')) {
          setTimeError('This time slot is already taken. Please choose another time.');
          scrollToErrorElement(timeSectionRef, 'time');
          return;
        }
        
        if (errorType === 'daily_capacity_exceeded' || errorMessage?.includes('Daily capacity reached')) {
          setAppointmentErrors({
            capacity: 'Daily capacity reached. Maximum 5 appointments per day allowed.'
          });
          scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        
        // Handle validation errors array format
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errors = errorData.errors;
          if (errors.appointment_date && errors.appointment_date.includes('already have an appointment')) {
            setAppointmentErrors({
              dailyLimit: 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.'
            });
            scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
          }
        }
      }
      
      // Handle other error types
      if (error.message && error.message.includes('already booked')) {
        setAppointmentErrors({
          booked: 'This date is already booked and has reached its daily capacity. Please select another date.'
        });
        scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (error.message && (error.message.includes('already have an appointment') || error.message.includes('Only one appointment per day'))) {
        setAppointmentErrors({
          dailyLimit: 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.'
        });
        scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (error.message && error.message.includes('past')) {
        Alert.alert('Invalid Date', 'Cannot schedule appointments in the past. Please select a current or future date.');
      } else if (error.message && error.message.includes('business hours')) {
        setTimeError('Appointments can only be scheduled between 10:00 AM and 7:00 PM. Please select a time within business hours.');
        scrollToErrorElement(timeSectionRef, 'time');
      } else if (error.message && (error.message.includes('time slot') || error.message.includes('already taken'))) {
        setTimeError('This time slot is already taken. Please select another time.');
        scrollToErrorElement(timeSectionRef, 'time');
      } else {
        setAppointmentErrors({
          general: `Failed to ${operation} appointment. Please try again.`
        });
        scheduleScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiService.deleteAppointment(id);
      fetchAppointments(1, true);
      fetchDailyCapacity(); // Refresh daily capacity
      Alert.alert('Success', 'Appointment cancelled.');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  const handleDeleteAllAppointments = async () => {
    try {
      setLoading(true);
      console.log('🗑️ Deleting all appointments...');
      
      // Get all appointment IDs
      const appointmentIds = appointments.map(appointment => appointment.id);
      
      // Delete all appointments
      for (const id of appointmentIds) {
        await apiService.deleteAppointment(id);
      }
      
      console.log('✅ All appointments deleted successfully');
      Alert.alert('Success', 'All appointments have been deleted.');
      fetchAppointments(1, true); // Refresh the appointments list
      setShowDeleteModal(false);
      setSelectedDeleteOption(null);
    } catch (error: any) {
      console.error('❌ Error deleting all appointments:', error);
      Alert.alert('Error', 'Failed to delete appointments. Please try again.');
      setShowDeleteModal(false);
      setSelectedDeleteOption(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancelledAppointments = async () => {
    try {
      setLoading(true);
      console.log('🗑️ Deleting cancelled appointments...');
      
      // Get only cancelled appointment IDs
      const cancelledAppointmentIds = appointments
        .filter(appointment => appointment.status === 'cancelled')
        .map(appointment => appointment.id);
      
      if (cancelledAppointmentIds.length === 0) {
        Alert.alert('Info', 'No cancelled appointments to delete.');
        setShowDeleteModal(false);
        return;
      }
      
      // Delete cancelled appointments
      for (const id of cancelledAppointmentIds) {
        await apiService.deleteAppointment(id);
      }
      
      console.log('✅ Cancelled appointments deleted successfully');
      Alert.alert('Success', `${cancelledAppointmentIds.length} cancelled appointment(s) have been deleted.`);
      fetchAppointments(1, true); // Refresh the appointments list
      setShowDeleteModal(false);
      setSelectedDeleteOption(null);
    } catch (error: any) {
      console.error('❌ Error deleting cancelled appointments:', error);
      Alert.alert('Error', 'Failed to delete cancelled appointments. Please try again.');
      setShowDeleteModal(false);
      setSelectedDeleteOption(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = () => {
    if (!selectedDeleteOption) return;
    
    if (selectedDeleteOption === 'all') {
      Alert.alert(
        'Delete All Appointments',
        `Are you sure you want to delete ALL ${appointments.length} appointments? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete All', 
            style: 'destructive',
            onPress: () => {
              handleDeleteAllAppointments();
            }
          }
        ]
      );
    } else if (selectedDeleteOption === 'cancelled') {
      const cancelledCount = appointments.filter(app => app.status === 'cancelled').length;
      if (cancelledCount === 0) {
        Alert.alert('Info', 'No cancelled appointments to delete.');
        return;
      }
      
      Alert.alert(
        'Delete Cancelled Appointments',
        `Are you sure you want to delete ${cancelledCount} cancelled appointment(s)? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Cancelled', 
            style: 'destructive',
            onPress: () => {
              handleDeleteCancelledAppointments();
            }
          }
        ]
      );
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
      fetchAppointments(1, true);
      fetchDailyCapacity(); // Refresh daily capacity
      Alert.alert('Success', 'Appointment rescheduled!');
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      if (error.message && error.message.includes('past dates')) {
        Alert.alert('Invalid Date', 'Cannot reschedule appointments to past dates. Please select a current or future date.');
      } else if (error.message && error.message.includes('business hours')) {
        Alert.alert('Invalid Time', 'Appointments can only be rescheduled between 10:00 AM and 7:00 PM. Please select a time within business hours.');
      } else {
        Alert.alert('Error', 'Failed to reschedule appointment');
      }
    }
  };

  // Transaction action handlers
  const handleCancelAppointment = async (appointment: any) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🔄 Cancelling appointment:', appointment.id);
              
              // Cancel appointment by updating status to cancelled
              await apiService.cancelAppointment(appointment.id);
              console.log('✅ Appointment cancelled successfully');
              
              Alert.alert('Success', 'Appointment has been cancelled successfully.');
              fetchAppointments(1, true); // Refresh the appointments list
            } catch (error: any) {
              console.error('❌ Error cancelling appointment:', error);
              console.error('Error details:', {
                message: error.message,
                status: error.status,
                response: error.response
              });
              
              // Provide more specific error messages
              let errorMessage = 'Failed to cancel appointment';
              if (error.message) {
                errorMessage += `: ${error.message}`;
              } else if (error.response?.data?.error) {
                errorMessage += `: ${error.response.data.error}`;
              } else if (error.response?.data?.message) {
                errorMessage += `: ${error.response.data.message}`;
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditAppointment = (appointment: any) => {
    Alert.alert(
      'Edit Appointment',
      'This will allow you to modify your appointment details. Do you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => {
            // Clear any existing time errors when editing
            setTimeError('');
            setAppointmentErrors({});
            
            // Extract time from appointment_date for preferred_time
            let preferredTime = '10:00'; // Default time
            
            console.log('🔍 Debug - Extracting time from appointment:', {
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time
            });
            
            // First try to use appointment_time field if it exists
            if (appointment.appointment_time) {
              preferredTime = appointment.appointment_time;
              console.log('✅ Using appointment_time field:', preferredTime);
            } else if (appointment.appointment_date.includes('T')) {
              const timePart = appointment.appointment_date.split('T')[1];
              preferredTime = timePart.split(':')[0] + ':' + timePart.split(':')[1];
              console.log('✅ Extracted from T format:', preferredTime);
            } else if (appointment.appointment_date.includes(' ')) {
              const timePart = appointment.appointment_date.split(' ')[1];
              preferredTime = timePart.split(':')[0] + ':' + timePart.split(':')[1];
              console.log('✅ Extracted from space format:', preferredTime);
            } else {
              // Try to parse as Date object
              try {
                const date = new Date(appointment.appointment_date);
                if (!isNaN(date.getTime())) {
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  preferredTime = `${hours}:${minutes}`;
                  console.log('✅ Extracted from Date object:', preferredTime);
                }
              } catch (error) {
                console.log('❌ Failed to extract time, using default:', preferredTime);
              }
            }
            
            // Set the form data to the appointment data for editing
            setNewAppointment({
              appointment_date: appointment.appointment_date.split('T')[0] || appointment.appointment_date.split(' ')[0],
              service_type: appointment.service_type,
              notes: appointment.notes || '',
              preferred_time: preferredTime,
            });
            setEditingAppointmentId(appointment.id);
            setModalVisible(true); // Open the appointment modal for editing
          },
        },
      ]
    );
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
          selected: true,
          selectedColor: '#9CA3AF', // Gray background to indicate booked
          selectedTextColor: '#fff',
          disabled: true,
          disableTouchEvent: true,
          marked: true,
          dotColor: '#9CA3AF', // Gray dot to indicate booked
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
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="calendar" size={24} color="#014D40" style={styles.headerIcon} />
          <Text style={styles.title}>Appointment Calendar</Text>
        </View>
      </View>

      {/* Appointments List with Pagination */}
      {loading && appointments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedAppointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
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
            <Text style={styles.businessHoursText}>10:00 AM - 7:00 PM</Text>
          </View>
        </View>

              {/* Appointments List Header */}
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Appointments</Text>
            <View style={styles.headerActions}>
              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
                <Text style={styles.deleteButtonText}>Delete</Text>
                <Ionicons name="chevron-down" size={12} color="#dc2626" />
              </TouchableOpacity>
              {/* Collapsible Sort Button */}
              <CollapsibleSortButton
                sortOption={sortOption}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                sortOptions={sortOptions}
                style={styles.sortButtonContainer}
              />
            </View>
          </View>
              </View>
            </>
          }
          ListEmptyComponent={
            !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>Tap the + button to schedule your first appointment</Text>
            </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadMoreText}>Loading more appointments...</Text>
                    </View>
            ) : (
              <View style={styles.bottomSpacing} />
            )
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
                    )}

      {/* Floating Action Button */}
                        <TouchableOpacity 
        style={styles.fab}
        onPress={handleAddAppointment}
        activeOpacity={0.8}
                        >
        <Ionicons name="add" size={28} color="#fff" />
                        </TouchableOpacity>

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
                   {editingAppointmentId ? 'Edit Appointment' : 'Schedule Appointment'}
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
            
          <KeyboardAvoidingWrapper style={{ flex: 1 }}>
          <ScrollView
            ref={scheduleScrollRef}
            style={styles.scheduleModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View ref={scrollContentRef}>
            {/* Service Type Card */}
            <View
              ref={serviceTypeSectionRef}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                if (y !== serviceTypeSectionY) {
                  setServiceTypeSectionY(y);
                }
              }}
              style={styles.scheduleModalCard}
            >
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="shirt" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Service Type</Text>
              </View>
              <Text style={styles.scheduleModalCardSubtitle}>Select the type of service you need</Text>
              
              {/* Service Type Options */}
              <View style={styles.serviceTypeContainer}>
                {[
                  { value: 'measurement', label: 'Measurement', icon: '📏', description: 'Body measurements for custom fitting' },
                  { value: 'consultation', label: 'Consultation', icon: '💬', description: 'Style and design consultation' },
                  { value: 'fitting', label: 'Fitting', icon: '👔', description: 'Try on and adjust garments' },
                  { value: 'alteration', label: 'Alteration', icon: '✂️', description: 'Modify existing garments' },
                ].map((service) => (
                  <TouchableOpacity
                    key={service.value}
                    style={[
                      styles.serviceTypeOption,
                      newAppointment.service_type === service.value && styles.serviceTypeOptionSelected
                    ]}
                    onPress={() => {
                      console.log('Service type selected:', service.value);
                      setNewAppointment({ ...newAppointment, service_type: service.value });
                    }}
                  >
                    <View style={styles.serviceTypeContent}>
                      <Text style={styles.serviceTypeIcon}>{service.icon}</Text>
                      <View style={styles.serviceTypeText}>
                        <Text style={[
                          styles.serviceTypeLabel,
                          newAppointment.service_type === service.value && styles.serviceTypeLabelSelected
                        ]}>
                          {service.label}
                        </Text>
                        <Text style={[
                          styles.serviceTypeDescription,
                          newAppointment.service_type === service.value && styles.serviceTypeDescriptionSelected
                        ]}>
                          {service.description}
                        </Text>
                      </View>
                    </View>
                    {newAppointment.service_type === service.value && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Inline field error for Service Type */}
              {fieldErrors.serviceType && (
                <View style={[styles.errorContainer, { marginTop: 8 }]}>
                  <Ionicons name="warning" size={16} color="#ff4444" />
                  <Text style={styles.errorText}>{fieldErrors.serviceType}</Text>
                </View>
              )}
            </View>

            {/* Date Selection Card */}
            <View style={styles.scheduleModalCard}>
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Appointment Date</Text>
              </View>
              <Text style={styles.scheduleModalCardSubtitle}>Select your preferred date</Text>
              
              {/* Date Picker Button */}
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openDatePicker}
              >
                <View style={styles.datePickerContent}>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                  <View style={styles.datePickerTextContainer}>
                    <Text style={styles.datePickerLabel}>Selected Date</Text>
                    <Text style={styles.datePickerValue}>
                      {newAppointment.appointment_date ? 
                        (() => {
                          const date = new Date(newAppointment.appointment_date);
                          return date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        })() : 
                        'Select a date'
                      }
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
                </View>
              </TouchableOpacity>

              {/* Date Picker Modal */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDateForPicker}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Time Selection Card */}
            <View
              ref={timeSectionRef}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                if (y !== timeSectionY) setTimeSectionY(y);
              }}
              style={styles.scheduleModalCard}
            >
              <View style={styles.scheduleModalCardHeader}>
                <Ionicons name="time" size={20} color={Colors.primary} />
                <Text style={styles.scheduleModalCardTitle}>Preferred Time</Text>
              </View>
              <Text style={styles.scheduleModalCardSubtitle}>Select time between 10 AM - 7 PM (hour or half-hour only)</Text>
              
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
                  minimumDate={(() => {
                    const minDate = new Date();
                    minDate.setHours(10, 0, 0, 0); // 10:00 AM
                    return minDate;
                  })()}
                  maximumDate={(() => {
                    const maxDate = new Date();
                    maxDate.setHours(19, 0, 0, 0); // 7:00 PM
                    return maxDate;
                  })()}
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
                placeholder="Rush order, specific measurements needed"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingWrapper>
          
          {/* Error Messages */}
          {appointmentErrors.dailyLimit && (
            <View
              style={[styles.errorContainer, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]} 
              onLayout={() => scheduleScrollRef.current?.scrollTo({ y: 0, animated: true })}
            > 
              <Ionicons name="person-outline" size={18} color="#ff9800" />
              <Text style={[styles.errorText, { fontWeight: '600' }]}>{appointmentErrors.dailyLimit}</Text>
            </View>
          )}
          
          {appointmentErrors.timeSlot && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{appointmentErrors.timeSlot}</Text>
            </View>
          )}
          
          {appointmentErrors.capacity && (
            <View
              style={styles.errorContainer}
              onLayout={() => scheduleScrollRef.current?.scrollTo({ y: 0, animated: true })}
            >
              <Ionicons name="warning" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{appointmentErrors.capacity}</Text>
            </View>
          )}
          
          {appointmentErrors.booked && (
            <View
              style={[styles.errorContainer, { backgroundColor: '#ffebee', borderColor: '#f44336' }]} 
              onLayout={() => scheduleScrollRef.current?.scrollTo({ y: 0, animated: true })}
            > 
              <Ionicons name="calendar-outline" size={18} color="#f44336" />
              <Text style={[styles.errorText, { fontWeight: '600' }]}>{appointmentErrors.booked}</Text>
            </View>
          )}
          
          {appointmentErrors.general && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{appointmentErrors.general}</Text>
            </View>
          )}
          
          <View style={styles.scheduleModalFooter}>
              <TouchableOpacity
              style={styles.scheduleModalCancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setTimeError(''); // Clear time error
                  setAppointmentErrors({}); // Clear appointment errors
                  // Reset form when cancel is pressed
                  setNewAppointment({
                    appointment_date: '',
                    service_type: '',
                    preferred_time: '10:00',
                    notes: '',
                  });
                }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.scheduleModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
              style={styles.scheduleModalConfirmButton}
                onPress={handleCreateAppointment}
              >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.scheduleModalConfirmButtonText}>
                {editingAppointmentId ? 'Update' : 'Schedule'}
              </Text>
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
                placeholder="2024-12-25"
                placeholderTextColor="#999"
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
                  <Text style={styles.detailLabel}>Estimated Service Completion Time:</Text>
                  <Text style={[styles.detailValue, { color: '#014D40', fontWeight: '600' }]}>
                    {(() => {
                      // Calculate service completion time based on service type
                      const serviceType = selectedAppointmentDetails.service_type?.toLowerCase();
                      
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
                    <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
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
                  <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
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
                    Each appointment has an estimated service completion time based on the service type (15-60 minutes).
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

      {/* Delete Options Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setSelectedDeleteOption(null);
        }}
      >
        <TouchableOpacity
          style={styles.deleteModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDeleteModal(false);
            setSelectedDeleteOption(null);
          }}
        >
          <View style={styles.deleteDropdownContainer}>
            <View style={styles.deleteDropdownHeader}>
              <View style={styles.deleteTitleContainer}>
                <Ionicons name="trash" size={20} color="#dc2626" />
                <Text style={styles.deleteDropdownTitle}>Delete Appointments</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedDeleteOption(null);
                }}
                style={styles.deleteCloseButton}
              >
                <Ionicons name="close" size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.deleteModalSubtitle}>Choose what you want to delete:</Text>
            
            {/* Delete All Option */}
            <TouchableOpacity
              style={[
                styles.deleteOption,
                selectedDeleteOption === 'all' && styles.selectedDeleteOption
              ]}
              onPress={() => setSelectedDeleteOption('all')}
              activeOpacity={0.7}
            >
              <View style={styles.deleteOptionContent}>
                <View style={styles.radioButton}>
                  {selectedDeleteOption === 'all' && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <View style={styles.deleteOptionTextContainer}>
                  <Text style={styles.deleteOptionText}>Delete All Appointments</Text>
                  <Text style={styles.deleteOptionSubtext}>
                    Total: {appointments.length} appointments
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Delete Cancelled Only Option */}
            <TouchableOpacity
              style={[
                styles.deleteOption,
                selectedDeleteOption === 'cancelled' && styles.selectedDeleteOption
              ]}
              onPress={() => setSelectedDeleteOption('cancelled')}
              activeOpacity={0.7}
            >
              <View style={styles.deleteOptionContent}>
                <View style={styles.radioButton}>
                  {selectedDeleteOption === 'cancelled' && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Ionicons name="close-circle-outline" size={18} color="#f59e0b" />
                <View style={styles.deleteOptionTextContainer}>
                  <Text style={styles.deleteOptionText}>Delete Cancelled Only</Text>
                  <Text style={styles.deleteOptionSubtext}>
                    Cancelled: {appointments.filter(app => app.status === 'cancelled').length} appointments
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Action Buttons */}
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelActionButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedDeleteOption(null);
                }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.cancelActionButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deleteActionButton,
                  !selectedDeleteOption && styles.disabledButton
                ]}
                onPress={handleDeleteConfirmation}
                disabled={!selectedDeleteOption}
              >
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.deleteActionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingWrapper>
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#014D40',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  
  // Header Actions Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 4,
    minWidth: 90,
    width: 90,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
    flex: 0,
    flexShrink: 0,
  },
  
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteDropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: screenWidth * 0.8,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  deleteTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteDropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  deleteCloseButton: {
    padding: 4,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  deleteOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deleteOptionTextContainer: {
    flex: 1,
  },
  deleteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  deleteOptionSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  
  // Updated Delete Modal Styles
  deleteModalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedDeleteOption: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelActionButton: {
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
    gap: 4,
  },
  cancelActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  deleteActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    gap: 6,
  },
  deleteActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  
  sortButtonContainer: {
    flex: 0,
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
    marginHorizontal: 16,
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
  serviceTypeContainer: {
    gap: 12,
  },
  serviceTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.light,
  },
  serviceTypeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  serviceTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceTypeText: {
    flex: 1,
  },
  serviceTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  serviceTypeLabelSelected: {
    color: Colors.primary,
  },
  serviceTypeDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  serviceTypeDescriptionSelected: {
    color: Colors.primary + 'CC',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginRight: 4,
  },
  scheduleModalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 4,
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

  // Error Message Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: '#ff4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
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

  // Date Picker Styles
  datePickerButton: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginVertical: 8,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  datePickerTextContainer: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Transaction Action Buttons
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    width: '100%',
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
    marginRight: 4,
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
    marginLeft: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 4,
  },
  singleButton: {
    flex: 1,
    alignSelf: 'flex-end',
    marginRight: 0,
    marginLeft: 0,
  },
  // Pagination styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
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
  listContainer: {
    paddingBottom: 20,
  },
});

export default AppointmentsScreen; 