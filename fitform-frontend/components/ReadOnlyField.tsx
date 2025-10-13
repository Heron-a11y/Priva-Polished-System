import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface ReadOnlyFieldProps {
  label: string;
  value: string | null | undefined;
  onEdit: () => void;
  icon?: string;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editButtonText?: string;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
  label,
  value,
  onEdit,
  icon = 'pencil',
  placeholder = 'Not provided',
  multiline = false,
  numberOfLines = 1,
  editButtonText = 'Edit',
}) => {
  const displayValue = value?.trim() || placeholder;
  const isEmpty = !value?.trim();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons name={icon as any} size={16} color="white" />
          <Text style={styles.editButtonText}>{editButtonText}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.valueContainer, isEmpty && styles.emptyValueContainer]}>
        <Text
          style={[
            styles.value,
            isEmpty && styles.emptyValue,
            multiline && styles.multilineValue
          ]}
          numberOfLines={multiline ? numberOfLines : 1}
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 70,
    justifyContent: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  valueContainer: {
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
  value: {
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

export default ReadOnlyField;
