import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  TextInputProps,
} from 'react-native';

interface EnhancedTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: any;
  inputStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
}

const EnhancedTextInput = forwardRef<TextInput, EnhancedTextInputProps>(
  (
    {
      label,
      error,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error && styles.inputError,
            inputStyle,
            style,
          ]}
          placeholderTextColor="#999"
          {...props}
        />
        {error && <Text style={[styles.errorText, errorStyle]}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

EnhancedTextInput.displayName = 'EnhancedTextInput';

export default EnhancedTextInput;

