import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface SizingStandard {
  id: number;
  name: string;
  category: string;
  gender: string;
  measurements: Record<string, number>;
  size_categories: Record<string, Record<string, number>>;
}

interface SizeRecommendation {
  id: number;
  recommended_size: string;
  confidence_score: number;
  sizing_standard: SizingStandard;
  customer_measurements: Record<string, number>;
  last_updated: string;
}

export default function SizingScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'charts' | 'measurements'>('recommendations');
  const [recommendations, setRecommendations] = useState<SizeRecommendation[]>([]);
  const [standards, setStandards] = useState<SizingStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  
  // Measurement form state
  const [measurements, setMeasurements] = useState<Record<string, string>>({
    chest: '',
    waist: '',
    hips: '',
    length: '',
  });

  // Update measurements when category changes
  const updateMeasurementsForCategory = (newCategory: string) => {
    if (newCategory === 'all' || newCategory === 'custom') {
      // Reset to generic measurements for 'all' or 'custom'
      setMeasurements({
        chest: '',
        waist: '',
        hips: '',
        length: '',
      });
    } else {
      // Get category-specific measurements
      const categoryMeasurements = getDefaultMeasurements(newCategory);
      setMeasurements(categoryMeasurements);
    }
  };

  const categories = ['all', 'shirts', 'pants', 'dresses', 'jackets', 'skirts', 'custom'];
  const genders = ['all', 'male', 'female', 'unisex'];

  // Category-based default measurements
  const getDefaultMeasurements = (category: string): Record<string, string> => {
    switch (category) {
      case 'shirts':
        return { chest: '', waist: '', length: '', shoulder: '', sleeve: '' };
      case 'pants':
        return { waist: '', hips: '', inseam: '', thigh: '', length: '' };
      case 'dresses':
        return { bust: '', waist: '', hips: '', length: '', shoulder: '' };
      case 'jackets':
        return { chest: '', waist: '', length: '', shoulder: '', sleeve: '' };
      case 'skirts':
        return { waist: '', hips: '', length: '' };
      default:
        return { chest: '', waist: '', hips: '', length: '' }; // Generic fallback
    }
  };

  // Get category description
  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'shirts':
        return 'Upper body garments that require chest, shoulder, and sleeve measurements for proper fit';
      case 'pants':
        return 'Lower body garments that focus on waist, hips, and inseam for comfortable wear';
      case 'dresses':
        return 'Full-body garments that need bust, waist, and hip measurements for elegant fit';
      case 'jackets':
        return 'Outerwear that requires chest, shoulder, and sleeve measurements for layering';
      case 'skirts':
        return 'Lower body garments that need waist and hip measurements for proper fit';
      default:
        return 'Select a specific category to see relevant measurements';
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (activeTab === 'recommendations') {
        loadRecommendations();
      } else if (activeTab === 'charts') {
        loadSizeCharts();
      }
    }
  }, [activeTab, isAuthenticated, isLoading]);

  // Separate effect for category/gender changes when on charts tab
  useEffect(() => {
    if (!isLoading && isAuthenticated && activeTab === 'charts') {
      // Add a small delay to prevent rapid successive calls
      const timer = setTimeout(() => {
        loadSizeCharts();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, selectedGender]);

  // Effect to update measurements when category changes
  useEffect(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'custom') {
      updateMeasurementsForCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const loadRecommendations = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please log in to view size recommendations');
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiService.getSizeRecommendations();
      if (response.success) {
        setRecommendations(response.data);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      Alert.alert('Error', 'Failed to load size recommendations');
    } finally {
      setLoading(false);
    }
  };

  const loadSizeCharts = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please log in to view size charts');
      return;
    }
    
    try {
      setLoading(true);
      // Handle "ALL" options and custom categories
      const category = selectedCategory === 'all' ? 'all' : selectedCategory;
      const gender = selectedGender === 'all' ? 'all' : selectedGender;
      
      console.log('🔄 Loading size charts with category:', category, 'gender:', gender);
      console.log('📊 Current state - selectedCategory:', selectedCategory, 'selectedGender:', selectedGender);
      
      const response = await apiService.getSizeCharts(category, gender);
      if (response.success) {
        console.log('✅ Size charts loaded successfully:', response.data.length, 'standards found');
        console.log('📋 Standards data:', response.data);
        setStandards(response.data);
      } else {
        console.log('❌ API response not successful:', response);
      }
    } catch (error) {
      console.error('❌ Error loading size charts:', error);
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    console.log('🎯 Category selected:', category);
    if (category === 'custom') {
      setShowCustomCategoryModal(true);
      console.log('📝 Opening custom category modal');
    } else {
      console.log('🔄 Setting predefined category:', category);
      setSelectedCategory(category);
      setCustomCategory('');
      // Update measurements for the selected category
      updateMeasurementsForCategory(category);
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      const finalCategory = customCategory.trim().toLowerCase();
      console.log('✏️ Setting custom category to:', finalCategory);
      setSelectedCategory(finalCategory);
      setShowCustomCategoryModal(false);
      setCustomCategory('');
      // Update measurements for the custom category
      updateMeasurementsForCategory(finalCategory);
      // Don't manually call loadSizeCharts here - let the useEffect handle it
      console.log('✅ Custom category set successfully');
    }
  };

  const handleMeasurementsSubmit = async () => {
    // Validate category and gender selection
    if (selectedCategory === 'all' || selectedGender === 'all') {
      Alert.alert('Error', 'Please select a specific category and gender for size recommendations');
      return;
    }

    // Validate measurements
    const hasEmptyFields = Object.values(measurements).some(value => !value);
    if (hasEmptyFields) {
      Alert.alert('Error', 'Please fill in all measurement fields');
      return;
    }

    try {
      setLoading(true);
      
      // Convert measurements to numbers for API
      const numericMeasurements: Record<string, number> = {};
      Object.entries(measurements).forEach(([key, value]) => {
        numericMeasurements[key] = parseFloat(value);
      });
      
      const response = await apiService.matchMeasurements({
        category: selectedCategory,
        gender: selectedGender,
        measurements: numericMeasurements
      });

      if (response.success) {
        Alert.alert(
          'Size Recommendation',
          `Your recommended size is: ${response.data.recommended_size}\nConfidence: ${(response.data.confidence_score * 100).toFixed(0)}%`
        );
        // Reset form
        setMeasurements(getDefaultMeasurements(selectedCategory));
        // Refresh recommendations
        loadRecommendations();
      }
    } catch (error) {
      console.error('Error matching measurements:', error);
      Alert.alert('Error', 'Failed to get size recommendation');
    } finally {
      setLoading(false);
    }
  };

  const renderRecommendations = () => (
    <View style={styles.tabContent}>
      <ThemedText style={styles.sectionTitle}>Your Size Recommendations</ThemedText>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.secondary} />
      ) : recommendations.length > 0 ? (
        recommendations.map((rec) => (
          <View key={rec.id} style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <ThemedText style={styles.recommendationTitle}>
                {rec.sizing_standard.name}
              </ThemedText>
              <View style={styles.confidenceBadge}>
                <ThemedText style={styles.confidenceBadgeText}>
                  {(rec.confidence_score * 100).toFixed(0)}%
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.recommendationSize}>
              Recommended Size: <Text style={styles.highlightText}>{rec.recommended_size}</Text>
            </ThemedText>
            <ThemedText style={styles.lastUpdated}>
              Last Updated: {new Date(rec.last_updated).toLocaleDateString()}
            </ThemedText>
          </View>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateIcon}>📏</ThemedText>
          <ThemedText style={styles.noData}>No size recommendations yet</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>Submit your measurements to get started!</ThemedText>
        </View>
      )}
    </View>
  );

  const renderSizeCharts = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Category:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  selectedCategory === cat && styles.filterChipActive
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive
                ]}>
                  {cat === 'custom' ? 'Custom' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Gender:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {genders.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.filterChip,
                  selectedGender === gender && styles.filterChipActive
                ]}
                onPress={() => setSelectedGender(gender)}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  selectedGender === gender && styles.filterChipTextActive
                ]}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedCategory !== 'all' && (
          <View style={styles.selectedCategoryInfo}>
            <ThemedText style={styles.selectedCategoryText}>
              📍 Selected: <Text style={styles.highlightText}>{selectedCategory}</Text> • <Text style={styles.highlightText}>{selectedGender}</Text>
            </ThemedText>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <ThemedText style={styles.loadingText}>Loading size charts...</ThemedText>
        </View>
      ) : standards.length > 0 ? (
        <>
          <View style={styles.debugInfo}>
            <ThemedText style={styles.debugText}>
              Found {standards.length} size chart(s) for category: "{selectedCategory}" and gender: "{selectedGender}"
            </ThemedText>
          </View>
          {standards.map((standard) => (
            <View key={standard.id} style={styles.standardCard}>
              <View style={styles.standardHeader}>
                <ThemedText style={styles.standardTitle}>{standard.name}</ThemedText>
                <View style={styles.standardBadge}>
                  <ThemedText style={styles.standardBadgeText}>
                    {standard.category} • {standard.gender}
                  </ThemedText>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeTableContainer}>
                <View style={styles.sizeTable}>
                  {Object.entries(standard.size_categories).map(([size, measurements]) => (
                    <View key={size} style={styles.sizeColumn}>
                      <View style={styles.sizeHeader}>
                        <ThemedText style={styles.sizeHeaderText}>{size}</ThemedText>
                      </View>
                      {Object.entries(measurements).map(([key, value]) => (
                        <View key={key} style={styles.measurementRow}>
                          <ThemedText style={styles.measurementKey}>{key}:</ThemedText>
                          <ThemedText style={styles.measurementValue}>{value}"</ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateIcon}>📊</ThemedText>
          <ThemedText style={styles.noData}>No size charts available</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>Try adjusting your filters</ThemedText>
        </View>
      )}
    </View>
  );

  const renderMeasurements = () => (
    <View style={styles.tabContent}>
      <ThemedText style={styles.sectionTitle}>Get Your Size Recommendation</ThemedText>
      
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Category:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  selectedCategory === cat && styles.filterChipActive
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive
                ]}>
                  {cat === 'custom' ? 'Custom' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Gender:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {genders.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.filterChip,
                  selectedGender === gender && styles.filterChipActive
                ]}
                onPress={() => setSelectedGender(gender)}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  selectedGender === gender && styles.filterChipTextActive
                ]}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedCategory !== 'all' && (
          <View style={styles.selectedCategoryInfo}>
            <ThemedText style={styles.selectedCategoryText}>
              📍 Selected: <Text style={styles.highlightText}>{selectedCategory}</Text> • <Text style={styles.highlightText}>{selectedGender}</Text>
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.measurementForm}>
        <View style={styles.formHeader}>
          <ThemedText style={styles.formTitle}>Enter Your Measurements</ThemedText>
          <ThemedText style={styles.formSubtitle}>All measurements should be in inches</ThemedText>
        </View>
        
        {/* Category Info Section */}
        {selectedCategory !== 'all' && selectedCategory !== 'custom' && (
          <View style={styles.categoryInfo}>
            <ThemedText style={styles.categoryInfoText}>
              📏 <Text style={styles.highlightText}>{selectedCategory.toUpperCase()}</Text> requires these measurements:
            </ThemedText>
            <View style={styles.measurementTagsContainer}>
              {Object.keys(measurements).map((field) => (
                <View key={field} style={styles.measurementTagContainer}>
                  <ThemedText style={styles.measurementTag}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText style={styles.categoryDescription}>
              {getCategoryDescription(selectedCategory)}
            </ThemedText>
            <ThemedText style={styles.measurementCount}>
              {Object.keys(measurements).length} measurement fields available
            </ThemedText>
          </View>
        )}
        
        {(selectedCategory === 'all' || selectedGender === 'all') && (
          <View style={styles.warningContainer}>
            <ThemedText style={styles.warningIcon}>⚠️</ThemedText>
            <ThemedText style={styles.warningText}>
              Please select a specific category and gender to get size recommendations
            </ThemedText>
          </View>
        )}
        
        <View style={styles.inputGrid}>
          {selectedCategory !== 'all' && selectedCategory !== 'custom' ? (
            // Dynamic measurement fields based on selected category
            (() => {
              const measurementEntries = Object.entries(measurements);
              const rows = [];
              
              // Create rows with 2 fields each
              for (let i = 0; i < measurementEntries.length; i += 2) {
                const firstField = measurementEntries[i];
                const secondField = measurementEntries[i + 1];
                
                rows.push(
                  <View key={`row-${i}`} style={styles.inputRow}>
                    {/* First field */}
                    <View style={styles.inputGroup}>
                      <ThemedText style={styles.inputLabel}>
                        {firstField[0].charAt(0).toUpperCase() + firstField[0].slice(1)}
                      </ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={firstField[1]}
                        onChangeText={(text) => setMeasurements({...measurements, [firstField[0]]: text})}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                      <ThemedText style={styles.inputUnit}>inches</ThemedText>
                    </View>
                    
                    {/* Second field (if exists) */}
                    {secondField && (
                      <View style={styles.inputGroup}>
                        <ThemedText style={styles.inputLabel}>
                          {secondField[0].charAt(0).toUpperCase() + secondField[0].slice(1)}
                        </ThemedText>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          value={secondField[1]}
                          onChangeText={(text) => setMeasurements({...measurements, [secondField[0]]: text})}
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                        />
                        <ThemedText style={styles.inputUnit}>inches</ThemedText>
                      </View>
                    )}
                  </View>
                );
              }
              
              return rows;
            })()
          ) : (
            // Show generic message when no specific category is selected
            <View style={styles.warningContainer}>
              <ThemedText style={styles.warningIcon}>📏</ThemedText>
              <ThemedText style={styles.warningText}>
                Select a specific category to see relevant measurements
              </ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton, 
            (loading || selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all') && styles.submitButtonDisabled
          ]}
          onPress={handleMeasurementsSubmit}
          disabled={loading || selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all'}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all' ? (
            <ThemedText style={styles.submitButtonText}>Select Category & Gender</ThemedText>
          ) : (
            <ThemedText style={styles.submitButtonText}>Get Size Recommendation</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCustomCategoryModal = () => (
    <Modal
      visible={showCustomCategoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCustomCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Custom Category</ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomCategoryModal(false)}
            >
              <ThemedText style={styles.closeButtonText}>×</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <ThemedText style={styles.modalSubtitle}>
              Specify the type of clothing you're looking for
            </ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Clothing Type</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., blazer, jumpsuit, romper..."
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCustomCategoryModal(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !customCategory.trim() && styles.saveButtonDisabled]}
              onPress={handleCustomCategorySubmit}
              disabled={!customCategory.trim()}
            >
              <ThemedText style={styles.saveButtonText}>Use Category</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateIcon}>🔐</ThemedText>
          <ThemedText style={styles.title}>Garment Sizing</ThemedText>
          <ThemedText style={styles.noData}>Please log in to access the sizing system.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Garment Sizing</ThemedText>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            Recommendations
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'charts' && styles.activeTab]}
          onPress={() => setActiveTab('charts')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'charts' && styles.activeTabText]}>
            Size Charts
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'measurements' && styles.activeTab]}
          onPress={() => setActiveTab('measurements')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'measurements' && styles.activeTabText]}>
            Measurements
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'recommendations' && renderRecommendations()}
        {activeTab === 'charts' && renderSizeCharts()}
        {activeTab === 'measurements' && renderMeasurements()}
      </ScrollView>

      {/* Custom Category Modal */}
      {renderCustomCategoryModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.light,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: Colors.primary,
    textShadowColor: 'rgba(1, 77, 64, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: Colors.background.light,
    borderRadius: 15,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: Colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    color: Colors.primary,
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: 25,
    backgroundColor: Colors.background.light,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 15,
    minWidth: 80,
    color: Colors.primary,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.background.light,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterChipText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  selectedCategoryInfo: {
    backgroundColor: Colors.border.gold,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  selectedCategoryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: Colors.background.card,
    padding: 22,
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
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceBadgeText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationSize: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  highlightText: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  standardCard: {
    backgroundColor: Colors.background.card,
    padding: 22,
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
    alignItems: 'center',
    marginBottom: 18,
  },
  standardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
  },
  standardBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  standardBadgeText: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: '600',
  },
  sizeTableContainer: {
    marginHorizontal: -22,
    paddingHorizontal: 22,
  },
  sizeTable: {
    flexDirection: 'row',
  },
  sizeColumn: {
    minWidth: 90,
    marginRight: 20,
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sizeHeader: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  sizeHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.text.inverse,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  measurementKey: {
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  measurementValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  measurementForm: {
    backgroundColor: Colors.background.card,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  inputGrid: {
    flexDirection: 'column',
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    width: (width - 90) / 2,
    marginRight: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border.medium,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.background.light,
    textAlign: 'center',
    color: Colors.text.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputUnit: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.text.secondary,
    fontStyle: 'italic',
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
  emptyStateSubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 8,
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
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    width: width * 0.85,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
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
  debugInfo: {
    backgroundColor: Colors.background.light,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  debugText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  categoryInfo: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  categoryInfoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  measurementTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
  },
  measurementTagContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    marginBottom: 8,
  },
  measurementTag: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  measurementCount: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 10,
  },
});
