import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ValidationWarning from './ValidationWarning';
import { FormValidator, FieldValidation, ValidationResult } from '../utils/formValidation';

interface FieldData {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  numberOfLines?: number;
}

interface GroupedReadOnlyFieldProps {
  title: string;
  fields: FieldData[];
  onEdit: () => void;
  icon?: string;
  editButtonText?: string;
  description?: string;
}

const GroupedReadOnlyField: React.FC<GroupedReadOnlyFieldProps> = ({
  title,
  fields,
  onEdit,
  icon = 'pencil',
  editButtonText = 'Edit',
  description,
}) => {
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Check for validation issues when component mounts or fields change
  useEffect(() => {
    const validationFields: FieldValidation[] = fields.map(field => ({
      key: field.label.toLowerCase().replace(/\s+/g, '_'),
      label: field.label,
      value: field.value || '',
      rules: FormValidator.getFieldRules('text', false), // Non-required by default
    }));

    const result = FormValidator.validateFields(validationFields);
    setValidationResult(result);

    // Show warning if there are empty fields
    if (Object.keys(result.warnings).length > 0) {
      setShowValidationWarning(true);
    }
  }, [fields]);
  return (
    <View style={styles.container}>
      {/* Validation Warning */}
      {showValidationWarning && validationResult && (
        <ValidationWarning
          visible={showValidationWarning}
          errors={validationResult.errors}
          warnings={validationResult.warnings}
          onDismiss={() => setShowValidationWarning(false)}
          title={`${title} - Incomplete Information`}
        />
      )}

      {/* Header with title and description */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>

      {/* Edit button below header */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.editButton,
            showValidationWarning && styles.editButtonWarning
          ]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons name={icon as any} size={16} color="white" />
          <Text style={styles.editButtonText}>{editButtonText}</Text>
          {showValidationWarning && (
            <Ionicons name="warning" size={14} color="white" style={styles.warningIcon} />
          )}
        </TouchableOpacity>
      </View>

      {/* Fields display */}
      <View style={styles.fieldsContainer}>
        {fields.map((field, index) => {
          const displayValue = field.value?.trim() || 'Not provided';
          const isEmpty = !field.value?.trim();

          return (
            <View key={index} style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <View style={[styles.fieldValueContainer, isEmpty && styles.emptyValueContainer]}>
                <Text
                  style={[
                    styles.fieldValue,
                    isEmpty && styles.emptyValue,
                    field.multiline && styles.multilineValue
                  ]}
                  numberOfLines={field.multiline ? field.numberOfLines : 1}
                >
                  {displayValue}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  titleContainer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
    justifyContent: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  editButtonWarning: {
    backgroundColor: Colors.warning,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  warningIcon: {
    marginLeft: 4,
  },
  fieldsContainer: {
    gap: 12,
  },
  fieldItem: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValueContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyValueContainer: {
    backgroundColor: Colors.background.light + '50',
    borderStyle: 'dashed',
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  emptyValue: {
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  multilineValue: {
    lineHeight: 24,
  },
});

export default GroupedReadOnlyField;
