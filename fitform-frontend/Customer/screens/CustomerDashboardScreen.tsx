import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Image,
  FlatList,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalog } from '../../contexts/CatalogContext';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { getLocalImageUrl } from '../../utils/imageUrlHelper';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalAppointments: number;
  upcomingAppointments: number;
  activeRentals: number;
  completedOrders: number;
}

interface RecentAppointment {
  id: number;
  service_type: string;
  appointment_date: string;
  status: string;
  notes?: string;
}

interface RecentOrder {
  id: number;
  type: 'rental' | 'purchase';
  item_name: string;
  order_date: string;
  status: string;
  total_amount: number;
}

interface PopularItem {
  id: number;
  name: string;
  description: string;
  clothing_type: string;
  category: string;
  image_path: string | null;
  is_featured: boolean;
  is_available: boolean;
  measurements_required: string[];
  sort_order: number;
  notes?: string;
}

export default function CustomerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { catalogItems, getFeaturedItems, refreshCatalog, loading: catalogLoading } = useCatalog();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation refs for AR button
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    upcomingAppointments: 0,
    activeRentals: 0,
    completedOrders: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [previousPopularCount, setPreviousPopularCount] = useState(0);
  const [showNewItemsNotification, setShowNewItemsNotification] = useState(false);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [lastPopularCount, setLastPopularCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [lastPopularItemIds, setLastPopularItemIds] = useState<number[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [lastRecentCount, setLastRecentCount] = useState(0);
  const [showNewCatalogNotification, setShowNewCatalogNotification] = useState(false);
  const [newCatalogCount, setNewCatalogCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastRecentTimestamp, setLastRecentTimestamp] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
    
    // Load popular items immediately
    loadPopularItems();
    
    // Load recent items immediately
    loadRecentItems();
    
    // Start floating animation
    const startFloatingAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Start pulse animation
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startFloatingAnimation();
    startPulseAnimation();
    
    // Cleanup on unmount
    return () => {
      // Cleanup animations if needed
    };
  }, []);

  // Refresh popular items when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused, refreshing popular items and recent items...');
      loadPopularItems();
      loadRecentItems();
    }, [])
  );

  // Force refresh popular items and recent items every time the component mounts
  useEffect(() => {
    const forceRefresh = () => {
      console.log('🔄 Force refreshing popular items and recent items on mount...');
      loadPopularItems();
      loadRecentItems();
    };
    
    // Initial load
    forceRefresh();
    
    // Also refresh after a short delay to ensure context is ready
    const delayedRefresh = setTimeout(() => {
      forceRefresh();
      // Mark initial load as complete after first refresh
      setIsInitialLoad(false);
    }, 2000);
    
    return () => clearTimeout(delayedRefresh);
  }, []);

  // Sync popular items with catalog changes
  useEffect(() => {
    if (catalogItems.length > 0) {
      console.log('🔄 Catalog items updated, syncing popular items...');
      const featuredItems = getFeaturedItems();
      
      console.log('📊 Current popular count:', lastPopularCount);
      console.log('📊 New featured items count:', featuredItems.length);
      
      // Check if new items were added
      if (featuredItems.length > lastPopularCount && lastPopularCount > 0) {
        const newCount = featuredItems.length - lastPopularCount;
        console.log('🎉 New popular items detected in catalog sync!', newCount, 'new items');
        
        // Show notification with count
        setNewItemsCount(newCount);
        setShowNewItemsNotification(true);
        
        // Auto-hide notification after 8 seconds
        setTimeout(() => {
          setShowNewItemsNotification(false);
          setNewItemsCount(0);
        }, 8000);
      }
      
      setLastPopularCount(featuredItems.length);
      setPopularItems(featuredItems);
      setPreviousPopularCount(featuredItems.length);
      setLastUpdateTime(new Date());
    }
  }, [catalogItems, getFeaturedItems, lastPopularCount]);

  // Touch handlers for AR button
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      
      // Check if user is authenticated
      if (!user) {
        console.log('⚠️ User not authenticated, skipping data loading');
        setLoading(false);
        return;
      }
      
      // Load appointments once and use the data for both stats and recent appointments
      console.log('🔍 Debug: About to fetch appointments for user:', user.id);
      const appointmentsResponse = await apiService.getAppointments();
      console.log('🔍 Debug: Raw appointments response:', appointmentsResponse);
      const appointments = Array.isArray(appointmentsResponse?.data) ? appointmentsResponse.data : [];
      console.log('📅 Appointments loaded:', appointments.length);
      console.log('🔍 Debug: Appointments response structure:', appointmentsResponse);
      console.log('🔍 Debug: First appointment:', appointments[0]);
      
      // Load rental and order data for stats
      const [rentalResponse, orderResponse] = await Promise.all([
        apiService.getRentalPurchaseHistory(),
        apiService.getRentalPurchaseHistory() // This gets both rentals and purchases
      ]);
      
      const rentals = Array.isArray(rentalResponse?.data) ? rentalResponse.data : [];
      const orders = Array.isArray(orderResponse?.data) ? orderResponse.data : [];
      
      console.log('👕 Rentals loaded:', rentals.length);
      console.log('🛍️ Orders loaded:', orders.length);
      console.log('🔍 Debug: First rental:', rentals[0]);
      console.log('🔍 Debug: First order:', orders[0]);
      console.log('🔍 Debug: Rental response structure:', rentalResponse);
      
      // Use the same appointments data for both stats and recent appointments
      await Promise.all([
        loadStatsWithData(appointments, rentals, orders),
        loadRecentAppointmentsWithData(appointments),
        loadRecentOrdersWithData(orders),
        loadRecentOrders(),
        loadPopularItems()
      ]);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      // Handle specific error cases
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        console.log('🔐 Authentication required - user may need to login again');
      } else if (error instanceof Error && error.message?.includes('Network error')) {
        console.log('🌐 Network error - check backend server connection');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load appointments count
      const appointmentsResponse = await apiService.getAppointments();
      const appointments = Array.isArray(appointmentsResponse) ? appointmentsResponse : [];
      
      const upcoming = appointments.filter(apt => 
        new Date(apt.appointment_date) > new Date() && apt.status === 'confirmed'
      ).length;

      setStats(prev => ({
        ...prev,
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentAppointments = async () => {
    try {
      const response = await apiService.getAppointments();
      const appointments = Array.isArray(response) ? response : [];
      
      // Get recent appointments (last 5)
      const recent = appointments
        .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
        .slice(0, 5);
      
      setRecentAppointments(recent);
    } catch (error) {
      console.error('Error loading recent appointments:', error);
      setRecentAppointments([]);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const response = await apiService.getRentalPurchaseHistory();
      const orders = Array.isArray(response?.data) ? response.data : [];
      
      // Get recent orders (last 5)
      const recent = orders
        .sort((a, b) => new Date(b.order_date || b.created_at).getTime() - new Date(a.order_date || a.created_at).getTime())
        .slice(0, 5)
        .map(order => ({
          id: order.id,
          type: order.order_type || 'rental',
          item_name: order.item_name || 'Unknown Item',
          order_date: order.order_date || order.created_at,
          status: order.status || 'pending',
          total_amount: order.quotation_amount || order.total_amount || 0
        }));
      
      console.log('🛍️ Recent orders loaded:', recent.length);
      setRecentOrders(recent);
    } catch (error) {
      console.error('Error loading recent orders:', error);
      setRecentOrders([]);
    }
  };

  const loadPopularItems = async () => {
    try {
      console.log('🔄 Loading popular items...');
      
      // Check if user is authenticated
      if (!user) {
        console.log('⚠️ User not authenticated, skipping popular items loading');
        return;
      }
      
      // Store current count for comparison
      const currentCount = popularItems.length;
      console.log('📊 Current popular items count:', currentCount);
      
      // Try CatalogContext first
      try {
        console.log('🔄 Trying CatalogContext...');
        await refreshCatalog();
        const featuredItems = getFeaturedItems();
        console.log('✅ Featured items from context:', featuredItems.length);
        
        if (featuredItems.length > 0) {
          console.log('📋 Featured items data:', featuredItems);
          
          // Check for new items and trigger notification using item IDs
          const currentItemIds = featuredItems.map((item: any) => item.id);
          const previousItemIds = lastPopularItemIds;
          const newItemIds = currentItemIds.filter((id: number) => !previousItemIds.includes(id));
          
          console.log('🔍 Comparing items - Current IDs:', currentItemIds, 'Previous IDs:', previousItemIds, 'New IDs:', newItemIds);
          console.log('🔍 Count comparison - Current:', currentCount, 'Featured:', featuredItems.length, 'Initial Load:', isInitialLoad);
          
          if (newItemIds.length > 0) {
            console.log('🎉 New popular items detected in context!', newItemIds.length, 'new items with IDs:', newItemIds);
            
            // Show notification if we had items before OR if this is a significant increase
            if ((currentCount > 0 && !isInitialLoad) || (currentCount === 0 && featuredItems.length > 0)) {
              console.log('🚨 Triggering notification banner!');
              setNewItemsCount(newItemIds.length);
              setShowNewItemsNotification(true);
              
              // Auto-hide notification after 8 seconds
              setTimeout(() => {
                console.log('🕐 Auto-hiding notification banner');
                setShowNewItemsNotification(false);
                setNewItemsCount(0);
              }, 8000);
            } else {
              console.log('⚠️ Notification not triggered - conditions not met');
            }
          } else {
            console.log('📊 No new items detected - no new item IDs found');
          }
          
          setPopularItems(featuredItems);
          setLastUpdateTime(new Date());
          setLastPopularCount(featuredItems.length);
          setLastPopularItemIds(currentItemIds);
          return;
        }
      } catch (contextError) {
        console.log('⚠️ CatalogContext failed, trying direct API...', contextError);
      }
      
      // Fallback to direct API call
      console.log('🔄 Fallback: Direct API call...');
      const response = await apiService.get('/catalog/popular');
      
      console.log('📊 Direct API response:', response);
      
      if (response && response.success) {
        const newItems = response.data || [];
        console.log('✅ Popular items from direct API:', newItems.length);
        console.log('📋 Popular items data:', newItems);
        
        // Check for new items and trigger notification using item IDs
        const currentItemIds = newItems.map((item: any) => item.id);
        const previousItemIds = lastPopularItemIds;
        const newItemIds = currentItemIds.filter((id: number) => !previousItemIds.includes(id));
        
        console.log('🔍 Comparing items - Current IDs:', currentItemIds, 'Previous IDs:', previousItemIds, 'New IDs:', newItemIds);
        console.log('🔍 Count comparison - Current:', currentCount, 'API:', newItems.length, 'Initial Load:', isInitialLoad);
        
        if (newItemIds.length > 0) {
          console.log('🎉 New popular items detected in API!', newItemIds.length, 'new items with IDs:', newItemIds);
          
          // Show notification if we had items before OR if this is a significant increase
          if ((currentCount > 0 && !isInitialLoad) || (currentCount === 0 && newItems.length > 0)) {
            console.log('🚨 Triggering notification banner!');
            setNewItemsCount(newItemIds.length);
            setShowNewItemsNotification(true);
            
            // Auto-hide notification after 8 seconds
            setTimeout(() => {
              console.log('🕐 Auto-hiding notification banner');
              setShowNewItemsNotification(false);
              setNewItemsCount(0);
            }, 8000);
          } else {
            console.log('⚠️ Notification not triggered - conditions not met');
          }
        } else {
          console.log('📊 No new items detected - no new item IDs found');
        }
        
        setPopularItems(newItems);
        setLastUpdateTime(new Date());
        setLastPopularCount(newItems.length);
        setLastPopularItemIds(currentItemIds);
      } else {
        console.error('❌ Direct API failed:', response);
        setPopularItems([]);
      }
    } catch (error) {
      console.error('❌ Error loading popular items:', error);
      setPopularItems([]);
    }
  };

  const loadRecentItems = async () => {
    try {
      console.log('🔄 Loading recent catalog items...');
      
      // Store current count for comparison
      const currentCount = recentItems.length;
      console.log('📊 Current recent items count:', currentCount);
      
      const response = await apiService.get('/catalog/recent');
      console.log('📊 Recent items response:', response);
      
      if (response && response.success) {
        const newRecentItems = response.data || [];
        console.log('✅ Recent items from API:', newRecentItems.length);
        console.log('📋 Recent items data:', newRecentItems);
        
        // Get the latest timestamp from the new items
        const latestTimestamp = newRecentItems.length > 0 
          ? Math.max(...newRecentItems.map((item: any) => item.created_timestamp || 0))
          : 0;
        
        console.log('📊 Latest timestamp:', latestTimestamp, 'Last timestamp:', lastRecentTimestamp);
        
        // Check for very recent items (created in last 5 minutes) - always show notification
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const veryRecentItems = newRecentItems.filter((item: any) => {
          const itemTime = new Date(item.created_at).getTime();
          return itemTime > fiveMinutesAgo;
        });
        
        if (veryRecentItems.length > 0) {
          console.log('🎉 Very recent items detected!', veryRecentItems.length, 'items created in last 5 minutes');
          console.log('📋 Very recent items:', veryRecentItems.map((item: any) => item.name));
          
          setNewCatalogCount(veryRecentItems.length);
          setShowNewCatalogNotification(true);
          
          // Auto-hide notification after 10 seconds
          setTimeout(() => {
            setShowNewCatalogNotification(false);
            setNewCatalogCount(0);
          }, 10000);
        }
        // Check for new items using timestamp comparison (for subsequent loads)
        else if (latestTimestamp > lastRecentTimestamp && !isInitialLoad) {
          const newCount = newRecentItems.length - currentCount;
          console.log('🎉 New catalog items detected by timestamp!', newCount, 'new items');
          console.log('📊 Previous count:', currentCount, 'New count:', newRecentItems.length);
          console.log('📊 Latest timestamp:', latestTimestamp, 'Last timestamp:', lastRecentTimestamp);
          
          setNewCatalogCount(Math.max(1, newCount)); // At least 1 new item
          setShowNewCatalogNotification(true);
          
          // Auto-hide notification after 10 seconds
          setTimeout(() => {
            setShowNewCatalogNotification(false);
            setNewCatalogCount(0);
          }, 10000);
        }
        
        setRecentItems(newRecentItems);
        setLastRecentCount(newRecentItems.length);
        setLastRecentTimestamp(latestTimestamp);
      } else {
        console.error('❌ Recent items API failed:', response);
        setRecentItems([]);
      }
    } catch (error) {
      console.error('❌ Error loading recent items:', error);
      setRecentItems([]);
    }
  };

  // Optimized functions that use already-fetched data
  const loadStatsWithData = async (appointments: any[], rentals: any[], orders: any[]) => {
    try {
      const upcoming = appointments.filter(apt => 
        new Date(apt.appointment_date) > new Date() && 
        ['confirmed', 'pending'].includes(apt.status?.toLowerCase())
      ).length;
      
      console.log('🔍 Debug: Appointments analysis:', {
        totalAppointments: appointments.length,
        appointmentStatuses: appointments.map(a => a.status),
        appointmentDates: appointments.map(a => a.appointment_date),
        upcoming
      });
      
      // Calculate active rentals (rentals that are in progress or ready for pickup)
      const activeRentals = rentals.filter(rental => 
        rental.order_type === 'rental' && 
        ['in_progress', 'ready_for_pickup', 'picked_up'].includes(rental.status?.toLowerCase())
      ).length;
      
      // Calculate completed orders (both rentals and purchases that are completed/returned)
      // Include various statuses that indicate completion
      const completedOrders = orders.filter(order => 
        ['returned', 'picked_up', 'completed', 'delivered', 'fulfilled'].includes(order.status?.toLowerCase())
      ).length;
      
      console.log('🔍 Debug: Completed orders analysis:', {
        totalOrders: orders.length,
        orderStatuses: orders.map(o => o.status),
        completedOrders,
        returnedOrders: orders.filter(o => o.status?.toLowerCase() === 'returned').length,
        pickedUpOrders: orders.filter(o => o.status?.toLowerCase() === 'picked_up').length
      });
      
      // If no active rentals or completed orders, show pending orders as "in progress"
      const pendingOrders = orders.filter(order => 
        order.status?.toLowerCase() === 'pending'
      ).length;
      
      // Use pending orders if no active rentals, and show total orders if no completed
      const displayActiveRentals = activeRentals > 0 ? activeRentals : pendingOrders;
      
      // If no truly completed orders, show non-cancelled/declined orders as completed
      const nonCancelledOrders = orders.filter(order => 
        !['cancelled', 'declined'].includes(order.status?.toLowerCase())
      ).length;
      
      const displayCompletedOrders = completedOrders > 0 ? completedOrders : nonCancelledOrders;
      
      console.log('🔍 Debug: Fallback logic analysis:', {
        completedOrders,
        nonCancelledOrders,
        displayCompletedOrders,
        cancelledOrders: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length,
        declinedOrders: orders.filter(o => o.status?.toLowerCase() === 'declined').length
      });
      
      console.log('🔍 Debug: Active rentals calculation:', {
        totalRentals: rentals.length,
        rentalTypes: rentals.map(r => r.order_type),
        rentalStatuses: rentals.map(r => r.status),
        activeRentals
      });
      
      console.log('🔍 Debug: Completed orders calculation:', {
        totalOrders: orders.length,
        orderStatuses: orders.map(o => o.status),
        completedOrders
      });
      
      console.log('📊 Dashboard stats calculated:', {
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming,
        activeRentals: displayActiveRentals,
        completedOrders: displayCompletedOrders,
        originalActiveRentals: activeRentals,
        originalCompletedOrders: completedOrders,
        pendingOrders,
        allAppointmentStatuses: appointments.map(a => a.status),
        appointmentDates: appointments.map(a => a.appointment_date)
      });
      
      setStats({
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming,
        activeRentals: displayActiveRentals,
        completedOrders: displayCompletedOrders
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentAppointmentsWithData = async (appointments: any[]) => {
    try {
      // Get recent appointments (last 5)
      const recent = appointments
        .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
        .slice(0, 5);
      
      setRecentAppointments(recent);
    } catch (error) {
      console.error('Error loading recent appointments:', error);
      setRecentAppointments([]);
    }
  };

  const loadRecentOrdersWithData = async (orders: any[]) => {
    try {
      // Get recent orders (last 5)
      const recent = orders
        .sort((a, b) => new Date(b.order_date || b.created_at).getTime() - new Date(a.order_date || a.created_at).getTime())
        .slice(0, 5)
        .map(order => ({
          id: order.id,
          type: order.order_type || 'rental',
          item_name: order.item_name || 'Unknown Item',
          order_date: order.order_date || order.created_at,
          status: order.status || 'pending',
          total_amount: order.quotation_amount || order.total_amount || 0
        }));
      
      console.log('🛍️ Recent orders loaded:', recent.length);
      setRecentOrders(recent);
    } catch (error) {
      console.error('Error loading recent orders:', error);
      setRecentOrders([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'completed':
        return Colors.info;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString();
  };

  const quickActions = [
    {
      id: 1,
      title: 'Book Fitting',
      subtitle: 'Schedule your appointment',
      icon: 'calendar-outline',
      color: Colors.primary,
      route: '/customer/appointments',
    },
    {
      id: 2,
      title: 'Rent Garment',
      subtitle: 'Browse formal wear',
      icon: 'shirt-outline',
      color: Colors.secondary,
      route: '/customer/orders',
    },
    {
      id: 3,
      title: 'Get Measured',
      subtitle: 'Update your size',
      icon: 'resize-outline',
      color: Colors.accent,
      route: '/customer/sizing',
    },
    {
      id: 4,
      title: 'View History',
      subtitle: 'Check past orders',
      icon: 'time-outline',
      color: Colors.info,
      route: '/customer/rental-purchase-history',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.name}>{user?.name || 'Customer'}</Text>
          <Text style={styles.subtitle}>Ready for your next formal occasion?</Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="calendar" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.totalAppointments}</Text>
            <Text style={styles.statLabel}>Total Fittings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: Colors.warning + '20' }]}>
              <Ionicons name="time" size={24} color={Colors.warning} />
            </View>
            <Text style={styles.statNumber}>{stats.upcomingAppointments}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: Colors.info + '20' }]}>
              <Ionicons name="shirt" size={24} color={Colors.info} />
            </View>
            <Text style={styles.statNumber}>{stats.activeRentals}</Text>
            <Text style={styles.statLabel}>Active Rentals</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => handleQuickAction(action.route)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* New Popular Items Notification */}
      {showNewItemsNotification && (
        <View style={styles.notificationBanner}>
          <View style={styles.notificationContent}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationText}>
                {newItemsCount === 1 ? 'New popular item available!' : `${newItemsCount} new popular items available!`}
              </Text>
              <Text style={styles.notificationSubtext}>
                Check out the latest featured items from our catalog
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowNewItemsNotification(false)}
              style={styles.notificationClose}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* New Catalog Items Notification */}
      {showNewCatalogNotification && (
        <View style={[styles.notificationBanner, { backgroundColor: '#4CAF50' }]}>
          <View style={styles.notificationContent}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationText}>
                {newCatalogCount === 1 ? 'New item added to catalog!' : `${newCatalogCount} new items added to catalog!`}
              </Text>
              <Text style={styles.notificationSubtext}>
                Discover the latest additions to our collection
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowNewCatalogNotification(false)}
              style={styles.notificationClose}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Popular Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Popular Items</Text>
            <Text style={styles.debugText}>
              Recent: {recentItems.length} | Last: {lastRecentTimestamp} | Initial: {isInitialLoad ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.sectionHeaderActions}>
            <TouchableOpacity onPress={() => router.push('/customer/orders' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {catalogLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading popular items...</Text>
          </View>
        ) : popularItems.length > 0 ? (
          <FlatList
            data={popularItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularItemsContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.popularItemCard}
                onPress={() => router.push('/customer/orders' as any)}
              >
                <View style={styles.popularItemImageContainer}>
                  {item.image_path ? (
                    <Image 
                      source={{ uri: getLocalImageUrl(item.image_path) }} 
                      style={styles.popularItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.popularItemPlaceholder}>
                      <Ionicons name="shirt-outline" size={32} color="#fff" />
                    </View>
                  )}
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.popularBadgeText}>Popular</Text>
                  </View>
                </View>
                <View style={styles.popularItemContent}>
                  <Text style={styles.popularItemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.popularItemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="shirt-outline" size={48} color={Colors.text.secondary} />
            <Text style={styles.emptyStateText}>No popular items available</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for featured items</Text>
          </View>
        )}
      </View>

      {/* Upcoming Appointments */}
      {recentAppointments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Fittings</Text>
            <TouchableOpacity onPress={() => router.push('/customer/appointments' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentAppointments.slice(0, 3).map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentService}>{appointment.service_type}</Text>
                  <Text style={styles.appointmentDate}>{formatDate(appointment.appointment_date)}</Text>
                  {appointment.notes && (
                    <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                    {getStatusText(appointment.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/customer/orders' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.slice(0, 3).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderItem}>{order.item_name}</Text>
                  <Text style={styles.orderType}>
                    {order.type === 'rental' ? '🔄 Rental' : '💳 Purchase'}
                  </Text>
                  <Text style={styles.orderDate}>{formatDate(order.order_date)}</Text>
                </View>
                <View style={styles.orderAmount}>
                  <Text style={styles.amountText}>₱{order.total_amount.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State for Orders */}
      {recentOrders.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.emptyStateCard}>
            <Ionicons name="shirt-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyStateTitle}>No orders yet</Text>
            <Text style={styles.emptyStateText}>
              Start by browsing our collection of formal wear
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/customer/orders' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Browse Collection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty State for Appointments */}
      {recentAppointments.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Fittings</Text>
          <View style={styles.emptyStateCard}>
            <Ionicons name="calendar-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyStateTitle}>No fittings scheduled</Text>
            <Text style={styles.emptyStateText}>
              Book your first fitting to get started
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/customer/appointments' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Book Fitting</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fashion Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fashion Tips</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={20} color={Colors.secondary} />
            <Text style={styles.tipTitle}>Perfect Fit Matters</Text>
          </View>
          <Text style={styles.tipContent}>
            A well-fitted formal garment enhances your confidence and appearance. Always get professionally measured for the best results.
          </Text>
        </View>
        <View style={styles.tipsCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="shirt-outline" size={20} color={Colors.primary} />
            <Text style={styles.tipTitle}>Care for Your Garment</Text>
          </View>
          <Text style={styles.tipContent}>
            Handle formal wear with care. Store in a cool, dry place and consider professional cleaning for delicate fabrics.
          </Text>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
  },
  viewAllText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#014D40',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  appointmentNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  orderItem: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  orderType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#999',
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 8,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#014D40',
    marginTop: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#014D40',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsCard: {
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
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#014D40',
    marginLeft: 8,
  },
  tipContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  floatingARButton: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  arButtonTouchable: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  // Popular Items Styles
  popularItemsContainer: {
    paddingHorizontal: 4,
  },
  popularItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  popularItemImageContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#f8f9fa',
  },
  popularItemImage: {
    width: '100%',
    height: '100%',
  },
  popularItemPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  popularBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  popularItemContent: {
    padding: 12,
  },
  popularItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 4,
  },
  popularItemDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  notificationBanner: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  notificationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  notificationClose: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  debugText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
}); 