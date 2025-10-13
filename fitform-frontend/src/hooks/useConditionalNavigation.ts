import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

interface ConditionalNavigationResult {
  router: any;
  navigation: any;
  canNavigate: boolean;
  goBack: () => void;
  navigate: (route: string) => void;
}

export function useConditionalNavigation(): ConditionalNavigationResult {
  const [router, setRouter] = useState<any>(null);
  const [navigation, setNavigation] = useState<any>(null);
  const [canNavigate, setCanNavigate] = useState(false);

  useEffect(() => {
    // Try to get router
    try {
      const routerInstance = useRouter();
      if (routerInstance && typeof routerInstance === 'object') {
        setRouter(routerInstance);
        setCanNavigate(true);
      }
    } catch (error) {
      console.log('⚠️ useRouter not available:', error.message);
    }

    // Try to get navigation
    try {
      const navigationInstance = useNavigation();
      if (navigationInstance && typeof navigationInstance === 'object') {
        setNavigation(navigationInstance);
        setCanNavigate(true);
      }
    } catch (error) {
      console.log('⚠️ useNavigation not available:', error.message);
    }
  }, []);

  const goBack = () => {
    try {
      if (router && typeof router.back === 'function') {
        router.back();
        return;
      }
      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
        return;
      }
      console.log('⚠️ No navigation method available');
    } catch (error) {
      console.log('❌ Navigation error:', error.message);
    }
  };

  const navigate = (route: string) => {
    try {
      if (router && typeof router.push === 'function') {
        router.push(route);
        return;
      }
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(route);
        return;
      }
      console.log(`⚠️ Cannot navigate to ${route}`);
    } catch (error) {
      console.log('❌ Navigation error:', error.message);
    }
  };

  return {
    router,
    navigation,
    canNavigate,
    goBack,
    navigate,
  };
}
