import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
        // Clear form data after successful login
        setEmail('');
        setPassword('');
        setErrors({});
        
        // Navigate to appropriate dashboard based on user role
        if (result.user.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/customer/dashboard');
        }
      } else {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/priva-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>Sign In</Text>
      
      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors({ ...errors, password: undefined });
        }}
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: '#f5f5f5' 
  },
  logoContainer: { 
    alignItems: 'center', 
    marginBottom: 24, 
    marginTop: 24 
  },
  logo: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 2, 
    borderColor: '#FFD700', 
    backgroundColor: '#014D40' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#014D40', 
    marginBottom: 32, 
    textAlign: 'center' 
  },
  label: { 
    fontSize: 16, 
    color: '#014D40', 
    marginBottom: 6, 
    marginTop: 12 
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    marginBottom: 4 
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: { 
    backgroundColor: '#014D40', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 24 
  },
  buttonDisabled: { 
    backgroundColor: '#666' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  linkText: { 
    color: '#007AFF', 
    fontSize: 15, 
    marginTop: 18, 
    textAlign: 'center' 
  },
}); 