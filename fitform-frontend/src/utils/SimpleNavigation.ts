/**
 * Simple Navigation Utility
 * Provides basic navigation without complex dependencies
 */

export class SimpleNavigation {
  /**
   * Simple back navigation that doesn't rely on router objects
   */
  static goBack(): void {
    try {
      // Try to use window.history if available (web)
      if (typeof window !== 'undefined' && window.history) {
        window.history.back();
        console.log('✅ Using window.history.back()');
        return;
      }
      
      // For React Native, we'll just log that back was pressed
      console.log('✅ Back navigation requested (React Native)');
      
    } catch (error: unknown) {
      console.log('❌ Simple navigation error:', (error as Error).message || error);
    }
  }

  /**
   * Simple navigation that logs the action
   */
  static navigate(route: string): void {
    try {
      console.log(`✅ Navigation requested to: ${route}`);
      
      // For React Native, we'll just log the navigation request
      // In a real app, you might use a different navigation method
      
    } catch (error: unknown) {
      console.log('❌ Simple navigation error:', (error as Error).message || error);
    }
  }

  /**
   * Check if navigation is available
   */
  static isNavigationAvailable(): boolean {
    return typeof window !== 'undefined' && window.history !== undefined;
  }
}

export default SimpleNavigation;
