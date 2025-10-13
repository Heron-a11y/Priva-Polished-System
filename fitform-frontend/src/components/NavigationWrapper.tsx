import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavigationWrapperProps {
  children: ReactNode;
  onBackPress?: () => void;
  showBackButton?: boolean;
  title?: string;
}

export function NavigationWrapper({ 
  children, 
  onBackPress, 
  showBackButton = true, 
  title = "AR Body Measurements" 
}: NavigationWrapperProps) {
  const handleBackPress = () => {
    try {
      if (onBackPress) {
        onBackPress();
      } else {
        console.log('Back button pressed - no navigation handler');
      }
    } catch (error) {
      console.log('❌ Back press error:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {showBackButton && (
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
});

export default NavigationWrapper;
