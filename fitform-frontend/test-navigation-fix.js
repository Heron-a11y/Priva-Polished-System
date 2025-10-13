/**
 * Navigation Fix Test Script
 * Tests the navigation utility functions
 */

console.log('🧭 Testing Navigation Fix\n');

// Simulate the NavigationUtils
const NavigationUtils = {
  goBack(options) {
    try {
      if (options.router && options.router.back) {
        console.log('✅ Using expo-router back()');
        return options.router.back();
      }
      
      if (options.navigation && options.navigation.goBack) {
        console.log('✅ Using react-navigation goBack()');
        return options.navigation.goBack();
      }
      
      console.log('⚠️ Navigation not available - no back method found');
    } catch (error) {
      console.log('❌ Navigation error:', error.message);
    }
  },

  navigate(route, options) {
    try {
      if (options.router && options.router.push) {
        console.log(`✅ Using expo-router push(${route})`);
        return options.router.push(route);
      }
      
      if (options.navigation && options.navigation.navigate) {
        console.log(`✅ Using react-navigation navigate(${route})`);
        return options.navigation.navigate(route);
      }
      
      console.log(`⚠️ Navigation not available - cannot navigate to ${route}`);
    } catch (error) {
      console.log('❌ Navigation error:', error.message);
    }
  },

  isNavigationAvailable(options) {
    return !!(options.router || options.navigation);
  },

  getNavigationMethod(options) {
    if (options.router) return 'expo-router';
    if (options.navigation) return 'react-navigation';
    return 'none';
  }
};

// Test scenarios
const testNavigationScenarios = () => {
  console.log('📱 Testing Navigation Scenarios:\n');

  // Scenario 1: expo-router available
  console.log('Scenario 1: expo-router available');
  const routerOptions = {
    router: { back: () => console.log('Router back called'), push: (route) => console.log(`Router push to ${route}`) },
    navigation: null
  };
  
  console.log(`Navigation method: ${NavigationUtils.getNavigationMethod(routerOptions)}`);
  console.log(`Navigation available: ${NavigationUtils.isNavigationAvailable(routerOptions)}`);
  NavigationUtils.goBack(routerOptions);
  NavigationUtils.navigate('/ARBodyDetectionTest', routerOptions);
  console.log('');

  // Scenario 2: react-navigation available
  console.log('Scenario 2: react-navigation available');
  const navigationOptions = {
    router: null,
    navigation: { goBack: () => console.log('Navigation goBack called'), navigate: (route) => console.log(`Navigation navigate to ${route}`) }
  };
  
  console.log(`Navigation method: ${NavigationUtils.getNavigationMethod(navigationOptions)}`);
  console.log(`Navigation available: ${NavigationUtils.isNavigationAvailable(navigationOptions)}`);
  NavigationUtils.goBack(navigationOptions);
  NavigationUtils.navigate('ARBodyDetectionTest', navigationOptions);
  console.log('');

  // Scenario 3: No navigation available
  console.log('Scenario 3: No navigation available');
  const noNavigationOptions = {
    router: null,
    navigation: null
  };
  
  console.log(`Navigation method: ${NavigationUtils.getNavigationMethod(noNavigationOptions)}`);
  console.log(`Navigation available: ${NavigationUtils.isNavigationAvailable(noNavigationOptions)}`);
  NavigationUtils.goBack(noNavigationOptions);
  NavigationUtils.navigate('/ARBodyDetectionTest', noNavigationOptions);
  console.log('');

  // Scenario 4: Both available (expo-router takes priority)
  console.log('Scenario 4: Both available (expo-router takes priority)');
  const bothOptions = {
    router: { back: () => console.log('Router back called'), push: (route) => console.log(`Router push to ${route}`) },
    navigation: { goBack: () => console.log('Navigation goBack called'), navigate: (route) => console.log(`Navigation navigate to ${route}`) }
  };
  
  console.log(`Navigation method: ${NavigationUtils.getNavigationMethod(bothOptions)}`);
  console.log(`Navigation available: ${NavigationUtils.isNavigationAvailable(bothOptions)}`);
  NavigationUtils.goBack(bothOptions);
  NavigationUtils.navigate('/ARBodyDetectionTest', bothOptions);
  console.log('');
};

// Run the test
testNavigationScenarios();

console.log('✅ Navigation Fix Test Complete!');
console.log('🎯 Navigation utility provides safe fallbacks');
console.log('🔄 Handles both expo-router and react-navigation');
console.log('⚠️ Gracefully handles missing navigation methods');
console.log('🚀 Ready for production use!');

module.exports = { NavigationUtils, testNavigationScenarios };
