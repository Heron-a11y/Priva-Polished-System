import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RentalOrderFlow from '../../Customer/components/RentalOrderFlow';
import PurchaseOrderFlow from '../../Customer/components/PurchaseOrderFlow';

const TABS = [
  { key: 'rentals', label: 'Rentals' },
  { key: 'purchases', label: 'Purchases' },
];

export default function CustomerOrders() {
  const [activeTab, setActiveTab] = useState('rentals');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {activeTab === 'rentals' ? (
          <RentalOrderFlow />
        ) : (
          <PurchaseOrderFlow />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#014D40',
    backgroundColor: '#e6f2ef',
  },
  tabText: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#014D40',
  },
  content: {
    flex: 1,
    padding: 24,
  },
}); 