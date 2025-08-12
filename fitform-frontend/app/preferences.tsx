import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    preferred_style: '',
    preferred_color: '',
    preferred_size: '',
    preferred_material: '',
    preferred_fit: '',
    preferred_pattern: '',
    preferred_budget: '',
    preferred_season: '',
    preferred_length: '',
    preferred_sleeve: '',
    notes: '',
  });
  const [originalPreferences, setOriginalPreferences] = useState({ ...preferences });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await apiService.getPreferences();
      if (res) {
        const loaded = {
          preferred_style: res.preferred_style || '',
          preferred_color: res.preferred_color || '',
          preferred_size: res.preferred_size || '',
          preferred_material: res.preferred_material || '',
          preferred_fit: res.preferred_fit || '',
          preferred_pattern: res.preferred_pattern || '',
          preferred_budget: res.preferred_budget || '',
          preferred_season: res.preferred_season || '',
          preferred_length: res.preferred_length || '',
          preferred_sleeve: res.preferred_sleeve || '',
          notes: res.notes || '',
        };
        setPreferences(loaded);
        setOriginalPreferences(loaded);
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (
      !preferences.preferred_style.trim() &&
      !preferences.preferred_color.trim() &&
      !preferences.preferred_size.trim()
    ) {
      newErrors.general = 'Please enter at least one of style, color, or size.';
    }
    if (preferences.preferred_style.length > 30) {
      newErrors.preferred_style = 'Style must be 30 characters or less.';
    }
    if (preferences.preferred_color.length > 30) {
      newErrors.preferred_color = 'Color must be 30 characters or less.';
    }
    if (preferences.preferred_size.length > 30) {
      newErrors.preferred_size = 'Size must be 30 characters or less.';
    }
    if (preferences.notes.length > 300) {
      newErrors.notes = 'Notes must be 300 characters or less.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const savePreferences = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      if (JSON.stringify(preferences) === JSON.stringify(originalPreferences)) {
        setFeedback({ type: 'success', message: 'No changes to save.' });
        return;
      }
      await apiService.createPreference(preferences);
      setFeedback({ type: 'success', message: 'Preferences saved successfully!' });
      setOriginalPreferences({ ...preferences });
      setErrors({});
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const clearPreferences = () => {
    console.log('Clear button pressed'); // Debug log
    // Since Alert doesn't work in this environment, clear directly
    performClear();
  };

  const performClear = () => {
    console.log('Performing clear operation'); // Debug log
    const clearedPreferences = {
        preferred_style: '',
        preferred_color: '',
        preferred_size: '',
        preferred_material: '',
        preferred_fit: '',
        preferred_pattern: '',
        preferred_budget: '',
        preferred_season: '',
        preferred_length: '',
        preferred_sleeve: '',
        notes: '',
    };
    
    console.log('Setting preferences to:', clearedPreferences); // Debug log
    setPreferences(clearedPreferences);
    setOriginalPreferences(clearedPreferences);
      setErrors({});
    setFeedback({ type: 'success', message: 'Preferences cleared!' });
    console.log('Clear operation completed'); // Debug log
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#014D40" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="settings-outline" size={28} color="#014D40" />
      <Text style={styles.title}>My Preferences</Text>
          </View>
          <Text style={styles.subtitle}>Customize your clothing preferences to get better recommendations</Text>
        </View>

        {/* Feedback Message */}
      {feedback && (
          <View style={[
            styles.feedbackContainer, 
            feedback.type === 'success' ? styles.successContainer : styles.errorContainer
          ]}>
            <Ionicons 
              name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={20} 
              color={feedback.type === 'success' ? '#4CAF50' : '#F44336'} 
            />
            <Text style={[
              styles.feedbackText, 
              feedback.type === 'success' ? styles.successText : styles.errorText
            ]}>
          {feedback.message}
        </Text>
          </View>
      )}

        {/* General Error */}
        {errors.general && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        {/* Preferences Form */}
        <View style={styles.formContainer}>
          {/* Style & Color Row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="shirt-outline" size={16} color="#014D40" /> Preferred Style
              </Text>
              {errors.preferred_style && <Text style={styles.fieldError}>{errors.preferred_style}</Text>}
      <TextInput
                style={[styles.input, errors.preferred_style && styles.inputError]}
        value={preferences.preferred_style}
        onChangeText={text => setPreferences({ ...preferences, preferred_style: text })}
                placeholder="e.g. Casual, Sporty, Formal"
        maxLength={30}
      />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="color-palette-outline" size={16} color="#014D40" /> Preferred Color
              </Text>
              {errors.preferred_color && <Text style={styles.fieldError}>{errors.preferred_color}</Text>}
      <TextInput
                style={[styles.input, errors.preferred_color && styles.inputError]}
        value={preferences.preferred_color}
        onChangeText={text => setPreferences({ ...preferences, preferred_color: text })}
                placeholder="e.g. Blue, Red, Black"
        maxLength={30}
      />
            </View>
          </View>

          {/* Size & Material Row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="resize-outline" size={16} color="#014D40" /> Preferred Size
              </Text>
              {errors.preferred_size && <Text style={styles.fieldError}>{errors.preferred_size}</Text>}
      <TextInput
                style={[styles.input, errors.preferred_size && styles.inputError]}
        value={preferences.preferred_size}
        onChangeText={text => setPreferences({ ...preferences, preferred_size: text })}
                placeholder="e.g. S, M, L, XL"
        maxLength={30}
      />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="leaf-outline" size={16} color="#014D40" /> Preferred Material
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_material}
        onChangeText={text => setPreferences({ ...preferences, preferred_material: text })}
        placeholder="e.g. Cotton, Polyester"
        maxLength={30}
      />
            </View>
          </View>

          {/* Fit & Pattern Row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="body-outline" size={16} color="#014D40" /> Preferred Fit
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_fit}
        onChangeText={text => setPreferences({ ...preferences, preferred_fit: text })}
        placeholder="e.g. Slim, Regular, Loose"
        maxLength={30}
      />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="grid-outline" size={16} color="#014D40" /> Preferred Pattern
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_pattern}
        onChangeText={text => setPreferences({ ...preferences, preferred_pattern: text })}
                placeholder="e.g. Solid, Striped, Checked"
        maxLength={30}
      />
            </View>
          </View>

          {/* Budget & Season Row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="wallet-outline" size={16} color="#014D40" /> Preferred Budget (₱)
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_budget}
        onChangeText={text => setPreferences({ ...preferences, preferred_budget: text })}
                placeholder="e.g. Below ₱1000, ₱1000-₱3000"
        maxLength={30}
      />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="sunny-outline" size={16} color="#014D40" /> Preferred Season
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_season}
        onChangeText={text => setPreferences({ ...preferences, preferred_season: text })}
        placeholder="e.g. Dry, Wet, All-season"
        maxLength={30}
      />
            </View>
          </View>

          {/* Length & Sleeve Row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="resize-outline" size={16} color="#014D40" /> Preferred Length
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_length}
        onChangeText={text => setPreferences({ ...preferences, preferred_length: text })}
        placeholder="e.g. Short, Medium, Long"
        maxLength={30}
      />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="shirt-outline" size={16} color="#014D40" /> Preferred Sleeve
              </Text>
      <TextInput
        style={styles.input}
        value={preferences.preferred_sleeve}
        onChangeText={text => setPreferences({ ...preferences, preferred_sleeve: text })}
        placeholder="e.g. Sleeveless, Short, Long"
        maxLength={30}
      />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="document-text-outline" size={16} color="#014D40" /> Additional Notes
            </Text>
            {errors.notes && <Text style={styles.fieldError}>{errors.notes}</Text>}
      <TextInput
              style={[styles.input, styles.textArea, errors.notes && styles.inputError]}
        value={preferences.notes}
        onChangeText={text => setPreferences({ ...preferences, notes: text })}
              placeholder="Any additional preferences or special requirements..."
        multiline
              numberOfLines={4}
        maxLength={300}
      />
            <Text style={styles.charCount}>{preferences.notes.length}/300</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => {
              console.log('TouchableOpacity pressed'); // Debug log
              clearPreferences();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#014D40',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#014D40',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 40,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successContainer: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  feedbackText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#2E7D32',
  },
  errorText: {
    color: '#C62828',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#fff',
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#014D40',
    padding: 16,
    borderRadius: 8,
    flex: 2,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 