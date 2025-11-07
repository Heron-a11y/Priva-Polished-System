import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  RefreshControl,
} from 'react-native';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import { MeasurementData, measurementsToStrings, normalizeMeasurementData, mapMeasurementsToCategory } from '../../types/measurements';

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
  const [allStandards, setAllStandards] = useState<SizingStandard[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination state for recommendations
  const [recommendationsLoadingMore, setRecommendationsLoadingMore] = useState(false);
  const [recommendationsCurrentPage, setRecommendationsCurrentPage] = useState(1);
  const [recommendationsHasMorePages, setRecommendationsHasMorePages] = useState(true);
  const [recommendationsRefreshing, setRecommendationsRefreshing] = useState(false);
  
  // Pagination state for size charts
  const [chartsLoadingMore, setChartsLoadingMore] = useState(false);
  const [chartsCurrentPage, setChartsCurrentPage] = useState(1);
  const [chartsHasMorePages, setChartsHasMorePages] = useState(true);
  const [chartsRefreshing, setChartsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isGenderExpanded, setIsGenderExpanded] = useState(false);
  const [isMeasurementsCategoryExpanded, setIsMeasurementsCategoryExpanded] = useState(false);
  const [isMeasurementsGenderExpanded, setIsMeasurementsGenderExpanded] = useState(false);
  
  // Measurement form state
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [latestMeasurements, setLatestMeasurements] = useState<MeasurementData | null>(null);
  const [loadingLatestMeasurements, setLoadingLatestMeasurements] = useState(false);
  const [measurementsPopulated, setMeasurementsPopulated] = useState(false);

  // Update measurements when category changes
  const updateMeasurementsForCategory = (newCategory: string) => {
    console.log('🔄 updateMeasurementsForCategory called with:', newCategory);
    console.log('📊 Current measurements before update:', measurements);
    console.log('📊 Measurements populated flag:', measurementsPopulated);
    
    if (newCategory === 'all' || newCategory === 'custom') {
      // Reset to empty measurements for 'all' or 'custom'
      console.log('🔄 Resetting measurements for generic category');
      setMeasurements({});
      setMeasurementsPopulated(false);
    } else {
      // If measurements were just populated, don't override them
      if (measurementsPopulated) {
        console.log('🔄 Skipping category update - measurements already populated');
        return;
      }
      
      // Get category-specific measurements
      const categoryMeasurements = getDefaultMeasurements(newCategory);
      console.log('🔄 Setting category measurements for', newCategory, ':', categoryMeasurements);
      
      // Preserve existing measurements that have values, only set empty fields
      const updatedMeasurements = { ...categoryMeasurements };
      Object.keys(measurements).forEach(key => {
        if (measurements[key] && measurements[key].trim() !== '') {
          updatedMeasurements[key] = measurements[key];
        }
      });
      
      // Ensure all required fields are present
      const requiredFields = getRequiredFieldsForCategory(newCategory);
      requiredFields.forEach(field => {
        if (!updatedMeasurements[field]) {
          updatedMeasurements[field] = '';
        }
      });
      
      console.log('🔄 Preserving existing measurements:', updatedMeasurements);
      setMeasurements(updatedMeasurements);
    }
  };

  // Handle category selection with dynamic filtering
  const handleCategorySelect = (category: string) => {
    console.log('🎯 Category selected:', category);
    
    if (category === 'custom') {
      setShowCustomCategoryModal(true);
      console.log('📝 Opening custom category modal');
    } else {
      console.log('🔄 Setting predefined category:', category);
      setSelectedCategory(category);
      setCustomCategory('');
      updateMeasurementsForCategory(category);
      
      // If a specific category is selected, filter available genders
      if (category !== 'all') {
        const availableGenders = getAvailableGenders(category);
        // If current selected gender is not available for this category, reset to 'all'
        if (!availableGenders.includes(selectedGender) && selectedGender !== 'all') {
          setSelectedGender('all');
        }
      }
    }
  };

  // Handle gender selection with dynamic filtering
  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
    
    // If a specific gender is selected, filter available categories
    if (gender !== 'all') {
      const availableCategories = getAvailableCategories(gender);
      // If current selected category is not available for this gender, reset to 'all'
      if (!availableCategories.includes(selectedCategory) && selectedCategory !== 'all') {
        setSelectedCategory('all');
        updateMeasurementsForCategory('all');
      }
    }
  };

  const categories = ['all', 'shirts', 'pants', 'dresses', 'jackets', 'skirts', 'shoes', 'hats', 'suits', 'activewear', 'custom'];
  const genders = ['all', 'male', 'female', 'unisex'];

  // Dynamic availability mappings based on actual size chart data
  const getDynamicCategoryGenderAvailability = () => {
    const availability: Record<string, string[]> = {};
    
    // Initialize with all categories
    categories.forEach(category => {
      if (category !== 'all') {
        availability[category] = [];
      }
    });
    
    // Populate based on actual size chart data
    allStandards.forEach(standard => {
      if (standard.category && standard.gender) {
        if (!availability[standard.category]) {
          availability[standard.category] = [];
        }
        if (!availability[standard.category].includes(standard.gender)) {
          availability[standard.category].push(standard.gender);
        }
      }
    });
    
    return availability;
  };

  const getDynamicGenderCategoryAvailability = () => {
    const availability: Record<string, string[]> = {};
    
    // Initialize with all genders
    genders.forEach(gender => {
      if (gender !== 'all') {
        availability[gender] = [];
      }
    });
    
    // Populate based on actual size chart data
    allStandards.forEach(standard => {
      if (standard.category && standard.gender) {
        if (!availability[standard.gender]) {
          availability[standard.gender] = [];
        }
        if (!availability[standard.gender].includes(standard.category)) {
          availability[standard.gender].push(standard.category);
        }
      }
    });
    
    return availability;
  };

  // Get current dynamic availability mappings
  const categoryGenderAvailability = getDynamicCategoryGenderAvailability();
  const genderCategoryAvailability = getDynamicGenderCategoryAvailability();

  // Get available categories based on selected gender
  const getAvailableCategories = (gender: string) => {
    if (gender === 'all') {
      // Return all categories that have at least one size chart available
      return categories.filter(cat => 
        cat !== 'all' && allStandards.some(standard => standard.category === cat)
      );
    }
    
    // Return categories that have size charts for this specific gender
    const availableCategories = allStandards
      .filter(standard => standard.gender === gender)
      .map(standard => standard.category)
      .filter((category, index, array) => array.indexOf(category) === index); // Remove duplicates
    
    return availableCategories;
  };

  // Get available genders based on selected category
  const getAvailableGenders = (category: string) => {
    if (category === 'all') {
      // Return all genders that have at least one size chart available
      return genders.filter(gender => 
        gender !== 'all' && allStandards.some(standard => standard.gender === gender)
      );
    }
    
    // Return genders that have size charts for this specific category
    const availableGenders = allStandards
      .filter(standard => standard.category === category)
      .map(standard => standard.gender)
      .filter((gender, index, array) => array.indexOf(gender) === index); // Remove duplicates
    
    return availableGenders;
  };

  // Check if a category-gender combination is available
  const isCombinationAvailable = (category: string, gender: string) => {
    if (category === 'all' || gender === 'all') return true;
    
    // Check if there are actual size charts available for this combination
    const hasSizeCharts = allStandards.some(standard => 
      standard.category === category && standard.gender === gender
    );
    
    return hasSizeCharts;
  };

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'all': return 'apps';
      case 'shirts': return 'shirt';
      case 'pants': return 'body';
      case 'dresses': return 'woman';
      case 'jackets': return 'snow';
      case 'skirts': return 'ellipse';
      case 'shoes': return 'footsteps';
      case 'hats': return 'ellipse-outline';
      case 'suits': return 'business';
      case 'activewear': return 'fitness';
      case 'custom': return 'create';
      default: return 'shirt';
    }
  };

  // Get gender icon
  const getGenderIcon = (gender: string): string => {
    switch (gender) {
      case 'all': return 'people';
      case 'male': return 'man';
      case 'female': return 'woman';
      case 'unisex': return 'person';
      default: return 'person';
    }
  };

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

  // Get required fields for a specific category
  const getRequiredFieldsForCategory = (category: string): string[] => {
    switch (category) {
      case 'shirts':
        return ['chest', 'waist', 'length', 'shoulder', 'sleeve'];
      case 'pants':
        return ['waist', 'hips', 'length', 'inseam', 'thigh'];
      case 'dresses':
        return ['chest', 'waist', 'hips', 'length', 'shoulder'];
      case 'jackets':
        return ['chest', 'waist', 'length', 'shoulder', 'sleeve'];
      case 'skirts':
        return ['waist', 'hips', 'length'];
      case 'shoes':
        return ['foot_length'];
      case 'hats':
        return ['head_circumference'];
      case 'suits':
        return ['chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve', 'inseam'];
      case 'activewear':
        return ['chest', 'waist', 'hips', 'length'];
      default:
        // For custom categories, require basic measurements
        return ['chest', 'waist', 'length'];
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
        return 'Select a specific category to see relevant measurements. Custom categories may require basic measurements.';
    }
  };

  // Load all size charts on component mount for dynamic filtering
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadAllSizeCharts();
      loadLatestMeasurements();
    }
  }, [isAuthenticated, isLoading]);

  // Load latest measurements for the user
  const loadLatestMeasurements = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoadingLatestMeasurements(true);
      console.log('🔄 Loading latest measurements...');
      const response = await apiService.getLatestMeasurements();
      console.log('🔍 API Response:', response);
      if (response.success && response.data) {
        console.log('✅ Latest measurements loaded:', response.data);
        console.log('📊 Available fields:', Object.keys(response.data));
        
        // Handle nested measurements structure
        const measurementsData = response.data.measurements || response.data;
        console.log('📏 Nested measurements:', measurementsData);
        console.log('📊 Measurement fields:', Object.keys(measurementsData));
        
        setLatestMeasurements(response.data);
      } else {
        console.log('ℹ️ No latest measurements found');
        setLatestMeasurements(null);
      }
    } catch (error) {
      console.error('❌ Error loading latest measurements:', error);
      setLatestMeasurements(null);
    } finally {
      setLoadingLatestMeasurements(false);
    }
  };

  // Use latest measurements to populate current form
  const useLatestMeasurements = () => {
    try {
      if (!latestMeasurements) {
        Alert.alert('No Latest Measurements', 'No previous measurements found. Please enter your measurements manually.');
        return;
      }

      if (selectedCategory === 'all' || selectedCategory === 'custom') {
        Alert.alert('Select Category', 'Please select a specific category first to use latest measurements.');
        return;
      }

      // Validate measurements data
      if (typeof latestMeasurements !== 'object' || Array.isArray(latestMeasurements)) {
        console.error('❌ Invalid measurements data type:', typeof latestMeasurements);
        Alert.alert('Error', 'Invalid measurement data. Please try again.');
        return;
      }

    // Map API measurements to category-specific form fields with intelligent calculations
    console.log('🔄 Mapping measurements for category:', selectedCategory);
    console.log('📊 Available measurements:', latestMeasurements);
    
    // Extract measurements from the nested structure
    const actualMeasurements = latestMeasurements.measurements || latestMeasurements;
    console.log('📏 Extracted measurements:', actualMeasurements);
    
    // Ensure we have a proper measurements object
    let newMeasurements: Record<string, string> = {};
    if (typeof actualMeasurements === 'object' && actualMeasurements !== null && !Array.isArray(actualMeasurements)) {
      console.log('📏 Base measurements - Height:', actualMeasurements.height, 'Chest:', actualMeasurements.chest, 'Waist:', actualMeasurements.waist);
      console.log('📏 Unit system from API:', latestMeasurements.unit_system);
      newMeasurements = mapMeasurementsToCategory(actualMeasurements, selectedCategory, latestMeasurements.unit_system?.toString());
    } else {
      console.error('❌ Invalid measurements structure:', actualMeasurements);
      Alert.alert('Error', 'Invalid measurement data structure. Please try again.');
      return;
    }
    
    // Ensure all required fields for the category are present
    const requiredFields = getRequiredFieldsForCategory(selectedCategory);
    const completeMeasurements = { ...newMeasurements };
    
    // Add any missing required fields with empty values
    requiredFields.forEach(field => {
      if (!completeMeasurements[field]) {
        completeMeasurements[field] = '';
      }
    });
    
    console.log('🧮 Calculated measurements for', selectedCategory, ':', completeMeasurements);
    console.log('📐 Calculation details:');
    Object.entries(completeMeasurements).forEach(([field, value]) => {
      console.log(`  ${field}: ${value}cm`);
    });
    
    setMeasurements(completeMeasurements);
    setMeasurementsPopulated(true); // Mark measurements as populated
    
    // Show success message with calculation details
    const filledFields = Object.keys(completeMeasurements).filter(key => 
      completeMeasurements[key] && completeMeasurements[key].trim() !== ''
    );
    
    // Determine the original unit system for the message
    const unitSystemStr = latestMeasurements.unit_system?.toString() || '';
    const isInches = unitSystemStr === 'inches';
    const unitLabel = isInches ? 'inches' : 'cm';
    
    const calculationDetails = filledFields.map(field => {
      const value = completeMeasurements[field];
      return `${field}: ${value}${unitLabel}`;
    }).join('\n');
    
    const unitMessage = isInches ? 
      '\n📏 Applied with proper allowances (in inches)' : 
      '\n📏 Applied with proper allowances (in cm)';
    
      Alert.alert(
        'Smart Measurements Applied! 🧮', 
        `Intelligent calculations completed for ${selectedCategory}:\n\n${calculationDetails}${unitMessage}\n\n✨ All measurements include proper allowances for comfortable fit!`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ Error in useLatestMeasurements:', error);
      Alert.alert(
        'Error', 
        'Failed to apply latest measurements. Please try again or enter measurements manually.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (activeTab === 'recommendations') {
        loadRecommendations(1, true);
      } else if (activeTab === 'charts') {
        loadSizeCharts(1, true);
      }
    }
  }, [activeTab, isAuthenticated, isLoading, loadRecommendations, loadSizeCharts]);

  // Separate effect for category/gender changes when on charts tab
  useEffect(() => {
    if (!isLoading && isAuthenticated && activeTab === 'charts') {
      // Add a small delay to prevent rapid successive calls
      const timer = setTimeout(() => {
        loadSizeCharts(1, true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, selectedGender, isLoading, isAuthenticated, activeTab, loadSizeCharts]);

  // Effect to update measurements when category changes
  useEffect(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'custom') {
      updateMeasurementsForCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // Debug effect to log measurements changes
  useEffect(() => {
    console.log('📊 Measurements state changed:', measurements);
  }, [measurements]);

  const loadRecommendations = useCallback(async (page = 1, reset = false) => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please log in to view size recommendations');
      return;
    }
    
    if (reset) {
      setLoading(true);
      setRecommendationsCurrentPage(1);
      setRecommendationsHasMorePages(true);
    } else {
      setRecommendationsLoadingMore(true);
    }
    
    try {
      const response = await apiService.getSizeRecommendations(page, 10);
      if (response.success) {
        const newRecommendations = response.data || [];
        
        console.log(`[Recommendations] Page ${page}, Received ${newRecommendations.length} items, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        if (reset) {
          setRecommendations(newRecommendations);
        } else {
          // Deduplicate recommendations by id
          setRecommendations(prev => {
            const existingIds = new Set(prev.map(rec => rec.id));
            const uniqueNewRecommendations = newRecommendations.filter((rec: SizeRecommendation) => !existingIds.has(rec.id));
            return [...prev, ...uniqueNewRecommendations];
          });
        }
        
        setRecommendationsHasMorePages(response.pagination?.has_more_pages || false);
        setRecommendationsCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      if (reset) {
        Alert.alert('Error', 'Failed to load size recommendations');
      }
    } finally {
      setLoading(false);
      setRecommendationsLoadingMore(false);
      setRecommendationsRefreshing(false);
    }
  }, [isAuthenticated]);

  // Load all available size charts to determine dynamic filtering
  const loadAllSizeCharts = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      console.log('🔄 Loading all available size charts for dynamic filtering...');
      // Load first page with a larger per_page to get all standards for filtering
      const response = await apiService.getSizeCharts('all', 'all', 1, 100);
      if (response.success) {
        const allData = response.data || [];
        console.log('✅ All size charts loaded:', allData.length, 'standards found');
        setAllStandards(allData);
      }
    } catch (error) {
      console.error('❌ Error loading all size charts:', error);
    }
  };

  const loadSizeCharts = useCallback(async (page = 1, reset = false) => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please log in to view size charts');
      return;
    }
    
    if (reset) {
      setLoading(true);
      setChartsCurrentPage(1);
      setChartsHasMorePages(true);
    } else {
      setChartsLoadingMore(true);
    }
    
    try {
      // Handle "ALL" options and custom categories
      const category = selectedCategory === 'all' ? 'all' : selectedCategory;
      const gender = selectedGender === 'all' ? 'all' : selectedGender;
      
      console.log('🔄 Loading size charts with category:', category, 'gender:', gender, 'page:', page);
      console.log('📊 Current state - selectedCategory:', selectedCategory, 'selectedGender:', selectedGender);
      
      const response = await apiService.getSizeCharts(category, gender, page, 10);
      if (response.success) {
        const newStandards = response.data || [];
        
        console.log(`[SizeCharts] Page ${page}, Received ${newStandards.length} items, Has more: ${response.pagination?.has_more_pages}, Total: ${response.pagination?.total}`);
        
        if (reset) {
          setStandards(newStandards);
        } else {
          // Deduplicate standards by id
          setStandards(prev => {
            const existingIds = new Set(prev.map(std => std.id));
            const uniqueNewStandards = newStandards.filter((std: SizingStandard) => !existingIds.has(std.id));
            return [...prev, ...uniqueNewStandards];
          });
        }
        
        setChartsHasMorePages(response.pagination?.has_more_pages || false);
        setChartsCurrentPage(page);
      } else {
        console.log('❌ API response not successful:', response);
      }
    } catch (error) {
      console.error('❌ Error loading size charts:', error);
      if (reset) {
        return;
      }
    } finally {
      setLoading(false);
      setChartsLoadingMore(false);
      setChartsRefreshing(false);
    }
  }, [isAuthenticated, selectedCategory, selectedGender]);


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

    // Validate measurements based on selected category
    const requiredFields = getRequiredFieldsForCategory(selectedCategory);
    const missingFields = requiredFields.filter(field => !measurements[field] || measurements[field].trim() === '');
    
    if (missingFields.length > 0) {
      const missingFieldNames = missingFields.map(field => field.charAt(0).toUpperCase() + field.slice(1)).join(', ');
      Alert.alert('Missing Measurements', `Please fill in the following required measurements for ${selectedCategory}: ${missingFieldNames}`);
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert measurements to numbers for API
      const numericMeasurements: Record<string, number> = {};
      Object.entries(measurements).forEach(([key, value]) => {
        numericMeasurements[key] = parseFloat(value);
      });
      
      // Ensure chest field is always present for API compatibility
      if (!numericMeasurements.hasOwnProperty('chest')) {
        numericMeasurements.chest = 0;
      }
      
      // Debug logging
      console.log('🔍 Debug - Measurements being sent to API:');
      console.log('📏 Original measurements:', measurements);
      console.log('🔢 Numeric measurements:', numericMeasurements);
      console.log('📊 Category:', selectedCategory);
      console.log('👤 Gender:', selectedGender);
      console.log('✅ Required fields for this category:', requiredFields);
      console.log('✅ All required fields are filled:', requiredFields.every(field => measurements[field] && measurements[field].trim() !== ''));
      
      const response = await apiService.matchMeasurements({
        category: selectedCategory,
        gender: selectedGender,
        measurements: numericMeasurements
      });

      if (response.success) {
        // Set success state for visual feedback
        setIsSuccess(true);
        
        // Enhanced success feedback
        Alert.alert(
          '🎉 Size Recommendation Successful!',
          `Your size recommendation has been processed successfully!\n\n` +
          `📏 **Recommended Size:** ${response.data.recommended_size}\n` +
          `🎯 **Confidence Level:** ${(response.data.confidence_score * 100).toFixed(0)}%\n` +
          `👕 **Category:** ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}\n` +
          `👤 **Gender:** ${selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)}\n\n` +
          `Your measurements have been saved and you can view your recommendations in the Recommendations tab.`,
          [
            {
              text: 'View Recommendations',
              onPress: () => {
                setActiveTab('recommendations');
                loadRecommendations(1, true);
              }
            },
            {
              text: 'Continue',
              style: 'default'
            }
          ]
        );
        
        // Reset form
        setMeasurements(getDefaultMeasurements(selectedCategory));
        // Refresh recommendations
        loadRecommendations(1, true);
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          setIsSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error matching measurements:', error);
      Alert.alert('Error', 'Failed to get size recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreRecommendations = useCallback(() => {
    if (!recommendationsLoadingMore && recommendationsHasMorePages) {
      loadRecommendations(recommendationsCurrentPage + 1, false);
    }
  }, [recommendationsLoadingMore, recommendationsHasMorePages, recommendationsCurrentPage, loadRecommendations]);

  const onRefreshRecommendations = useCallback(() => {
    setRecommendationsRefreshing(true);
    loadRecommendations(1, true).finally(() => setRecommendationsRefreshing(false));
  }, [loadRecommendations]);

  const renderRecommendationCard = useCallback(({ item: rec }: { item: SizeRecommendation }) => (
    <View style={styles.recommendationCard}>
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
  ), []);

  const renderStandardCard = useCallback(({ item: standard }: { item: SizingStandard }) => (
    <View style={styles.standardCard}>
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
  ), []);

  const renderRecommendations = () => (
    <View style={styles.tabContent}>
      {loading && recommendations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendationCard}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          ListHeaderComponent={
            <ThemedText style={styles.sectionTitle}>Your Size Recommendations</ThemedText>
          }
          onEndReached={loadMoreRecommendations}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={recommendationsRefreshing}
              onRefresh={onRefreshRecommendations}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <ThemedText style={styles.emptyStateIcon}>📏</ThemedText>
              <ThemedText style={styles.noData}>No size recommendations yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Submit your measurements to get started!</ThemedText>
            </View>
          }
          ListFooterComponent={
            recommendationsLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <ThemedText style={styles.loadMoreText}>Loading more recommendations...</ThemedText>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );

   const renderSizeCharts = () => {
     // Get available options based on current selections
     const availableCategories = selectedGender === 'all' 
       ? categories.filter(cat => cat !== 'all') // Remove 'all' from the list
       : getAvailableCategories(selectedGender);
     
     const availableGenders = selectedCategory === 'all'
       ? genders.filter(gender => gender !== 'all')
       : getAvailableGenders(selectedCategory);

     const renderListHeader = () => (
       <View style={styles.filterContainer}>
         {/* Category Selection - Collapsible */}
         <View style={styles.collapsibleSection}>
           <TouchableOpacity 
             style={styles.collapsibleHeader}
             onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}
           >
             <View style={styles.collapsibleHeaderContent}>
               <ThemedText style={styles.filterLabel}>Category:</ThemedText>
               <View style={styles.selectedValueContainer}>
                 <ThemedText style={styles.selectedValue}>
                   {selectedCategory === 'all' ? 'All Categories' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                 </ThemedText>
                 <Ionicons 
                   name={isCategoryExpanded ? "chevron-up" : "chevron-down"} 
                   size={20} 
                   color={Colors.text.secondary} 
                 />
               </View>
             </View>
           </TouchableOpacity>
           
           {isCategoryExpanded && (
             <View style={styles.collapsibleContent}>
               <View style={styles.optionsGrid}>
                 {availableCategories.map((cat) => {
                   const isAvailable = isCombinationAvailable(cat, selectedGender);
                   const isSelected = selectedCategory === cat;
                   
                   return (
                     <TouchableOpacity
                       key={cat}
                       style={[
                         styles.filterChip,
                         isSelected && styles.filterChipActive,
                         !isAvailable && styles.filterChipDisabled
                       ]}
                       onPress={() => isAvailable && handleCategorySelect(cat)}
                       disabled={!isAvailable}
                     >
                       <Ionicons 
                         name={getCategoryIcon(cat) as any} 
                         size={16} 
                         color={
                           isSelected ? Colors.text.inverse : 
                           !isAvailable ? Colors.text.muted : 
                           Colors.text.secondary
                         }
                         style={styles.chipIcon}
                       />
                       <ThemedText style={[
                         styles.filterChipText,
                         isSelected && styles.filterChipTextActive,
                         !isAvailable && styles.filterChipTextDisabled
                       ]}>
                         {cat === 'custom' ? 'Custom' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                       </ThemedText>
                     </TouchableOpacity>
                   );
                 })}
               </View>
             </View>
           )}
         </View>
         
         {/* Gender Selection - Collapsible */}
         <View style={styles.collapsibleSection}>
           <TouchableOpacity 
             style={styles.collapsibleHeader}
             onPress={() => setIsGenderExpanded(!isGenderExpanded)}
           >
             <View style={styles.collapsibleHeaderContent}>
               <ThemedText style={styles.filterLabel}>Gender:</ThemedText>
               <View style={styles.selectedValueContainer}>
                 <ThemedText style={styles.selectedValue}>
                   {selectedGender === 'all' ? 'All Genders' : selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)}
                 </ThemedText>
                 <Ionicons 
                   name={isGenderExpanded ? "chevron-up" : "chevron-down"} 
                   size={20} 
                   color={Colors.text.secondary} 
                 />
               </View>
             </View>
           </TouchableOpacity>
           
           {isGenderExpanded && (
             <View style={styles.collapsibleContent}>
               <View style={styles.optionsGrid}>
                 {availableGenders.map((gender) => {
                   const isAvailable = isCombinationAvailable(selectedCategory, gender);
                   const isSelected = selectedGender === gender;
                   
                   return (
                     <TouchableOpacity
                       key={gender}
                       style={[
                         styles.filterChip,
                         isSelected && styles.filterChipActive,
                         !isAvailable && styles.filterChipDisabled
                       ]}
                       onPress={() => isAvailable && handleGenderSelect(gender)}
                       disabled={!isAvailable}
                     >
                       <Ionicons 
                         name={getGenderIcon(gender) as any} 
                         size={16} 
                         color={
                           isSelected ? Colors.text.inverse : 
                           !isAvailable ? Colors.text.muted : 
                           Colors.text.secondary
                         }
                         style={styles.chipIcon}
                       />
                       <ThemedText style={[
                         styles.filterChipText,
                         isSelected && styles.filterChipTextActive,
                         !isAvailable && styles.filterChipTextDisabled
                       ]}>
                         {gender.charAt(0).toUpperCase() + gender.slice(1)}
                       </ThemedText>
                     </TouchableOpacity>
                   );
                 })}
               </View>
             </View>
           )}
         </View>

         {selectedCategory !== 'all' && (
           <View style={styles.selectedCategoryInfo}>
             <ThemedText style={styles.selectedCategoryText}>
               📍 Selected: <Text style={styles.highlightText}>{selectedCategory}</Text> • <Text style={styles.highlightText}>{selectedGender}</Text>
             </ThemedText>
           </View>
         )}
       </View>
     );

     return (
       <View style={styles.tabContent}>
         {loading && standards.length === 0 ? (
           <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color={Colors.secondary} />
             <ThemedText style={styles.loadingText}>Loading size charts...</ThemedText>
           </View>
         ) : (
           <FlatList
             data={standards}
             renderItem={renderStandardCard}
             keyExtractor={(item) => item.id.toString()}
             showsVerticalScrollIndicator={false}
             contentContainerStyle={styles.flatListContent}
             ListHeaderComponent={renderListHeader}
             onEndReached={() => {
               if (!chartsLoadingMore && chartsHasMorePages) {
                 loadSizeCharts(chartsCurrentPage + 1, false);
               }
             }}
             onEndReachedThreshold={0.5}
             refreshControl={
               <RefreshControl
                 refreshing={chartsRefreshing}
                 onRefresh={() => {
                   setChartsRefreshing(true);
                   loadSizeCharts(1, true).finally(() => setChartsRefreshing(false));
                 }}
                 colors={[Colors.primary]}
               />
             }
             ListEmptyComponent={
               <View style={styles.emptyStateContainer}>
                 <ThemedText style={styles.emptyStateIcon}>📊</ThemedText>
                 <ThemedText style={styles.noData}>No size charts available</ThemedText>
                 <ThemedText style={styles.emptyStateSubtext}>Try adjusting your filters</ThemedText>
               </View>
             }
             ListFooterComponent={
               chartsLoadingMore ? (
                 <View style={styles.loadMoreContainer}>
                   <ActivityIndicator size="small" color={Colors.primary} />
                   <ThemedText style={styles.loadMoreText}>Loading more size charts...</ThemedText>
                 </View>
               ) : null
             }
           />
         )}
       </View>
     );
   };

  const renderMeasurements = () => (
    <View style={styles.tabContent}>
      <ThemedText style={styles.sectionTitle}>Get Your Size Recommendation</ThemedText>
      
      <View style={styles.filterContainer}>
        {/* Category Selection - Collapsible */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setIsMeasurementsCategoryExpanded(!isMeasurementsCategoryExpanded)}
          >
            <View style={styles.collapsibleHeaderContent}>
              <ThemedText style={styles.filterLabel}>Category:</ThemedText>
              <View style={styles.selectedValueContainer}>
                <ThemedText style={styles.selectedValue}>
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                </ThemedText>
                <Ionicons 
                  name={isMeasurementsCategoryExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </View>
            </View>
          </TouchableOpacity>
          
          {isMeasurementsCategoryExpanded && (
            <View style={styles.collapsibleContent}>
              <View style={styles.optionsGrid}>
                {categories.map((cat) => {
                  const isAvailable = isCombinationAvailable(cat, selectedGender);
                  const isSelected = selectedCategory === cat;
                  
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipActive,
                        !isAvailable && styles.filterChipDisabled
                      ]}
                      onPress={() => isAvailable && handleCategorySelect(cat)}
                      disabled={!isAvailable}
                    >
                      <Ionicons 
                        name={getCategoryIcon(cat) as any} 
                        size={16} 
                        color={
                          isSelected ? Colors.text.inverse : 
                          !isAvailable ? Colors.text.muted : 
                          Colors.text.secondary
                        }
                        style={styles.chipIcon}
                      />
                      <ThemedText style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                        !isAvailable && styles.filterChipTextDisabled
                      ]}>
                        {cat === 'custom' ? 'Custom' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        
        {/* Gender Selection - Collapsible */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setIsMeasurementsGenderExpanded(!isMeasurementsGenderExpanded)}
          >
            <View style={styles.collapsibleHeaderContent}>
              <ThemedText style={styles.filterLabel}>Gender:</ThemedText>
              <View style={styles.selectedValueContainer}>
                <ThemedText style={styles.selectedValue}>
                  {selectedGender === 'all' ? 'All Genders' : selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)}
                </ThemedText>
                <Ionicons 
                  name={isMeasurementsGenderExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </View>
            </View>
          </TouchableOpacity>
          
          {isMeasurementsGenderExpanded && (
            <View style={styles.collapsibleContent}>
              <View style={styles.optionsGrid}>
                {genders.map((gender) => {
                  const isAvailable = isCombinationAvailable(selectedCategory, gender);
                  const isSelected = selectedGender === gender;
                  
                  return (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipActive,
                        !isAvailable && styles.filterChipDisabled
                      ]}
                      onPress={() => isAvailable && handleGenderSelect(gender)}
                      disabled={!isAvailable}
                    >
                      <Ionicons 
                        name={getGenderIcon(gender) as any} 
                        size={16} 
                        color={
                          isSelected ? Colors.text.inverse : 
                          !isAvailable ? Colors.text.muted : 
                          Colors.text.secondary
                        }
                        style={styles.chipIcon}
                      />
                      <ThemedText style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                        !isAvailable && styles.filterChipTextDisabled
                      ]}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
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

        {/* Use Latest Measurements Button */}
        {latestMeasurements && selectedCategory !== 'all' && selectedCategory !== 'custom' && (
          <View style={styles.latestMeasurementsContainer}>
            <TouchableOpacity
              style={styles.useLatestButton}
              onPress={useLatestMeasurements}
              disabled={loadingLatestMeasurements}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={Colors.primary} 
                style={styles.buttonIcon}
              />
              <ThemedText style={styles.useLatestButtonText}>
                {loadingLatestMeasurements ? 'Loading...' : 'Use Latest Measurements'}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.latestMeasurementsHint}>
              💡 Tap to auto-fill with your most recent measurements
            </ThemedText>
          </View>
        )}
        
        {/* Category Info Section */}
        {selectedCategory !== 'all' && selectedCategory !== 'custom' && (
          <View style={styles.categoryInfo}>
            <ThemedText style={styles.categoryInfoText}>
              📏 <Text style={styles.highlightText}>{selectedCategory.toUpperCase()}</Text> requires these measurements:
            </ThemedText>
            <View style={styles.measurementTagsContainer}>
              {getRequiredFieldsForCategory(selectedCategory).map((field) => (
                <View key={field} style={styles.requiredMeasurementTag}>
                  <ThemedText style={styles.requiredMeasurementTagText}>
                    {field.charAt(0).toUpperCase() + field.slice(1)} *
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText style={styles.categoryDescription}>
              {getCategoryDescription(selectedCategory)}
            </ThemedText>
            <ThemedText style={styles.measurementCount}>
              {getRequiredFieldsForCategory(selectedCategory).length} required measurement fields
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
              // Get required fields for the category and ensure they exist in measurements
              const requiredFields = getRequiredFieldsForCategory(selectedCategory);
              console.log('📋 Required fields for', selectedCategory, ':', requiredFields);
              console.log('📊 Current measurements state:', measurements);
              
              const measurementEntries = requiredFields.map(field => [
                field, 
                measurements[field] || ''
              ]);
              console.log('📝 Measurement entries to render:', measurementEntries);
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
                        {getRequiredFieldsForCategory(selectedCategory).includes(firstField[0]) && (
                          <Text style={styles.requiredAsterisk}> *</Text>
                        )}
                      </ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={firstField[1]}
                        onChangeText={(text) => {
                          setMeasurements({...measurements, [firstField[0]]: text});
                          if (measurementsPopulated) {
                            setMeasurementsPopulated(false);
                          }
                        }}
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
                          {getRequiredFieldsForCategory(selectedCategory).includes(secondField[0]) && (
                            <Text style={styles.requiredAsterisk}> *</Text>
                          )}
                        </ThemedText>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          value={secondField[1]}
                          onChangeText={(text) => {
                            setMeasurements({...measurements, [secondField[0]]: text});
                            if (measurementsPopulated) {
                              setMeasurementsPopulated(false);
                            }
                          }}
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                        />
                        <ThemedText style={styles.inputUnit}>inches</ThemedText>
                      </View>
                    )}
                  </View>
                );
              }
              
              return rows.length > 0 ? rows : (
                // Fallback: Show a message if no fields are rendered
                <View style={styles.warningContainer}>
                  <ThemedText style={styles.warningIcon}>⚠️</ThemedText>
                  <ThemedText style={styles.warningText}>
                    No measurement fields available for {selectedCategory}. Please try selecting a different category.
                  </ThemedText>
                </View>
              );
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
            (loading || selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all') && styles.submitButtonDisabled,
            isSuccess && styles.submitButtonSuccess
          ]}
          onPress={handleMeasurementsSubmit}
          disabled={loading || selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all'}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : isSuccess ? (
            <ThemedText style={styles.submitButtonText}>✅ Success! View Recommendations</ThemedText>
          ) : selectedCategory === 'all' || selectedCategory === 'custom' || selectedGender === 'all' ? (
            <ThemedText style={styles.submitButtonText}>Select Category & Gender</ThemedText>
          ) : (
            <ThemedText style={styles.submitButtonText}>Get Size Recommendation</ThemedText>
          )}
        </TouchableOpacity>

        {/* Success Message Display */}
        {isSuccess && (
          <View style={styles.successMessageContainer}>
            <ThemedText style={styles.successMessageIcon}>🎉</ThemedText>
            <ThemedText style={styles.successMessageTitle}>Size Recommendation Complete!</ThemedText>
            <ThemedText style={styles.successMessageText}>
              Your measurements have been successfully processed and saved. 
              You can now view your size recommendations in the Recommendations tab.
            </ThemedText>
            
            {/* Measurement Summary */}
            <View style={styles.measurementSummaryContainer}>
              <ThemedText style={styles.measurementSummaryTitle}>
                📏 Submitted Measurements:
              </ThemedText>
              <View style={styles.measurementSummaryGrid}>
                {Object.entries(measurements).map(([key, value]) => (
                  <View key={key} style={styles.measurementSummaryItem}>
                    <ThemedText style={styles.measurementSummaryLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </ThemedText>
                    <ThemedText style={styles.measurementSummaryValue}>
                      {value}" inches
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Quick Action Button */}
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                setActiveTab('recommendations');
                loadRecommendations();
              }}
            >
              <ThemedText style={styles.quickActionButtonText}>
                📋 View My Recommendations
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
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
    <KeyboardAvoidingWrapper style={styles.container} scrollEnabled={false}>
      <ThemedText style={styles.title}>Garment Sizing</ThemedText>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <ThemedText 
            style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}
            numberOfLines={1}
          >
            Recommendations
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'charts' && styles.activeTab]}
          onPress={() => setActiveTab('charts')}
        >
          <ThemedText 
            style={[styles.tabText, activeTab === 'charts' && styles.activeTabText]}
            numberOfLines={1}
          >
            Size Charts
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'measurements' && styles.activeTab]}
          onPress={() => setActiveTab('measurements')}
        >
          <ThemedText 
            style={[styles.tabText, activeTab === 'measurements' && styles.activeTabText]}
            numberOfLines={1}
          >
            Measurements
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'recommendations' && renderRecommendations()}
      {activeTab === 'charts' && renderSizeCharts()}
      {activeTab === 'measurements' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderMeasurements()}
        </ScrollView>
      )}

      {/* Custom Category Modal */}
      {renderCustomCategoryModal()}
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.light,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: Colors.primary,
    textShadowColor: 'rgba(1, 77, 64, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
    lineHeight: 38,
    includeFontPadding: false,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: Colors.background.light,
    borderRadius: 15,
    padding: 4,
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
    paddingVertical: 14,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 1,
    minHeight: 48,
    justifyContent: 'center',
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
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  activeTabText: {
    color: Colors.text.inverse,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
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
   scrollContainer: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
   },
   scrollContent: {
     paddingRight: 10,
   },
   scrollIndicator: {
     paddingLeft: 8,
     paddingRight: 4,
   },
   chipIcon: {
     marginRight: 6,
   },
   filterChip: {
     paddingHorizontal: 16,
     paddingVertical: 10,
     backgroundColor: Colors.background.light,
     borderRadius: 25,
     marginRight: 12,
     borderWidth: 1,
     borderColor: Colors.border.medium,
     flexDirection: 'row',
     alignItems: 'center',
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
  submitButtonSuccess: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  successMessageContainer: {
    backgroundColor: Colors.success,
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successMessageIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  successMessageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessageText: {
    fontSize: 14,
    color: Colors.text.inverse,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  measurementSummaryContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  measurementSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  measurementSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  measurementSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%', // Two items per row
    marginBottom: 8,
  },
  measurementSummaryLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  measurementSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  quickActionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  quickActionButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  requiredMeasurementTag: {
    backgroundColor: Colors.primary,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  requiredMeasurementTagText: {
    fontSize: 12,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  requiredAsterisk: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Collapsible Interface Styles
  collapsibleSection: {
    marginBottom: 16,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    padding: 16,
    backgroundColor: Colors.background.light,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  collapsibleContent: {
    padding: 16,
    backgroundColor: Colors.background.card,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.background.light,
    borderColor: Colors.border.light,
  },
  filterChipTextDisabled: {
    color: Colors.text.muted,
  },
  // Latest Measurements Button Styles
  latestMeasurementsContainer: {
    backgroundColor: Colors.background.light,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  useLatestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  useLatestButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  latestMeasurementsHint: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Pagination styles
  flatListContent: {
    paddingBottom: 20,
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

