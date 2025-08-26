import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Text,
} from 'react-native';
import { ThemedView } from '../../../components/ThemedView';
import { ThemedText } from '../../../components/ThemedText';
import { Colors } from '../../../constants/Colors';
import apiService from '../../../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

interface SizingStandard {
  id: number;
  name: string;
  category: string;
  gender: string;
  measurements: Record<string, number>;
  size_categories: Record<string, Record<string, number>>;
  is_active: boolean;
  updated_by: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export default function SizingManagementScreen() {
  const [standards, setStandards] = useState<SizingStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStandard, setEditingStandard] = useState<SizingStandard | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'shirts',
    gender: 'male',
    is_active: true,
    measurements: {
      chest: '', waist: '', length: '', shoulder: '', sleeve: ''
    },
    size_categories: {
      XS: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
      S: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
      M: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
      L: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
      XL: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
      XXL: { chest: '', waist: '', length: '', shoulder: '', sleeve: '' },
    }
  } as {
    name: string;
    category: string;
    gender: string;
    is_active: boolean;
    measurements: Record<string, string>;
    size_categories: Record<string, Record<string, string>>;
  });

  const categories = ['shirts', 'pants', 'dresses', 'jackets', 'skirts', 'shoes', 'hats', 'suits', 'activewear', 'custom'];
  const genders = ['male', 'female', 'unisex'];

  // Category-based default measurements
  const getDefaultMeasurements = (category: string): Record<string, string> => {
    switch (category) {
      case 'shirts':
        return { chest: '', waist: '', length: '', shoulder: '', sleeve: '' };
      case 'pants':
        return { waist: '', hips: '', length: '', inseam: '', thigh: '' };
      case 'dresses':
        return { chest: '', waist: '', hips: '', length: '', shoulder: '' };
      case 'jackets':
        return { chest: '', waist: '', length: '', shoulder: '', sleeve: '' };
      case 'skirts':
        return { waist: '', hips: '', length: '' };
      case 'shoes':
        return { foot_length: '' };
      case 'hats':
        return { head_circumference: '' };
      case 'suits':
        return { chest: '', waist: '', hips: '', length: '', shoulder: '', sleeve: '', inseam: '' };
      case 'activewear':
        return { chest: '', waist: '', hips: '', length: '' };
      default:
        // For custom categories, return basic measurements
        return { chest: '', waist: '', length: '' };
    }
  };

  // Get category description
  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'shirts':
        return 'Upper body garments that require chest, waist, length, shoulder, and sleeve measurements for proper fit';
      case 'pants':
        return 'Lower body garments that require waist, hips, length, inseam, and thigh measurements for comfortable wear';
      case 'dresses':
        return 'Full-body garments that require chest, waist, hips, length, and shoulder measurements for elegant fit';
      case 'jackets':
        return 'Outerwear that requires chest, waist, length, shoulder, and sleeve measurements for layering';
      case 'skirts':
        return 'Lower body garments that require waist, hips, and length measurements for proper fit';
      case 'shoes':
        return 'Footwear that requires foot length measurement for proper sizing';
      case 'hats':
        return 'Headwear that requires head circumference measurement for comfortable fit';
      case 'suits':
        return 'Formal wear that requires comprehensive measurements including chest, waist, hips, length, shoulder, sleeve, and inseam';
      case 'activewear':
        return 'Athletic clothing that requires chest, waist, hips, and length measurements for comfortable movement';
      default:
        return 'Custom garment category - add relevant measurements as needed';
    }
  };

  // Update measurements when category changes
  const updateMeasurementsForCategory = (newCategory: string) => {
    console.log('Updating measurements for category:', newCategory);
    
    const defaultMeasurements = getDefaultMeasurements(newCategory);
    console.log('Default measurements for', newCategory, ':', defaultMeasurements);
    
    // Keep any custom fields that admin added manually
    const customFields = Object.keys(formData.measurements).filter(field => 
      !Object.keys(defaultMeasurements).includes(field)
    );
    console.log('Custom fields to preserve:', customFields);
    
    const updatedMeasurements: Record<string, string> = { ...defaultMeasurements };
    customFields.forEach(field => {
      updatedMeasurements[field] = formData.measurements[field] || '';
    });
    
    // Update size categories to match new measurements
    const updatedSizeCategories: Record<string, Record<string, string>> = {};
    Object.keys(formData.size_categories).forEach(size => {
      updatedSizeCategories[size] = {};
      Object.keys(updatedMeasurements).forEach(measurement => {
        updatedSizeCategories[size][measurement] = '';
      });
    });
    
    console.log('Updated measurements:', updatedMeasurements);
    console.log('Updated size categories:', updatedSizeCategories);
    
    // Update formData with new measurements and size categories
    setFormData(prevData => ({
      ...prevData,
      category: newCategory,
      measurements: updatedMeasurements,
      size_categories: updatedSizeCategories
    }));
  };

  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customMeasurements, setCustomMeasurements] = useState<string[]>([]);
  const [customSizeCategories, setCustomSizeCategories] = useState<string[]>([]);
  const [newMeasurementField, setNewMeasurementField] = useState('');
  const [newSizeCategory, setNewSizeCategory] = useState('');

  useEffect(() => {
    loadSizingStandards();
  }, []);

  const loadSizingStandards = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSizingStandards();
      if (response.success) {
        setStandards(response.data);
      }
    } catch (error) {
      console.error('Error loading sizing standards:', error);
      Alert.alert('Error', 'Failed to load sizing standards');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStandard(null);
    const defaultMeasurements = getDefaultMeasurements('shirts'); // Start with shirts as default
    const defaultSizeCategories = {
      XS: { ...defaultMeasurements },
      S: { ...defaultMeasurements },
      M: { ...defaultMeasurements },
      L: { ...defaultMeasurements },
      XL: { ...defaultMeasurements },
      XXL: { ...defaultMeasurements },
    };
    
    setFormData({
      name: '',
      category: 'shirts', // Ensure this is set to a valid default
      gender: 'male',
      is_active: true,
      measurements: defaultMeasurements,
      size_categories: defaultSizeCategories
    });
    
    setModalVisible(true);
  };

  const handleCategorySelect = (category: string) => {
    console.log('Category selected:', category);
    if (category === 'custom') {
      setShowCustomCategoryInput(true);
      // Don't clear the category here - wait until custom category is submitted
      console.log('Custom category selected, showing input');
    } else {
      setShowCustomCategoryInput(false);
      setCustomCategory('');
      
      // Update category and measurements immediately
      setFormData(prevData => {
        const defaultMeasurements = getDefaultMeasurements(category);
        console.log('Setting measurements for', category, ':', defaultMeasurements);
        
        // Update size categories to match new measurements
        const updatedSizeCategories: Record<string, Record<string, string>> = {};
        Object.keys(prevData.size_categories).forEach(size => {
          updatedSizeCategories[size] = {};
          Object.keys(defaultMeasurements).forEach(measurement => {
            updatedSizeCategories[size][measurement] = '';
          });
        });
        
        return {
          ...prevData,
          category: category,
          measurements: defaultMeasurements,
          size_categories: updatedSizeCategories
        };
      });
      
      console.log('Predefined category selected:', category);
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      const finalCategory = customCategory.trim().toLowerCase();
      console.log('Setting custom category:', finalCategory);
      
      // Update the category and measurements immediately
      setFormData(prevData => {
        const defaultMeasurements = getDefaultMeasurements(finalCategory);
        console.log('Setting measurements for custom category', finalCategory, ':', defaultMeasurements);
        
        // Update size categories to match new measurements
        const updatedSizeCategories: Record<string, Record<string, string>> = {};
        Object.keys(prevData.size_categories).forEach(size => {
          updatedSizeCategories[size] = {};
          Object.keys(defaultMeasurements).forEach(measurement => {
            updatedSizeCategories[size][measurement] = '';
          });
        });
        
        return {
          ...prevData,
          category: finalCategory,
          measurements: defaultMeasurements,
          size_categories: updatedSizeCategories
        };
      });
      
      setShowCustomCategoryInput(false);
    }
  };

  const addCustomMeasurementField = () => {
    console.log('addCustomMeasurementField called with:', newMeasurementField);
    console.log('Current measurements:', formData.measurements);
    
    if (newMeasurementField.trim() && !formData.measurements.hasOwnProperty(newMeasurementField.trim().toLowerCase())) {
      const fieldName = newMeasurementField.trim().toLowerCase();
      console.log('Adding field:', fieldName);
      
      // Add the new measurement field to measurements
      const updatedMeasurements = {
        ...formData.measurements,
        [fieldName]: ''
      };
      
      // Update all size categories to include the new measurement
      const updatedSizeCategories = { ...formData.size_categories };
      Object.keys(updatedSizeCategories).forEach(size => {
        updatedSizeCategories[size] = {
          ...updatedSizeCategories[size],
          [fieldName]: ''
        };
      });
      
      // Update formData with both new measurements and size categories
      setFormData({
        ...formData,
        measurements: updatedMeasurements,
        size_categories: updatedSizeCategories
      });
      
      // Clear the input field
      setNewMeasurementField('');
      
      console.log('Successfully added measurement field:', fieldName);
      console.log('Updated measurements:', updatedMeasurements);
    } else {
      console.log('Field not added. Conditions not met:');
      console.log('- Field is empty:', !newMeasurementField.trim());
      console.log('- Field already exists:', formData.measurements.hasOwnProperty(newMeasurementField.trim().toLowerCase()));
    }
  };

  const removeMeasurementField = (fieldName: string) => {
    const { [fieldName]: removed, ...remainingMeasurements } = formData.measurements;
    
    // Remove from all size categories
    const updatedSizeCategories = { ...formData.size_categories };
    Object.keys(updatedSizeCategories).forEach(size => {
      const { [fieldName]: removed, ...remaining } = updatedSizeCategories[size];
      updatedSizeCategories[size] = remaining;
    });
    
    setFormData({
      ...formData,
      measurements: remainingMeasurements,
      size_categories: updatedSizeCategories
    });
  };

  const addCustomSizeCategory = () => {
    if (newSizeCategory.trim() && !formData.size_categories.hasOwnProperty(newSizeCategory.trim().toUpperCase())) {
      const sizeName = newSizeCategory.trim().toUpperCase();
      const newSizeMeasurements: Record<string, string> = {};
      
      // Initialize all measurement fields for the new size with empty strings
      Object.keys(formData.measurements).forEach(measurement => {
        newSizeMeasurements[measurement] = '';
      });
      
      setFormData({
        ...formData,
        size_categories: {
          ...formData.size_categories,
          [sizeName]: newSizeMeasurements
        }
      });
      
      setNewSizeCategory('');
      console.log('Added size category:', sizeName);
    }
  };

  const removeSizeCategory = (sizeName: string) => {
    const { [sizeName]: removed, ...remainingSizes } = formData.size_categories;
    setFormData({
      ...formData,
      size_categories: remainingSizes
    });
  };

  const openEditModal = (standard: SizingStandard) => {
    setEditingStandard(standard);
    
    // Check if the category is custom (not in predefined list)
    const isCustomCategory = !categories.slice(0, -1).includes(standard.category);
    
    // Convert measurements to strings for the form
    const measurementsAsStrings = Object.fromEntries(
      Object.entries(standard.measurements).map(([key, value]) => [key, value.toString()])
    );
    
    // Convert size categories measurements to strings for the form
    const sizeCategoriesAsStrings = Object.fromEntries(
      Object.entries(standard.size_categories).map(([size, measurements]) => [
        size,
        Object.fromEntries(
          Object.entries(measurements).map(([key, value]) => [key, value.toString()])
        )
      ])
    );
    
    setFormData({
      name: standard.name,
      category: standard.category,
      gender: standard.gender,
      is_active: standard.is_active,
      measurements: measurementsAsStrings,
      size_categories: sizeCategoriesAsStrings,
    });
    
    if (isCustomCategory) {
      setCustomCategory(standard.category);
      setShowCustomCategoryInput(true);
    } else {
      setCustomCategory('');
      setShowCustomCategoryInput(false);
    }
    
    setModalVisible(true);
  };

  // Format measurement value for display
  const formatMeasurementValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal points
      return value.replace(/[^0-9.]/g, '');
    }
    return '';
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    // Check if name is provided
    if (!formData.name.trim()) return false;
    
    // Check if category is set
    if (!formData.category.trim()) return false;
    
    // Check if custom category is selected but not yet submitted
    if (showCustomCategoryInput && !customCategory.trim()) return false;
    
    // Check if all measurements are valid positive numbers
    const allMeasurementsValid = Object.values(formData.measurements).every(value => {
      if (!value || value.trim() === '') return false;
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue > 0;
    });
    
    if (!allMeasurementsValid) return false;
    
    // Check if all size category measurements are valid positive numbers
    const allSizeMeasurementsValid = Object.values(formData.size_categories).every(measurements => {
      return Object.values(measurements).every(value => {
        if (!value || value.trim() === '') return false;
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue > 0;
      });
    });
    
    return allSizeMeasurementsValid;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the sizing standard');
      return;
    }

    // Check if custom category is selected but not yet submitted
    if (showCustomCategoryInput && !customCategory.trim()) {
      Alert.alert('Error', 'Please enter a custom category name');
      return;
    }

    // Ensure category is set (either predefined or custom)
    if (!formData.category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate that all measurements are positive numbers
    const validationErrors: string[] = [];
    
    // Check base measurements
    Object.entries(formData.measurements).forEach(([field, value]) => {
      if (!value || value.trim() === '') {
        validationErrors.push(`Base measurement '${field}' is required`);
      } else {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          validationErrors.push(`Base measurement '${field}' must be a positive number`);
        }
      }
    });

    // Check size category measurements
    Object.entries(formData.size_categories).forEach(([size, measurements]) => {
      Object.entries(measurements).forEach(([field, value]) => {
        if (!value || value.trim() === '') {
          validationErrors.push(`Size '${size}' measurement '${field}' is required`);
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue <= 0) {
            validationErrors.push(`Size '${size}' measurement '${field}' must be a positive number`);
          }
        }
      });
    });

    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', `Please fix the following issues:\n\n${validationErrors.join('\n')}`);
      return;
    }

    // Convert measurements to numbers for backend
    const numericMeasurements: Record<string, number> = {};
    Object.entries(formData.measurements).forEach(([field, value]) => {
      numericMeasurements[field] = parseFloat(value);
    });

    const numericSizeCategories: Record<string, Record<string, number>> = {};
    Object.entries(formData.size_categories).forEach(([size, measurements]) => {
      numericSizeCategories[size] = {};
      Object.entries(measurements).forEach(([field, value]) => {
        numericSizeCategories[size][field] = parseFloat(value);
      });
    });

    const submissionData = {
      ...formData,
      measurements: numericMeasurements,
      size_categories: numericSizeCategories
    };

    // Debug: Log what we're sending
    console.log('Submitting form data:', submissionData);

    try {
      setLoading(true);
      const response = await apiService.updateSizingStandard(submissionData);
      if (response.success) {
        Alert.alert('Success', response.message);
        setModalVisible(false);
        loadSizingStandards();
      }
    } catch (error: any) {
      console.error('Error saving sizing standard:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to save sizing standard';
      if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async (standard: SizingStandard) => {
    try {
      const updatedData = { 
        name: standard.name,
        category: standard.category,
        gender: standard.gender,
        measurements: standard.measurements,
        size_categories: standard.size_categories,
        is_active: !standard.is_active 
      };
      const response = await apiService.updateSizingStandard(updatedData);
      if (response.success) {
        loadSizingStandards();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderStandardCard = (standard: SizingStandard) => (
    <View key={standard.id} style={styles.standardCard}>
      <View style={styles.standardHeader}>
        <View style={styles.standardInfo}>
          <ThemedText style={styles.standardName}>{standard.name}</ThemedText>
          <View style={styles.standardMeta}>
            <View style={[styles.statusBadge, standard.is_active ? styles.activeBadge : styles.inactiveBadge]}>
              <ThemedText style={styles.statusText}>
                {standard.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryText}>
                {standard.category} • {standard.gender}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(standard)}
          >
            <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, standard.is_active ? styles.deactivateButton : styles.activateButton]}
            onPress={() => toggleActiveStatus(standard)}
          >
            <ThemedText style={styles.actionButtonText}>
              {standard.is_active ? 'Deactivate' : 'Activate'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.standardDetails}>
        <ThemedText style={styles.detailText}>
          <ThemedText style={styles.detailLabel}>Updated by:</ThemedText> {standard.updated_by?.name || 'System'}
        </ThemedText>
        <ThemedText style={styles.detailText}>
          <ThemedText style={styles.detailLabel}>Last updated:</ThemedText> {new Date(standard.updated_at).toLocaleDateString()}
        </ThemedText>
      </View>
    </View>
  );

  const renderForm = () => {
    console.log('Rendering form with category:', formData.category);
    console.log('Current measurements:', formData.measurements);
    console.log('Current size categories:', formData.size_categories);
    
    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {editingStandard ? 'Edit Sizing Standard' : 'Add New Sizing Standard'}
            </ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <View style={styles.formSection}>
              <ThemedText style={styles.formSectionTitle}>Basic Information</ThemedText>
              <ThemedText style={styles.formSectionSubtitle}>Define the core details of your sizing standard</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Standard Name</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter standard name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <ThemedText style={styles.inputLabel}>Category</ThemedText>
                  <View style={styles.pickerContainer}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.pickerOption,
                          (formData.category === cat || (cat === 'custom' && showCustomCategoryInput)) && styles.pickerOptionActive
                        ]}
                        onPress={() => handleCategorySelect(cat)}
                      >
                        <ThemedText style={[
                          styles.pickerOptionText,
                          (formData.category === cat || (cat === 'custom' && showCustomCategoryInput)) && styles.pickerOptionTextActive
                        ]}>
                          {cat === 'custom' ? 'Custom' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {showCustomCategoryInput && (
                    <View style={styles.customCategorySection}>
                      <ThemedText style={styles.customCategoryLabel}>Custom Category Name</ThemedText>
                      <View style={styles.customCategoryRow}>
                        <TextInput
                          style={styles.customCategoryInput}
                          value={customCategory}
                          onChangeText={setCustomCategory}
                          placeholder="e.g., blazers, jumpsuits..."
                          placeholderTextColor="#999"
                        />
                        <TouchableOpacity
                          style={[styles.customCategoryButton, !customCategory.trim() && styles.customCategoryButtonDisabled]}
                          onPress={handleCustomCategorySubmit}
                          disabled={!customCategory.trim()}
                        >
                          <ThemedText style={styles.customCategoryButtonText}>Add</ThemedText>
                        </TouchableOpacity>
                      </View>
                      {customCategory.trim() && (
                        <View style={styles.selectedCustomCategory}>
                          <ThemedText style={styles.selectedCustomCategoryText}>
                            📍 Selected: 
                          </ThemedText>
                          <ThemedText style={styles.highlightText}>
                            {customCategory}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.halfInput}>
                  <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                  <View style={styles.pickerContainer}>
                    {genders.map((gen) => (
                      <TouchableOpacity
                        key={gen}
                        style={[
                          styles.pickerOption,
                          formData.gender === gen && styles.pickerOptionActive
                        ]}
                        onPress={() => setFormData({...formData, gender: gen})}
                      >
                        <ThemedText style={[
                          styles.pickerOptionText,
                          formData.gender === gen && styles.pickerOptionTextActive
                        ]}>
                          {gen.charAt(0).toUpperCase() + gen.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <ThemedText style={styles.switchLabel}>Active Status</ThemedText>
                  <ThemedText style={styles.switchDescription}>Enable this standard for customer use</ThemedText>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    formData.is_active && styles.toggleSwitchActive
                  ]}
                  onPress={() => setFormData({...formData, is_active: !formData.is_active})}
                >
                  <View style={[
                    styles.toggleKnob,
                    formData.is_active && styles.toggleKnobActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Measurements Configuration */}
            <View style={styles.formSection}>
              <ThemedText style={styles.formSectionTitle}>📏 Base Measurements (Reference Values)</ThemedText>
              <ThemedText style={styles.formSectionSubtitle}>
                Set the reference measurements that will be used as a baseline for all size categories
              </ThemedText>
              <View style={styles.baseMeasurementsInfo}>
                <ThemedText style={styles.baseMeasurementsInfoText}>
                  🎯 <Text style={styles.highlightText}>Base measurements serve as your sizing standard reference.</Text>
                </ThemedText>
                <ThemedText style={styles.baseMeasurementsSubtext}>
                  These values represent the "middle" or "standard" measurements that other sizes will be based on.
                </ThemedText>
              </View>
                              <View style={styles.categoryInfo}>
                  <View style={styles.categoryInfoHeader}>
                    <Text style={styles.categoryIcon}>✏️</Text>
                    <ThemedText style={styles.categoryInfoText}>
                      <Text style={styles.highlightText}>{formData.category.toUpperCase()}</Text> requires these measurements:
                    </ThemedText>
                  </View>
                  <View style={styles.measurementTagsContainer}>
                    {Object.keys(formData.measurements).map((field, index) => (
                      <View key={field} style={styles.measurementTagContainer}>
                        <ThemedText style={styles.measurementTag}>
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <ThemedText style={styles.categoryDescription}>
                    {getCategoryDescription(formData.category)}
                  </ThemedText>
                  <ThemedText style={styles.categoryInfoSubtext}>
                    These fields will be available for all size categories
                  </ThemedText>
                </View>
              
              {/* Add New Measurement Field */}
              <View style={styles.addMeasurementSection}>
                <View style={styles.addMeasurementRow}>
                  <TextInput
                    style={styles.addMeasurementInput}
                    value={newMeasurementField}
                    onChangeText={setNewMeasurementField}
                    placeholder="e.g., bust, waist, inseam..."
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={[styles.addMeasurementButton, !newMeasurementField.trim() && styles.addMeasurementButtonDisabled]}
                    onPress={addCustomMeasurementField}
                    disabled={!newMeasurementField.trim()}
                  >
                    <ThemedText style={styles.addMeasurementButtonText}>+ Add</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Display Current Measurement Fields */}
              <View style={styles.measurementFieldsContainer}>
                <View style={styles.baseMeasurementsLabel}>
                  <ThemedText style={styles.baseMeasurementsLabelText}>
                    📊 Base Measurement Values (Reference)
                  </ThemedText>
                  <ThemedText style={styles.baseMeasurementsLabelSubtext}>
                    Set these as your standard reference measurements
                  </ThemedText>
                </View>
                {Object.entries(formData.measurements).map(([field, value]) => (
                  <View key={field} style={styles.measurementFieldItem}>
                    <View style={styles.measurementFieldInfo}>
                      <ThemedText style={styles.measurementFieldLabel}>
                        {field.charAt(0).toUpperCase() + field.slice(1)} *
                      </ThemedText>
                      <View style={styles.baseMeasurementInput}>
                        <TextInput
                          style={[
                            styles.baseInput,
                            (!value || value.trim() === '' || parseFloat(value) <= 0) && styles.inputError
                          ]}
                          value={formatMeasurementValue(value)}
                          onChangeText={(text) => {
                            // Only allow numbers and decimal points
                            const numericText = text.replace(/[^0-9.]/g, '');
                            setFormData({
                              ...formData,
                              measurements: {
                                ...formData.measurements,
                                [field]: numericText
                              }
                            });
                          }}
                          placeholder="Enter measurement (inches)"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                        <ThemedText style={styles.baseUnit}>inches</ThemedText>
                      </View>
                      {(!value || value.trim() === '' || parseFloat(value) <= 0) && (
                        <ThemedText style={styles.errorText}>
                          Required - must be a positive number
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeFieldButton}
                      onPress={() => removeMeasurementField(field)}
                    >
                      <ThemedText style={styles.removeFieldButtonText}>×</ThemedText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Visual Separator */}
            <View style={styles.sectionSeparator}>
              <View style={styles.separatorLine} />
              <ThemedText style={styles.separatorText}>📏 MEASUREMENT BREAKDOWN 📏</ThemedText>
              <View style={styles.separatorLine} />
            </View>

            {/* Size Categories */}
            <View style={styles.formSection}>
              <ThemedText style={styles.formSectionTitle}>👕 Size Categories (Individual Size Measurements)</ThemedText>
              <ThemedText style={styles.formSectionSubtitle}>
                Define the specific measurements for each size category (XS, S, M, L, XL, XXL)
              </ThemedText>
              <View style={styles.sizeCategoriesInfo}>
                <ThemedText style={styles.sizeCategoriesInfoText}>
                  🎯 <Text style={styles.highlightText}>Each size category needs measurements for all fields defined above.</Text>
                </ThemedText>
                <ThemedText style={styles.sizeCategoriesSubtext}>
                  These measurements determine what "XS", "S", "M", etc. actually mean for your customers.
                </ThemedText>
              </View>
              
              {/* Add New Size Category */}
              <View style={styles.addSizeSection}>
                <View style={styles.addSizeRow}>
                  <TextInput
                    style={styles.addSizeInput}
                    value={newSizeCategory}
                    onChangeText={setNewSizeCategory}
                    placeholder="e.g., 2XL, 3XL, S/M, L/XL..."
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={[styles.addSizeButton, !newSizeCategory.trim() && styles.addSizeButtonDisabled]}
                    onPress={addCustomSizeCategory}
                    disabled={!newSizeCategory.trim()}
                  >
                    <ThemedText style={styles.addSizeButtonText}>+ Add Size</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
              
              {Object.entries(formData.size_categories).map(([size, measurements]) => (
                <View key={size} style={styles.sizeCategory}>
                  <View style={styles.sizeHeader}>
                    <ThemedText style={styles.sizeLabel}>{size}</ThemedText>
                    <View style={styles.sizeBadge}>
                      <ThemedText style={styles.sizeBadgeText}>{size}</ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeSizeButton}
                      onPress={() => removeSizeCategory(size)}
                    >
                      <ThemedText style={styles.removeFieldButtonText}>×</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.measurementInputs}>
                    {Object.entries(measurements).map(([key, value]) => (
                      <View key={key} style={styles.measurementInput}>
                        <ThemedText style={styles.measurementLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1)} *
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.numberInput,
                            (!value || value.trim() === '' || parseFloat(value) <= 0) && styles.inputError
                          ]}
                          value={formatMeasurementValue(value)}
                          onChangeText={(text) => {
                            // Only allow numbers and decimal points
                            const numericText = text.replace(/[^0-9.]/g, '');
                            const newSizeCategories = { ...formData.size_categories };
                            newSizeCategories[size] = { ...newSizeCategories[size], [key]: numericText };
                            setFormData({...formData, size_categories: newSizeCategories});
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#999"
                        />
                        {(!value || value.trim() === '' || parseFloat(value) <= 0) && (
                          <ThemedText style={styles.errorText}>
                            Required
                          </ThemedText>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Floating Bulb Icon - Above the Cancel and Fill All Fields buttons */}
          <View style={styles.floatingBulbContainer}>
            <TouchableOpacity 
              style={styles.floatingBulbIcon}
              onPress={() => {
                console.log('Opening summary modal...');
                setShowSummaryModal(true);
              }}
            >
              <ThemedText style={styles.floatingBulbText}>💡</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (loading || !isFormValid()) && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : !isFormValid() ? (
                <ThemedText style={styles.saveButtonText}>
                  Fill All Fields
                </ThemedText>
              ) : (
                <ThemedText style={styles.saveButtonText}>
                  {editingStandard ? 'Update' : 'Create'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Sizing Standards Management</ThemedText>
        <ThemedText style={styles.subtitle}>Manage garment sizing standards for different categories and genders</ThemedText>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <ThemedText style={styles.addButtonText}>+ Add New Standard</ThemedText>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <ThemedText style={styles.loadingText}>Loading sizing standards...</ThemedText>
        </View>
      ) : standards.length > 0 ? (
        <ScrollView style={styles.standardsList} showsVerticalScrollIndicator={false}>
          {standards.map(renderStandardCard)}
        </ScrollView>
      ) : (
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateIcon}>📏</ThemedText>
          <ThemedText style={styles.emptyStateText}>No sizing standards found</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>Create your first sizing standard to get started</ThemedText>
        </View>
      )}

      {renderForm()}

      {/* Summary Modal */}
      <Modal
        visible={showSummaryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSummaryModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.summaryModalOverlay}>
          <View style={styles.summaryModalContent}>
            <View style={styles.summaryModalHeader}>
              <Text style={styles.summaryModalTitle}>
                💡 How Sizing Standards Work
              </Text>
              <TouchableOpacity
                onPress={() => setShowSummaryModal(false)}
                style={styles.summaryCloseButton}
              >
                <Text style={styles.summaryCloseButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryFormContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.summaryScrollContent}
                style={styles.summaryScrollView}
              >
                <View style={styles.summaryHeaderSection}>
                  <View style={styles.summaryIconContainer}>
                    <Text style={styles.summaryIcon}>📏</Text>
                  </View>
                  <Text style={styles.summaryMainTitle}>Sizing Standards Guide</Text>
                  <Text style={styles.summarySubtitle}>
                    Understand how to set up and manage your sizing system effectively
                  </Text>
                </View>
                
                <View style={styles.summaryStepsContainer}>
                  <View style={styles.summaryStepCard}>
                    <View style={styles.summaryStepHeader}>
                      <Text style={styles.summaryStepNumber}>1</Text>
                      <Text style={styles.summaryStepTitle}>
                        Base Measurements Set Your Reference Standard
                      </Text>
                    </View>
                    <Text style={styles.summaryStepDescription}>
                      These are your "middle" or "standard" measurements that serve as the foundation for your sizing system.
                    </Text>
                  </View>
                  
                  <View style={styles.summaryStepCard}>
                    <View style={styles.summaryStepHeader}>
                      <Text style={styles.summaryStepNumber}>2</Text>
                      <Text style={styles.summaryStepTitle}>
                        Size Categories Define What Each Size Means
                      </Text>
                    </View>
                    <Text style={styles.summaryStepDescription}>
                      XS, S, M, L, XL, XXL are just labels. Here you define the actual measurements for each size.
                    </Text>
                  </View>
                  
                  <View style={styles.summaryStepCard}>
                    <View style={styles.summaryStepHeader}>
                      <Text style={styles.summaryStepNumber}>3</Text>
                      <Text style={styles.summaryStepTitle}>
                        Customer Experience Get Perfect Size Recommendations
                      </Text>
                    </View>
                    <Text style={styles.summaryStepDescription}>
                      When customers enter their measurements, the system compares them to your size categories and recommends the best fit.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryExampleSection}>
                  <View style={styles.summaryExampleCard}>
                    <Text style={styles.summaryExampleIcon}>📊</Text>
                    <Text style={styles.summaryExampleDescription}>
                      If you set "M" size to Chest: 40", Waist: 32", Length: 28", then customers with similar measurements will be recommended "M" size.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={styles.summaryModalButton}
                onPress={() => setShowSummaryModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.summaryModalButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.light,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: Colors.primary,
    textShadowColor: 'rgba(1, 77, 64, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  standardCard: {
    backgroundColor: Colors.background.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  standardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  standardInfo: {
    flex: 1,
  },
  standardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  standardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: Colors.success,
  },
  inactiveBadge: {
    backgroundColor: Colors.error,
  },
  statusText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.info,
  },
  activateButton: {
    backgroundColor: Colors.success,
  },
  deactivateButton: {
    backgroundColor: Colors.warning,
  },
  actionButtonText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  standardDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 15,
  },
  detailText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 18,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.text.muted,
  },
  standardsList: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  formSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    position: 'relative',
  },
  formSectionSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.border.medium,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.background.light,
    color: Colors.text.primary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 15,
  },
  halfInput: {
    flex: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.light,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  pickerOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerOptionText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  switchLabelContainer: {
    marginBottom: 5,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  switchDescription: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    backgroundColor: Colors.border.medium,
    borderRadius: 14,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: Colors.success,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  sizeCategory: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sizeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  sizeBadgeText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  measurementInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measurementInput: {
    flex: 1,
    minWidth: 80,
  },
  measurementLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.background.light,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 15,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: Colors.background.light,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.text.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  customCategorySection: {
    marginTop: 15,
  },
  customCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  customCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.background.light,
    color: Colors.text.primary,
  },
  customCategoryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  customCategoryButtonDisabled: {
    backgroundColor: Colors.text.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  customCategoryButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCustomCategory: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  selectedCustomCategoryText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  highlightText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  addMeasurementSection: {
    marginTop: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  addMeasurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 15,
  },
  addSizeSection: {
    marginTop: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  addSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 15,
  },
  addMeasurementInput: {
    flex: 1,
    maxWidth: 250,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: Colors.background.light,
    color: Colors.text.primary,
  },
  addSizeInput: {
    flex: 1,
    maxWidth: 250,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: Colors.background.light,
    color: Colors.text.primary,
  },
  addMeasurementButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    height: 36,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addMeasurementButtonDisabled: {
    backgroundColor: Colors.text.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  addMeasurementButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  addSizeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    height: 36,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addSizeButtonDisabled: {
    backgroundColor: Colors.text.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  addSizeButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  measurementFieldsContainer: {
    marginTop: 10,
  },
  measurementFieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  measurementFieldInfo: {
    flex: 1,
  },
  measurementFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  measurementFieldValue: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  removeFieldButton: {
    padding: 8,
  },
  removeFieldButtonText: {
    fontSize: 18,
    color: Colors.error,
  },
  removeSizeButton: {
    padding: 8,
  },
  removeSizeButtonText: {
    fontSize: 18,
    color: Colors.error,
  },
  baseMeasurementInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  baseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.background.light,
    color: Colors.text.primary,
  },
  baseUnit: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 10,
    color: Colors.error,
    marginTop: 5,
    textAlign: 'center',
  },
  categoryInfo: {
    marginTop: 10,
    padding: 15,
    backgroundColor: Colors.background.light,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  categoryInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryInfoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  measurementTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  measurementTagContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  measurementTag: {
    fontSize: 12,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
  },
  categoryInfoSubtext: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 5,
    textAlign: 'center',
  },
  formNote: {
    marginTop: 15,
    padding: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  formNoteText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  requiredAsterisk: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  baseMeasurementsInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  baseMeasurementsInfoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  baseMeasurementsSubtext: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 5,
    textAlign: 'center',
  },
  sizeCategoriesInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  sizeCategoriesInfoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  sizeCategoriesSubtext: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 5,
    textAlign: 'center',
  },
  baseMeasurementsLabel: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  baseMeasurementsLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 5,
  },
  baseMeasurementsLabelSubtext: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.medium,
  },
  separatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginHorizontal: 10,
  },
  floatingBulbContainer: {
    position: 'absolute',
    bottom: 110,
    right: 15,
    zIndex: 10,
  },
  floatingBulbIcon: {
    backgroundColor: Colors.background.card,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingBulbText: {
    fontSize: 20,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryModalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '92%',
    minHeight: 550,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  summaryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  summaryModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 10,
  },
  summaryCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  summaryCloseButtonText: {
    fontSize: 20,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  summaryFormContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
    paddingBottom: 0,
    minHeight: 450,
  },
  summaryScrollContent: {
    paddingBottom: 40,
  },
  summaryScrollView: {
    flex: 1,
  },
  summaryHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIcon: {
    fontSize: 40,
    color: Colors.text.inverse,
  },
  summaryMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryStepsContainer: {
    marginBottom: 20,
  },
  summaryStepCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryStepNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 12,
  },
  summaryStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  summaryStepDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginLeft: 32,
  },
  summaryExampleSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  summaryExampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  summaryExampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  summaryExampleIcon: {
    fontSize: 18,
    color: Colors.warning,
    marginRight: 12,
  },
  summaryExampleTitle: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  summaryExampleDescription: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  summaryModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    minHeight: 80,
  },
  summaryModalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  summaryModalButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

