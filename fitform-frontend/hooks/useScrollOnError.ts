import { useRef, useCallback, useEffect } from 'react';
import { ScrollView, View } from 'react-native';

export interface UseScrollOnErrorOptions {
  scrollViewRef?: React.RefObject<ScrollView>;
  errorElementRef?: React.RefObject<View>;
  offset?: number;
  animated?: boolean;
  delay?: number;
}

export interface UseScrollOnErrorReturn {
  scrollToError: () => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToElement: (elementRef: React.RefObject<View>) => void;
  registerErrorElement: (ref: React.RefObject<View>, errorKey: string) => void;
  scrollToErrorByKey: (errorKey: string) => void;
}

export function useScrollOnError(options: UseScrollOnErrorOptions = {}): UseScrollOnErrorReturn {
  const {
    scrollViewRef,
    errorElementRef,
    offset = 20,
    animated = true,
    delay = 100
  } = options;

  const errorElementsRef = useRef<Map<string, React.RefObject<View>>>(new Map());

  const scrollToError = useCallback(() => {
    console.log('🔄 ScrollToError called', { 
      hasErrorElementRef: !!errorElementRef?.current,
      hasScrollViewRef: !!scrollViewRef?.current 
    });
    
    if (errorElementRef?.current) {
      setTimeout(() => {
        errorElementRef.current?.measureInWindow((x, y, width, height) => {
          console.log('📍 Error element position:', { x, y, width, height });
          if (y !== undefined && y !== null) {
            const scrollY = Math.max(0, y - offset);
            console.log('📜 Scrolling to:', scrollY);
            scrollViewRef?.current?.scrollTo({
              y: scrollY,
              animated
            });
          } else {
            console.log('⚠️ Element position undefined, scrolling to end');
            // Fallback: scroll to bottom if element position can't be determined
            scrollViewRef?.current?.scrollToEnd({ animated });
          }
        });
      }, delay);
    } else {
      console.log('⚠️ No error element ref, scrolling to end');
      // Fallback: scroll to bottom if no error element ref
      scrollViewRef?.current?.scrollToEnd({ animated });
    }
  }, [errorElementRef, scrollViewRef, offset, animated, delay]);

  const scrollToTop = useCallback(() => {
    scrollViewRef?.current?.scrollTo({
      y: 0,
      animated
    });
  }, [scrollViewRef, animated]);

  const scrollToBottom = useCallback(() => {
    scrollViewRef?.current?.scrollToEnd({ animated });
  }, [scrollViewRef, animated]);

  const scrollToElement = useCallback((elementRef: React.RefObject<View>, sectionType?: string) => {
    console.log('🎯 ScrollToElement called', { hasElementRef: !!elementRef?.current, hasScrollView: !!scrollViewRef?.current, sectionType });
    
    if (scrollViewRef?.current) {
      // Use fixed scroll positions like the admin screen does
      // These positions are based on the modal layout structure
      const scrollPositions: { [key: string]: number } = {
        'serviceType': 0,      // Service Type section is at the top
        'time': 400,           // Time section is approximately 400px down
        'date': 200,           // Date section is approximately 200px down
        'notes': 600           // Notes section is at the bottom
      };
      
      // Use sectionType if provided, otherwise try to determine from ref
      let scrollY = 0;
      if (sectionType && scrollPositions[sectionType] !== undefined) {
        scrollY = scrollPositions[sectionType];
      } else {
        // Fallback: scroll to top
        scrollY = 0;
      }
      
      console.log('📜 Scrolling to fixed position:', scrollY);
      scrollViewRef.current.scrollTo({
        y: scrollY,
        animated: true
      });
    } else {
      console.log('⚠️ No scroll view ref available');
    }
  }, [scrollViewRef, animated]);

  const registerErrorElement = useCallback((ref: React.RefObject<View>, errorKey: string) => {
    console.log('📝 Registering error element:', { errorKey, hasRef: !!ref?.current });
    errorElementsRef.current.set(errorKey, ref);
    console.log('📋 Total registered elements:', errorElementsRef.current.size);
  }, []);

  const scrollToErrorByKey = useCallback((errorKey: string) => {
    console.log('🔑 ScrollToErrorByKey called with key:', errorKey);
    
    // Define scroll positions for each field - optimized for speed
    const scrollPositions: { [key: string]: number } = {
      'name': 0,
      'clothing_type': 120,
      'description': 200,
      'category': 280,
      'measurements_required': 400,
      'sort_order': 600,
      'notes': 700
    };

    // Get the scroll position immediately
    const scrollY = scrollPositions[errorKey] || 0;
    console.log('📜 Scrolling to position:', scrollY);
    
    // Scroll immediately without delays
    scrollViewRef?.current?.scrollTo({ y: scrollY, animated: true });
  }, [scrollViewRef]);

  return {
    scrollToError,
    scrollToTop,
    scrollToBottom,
    scrollToElement,
    registerErrorElement,
    scrollToErrorByKey
  };
}
