import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to login first
    router.replace('/login');
  }, [router]);

  // Return null while redirecting
  return null;
} 