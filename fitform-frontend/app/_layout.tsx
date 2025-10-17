import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import Sidebar from '../components/Sidebar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { NotificationProvider } from '../contexts/NotificationContext';
import { CatalogProvider } from '../contexts/CatalogContext';
import * as Font from 'expo-font';
import { LogBox } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

// Disable Expo error notifications and warnings
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  'Warning:',
  'Error:',
  'Remote debugger',
  'Expo',
  'Metro',
  'Network request failed',
  'fetch',
  'connection',
  'timeout'
]);

// Font loading configuration
const loadFonts = async () => {
  try {
    // Load custom fonts with error handling
    await Font.loadAsync({
      'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
  } catch (error) {
    console.warn('Font loading failed:', error);
    // Continue without custom fonts
  }
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const hideHeader = pathname === '/login' || pathname === '/register';
  
  // Don't show generic sidebar on role-specific pages
  const isRoleSpecificPage = pathname.startsWith('/admin/') || pathname.startsWith('/customer/');
  const showGenericSidebar = !isRoleSpecificPage;

  useEffect(() => {
    // Load fonts when component mounts
    loadFonts().then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      // Only redirect to login if not authenticated and not on login/register pages
      if (!isAuthenticated && pathname !== '/login' && pathname !== '/register' && !isRoleSpecificPage) {
        router.replace('/login');
      } 
      // Remove automatic redirection for authenticated users
      // Let users stay on login screen if they want to switch accounts
      // Only redirect if they're already on a protected route
      else if (isAuthenticated && user && pathname !== '/login' && pathname !== '/register') {
        // User is authenticated and on a protected route - allow them to stay
        console.log('✅ User authenticated, staying on current route:', pathname);
      }
    }
  }, [isLoading, fontsLoaded, pathname, router, isRoleSpecificPage, isAuthenticated, user]);

  // Show loading screen while checking authentication and loading fonts
  if (isLoading || !fontsLoaded) {
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

// Custom Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error silently without showing notifications
    console.warn('App error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      // Return a minimal fallback UI without error notifications
      return (
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#014D40" />
        </View>
      );
    }

    return this.props.children;
  }
}

export default function Layout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <CatalogProvider>
            <AppContent />
          </CatalogProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
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
