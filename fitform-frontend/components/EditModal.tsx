import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import PasswordInput from './PasswordInput';
import ValidationWarning from './ValidationWarning';
import { FormValidator, FieldValidation, ValidationResult } from '../utils/formValidation';

const { width: screenWidth } = Dimensions.get('window');

interface RadioOption {
  value: string;
  label: string;
}

interface EditField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'email' | 'phone' | 'password' | 'multiline' | 'number' | 'radio';
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  options?: RadioOption[];
}

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  fields: EditField[];
  onSave: (data: Record<string, string>) => Promise<boolean>;
  loading?: boolean;
  icon?: string;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  onClose,
  title,
  fields,
  onSave,
  loading = false,
  icon = 'create-outline',
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      const initialData: Record<string, string> = {};
      fields.forEach(field => {
        initialData[field.key] = field.value || '';
      });
      setFormData(initialData);
      setErrors({});
      setWarnings({});
      setShowValidationWarning(false);
      setValidationResult(null);
    }
  }, [visible, fields]);

  const validateForm = () => {
    // Create validation fields
    const validationFields: FieldValidation[] = fields.map(field => ({
      key: field.key,
      label: field.label,
      value: formData[field.key] || '',
      rules: FormValidator.getFieldRules(field.type, field.required),
    }));

    // Perform comprehensive validation
    const result = FormValidator.validateFields(validationFields);
    
    setErrors(result.errors);
    setWarnings(result.warnings);
    setValidationResult(result);
    
    // Show validation warning if there are errors or warnings
    if (!result.isValid || Object.keys(result.warnings).length > 0) {
      setShowValidationWarning(true);
    }

    return result.isValid;
  };

  const handleSave = async () => {
    const isValid = validateForm();
    
    if (!isValid) {
      // Show validation warning
      setShowValidationWarning(true);
      return;
    }

    // Check for warnings even if form is valid
    if (validationResult && Object.keys(validationResult.warnings).length > 0) {
      // Show confirmation dialog for warnings
      Alert.alert(
        'Empty Fields Detected',
        'Some fields are empty. Do you want to save anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: () => performSave() },
        ]
      );
      return;
    }

    performSave();
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
        setFormData({});
        setErrors({});
        setWarnings({});
        setShowValidationWarning(false);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  const renderField = (field: EditField) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    if (field.type === 'password') {
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <PasswordInput
            value={value}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [field.key]: text }))}
            placeholder={field.placeholder}
            error={error}
          />
        </View>
      );
    }

    if (field.type === 'multiline') {
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              styles.multilineInput,
              error && styles.inputError
            ]}
            value={value}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [field.key]: text }))}
            placeholder={field.placeholder}
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={field.numberOfLines || 4}
            maxLength={field.maxLength}
            textAlignVertical="top"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    if (field.type === 'radio') {
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.radioContainer}>
            {field.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioOption}
                onPress={() => setFormData(prev => ({ ...prev, [field.key]: option.value }))}
              >
                <View style={styles.radioButton}>
                  {value === option.value && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.required && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={[styles.textInput, error && styles.inputError]}
          value={value}
          onChangeText={(text) => setFormData(prev => ({ ...prev, [field.key]: text }))}
          placeholder={field.placeholder}
          placeholderTextColor="#999"
          keyboardType={
            field.type === 'email' ? 'email-address' :
            field.type === 'phone' ? 'phone-pad' :
            field.type === 'number' ? 'numeric' : 'default'
          }
          autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
          autoCorrect={field.type !== 'email'}
          maxLength={field.maxLength}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <Ionicons name={icon as any} size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {showValidationWarning && validationResult && (
              <ValidationWarning
                visible={showValidationWarning}
                errors={validationResult.errors}
                warnings={validationResult.warnings}
                onDismiss={() => setShowValidationWarning(false)}
                onFixErrors={() => setShowValidationWarning(false)}
                title="Form Validation Issues"
              />
            )}
            {fields.map(renderField)}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: screenWidth * 0.95,
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  radioContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border.light,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});

export default EditModal;
