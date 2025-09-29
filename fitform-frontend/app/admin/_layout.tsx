import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import AdminSidebar from './components/AdminSidebar';
import Header from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Admin Layout - Auth State:', { isLoading, isAuthenticated, user: user?.role });
    
    if (!isLoading && !isAuthenticated) {
      console.log('Admin Layout - Redirecting to login: not authenticated');
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      console.log('Admin Layout - Redirecting: wrong role', user?.role);
      // Redirect to appropriate dashboard if not an admin
      if (user?.role === 'customer') {
        router.replace('/customer/dashboard');
      } else {
        router.replace('/login');
      }
    } else if (!isLoading && isAuthenticated && user?.role === 'admin') {
      console.log('Admin Layout - Access granted for admin');
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

  // Don't render anything if not authenticated or not an admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      {isMobile && (
        <Header onHamburgerPress={() => setSidebarOpen(true)} />
      )}
      <View style={[styles.content, isMobile && styles.mobileContent]}>
        <AdminSidebar open={isMobile ? sidebarOpen : true} setOpen={setSidebarOpen} />
        <View style={styles.stackContainer}>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background.light }
            }} 
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.light,
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
    backgroundColor: Colors.background.light,
    paddingLeft: isMobile ? 0 : 8, // Add some spacing from sidebar on desktop
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
  },
}); 