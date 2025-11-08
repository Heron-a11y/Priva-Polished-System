import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RentalOrderFlow from '../../Customer/components/RentalOrderFlow';
import PurchaseOrderFlow from '../../Customer/components/PurchaseOrderFlow';
import { Colors } from '../../constants/Colors';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';

const { width, height } = Dimensions.get('window');

const TABS = [
  { key: 'rentals', label: 'Rentals', icon: '👔', description: 'Garment rentals' },
  { key: 'purchases', label: 'Purchases', icon: '🛍️', description: 'Custom garments' },
];

export default function CustomerOrders() {
  const [activeTab, setActiveTab] = useState('rentals');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      {/* Compact Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>Manage your transactions</Text>
      </View>

      {/* Compact Tab Bar */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {activeTab === 'rentals' ? (
          <RentalOrderFlow />
        ) : (
          <PurchaseOrderFlow />
        )}
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: Colors.background.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    color: Colors.text.inverse,
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '400',
  },
  tabContainer: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 12,
    marginTop: -12,
    borderRadius: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: Colors.background.primary,
  },
  tabIcon: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    marginBottom: 4,
  },
  tabText: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.text.inverse,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 2,
    backgroundColor: Colors.secondary,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
}); 