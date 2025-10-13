/**
 * Navigation Utilities
 * Provides safe navigation methods with fallbacks
 */

export interface NavigationOptions {
  router?: any;
  navigation?: any;
}

export class NavigationUtils {
  /**
   * Safe back navigation with fallbacks
   */
  static goBack(options: NavigationOptions): void {
    try {
      // Check if router exists and has back method
      if (options.router && typeof options.router === 'object' && typeof options.router.back === 'function') {
        console.log('✅ Using expo-router back()');
        options.router.back();
        return;
      }
      
      // Check if navigation exists and has goBack method
      if (options.navigation && typeof options.navigation === 'object' && typeof options.navigation.goBack === 'function') {
        console.log('✅ Using react-navigation goBack()');
        options.navigation.goBack();
        return;
      }
      
      console.log('⚠️ Navigation not available - no back method found');
      console.log('Router:', options.router);
      console.log('Navigation:', options.navigation);
    } catch (error) {
      console.log('❌ Navigation error:', error.message || error);
    }
  }

  /**
   * Safe navigation to a specific route
   */
  static navigate(route: string, options: NavigationOptions): void {
    try {
      // Check if router exists and has push method
      if (options.router && typeof options.router === 'object' && typeof options.router.push === 'function') {
        console.log(`✅ Using expo-router push(${route})`);
        options.router.push(route);
        return;
      }
      
      // Check if navigation exists and has navigate method
      if (options.navigation && typeof options.navigation === 'object' && typeof options.navigation.navigate === 'function') {
        console.log(`✅ Using react-navigation navigate(${route})`);
        options.navigation.navigate(route);
        return;
      }
      
      console.log(`⚠️ Navigation not available - cannot navigate to ${route}`);
      console.log('Router:', options.router);
      console.log('Navigation:', options.navigation);
    } catch (error) {
      console.log('❌ Navigation error:', error.message || error);
    }
  }

  /**
   * Safe navigation with replace
   */
  static replace(route: string, options: NavigationOptions): void {
    try {
      if (options.router && options.router.replace) {
        options.router.replace(route);
        return;
      }
      
      if (options.navigation && options.navigation.replace) {
        options.navigation.replace(route);
        return;
      }
      
      console.log(`Navigation not available - cannot replace with ${route}`);
    } catch (error) {
      console.log('Navigation error:', error);
    }
  }

  /**
   * Check if navigation is available
   */
  static isNavigationAvailable(options: NavigationOptions): boolean {
    return !!(options.router || options.navigation);
  }

  /**
   * Get navigation method name
   */
  static getNavigationMethod(options: NavigationOptions): string {
    if (options.router) return 'expo-router';
    if (options.navigation) return 'react-navigation';
    return 'none';
  }
}

export default NavigationUtils;
