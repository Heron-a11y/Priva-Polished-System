import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ManagePickupReturnScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Pickups & Returns</Text>
      <Text style={styles.message}>Manage customer pickups and returns here.</Text>
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
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ManagePickupReturnScreen; 