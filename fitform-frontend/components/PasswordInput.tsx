import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Text,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  style?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChangeText,
  placeholder = "Enter your password",
  label,
  error,
  style,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType = 'done',
  onSubmitEditing,
  blurOnSubmit = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            style
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={!showPassword}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholderTextColor="#999"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={togglePasswordVisibility}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#014D40"
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#014D40',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    paddingRight: 50, // Make room for the eye button
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
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
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default PasswordInput;
