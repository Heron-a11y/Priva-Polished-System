import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import EnhancedProfileScreen from '../../Customer/screens/EnhancedProfileScreen';

export default function CustomerProfile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'customer') {
      if (user?.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'customer') {
    return null;
  }

  return <EnhancedProfileScreen />;
} 