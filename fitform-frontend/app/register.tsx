import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
  }>({});
  const router = useRouter();
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors: { 
      name?: string; 
      email?: string; 
      password?: string; 
      confirmPassword?: string; 
    } = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleRegister = async () => {
    // Clear previous errors
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting registration with data:', {
        name: name.trim(),
        email: email.trim(),
        password: password.length + ' characters',
        password_confirmation: confirmPassword.length + ' characters',
        role: 'customer',
      });

      const success = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        role: 'customer',
      });
      
      console.log('Registration result:', success);
      
      if (success) {
        console.log('Registration successful, clearing form and showing success message');
        // Clear form data after successful registration
        clearForm();
        
        // Show success message
        setShowSuccess(true);
        
        // Navigate to login after 2 seconds
        setTimeout(() => {
          console.log('Navigating to login');
          router.replace('/login');
        }, 2000);
      } else {
        console.log('Registration failed');
        Alert.alert('Registration Failed', 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/priva-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successMessage}>
            Your account has been created successfully. You will be redirected to login in a few seconds...
          </Text>
          <ActivityIndicator size="large" color="#014D40" style={styles.successSpinner} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/priva-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>Create Account</Text>
      
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (errors.name) setErrors({ ...errors, name: undefined });
        }}
        placeholder="Enter your full name"
        autoCapitalize="words"
        autoCorrect={false}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      
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
      
      <PasswordInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors({ ...errors, password: undefined });
        }}
        placeholder="Enter your password"
        error={errors.password}
      />
      
      <PasswordInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
        }}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#014D40',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successSpinner: {
    marginTop: 16,
  },
}); 