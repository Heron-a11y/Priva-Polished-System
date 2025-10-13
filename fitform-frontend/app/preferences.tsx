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
  Platform,
  Dimensions,
  Image
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import networkConfig from '../services/network-config';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import EditModal from '../components/EditModal';
import ReadOnlyField from '../components/ReadOnlyField';
import GroupedReadOnlyField from '../components/GroupedReadOnlyField';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

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
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [editingGroup, setEditingGroup] = useState<string>('');

  // Convert profile image URL to use current API base URL
  const getCorrectProfileImageUrl = (profileImageUrl: string | null) => {
    if (!profileImageUrl) return null;
    
    // If the URL contains ngrok or different domain, convert it to current API base
    if (profileImageUrl.includes('ngrok.io') || profileImageUrl.includes('fitform-api')) {
      // Extract the path from the original URL
      const urlParts = profileImageUrl.split('/storage/');
      if (urlParts.length > 1) {
        // Use current API base URL from network config
        const currentApiBase = networkConfig.getBackendUrl().replace('/api', '');
        return `${currentApiBase}/storage/${urlParts[1]}`;
      }
    }
    
    // If it's already a relative path or correct domain, return as is
    return profileImageUrl;
  };

  useEffect(() => {
    fetchPreferences();
    console.log('User data in preferences:', user);
    console.log('Profile image URL:', user?.profile_image);
    // Reset image error state when user changes
    setImageLoadError(false);
  }, [user]);

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

  const handleEditField = (field: string) => {
    setEditingField(field);
    setEditingGroup('');
    setShowEditModal(true);
  };

  const handleEditGroup = (group: string) => {
    setEditingGroup(group);
    setEditingField('');
    setShowEditModal(true);
  };

  const handleSaveField = async (data: Record<string, string>) => {
    try {
      setSaving(true);
      
      if (editingGroup) {
        // Handle group editing - update multiple fields
        const updatedPreferences = { ...preferences, ...data };
        setPreferences(updatedPreferences);
        Alert.alert('Success', 'Preferences updated successfully');
      } else {
        // Handle individual field editing
        const fieldValue = data[editingField];
        const updatedPreferences = { ...preferences, [editingField]: fieldValue };
        setPreferences(updatedPreferences);
        Alert.alert('Success', 'Preference updated successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Failed to update preference');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getEditFields = () => {
    const fieldConfigs = {
      preferred_style: {
        key: 'preferred_style',
        label: 'Preferred Style',
        value: preferences.preferred_style,
        type: 'text' as const,
        placeholder: 'Modern, Classic, Vintage',
        maxLength: 30,
      },
      preferred_color: {
        key: 'preferred_color',
        label: 'Preferred Color',
        value: preferences.preferred_color,
        type: 'text' as const,
        placeholder: 'Navy Blue, Black, White',
        maxLength: 30,
      },
      preferred_size: {
        key: 'preferred_size',
        label: 'Preferred Size',
        value: preferences.preferred_size,
        type: 'text' as const,
        placeholder: 'Small, Medium, Large',
        maxLength: 30,
      },
      preferred_material: {
        key: 'preferred_material',
        label: 'Preferred Material',
        value: preferences.preferred_material,
        type: 'text' as const,
        placeholder: 'Cotton, Wool, Silk, Polyester',
        maxLength: 30,
      },
      preferred_fit: {
        key: 'preferred_fit',
        label: 'Preferred Fit',
        value: preferences.preferred_fit,
        type: 'text' as const,
        placeholder: 'Slim, Regular, Loose',
        maxLength: 30,
      },
      preferred_pattern: {
        key: 'preferred_pattern',
        label: 'Preferred Pattern',
        value: preferences.preferred_pattern,
        type: 'text' as const,
        placeholder: 'Solid, Striped, Checkered, Floral',
        maxLength: 30,
      },
      preferred_budget: {
        key: 'preferred_budget',
        label: 'Preferred Budget',
        value: preferences.preferred_budget,
        type: 'text' as const,
        placeholder: '5000-10000, 10000-20000, 20000+',
        maxLength: 30,
      },
      preferred_season: {
        key: 'preferred_season',
        label: 'Preferred Season',
        value: preferences.preferred_season,
        type: 'text' as const,
        placeholder: 'Spring, Summer, Fall, Winter',
        maxLength: 30,
      },
      preferred_length: {
        key: 'preferred_length',
        label: 'Preferred Length',
        value: preferences.preferred_length,
        type: 'text' as const,
        placeholder: 'Short, Medium, Long',
        maxLength: 30,
      },
      preferred_sleeve: {
        key: 'preferred_sleeve',
        label: 'Preferred Sleeve',
        value: preferences.preferred_sleeve,
        type: 'text' as const,
        placeholder: 'Short, Long, Sleeveless',
        maxLength: 30,
      },
      notes: {
        key: 'notes',
        label: 'Notes',
        value: preferences.notes,
        type: 'multiline' as const,
        placeholder: 'Special requirements, style notes',
        multiline: true,
        numberOfLines: 4,
        maxLength: 300,
      },
    };

    if (editingGroup) {
      // Return fields for the specific group
      const groupFields = {
        basic: ['preferred_style', 'preferred_color', 'preferred_size', 'preferred_material'],
        style: ['preferred_fit', 'preferred_pattern'],
        budget: ['preferred_budget', 'preferred_season'],
        length: ['preferred_length', 'preferred_sleeve'],
        notes: ['notes']
      };
      
      const groupFieldKeys = groupFields[editingGroup as keyof typeof groupFields] || [];
      return groupFieldKeys.map(key => fieldConfigs[key as keyof typeof fieldConfigs]).filter(Boolean);
    } else {
      // Return single field for individual editing
      return [fieldConfigs[editingField as keyof typeof fieldConfigs]].filter(Boolean);
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
    <KeyboardAvoidingWrapper style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Enhanced Header */}
        <View style={styles.enhancedHeader}>
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                {user?.profile_image && user.profile_image.trim() !== '' && !imageLoadError ? (
                  <Image 
                    source={{ 
                      uri: getCorrectProfileImageUrl(user.profile_image),
                      cache: 'force-cache'
                    }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Profile image load error - falling back to default icon');
                      console.log('Original URL:', user.profile_image);
                      console.log('Corrected URL:', getCorrectProfileImageUrl(user.profile_image));
                      console.log('Error details:', error.nativeEvent?.error);
                      setImageLoadError(true);
                    }}
                    onLoad={() => {
                      console.log('Profile image loaded successfully');
                      setImageLoadError(false);
                    }}
                  />
                ) : (
                  <Ionicons name="person-circle" size={48} color={Colors.primary} />
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.enhancedTitle}>My Preferences</Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.statText}>Personalized</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={16} color={Colors.info} />
                <Text style={styles.statText}>Smart Matching</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Feedback Message */}
        {feedback && (
          <View style={[
            styles.enhancedFeedbackContainer, 
            feedback.type === 'success' ? styles.enhancedSuccessContainer : styles.enhancedErrorContainer
          ]}>
            <View style={styles.feedbackIconContainer}>
              <Ionicons 
                name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                size={24} 
                color={feedback.type === 'success' ? Colors.success : Colors.error} 
              />
            </View>
            <View style={styles.feedbackTextContainer}>
              <Text style={[
                styles.enhancedFeedbackText, 
                feedback.type === 'success' ? styles.enhancedSuccessText : styles.enhancedErrorText
              ]}>
                {feedback.message}
              </Text>
            </View>
          </View>
        )}

        {/* General Error */}
        {errors.general && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        {/* Enhanced Preferences Form */}
        <View style={styles.enhancedFormContainer}>
          {/* Basic Preferences Section */}
          <View style={styles.sectionContainer}>
            <GroupedReadOnlyField
              title="Basic Preferences"
              description="Your core style preferences"
              fields={[
                { label: 'Preferred Style', value: preferences.preferred_style || 'Not specified' },
                { label: 'Preferred Color', value: preferences.preferred_color || 'Not specified' },
                { label: 'Preferred Size', value: preferences.preferred_size || 'Not specified' },
                { label: 'Preferred Material', value: preferences.preferred_material || 'Not specified' }
              ]}
              onEdit={() => handleEditGroup('basic')}
              icon="star"
              editButtonText="Edit Basic Preferences"
            />
          </View>

          {/* Style Details Section */}
          <View style={styles.sectionContainer}>
            <GroupedReadOnlyField
              title="Style Details"
              description="Your specific style preferences"
              fields={[
                { label: 'Preferred Fit', value: preferences.preferred_fit || 'Not specified' },
                { label: 'Preferred Pattern', value: preferences.preferred_pattern || 'Not specified' }
              ]}
              onEdit={() => handleEditGroup('style')}
              icon="shirt"
              editButtonText="Edit Style Details"
            />
          </View>

          {/* Budget & Season Section */}
          <View style={styles.sectionContainer}>
            <GroupedReadOnlyField
              title="Budget & Season"
              description="Your budget and seasonal preferences"
              fields={[
                { label: 'Preferred Budget', value: preferences.preferred_budget || 'Not specified' },
                { label: 'Preferred Season', value: preferences.preferred_season || 'Not specified' }
              ]}
              onEdit={() => handleEditGroup('budget')}
              icon="wallet"
              editButtonText="Edit Budget & Season"
            />
          </View>

          {/* Length & Sleeve Section */}
          <View style={styles.sectionContainer}>
            <GroupedReadOnlyField
              title="Length & Sleeve"
              description="Your preferred garment dimensions"
              fields={[
                { label: 'Preferred Length', value: preferences.preferred_length || 'Not specified' },
                { label: 'Preferred Sleeve', value: preferences.preferred_sleeve || 'Not specified' }
              ]}
              onEdit={() => handleEditGroup('length')}
              icon="resize"
              editButtonText="Edit Length & Sleeve"
            />
          </View>

          {/* Additional Notes Section */}
          <View style={styles.sectionContainer}>
            <GroupedReadOnlyField
              title="Additional Notes"
              description="Any special requirements or additional notes"
              fields={[
                { 
                  label: 'Special Requirements', 
                  value: preferences.notes || 'No additional notes',
                  multiline: true,
                  numberOfLines: 4
                }
              ]}
              onEdit={() => handleEditGroup('notes')}
              icon="document-text"
              editButtonText="Edit Notes"
            />
          </View>
        </View>

        {/* Enhanced Action Buttons */}
        <View style={styles.enhancedButtonContainer}>
          <TouchableOpacity 
            style={styles.enhancedClearButton} 
            onPress={() => {
              console.log('TouchableOpacity pressed'); // Debug log
              clearPreferences();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={styles.enhancedClearButtonText} numberOfLines={1}>Clear All</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.enhancedSaveButton, saving && styles.enhancedSaveButtonDisabled]} 
            onPress={savePreferences}
            disabled={saving}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={Colors.text.inverse} />
                  <Text style={styles.enhancedSaveButtonText}>Save</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <EditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editingGroup ? 
          `Edit ${editingGroup.charAt(0).toUpperCase() + editingGroup.slice(1)} Preferences` : 
          `Edit ${editingField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
        }
        fields={getEditFields()}
        onSave={handleSaveField}
        loading={saving}
        icon="create-outline"
      />
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.primary,
  },
  scrollContainer: {
    padding: 20,
  },

  // Enhanced Header Styles
  enhancedHeader: {
    marginBottom: 24,
  },
  headerCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  headerTextContainer: {
    flex: 1,
  },
  enhancedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  enhancedSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 6,
  },

  // Enhanced Feedback Styles
  enhancedFeedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedSuccessContainer: {
    backgroundColor: Colors.success + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  enhancedErrorContainer: {
    backgroundColor: Colors.error + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  feedbackIconContainer: {
    marginRight: 12,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  enhancedFeedbackText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enhancedSuccessText: {
    color: Colors.success,
  },
  enhancedErrorText: {
    color: Colors.error,
  },

  // Enhanced Form Styles
  enhancedFormContainer: {
    marginBottom: 24,
  },
  sectionContainer: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  sectionContent: {
    paddingTop: 16,
  },
  enhancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  enhancedInputGroup: {
    flex: 1,
    marginRight: 6,
    marginLeft: 6,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  enhancedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  enhancedInput: {
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: Colors.text.primary,
    marginLeft: 0,
    marginRight: 0,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhancedInputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  enhancedTextArea: {
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: Colors.text.primary,
    height: 100,
    textAlignVertical: 'top',
    marginLeft: 0,
    marginRight: 0,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhancedFieldError: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  enhancedCharCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },

  // Enhanced Button Styles
  enhancedButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  enhancedClearButton: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.error,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedClearButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
  },
  enhancedSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  enhancedSaveButtonDisabled: {
    backgroundColor: Colors.text.secondary,
  },
  enhancedSaveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  // Legacy styles for compatibility
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