import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PasswordInput from '../components/PasswordInput';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';

export default function PasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const router = useRouter();

  const handleChangePassword = () => {
    Alert.alert('Password updated!', 'Your password has been changed.');
    // Add your API call here
  };

  return (
    <KeyboardAvoidingWrapper style={styles.container}>
      <View style={styles.contentContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#014D40" />
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password (min. 8 characters)"
        />
        <PasswordInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password (min. 8 characters)"
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
          <Text style={styles.saveButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { flex: 1, padding: 24 },
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