import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface MeasurementValidationWarningProps {
  visible: boolean;
  missingFields: string[];
  onClose: () => void;
  onFillMeasurements: () => void;
  title?: string;
  subtitle?: string;
}

const MeasurementValidationWarning: React.FC<MeasurementValidationWarningProps> = ({
  visible,
  missingFields,
  onClose,
  onFillMeasurements,
  title = 'Incomplete Measurements',
  subtitle = 'Please fill in all required measurements for accurate sizing',
}) => {
  if (!visible || missingFields.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={24} color={Colors.warning} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.warningSection}>
              <Text style={styles.warningTitle}>Missing Measurements:</Text>
              {missingFields.map((field, index) => (
                <View key={index} style={styles.missingFieldItem}>
                  <Ionicons name="close-circle" size={16} color={Colors.error} />
                  <Text style={styles.missingFieldText}>{field}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="information-circle" size={16} color={Colors.info} />
                <Text style={styles.infoText}>
                  All measurements are required for accurate sizing and fitting
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="ruler" size={16} color={Colors.info} />
                <Text style={styles.infoText}>
                  Enter measurements in centimeters for best results
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fillButton}
              onPress={onFillMeasurements}
            >
              <Ionicons name="create" size={16} color="white" />
              <Text style={styles.fillButtonText}>Fill Measurements</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    maxHeight: 300,
  },
  warningSection: {
    padding: 20,
    paddingBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  missingFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  missingFieldText: {
    fontSize: 14,
    color: Colors.error,
    marginLeft: 8,
    flex: 1,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
    backgroundColor: Colors.background.light,
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  fillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  fillButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default MeasurementValidationWarning;




