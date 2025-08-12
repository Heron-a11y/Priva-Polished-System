import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import Sidebar from '../components/Sidebar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { NotificationProvider } from '../contexts/NotificationContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const hideHeader = pathname === '/login' || pathname === '/register';
  
  // Don't show generic sidebar on role-specific pages
  const isRoleSpecificPage = pathname.startsWith('/admin/') || pathname.startsWith('/customer/');
  const showGenericSidebar = !isRoleSpecificPage;

  useEffect(() => {
    if (!isLoading) {
      // Always redirect to login first, regardless of authentication status
      if (pathname !== '/login' && pathname !== '/register' && !isRoleSpecificPage) {
        router.replace('/login');
      }
    }
  }, [isLoading, pathname, router, isRoleSpecificPage]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#014D40" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isMobile && !hideHeader && !isRoleSpecificPage && (
        <Header onHamburgerPress={() => setSidebarOpen(true)} />
      )}
      <View style={[styles.content, isMobile && !hideHeader && !isRoleSpecificPage && styles.mobileContent]}>
        {!isMobile && showGenericSidebar && <Sidebar open />}
        <View style={styles.stackContainer}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        {isMobile && showGenericSidebar && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
      </View>
    </View>
  );
}

export default function Layout() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
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
