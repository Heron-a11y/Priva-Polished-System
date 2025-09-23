import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import CustomerSidebar from '../../Customer/components/CustomerSidebar';
import Header from '../../components/Header';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Customer Layout - Auth State:', { isLoading, isAuthenticated, user: user?.role });
    
    if (!isLoading && !isAuthenticated) {
      console.log('Customer Layout - Redirecting to login: not authenticated');
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'customer') {
      console.log('Customer Layout - Redirecting: wrong role', user?.role);
      // Redirect to appropriate dashboard if not a customer
      if (user?.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/login');
      }
    } else if (!isLoading && isAuthenticated && user?.role === 'customer') {
      console.log('Customer Layout - Access granted for customer');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#014D40" />
      </View>
    );
  }

  // Don't render anything if not authenticated or not a customer
  if (!isAuthenticated || user?.role !== 'customer') {
    return null;
  }

  return (
    <NotificationProvider>
      <View style={styles.container}>
        {isMobile && (
          <Header onHamburgerPress={() => setSidebarOpen(true)} />
        )}
        <View style={[styles.content, isMobile && styles.mobileContent]}>
          {!isMobile && <CustomerSidebar />}
          <View style={styles.stackContainer}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
          {isMobile && <CustomerSidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
        </View>
      </View>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileContent: {
    flexDirection: 'column',
  },
  stackContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
}); 