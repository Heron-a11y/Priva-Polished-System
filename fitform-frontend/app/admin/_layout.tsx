import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import AdminSidebar from './components/AdminSidebar';
import Header from '../../components/Header';
import { Colors } from '../../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isMobile = SCREEN_WIDTH < 768; // More reliable mobile detection

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
}); 