import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface ValidationWarningProps {
  visible: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  onDismiss: () => void;
  onFixErrors?: () => void;
  title?: string;
}

const ValidationWarning: React.FC<ValidationWarningProps> = ({
  visible,
  errors,
  warnings,
  onDismiss,
  onFixErrors,
  title = 'Validation Issues',
}) => {
  if (!visible) return null;

  const errorCount = Object.keys(errors).length;
  const warningCount = Object.keys(warnings).length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={hasErrors ? "warning" : "information-circle"} 
            size={20} 
            color={hasErrors ? Colors.error : Colors.warning} 
          />
          <Text style={[styles.title, hasErrors && styles.errorTitle]}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {hasErrors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Errors ({errorCount})
            </Text>
            {Object.entries(errors).map(([key, error]) => (
              <View key={key} style={styles.errorItem}>
                <Ionicons name="close-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ))}
          </View>
        )}

        {hasWarnings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Warnings ({warningCount})
            </Text>
            {Object.entries(warnings).map(([key, warning]) => (
              <View key={key} style={styles.warningItem}>
                <Ionicons name="information-circle" size={16} color={Colors.warning} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {onFixErrors && hasErrors && (
        <TouchableOpacity style={styles.fixButton} onPress={onFixErrors}>
          <Ionicons name="checkmark-circle" size={16} color="white" />
          <Text style={styles.fixButtonText}>Fix Errors</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  errorTitle: {
    color: Colors.error,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  warningText: {
    fontSize: 14,
    color: Colors.warning,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fixButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ValidationWarning;







