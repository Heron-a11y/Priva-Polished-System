import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollEnabled?: boolean;
  keyboardVerticalOffset?: number;
  behavior?: 'height' | 'position' | 'padding';
}

const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  scrollEnabled = true,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 20,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
}) => {
  const content = scrollEnabled ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.container}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardAvoidingView, style]}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {content}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
  },
});

export default KeyboardAvoidingWrapper;

