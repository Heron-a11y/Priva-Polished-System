import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import EnhancedProfileScreen from '../Customer/screens/EnhancedProfileScreen';

export default function ProfileScreen() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && user) {
      // Redirect to role-specific profile
      if (user.role === 'customer') {
        router.replace('/customer/profile');
      } else if (user.role === 'admin') {
        router.replace('/admin/profile');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // This will redirect to the appropriate profile screen
  return null;
} 