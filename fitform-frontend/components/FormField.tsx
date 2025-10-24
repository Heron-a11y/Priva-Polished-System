import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

export interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  style?: any;
  inputStyle?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  onRegisterErrorElement?: (ref: React.RefObject<View>) => void;
  fieldName?: string;
}

export interface FormFieldRef {
  focus: () => void;
  blur: () => void;
  getRef: () => React.RefObject<View>;
}

const FormField = forwardRef<FormFieldRef, FormFieldProps>(({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  editable = true,
  style,
  inputStyle,
  onFocus,
  onBlur,
  onRegisterErrorElement,
  fieldName
}, ref) => {
  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    getRef: () => containerRef
  }));

  // Register error element when component mounts
  React.useEffect(() => {
    if (onRegisterErrorElement && fieldName) {
      console.log('📝 FormField registering error element:', fieldName);
      // Register immediately - no delay needed
      onRegisterErrorElement(containerRef);
    }
  }, [onRegisterErrorElement, fieldName]);

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
  };

  return (
    <View ref={containerRef} style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {error && (
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
          </View>
        )}
      </View>
      
      <View style={[
        styles.inputContainer,
        error && styles.inputContainerError,
        !editable && styles.inputContainerDisabled
      ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.secondary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {error && (
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
          </View>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

FormField.displayName = 'FormField';

const styles = StyleSheet.create({
  container: {
    marginBottom: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
  },
  label: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  required: {
    color: Colors.error,
    fontWeight: '700',
  },
  errorIcon: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingVertical: isSmallMobile ? 10 : isMediumMobile ? 12 : isLargeMobile ? 14 : 14,
    minHeight: isSmallMobile ? 44 : isMediumMobile ? 48 : isLargeMobile ? 52 : 56,
  },
  inputContainerError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBackground,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.background.disabled,
    borderColor: Colors.border.disabled,
  },
  input: {
    flex: 1,
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: Colors.text.primary,
    padding: 0,
    margin: 0,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: isSmallMobile ? 80 : isMediumMobile ? 90 : isLargeMobile ? 100 : 120,
  },
  errorIconContainer: {
    marginLeft: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  errorContainer: {
    marginTop: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
    lineHeight: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 20,
  },
});

export default FormField;
