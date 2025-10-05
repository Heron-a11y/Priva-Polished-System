module.exports = {
  extends: ['expo'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-native'],
  rules: {
    // React Native specific rules
    'react-native/no-unused-styles': 'off',
    'react-native/split-platform-components': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-dupe-class-members': 'off',
    '@typescript-eslint/no-redeclare': 'off',
    
    // General rules
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'no-unreachable': 'off',
    'import/export': 'off',
    'react/jsx-no-undef': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'expo/no-dynamic-env-var': 'off',
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },
  settings: {
    'react-native/style-sheet-object-names': ['StyleSheet', 'styles'],
  },
};
