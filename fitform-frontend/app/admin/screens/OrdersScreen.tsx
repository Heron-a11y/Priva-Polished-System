import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OrdersScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orders Management</Text>
      <Text style={styles.subtitle}>Manage customer orders and transactions</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default OrdersScreen;
