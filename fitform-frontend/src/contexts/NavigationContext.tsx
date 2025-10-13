import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

interface NavigationContextType {
  goBack: () => void;
  navigate: (route: string) => void;
  canNavigate: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  let router: any = null;
  let navigation: any = null;
  let canNavigate = false;

  // Safely get router
  try {
    router = useRouter();
    if (router && typeof router === 'object') {
      canNavigate = true;
    }
  } catch (error) {
    console.log('⚠️ useRouter not available in NavigationProvider');
  }

  // Safely get navigation
  try {
    navigation = useNavigation();
    if (navigation && typeof navigation === 'object') {
      canNavigate = true;
    }
  } catch (error) {
    console.log('⚠️ useNavigation not available in NavigationProvider');
  }

  const goBack = () => {
    try {
      if (router && typeof router.back === 'function') {
        console.log('✅ Using router.back()');
        router.back();
        return;
      }
      if (navigation && typeof navigation.goBack === 'function') {
        console.log('✅ Using navigation.goBack()');
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
        console.log(`✅ Using router.push(${route})`);
        router.push(route);
        return;
      }
      if (navigation && typeof navigation.navigate === 'function') {
        console.log(`✅ Using navigation.navigate(${route})`);
        navigation.navigate(route);
        return;
      }
      console.log(`⚠️ Cannot navigate to ${route}`);
    } catch (error) {
      console.log('❌ Navigation error:', error.message);
    }
  };

  return (
    <NavigationContext.Provider value={{ goBack, navigate, canNavigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
}
