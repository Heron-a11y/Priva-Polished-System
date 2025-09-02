import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PasswordInput from './PasswordInput';

export default function PasswordInputDemo() {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [password3, setPassword3] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password Input Demo</Text>
      
      <PasswordInput
        label="Login Password"
        value={password1}
        onChangeText={setPassword1}
        placeholder="Enter your login password"
      />
      
      <PasswordInput
        label="New Password"
        value={password2}
        onChangeText={setPassword2}
        placeholder="Enter new password"
      />
      
      <PasswordInput
        label="Confirm Password"
        value={password3}
        onChangeText={setPassword3}
        placeholder="Confirm your password"
      />
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          ✅ Eye icon should be visible on both web and mobile
        </Text>
        <Text style={styles.infoText}>
          ✅ Click/tap the eye to show/hide password
        </Text>
        <Text style={styles.infoText}>
          ✅ Works on all platforms (iOS, Android, Web)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#014D40',
    marginBottom: 8,
    lineHeight: 22,
  },
});
