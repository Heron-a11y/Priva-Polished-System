import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

interface SafeNavigationResult {
  router: any;
  navigation: any;
  isNavigationReady: boolean;
}

export function useSafeNavigation(): SafeNavigationResult {
  const [navigationState, setNavigationState] = useState<SafeNavigationResult>({
    router: null,
    navigation: null,
    isNavigationReady: false,
  });

  useEffect(() => {
    let router = null;
    let navigation = null;
    let isReady = false;

    try {
      router = useRouter();
      isReady = true;
    } catch (error) {
      console.log('⚠️ useRouter not available:', error.message);
    }

    try {
      navigation = useNavigation();
      isReady = true;
    } catch (error) {
      console.log('⚠️ useNavigation not available:', error.message);
    }

    setNavigationState({
      router,
      navigation,
      isNavigationReady: isReady,
    });
  }, []);

  return navigationState;
}
