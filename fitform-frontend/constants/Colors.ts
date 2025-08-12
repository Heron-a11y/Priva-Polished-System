/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  // Primary brand colors - matching app theme
  primary: '#014D40', // Dark green (main brand color)
  secondary: '#FFD700', // Gold (accent color)
  accent: '#00BFA5', // Teal accent
  
  // Status colors
  success: '#10b981', // Modern green
  warning: '#f59e0b', // Modern amber
  error: '#ef4444', // Modern red
  info: '#3b82f6', // Modern blue
  
  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Gradient colors - using app theme
  gradient: {
    primary: ['#014D40', '#00352D'],
    secondary: ['#FFD700', '#FFC107'],
    success: ['#10b981', '#059669'],
    warning: ['#f59e0b', '#d97706'],
    error: ['#ef4444', '#dc2626'],
  },
  
  // Background variations - matching app theme
  background: {
    primary: '#014D40', // Dark green (main background)
    secondary: '#00352D', // Darker green
    card: 'rgba(255, 255, 255, 0.95)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    light: '#f5f5f5', // Light background for cards
  },
  
  // Text variations
  text: {
    primary: '#014D40', // Dark green for text
    secondary: '#666666', // Gray for secondary text
    muted: '#999999', // Muted text
    inverse: '#ffffff', // White text on dark backgrounds
    accent: '#FFD700', // Gold for highlights
  },
  
  // Border colors
  border: {
    light: 'rgba(1, 77, 64, 0.1)', // Light green borders
    medium: 'rgba(1, 77, 64, 0.2)', // Medium green borders
    dark: 'rgba(1, 77, 64, 0.3)', // Dark green borders
    gold: 'rgba(255, 215, 0, 0.3)', // Gold borders
  },
};
