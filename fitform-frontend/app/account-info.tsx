import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AccountInfoScreen() {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const router = useRouter();

  const handleSave = () => {
    Alert.alert('Account updated!', 'Your changes have been saved.');
    // Add your API call here
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#014D40" />
      </TouchableOpacity>
      <Text style={styles.title}>Account Information</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />
      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#014D40', marginTop: 24 },
  label: { fontSize: 16, color: '#014D40', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 4 },
  saveButton: { backgroundColor: '#014D40', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}); 