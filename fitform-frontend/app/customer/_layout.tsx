import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import CustomerSidebar from '../../Customer/components/CustomerSidebar';
import Header from '../../components/Header';
import CustomerOrders from './orders';
import { NotificationProvider } from '../../contexts/NotificationContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
}); 