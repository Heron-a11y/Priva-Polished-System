import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Switch,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { CLOTHING_TYPES, MEASUREMENT_FIELDS } from '../../../constants/ClothingTypes';
import apiService from '../../../services/api';
import { getLocalImageUrl } from '../../../utils/imageUrlHelper';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

interface CatalogItem {
  id: number;
  name: string;
  description?: string;
  clothing_type: string;
  category: 'formal_attire' | 'ph_traditional' | 'evening_party_wear' | 'wedding_bridal' | 'special';
  image_path?: string;
  measurements_required: string[];
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CatalogFormData {
  name: string;
  description: string;
  clothing_type: string;
  category: string;
  image: any; // For file upload
  measurements_required: string[];
  is_available: boolean;
  is_featured: boolean;
  sort_order: string;
  notes: string;
}

const CATEGORIES = {
  formal_attire: 'Formal Attire',
  ph_traditional: 'PH Traditional',
  evening_party_wear: 'Evening & Party',
  wedding_bridal: 'Wedding & Bridal',
  special: 'Popular'
};

const MEASUREMENT_OPTIONS = Object.keys(MEASUREMENT_FIELDS);

export default function CatalogManagementScreen() {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showFormCategoryDropdown, setShowFormCategoryDropdown] = useState(false);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    description: '',
    clothing_type: '',
    category: 'formal_attire',
    image: null,
    measurements_required: [],
    is_available: true,
    is_featured: false,
    sort_order: '0',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  useEffect(() => {
    // Test API connection first
    const testConnection = async () => {
      try {
        console.log('🧪 Testing API connection...');
        const testResult = await apiService.testConnection();
        console.log('🧪 Test result:', testResult);
        
        if (testResult.success) {
          console.log('✅ API connection successful, loading catalog items...');
          loadCatalogItems();
        } else {
          console.log('❌ API connection failed:', testResult.error);
          Alert.alert('Connection Error', 'Failed to connect to backend: ' + testResult.error);
        }
      } catch (error) {
        console.error('❌ Connection test error:', error);
        Alert.alert('Connection Error', 'Failed to test connection: ' + error.message);
      }
    };
    
    testConnection();
  }, []);

  // Refresh modal when catalogItems change
  useEffect(() => {
    if (showItemModal && selectedItem) {
      const updatedItem = catalogItems.find(item => item.id === selectedItem.id);
      if (updatedItem) {
        setSelectedItem(updatedItem);
      }
    }
  }, [catalogItems, showItemModal, selectedItem]);

  const loadCatalogItems = async (category?: string) => {
    try {
      setLoading(true);
      const currentCategory = category !== undefined ? category : selectedCategory;
      const params = {
        search: searchQuery,
        category: currentCategory === 'all' ? undefined : currentCategory
      };
      
      const response = await apiService.get('/admin/catalog', { params });
      
      
      if (response && response.success) {
        setCatalogItems(response.data);
      } else {
        // Show sample data for testing
        const sampleData = [
          {
            id: 1,
            name: 'Sample Suit',
            description: 'This is a sample item for testing',
            clothing_type: 'Suit',
            category: 'formal_attire',
            image_path: 'catalog/suit-katrina.webp',
            measurements_required: ['bust', 'waist', 'shoulder_width'],
            is_available: true,
            is_featured: false,
            sort_order: 1,
            notes: 'Sample item',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setCatalogItems(sampleData);
      }
    } catch (error) {
      console.error('Error loading catalog items:', error);
      
      // Show sample data for testing
      const sampleData = [
        {
          id: 1,
          name: 'Sample Suit',
          description: 'This is a sample item for testing',
          clothing_type: 'Suit',
          category: 'formal_attire',
          image_path: 'catalog/suit-katrina.webp',
          measurements_required: ['bust', 'waist', 'shoulder_width'],
          is_available: true,
          is_featured: false,
          sort_order: 1,
          notes: 'Sample item',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setCatalogItems(sampleData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCatalogItems();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Debounce search
    setTimeout(() => {
      loadCatalogItems();
    }, 500);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    loadCatalogItems(category);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setSelectedImage(null);
    setShowFormCategoryDropdown(false);
    setFormData({
      name: '',
      description: '',
      clothing_type: '',
      category: 'formal_attire',
      image: null,
      measurements_required: [],
      is_available: true,
      is_featured: false,
      sort_order: '0',
      notes: ''
    });
    setShowForm(true);
  };

  const handleEditItem = async (item: CatalogItem) => {
    try {
      console.log('🔄 Starting edit for item:', item.id, item.name);
      
      // First, try to fetch the latest item details from the server
      console.log('🔄 Fetching latest item details...');
      const response = await apiService.get(`/admin/catalog/${item.id}`);
      
      if (response && response.success) {
        console.log('✅ Latest item details fetched:', response.data);
        const latestItem = response.data;
        
        setEditingItem(latestItem);
        setSelectedImage(null);
        setShowFormCategoryDropdown(false);
        setFormData({
          name: latestItem.name,
          description: latestItem.description || '',
          clothing_type: latestItem.clothing_type,
          category: latestItem.category,
          image: null, // Will be handled separately for editing
          measurements_required: latestItem.measurements_required,
          is_available: latestItem.is_available,
          is_featured: latestItem.is_featured,
          sort_order: latestItem.sort_order.toString(),
          notes: latestItem.notes || ''
        });
        setShowForm(true);
      } else {
        console.log('⚠️ Failed to fetch latest details, using cached data');
        // Fallback to using the item data we have
        setEditingItem(item);
        setSelectedImage(null);
        setShowFormCategoryDropdown(false);
        setFormData({
          name: item.name,
          description: item.description || '',
          clothing_type: item.clothing_type,
          category: item.category,
          image: null,
          measurements_required: item.measurements_required,
          is_available: item.is_available,
          is_featured: item.is_featured,
          sort_order: item.sort_order.toString(),
          notes: item.notes || ''
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('❌ Error fetching item details for edit:', error);
      console.log('⚠️ Using cached data for editing');
      
      // Fallback to using the item data we have
      setEditingItem(item);
      setSelectedImage(null);
      setShowFormCategoryDropdown(false);
      setFormData({
        name: item.name,
        description: item.description || '',
        clothing_type: item.clothing_type,
        category: item.category,
        image: null,
        measurements_required: item.measurements_required,
        is_available: item.is_available,
        is_featured: item.is_featured,
        sort_order: item.sort_order.toString(),
        notes: item.notes || ''
      });
      setShowForm(true);
    }
  };

  const handleItemPress = (item: CatalogItem) => {
    // Find the latest version of the item from the current catalogItems
    const latestItem = catalogItems.find(catalogItem => catalogItem.id === item.id) || item;
    setSelectedItem(latestItem);
    setShowItemModal(true);
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImageForItem = async (itemId: number, image: any) => {
    try {
      console.log('📤 Uploading image for item:', itemId);
      console.log('📤 Image details:', {
        uri: image.uri,
        type: image.mimeType,
        name: image.fileName
      });
      
      // Convert image to base64 for reliable transmission
      const base64Image = await convertImageToBase64(image.uri);
      
      const imageData = {
        image: base64Image,
        image_type: image.mimeType || 'image/jpeg',
        image_name: image.fileName || 'image.jpg'
      };
      
      console.log('📤 Sending base64 image data');
      
      const response = await apiService.post(`/admin/catalog/${itemId}/image`, imageData);
      console.log('📷 Image upload response:', response);
      return response;
    } catch (error) {
      console.error('❌ Image upload error:', error);
      throw error;
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix to get just the base64 string
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Base64 conversion error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Debug: Log form data before submission
      console.log('📝 Form data before submission:', formData);
      console.log('📝 Selected image:', selectedImage);
      console.log('📝 Form data keys:', Object.keys(formData));
      console.log('📝 Form data values:', Object.values(formData));
      
      // Validate required fields
      if (!formData.name.trim()) {
        Alert.alert('Validation Error', 'Please enter a name for the catalog item');
        setSubmitting(false);
        return;
      }
      if (!formData.clothing_type.trim()) {
        Alert.alert('Validation Error', 'Please enter a clothing type');
        setSubmitting(false);
        return;
      }
      if (!formData.category) {
        Alert.alert('Validation Error', 'Please select a category');
        setSubmitting(false);
        return;
      }
      if (!formData.measurements_required || formData.measurements_required.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one required measurement');
        setSubmitting(false);
        return;
      }
      
      if (editingItem) {
        try {
          console.log('🔄 Updating catalog item:', editingItem.id);
          
        // For editing, always use JSON data first, then handle image separately
        console.log('📤 Sending JSON data for update');
        const updateData = {
          name: formData.name,
          description: formData.description,
          clothing_type: formData.clothing_type,
          category: formData.category,
          measurements_required: formData.measurements_required,
          is_available: formData.is_available,
          is_featured: formData.is_featured,
          sort_order: parseInt(formData.sort_order),
          notes: formData.notes
        };

        console.log('📤 Update data:', updateData);
        
        let response;
        try {
          response = await apiService.put(`/admin/catalog/${editingItem.id}`, updateData);
          console.log('✅ Update response:', response);
        } catch (updateError) {
          console.error('❌ JSON update failed, trying alternative approach:', updateError);
          
          // Fallback: Try with individual field updates
          console.log('🔄 Trying individual field updates...');
          const individualUpdates = [
            { field: 'name', value: formData.name },
            { field: 'description', value: formData.description },
            { field: 'clothing_type', value: formData.clothing_type },
            { field: 'category', value: formData.category },
            { field: 'measurements_required', value: formData.measurements_required },
            { field: 'is_available', value: formData.is_available },
            { field: 'is_featured', value: formData.is_featured },
            { field: 'sort_order', value: parseInt(formData.sort_order) },
            { field: 'notes', value: formData.notes }
          ];
          
          for (const update of individualUpdates) {
            try {
              await apiService.put(`/admin/catalog/${editingItem.id}`, { [update.field]: update.value });
              console.log(`✅ Updated ${update.field}`);
            } catch (fieldError) {
              console.error(`❌ Failed to update ${update.field}:`, fieldError);
            }
          }
          
          response = { success: true, message: 'Updated with fallback method' };
        }
        
        // If new image is selected, upload it separately
        if (selectedImage) {
          console.log('📷 New image selected, uploading separately...');
          try {
            await uploadImageForItem(editingItem.id, selectedImage);
            console.log('✅ Image uploaded successfully for update');
          } catch (imageError) {
            console.error('❌ Image upload failed:', imageError);
            Alert.alert('Warning', 'Item updated but image upload failed. You can update the image later.');
          }
        }
          
          Alert.alert('Success', 'Catalog item updated successfully');
          
          // Refresh the catalog items after successful update
          await loadCatalogItems();
        } catch (error) {
          console.error('❌ Error updating catalog item:', error);
          if (error.message && error.message.includes('Network request failed')) {
            Alert.alert('Network Error', 'Failed to connect to server. Please check your internet connection and try again.');
          } else {
            Alert.alert('Error', 'Failed to update catalog item. Please try again.');
          }
        }
      } else {
        // For creating new items, use JSON data (more reliable than FormData)
        const submitData = {
          name: formData.name,
          description: formData.description,
          clothing_type: formData.clothing_type,
          category: formData.category,
          measurements_required: formData.measurements_required,
          is_available: formData.is_available,
          is_featured: formData.is_featured,
          sort_order: parseInt(formData.sort_order),
          notes: formData.notes
        };
        
        // Debug: Log JSON data
        console.log('📤 JSON data:', submitData);
        
        // Note: Image upload will be handled separately if needed
        // For now, we'll create the item without image and handle image upload later
        if (selectedImage) {
          console.log('📷 Image selected but will be handled separately:', selectedImage.fileName);
        }

        const response = await apiService.post('/admin/catalog', submitData);
        
        // If image is selected, upload it separately
        if (selectedImage && response.success && response.data) {
          try {
            console.log('📷 Uploading image for item:', response.data.id);
            await uploadImageForItem(response.data.id, selectedImage);
            console.log('✅ Image uploaded successfully');
          } catch (imageError) {
            console.error('❌ Image upload failed:', imageError);
            Alert.alert('Warning', 'Item created but image upload failed. You can add the image later.');
          }
        }
        
        Alert.alert('Success', 'Catalog item created successfully');
      }

      setShowForm(false);
      setEditingItem(null);
      setSelectedImage(null);
      setFormData({
        name: '',
        description: '',
        clothing_type: '',
        category: 'formal_attire',
        image: null,
        measurements_required: [],
        is_available: true,
        is_featured: false,
        sort_order: '0',
        notes: ''
      });
      
      // Force refresh of catalog items
      await loadCatalogItems();
      
      // If modal is open, refresh the selected item
      if (showItemModal && selectedItem) {
        const updatedItem = catalogItems.find(item => item.id === selectedItem.id);
        if (updatedItem) {
          setSelectedItem(updatedItem);
        }
      }
    } catch (error) {
      console.error('Error submitting catalog item:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Failed to save catalog item';
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error.message?.includes('Validation failed')) {
        errorMessage = error.message;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out - please try again';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = (item: CatalogItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/admin/catalog/${item.id}`);
              Alert.alert('Success', 'Catalog item deleted successfully');
              loadCatalogItems();
            } catch (error) {
              console.error('Error deleting catalog item:', error);
              Alert.alert('Error', 'Failed to delete catalog item');
            }
          }
        }
      ]
    );
  };

  const toggleAvailability = async (item: CatalogItem) => {
    try {
      await apiService.put(`/admin/catalog/${item.id}`, {
        is_available: !item.is_available
      });
      loadCatalogItems();
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const toggleFeatured = async (item: CatalogItem) => {
    try {
      await apiService.post(`/admin/catalog/${item.id}/featured`, {
        is_featured: !item.is_featured
      });
      loadCatalogItems();
    } catch (error) {
      console.error('Error updating featured status:', error);
      Alert.alert('Error', 'Failed to update featured status');
    }
  };

  const renderCatalogItem = ({ item }: { item: CatalogItem }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => handleItemPress(item)}>
      {/* Top Section: Image, Name, and Status */}
      <View style={styles.cardTopSection}>
        <View style={styles.imageAndNameContainer}>
          <View style={styles.itemImageContainer}>
            {item.image_path ? (
              <Image 
                source={{ uri: getLocalImageUrl(item.image_path) }} 
                style={styles.itemImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Image load error for item', item.id, ':', error.nativeEvent.error);
                  console.log('❌ Image URL:', getLocalImageUrl(item.image_path));
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully for item', item.id);
                  console.log('✅ Image URL:', getLocalImageUrl(item.image_path));
                }}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="shirt" size={40} color={Colors.text.secondary} />
              </View>
            )}
            {/* Featured Badge on Image */}
            {item.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.nameAndDetailsContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{CATEGORIES[item.category]}</Text>
            </View>
          </View>
        </View>
        
        {/* Status Badge - Top Right */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: item.is_available ? Colors.success : Colors.error }]}>
            <Text style={styles.statusText}>{item.is_available ? 'Available' : 'Unavailable'}</Text>
          </View>
        </View>
      </View>

      {/* Middle Section: Metadata in List Format */}
      <View style={styles.metadataList}>
        <View style={styles.metadataRow}>
          <Ionicons name="calendar-outline" size={14} color="#014D40" />
          <Text style={styles.metadataLabel}>Created:</Text>
          <Text style={styles.metadataValue}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.metadataRow}>
          <Ionicons name="refresh-outline" size={14} color="#014D40" />
          <Text style={styles.metadataLabel}>Updated:</Text>
          <Text style={styles.metadataValue}>{new Date(item.updated_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.metadataRow}>
          <Ionicons name="list-outline" size={14} color="#014D40" />
          <Text style={styles.metadataLabel}>Sort:</Text>
          <Text style={styles.metadataValue}>{item.sort_order}</Text>
        </View>
      </View>

      {/* Separator Line */}
      <View style={styles.separatorLine} />

      {/* Bottom Section: Action Buttons */}
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.availabilityButton]}
          onPress={(e) => {
            e.stopPropagation();
            toggleAvailability(item);
          }}
        >
          <Ionicons 
            name={item.is_available ? "eye-off" : "eye"} 
            size={18} 
            color={item.is_available ? Colors.error : Colors.success} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.featuredButton]}
          onPress={(e) => {
            e.stopPropagation();
            toggleFeatured(item);
          }}
        >
          <Ionicons 
            name={item.is_featured ? "star" : "star-outline"} 
            size={18} 
            color={item.is_featured ? Colors.warning : Colors.text.secondary} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleEditItem(item);
          }}
        >
          <Ionicons name="create" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteItem(item);
          }}
        >
          <Ionicons name="trash" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderForm = () => (
    <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.formContainer}>
        {/* Enhanced Header */}
        <View style={styles.formHeader}>
          <View style={styles.formHeaderContent}>
            <View style={styles.formTitleContainer}>
              <Ionicons 
                name={editingItem ? "create" : "add-circle"} 
                size={24} 
                color="#014D40" 
              />
              <Text style={styles.formTitle}>
                {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowForm(false);
                setShowFormCategoryDropdown(false);
              }}
            >
              <Ionicons name="close" size={24} color="#014D40" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
          {/* Basic Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#014D40" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Item Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => {
                  console.log('📝 Name changed to:', text);
                  setFormData({ ...formData, name: text });
                }}
                placeholder="Enter item name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Clothing Type *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.clothing_type}
                onChangeText={(text) => {
                  console.log('📝 Clothing type changed to:', text);
                  setFormData({ ...formData, clothing_type: text });
                }}
                placeholder="Enter clothing type"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter item description"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Category Selection Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={20} color="#014D40" />
              <Text style={styles.sectionTitle}>Category</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Select Category *</Text>
              <TouchableOpacity
                style={styles.categoryDropdownButton}
                onPress={() => setShowFormCategoryDropdown(!showFormCategoryDropdown)}
              >
                <View style={styles.categoryDropdownContent}>
                  <Ionicons 
                    name={formData.category === 'formal_attire' ? 'business-outline' :
                          formData.category === 'ph_traditional' ? 'flag-outline' :
                          formData.category === 'evening_party_wear' ? 'sparkles-outline' :
                          formData.category === 'wedding_bridal' ? 'heart-outline' :
                          formData.category === 'special' ? 'star-outline' : 'shirt-outline'} 
                    size={20} 
                    color="#014D40" 
                  />
                  <Text style={styles.categoryDropdownText}>
                    {CATEGORIES[formData.category] || 'Select a category'}
                  </Text>
                </View>
                <Ionicons 
                  name={showFormCategoryDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#014D40" 
                />
              </TouchableOpacity>
              
              {showFormCategoryDropdown && (
                <View style={styles.categoryDropdownOptions}>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryDropdownOption,
                        formData.category === key && styles.selectedCategoryDropdownOption
                      ]}
                      onPress={() => {
                        console.log('📝 Category changed to:', key);
                        setFormData({ ...formData, category: key });
                        setShowFormCategoryDropdown(false);
                      }}
                    >
                      <Ionicons 
                        name={key === 'formal_attire' ? 'business-outline' :
                              key === 'ph_traditional' ? 'flag-outline' :
                              key === 'evening_party_wear' ? 'sparkles-outline' :
                              key === 'wedding_bridal' ? 'heart-outline' :
                              key === 'special' ? 'star-outline' : 'shirt-outline'} 
                        size={18} 
                        color={formData.category === key ? '#fff' : '#014D40'} 
                      />
                      <Text style={[
                        styles.categoryDropdownOptionText,
                        formData.category === key && styles.selectedCategoryDropdownOptionText
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Image Upload Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={20} color="#014D40" />
              <Text style={styles.sectionTitle}>Item Image</Text>
            </View>
            
            <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImagePicker}>
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={handleImagePicker}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : editingItem && editingItem.image_path ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: getLocalImageUrl(editingItem.image_path) }} 
                    style={styles.imagePreview} 
                  />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={handleImagePicker}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageUploadPlaceholder}>
                  <Ionicons name="camera" size={48} color="#014D40" />
                  <Text style={styles.imageUploadText}>Tap to select image</Text>
                  <Text style={styles.imageUploadSubtext}>Recommended: 1:1 aspect ratio</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Measurements Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="resize-outline" size={20} color="#014D40" />
              <Text style={styles.sectionTitle}>Required Measurements</Text>
            </View>
            
            <View style={styles.measurementsGrid}>
              {MEASUREMENT_OPTIONS.map((measurement) => (
                <TouchableOpacity
                  key={measurement}
                  style={[
                    styles.measurementCard,
                    formData.measurements_required.includes(measurement) && styles.selectedMeasurementCard
                  ]}
                  onPress={() => {
                    const updated = formData.measurements_required.includes(measurement)
                      ? formData.measurements_required.filter(m => m !== measurement)
                      : [...formData.measurements_required, measurement];
                    console.log('📝 Measurements changed to:', updated);
                    setFormData({ ...formData, measurements_required: updated });
                  }}
                >
                  <Ionicons 
                    name={formData.measurements_required.includes(measurement) ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={formData.measurements_required.includes(measurement) ? '#fff' : '#014D40'} 
                  />
                  <Text style={[
                    styles.measurementCardText,
                    formData.measurements_required.includes(measurement) && styles.selectedMeasurementCardText
                  ]}>
                    {MEASUREMENT_FIELDS[measurement].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={20} color="#014D40" />
              <Text style={styles.sectionTitle}>Settings</Text>
            </View>
            
            <View style={styles.settingsContainer}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="eye-outline" size={20} color="#014D40" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Available for Rent/Purchase</Text>
                    <Text style={styles.settingDescription}>Make this item available to customers</Text>
                  </View>
                </View>
                <Switch
                  value={formData.is_available}
                  onValueChange={(value) => setFormData({ ...formData, is_available: value })}
                  trackColor={{ false: '#e9ecef', true: Colors.primary }}
                  thumbColor={formData.is_available ? '#fff' : '#fff'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="star-outline" size={20} color="#014D40" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Featured Item</Text>
                    <Text style={styles.settingDescription}>Show in Popular category</Text>
                  </View>
                </View>
                <Switch
                  value={formData.is_featured}
                  onValueChange={(value) => setFormData({ ...formData, is_featured: value })}
                  trackColor={{ false: '#e9ecef', true: Colors.warning }}
                  thumbColor={formData.is_featured ? '#fff' : '#fff'}
                />
              </View>
            </View>

            <View style={styles.settingsGap} />

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Sort Order</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.sort_order}
                  onChangeText={(text) => setFormData({ ...formData, sort_order: text })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Enhanced Form Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowForm(false);
              setShowFormCategoryDropdown(false);
            }}
          >
            <Ionicons name="close" size={20} color="#666" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={editingItem ? "checkmark" : "add"} size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderItemModal = () => (
    <Modal visible={showItemModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Item Details</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowItemModal(false)}
          >
            <Ionicons name="close" size={24} color="#014D40" />
          </TouchableOpacity>
        </View>

        {selectedItem && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header Section with Image and Basic Info */}
            <View style={styles.modalHeaderSection}>
              {/* Image Container */}
              <View style={styles.modalImageContainer}>
                {selectedItem.image_path ? (
                  <Image 
                    source={{ uri: getLocalImageUrl(selectedItem.image_path) }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalPlaceholderImage}>
                    <Ionicons name="shirt" size={80} color={Colors.text.secondary} />
                  </View>
                )}
                {selectedItem.is_featured && (
                  <View style={styles.modalFeaturedBadge}>
                    <Ionicons name="star" size={16} color="#fff" />
                    <Text style={styles.modalFeaturedText}>Featured</Text>
                  </View>
                )}
              </View>

              {/* Basic Info */}
              <View style={styles.modalBasicInfo}>
                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                <Text style={styles.modalItemType}>{selectedItem.clothing_type}</Text>
                
                <View style={styles.modalBadgesRow}>
                  <View style={styles.modalCategoryBadge}>
                    <Text style={styles.modalCategoryText}>{CATEGORIES[selectedItem.category]}</Text>
                  </View>
                  <View style={[styles.modalStatusBadge, { backgroundColor: selectedItem.is_available ? Colors.success : Colors.error }]}>
                    <Text style={styles.modalStatusText}>
                      {selectedItem.is_available ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Content Sections */}
            <View style={styles.modalContentSections}>
              {/* Description */}
              {selectedItem.description && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#014D40" />
                    <Text style={styles.modalSectionTitle}>Description</Text>
                  </View>
                  <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                </View>
              )}

              {/* Required Measurements */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="resize-outline" size={20} color="#014D40" />
                  <Text style={styles.modalSectionTitle}>Required Measurements</Text>
                </View>
                <View style={styles.modalMeasurementsContainer}>
                  {selectedItem.measurements_required.map((measurement, index) => (
                    <View key={index} style={styles.modalMeasurementTag}>
                      <Text style={styles.modalMeasurementText}>{measurement}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Notes */}
              {selectedItem.notes && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="clipboard-outline" size={20} color="#014D40" />
                    <Text style={styles.modalSectionTitle}>Notes</Text>
                  </View>
                  <Text style={styles.modalNotes}>{selectedItem.notes}</Text>
                </View>
              )}

              {/* Metadata */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="information-circle-outline" size={20} color="#014D40" />
                  <Text style={styles.modalSectionTitle}>Item Information</Text>
                </View>
                <View style={styles.modalMetadataContainer}>
                  <View style={styles.modalMetadataItem}>
                    <View style={styles.modalMetadataIcon}>
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    </View>
                    <View style={styles.modalMetadataContent}>
                      <Text style={styles.modalMetadataLabel}>Created</Text>
                      <Text style={styles.modalMetadataValue}>
                        {new Date(selectedItem.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalMetadataItem}>
                    <View style={styles.modalMetadataIcon}>
                      <Ionicons name="refresh-circle-outline" size={16} color="#fff" />
                    </View>
                    <View style={styles.modalMetadataContent}>
                      <Text style={styles.modalMetadataLabel}>Updated</Text>
                      <Text style={styles.modalMetadataValue}>
                        {new Date(selectedItem.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalMetadataItem}>
                    <View style={styles.modalMetadataIcon}>
                      <Ionicons name="reorder-three-outline" size={16} color="#fff" />
                    </View>
                    <View style={styles.modalMetadataContent}>
                      <Text style={styles.modalMetadataLabel}>Sort Order</Text>
                      <Text style={styles.modalMetadataValue}>{selectedItem.sort_order}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading catalog items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="shirt" size={28} color="#014D40" style={styles.titleIcon} />
          <Text style={styles.headerTitle}>Catalog Management</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {/* Search and Filter Row */}
        <View style={styles.searchAndFilterRow}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#014D40" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search catalog items..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Dropdown */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Ionicons 
                name={selectedCategory === 'all' ? 'grid-outline' :
                      selectedCategory === 'formal_attire' ? 'business-outline' :
                      selectedCategory === 'ph_traditional' ? 'flag-outline' :
                      selectedCategory === 'evening_party_wear' ? 'sparkles-outline' :
                      selectedCategory === 'wedding_bridal' ? 'heart-outline' :
                      selectedCategory === 'special' ? 'star-outline' : 'shirt-outline'} 
                size={18} 
                color="#014D40" 
                style={styles.dropdownIcon}
              />
              <Text style={styles.dropdownText}>
                {selectedCategory === 'all' ? 'All Categories' : CATEGORIES[selectedCategory]}
              </Text>
              <Ionicons 
                name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#014D40" 
              />
            </TouchableOpacity>

            {/* Dropdown Options */}
            {showCategoryDropdown && (
              <View style={styles.dropdownOptions}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.dropdownOption, selectedCategory === 'all' && styles.selectedDropdownOption]}
                    onPress={() => {
                      handleCategoryFilter('all');
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Ionicons name="grid-outline" size={16} color={selectedCategory === 'all' ? '#fff' : '#014D40'} />
                    <Text style={[styles.dropdownOptionText, selectedCategory === 'all' && styles.selectedDropdownOptionText]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.dropdownOption, selectedCategory === key && styles.selectedDropdownOption]}
                      onPress={() => {
                        handleCategoryFilter(key);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Ionicons 
                        name={key === 'formal_attire' ? 'business-outline' :
                              key === 'ph_traditional' ? 'flag-outline' :
                              key === 'evening_party_wear' ? 'sparkles-outline' :
                              key === 'wedding_bridal' ? 'heart-outline' :
                              key === 'special' ? 'star-outline' : 'shirt-outline'} 
                        size={16} 
                        color={selectedCategory === key ? '#fff' : '#014D40'} 
                      />
                      <Text style={[styles.dropdownOptionText, selectedCategory === key && styles.selectedDropdownOptionText]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>

      {catalogItems.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={64} color={Colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Catalog Items</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory !== 'all' 
              ? 'No items match your current filters' 
              : 'Start by adding your first catalog item'
            }
          </Text>
          {!searchQuery && selectedCategory === 'all' && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddItem}>
              <Text style={styles.emptyButtonText}>Add First Item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={catalogItems}
          renderItem={renderCatalogItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderForm()}
      {renderItemModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#014D40',
  },
  addButton: {
    backgroundColor: '#014D40',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filters: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#014D40',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'relative',
    minWidth: 180,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: '500',
    flex: 1,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    zIndex: 9999,
    maxHeight: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedDropdownOption: {
    backgroundColor: '#014D40',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  selectedDropdownOptionText: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  imageAndNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  nameAndDetailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#014D40',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.warning,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#014D40',
    marginBottom: 4,
    lineHeight: 22,
  },
  itemType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#014D40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  itemStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 12,
  },
  availabilityButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featuredButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButton: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  itemDetailsSection: {
    backgroundColor: Colors.background + '50',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  itemNotes: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  metadataList: {
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '600',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
    marginHorizontal: 8,
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  formContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
    marginRight: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border + '50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.background,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  selectedCategoryOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  selectedCategoryOptionText: {
    color: Colors.white,
    fontWeight: '700',
  },
  measurementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  measurementOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  selectedMeasurementOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  measurementOptionText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  selectedMeasurementOptionText: {
    color: Colors.white,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  formActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.background,
    marginRight: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border + '50',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.secondary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  imageUploadButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  selectedImage: {
    width: 116,
    height: 116,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  imageUploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  removeImageText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  // Enhanced Form Styles
  formHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  formSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#014D40',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    gap: 8,
  },
  selectedCategoryCard: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    textAlign: 'center',
  },
  selectedCategoryCardText: {
    color: '#fff',
  },
  imageUploadContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageUploadPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
  },
  imageUploadSubtext: {
    fontSize: 12,
    color: '#666',
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  measurementCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    gap: 12,
  },
  selectedMeasurementCard: {
    backgroundColor: '#014D40',
    borderColor: '#014D40',
  },
  measurementCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#014D40',
    flex: 1,
  },
  selectedMeasurementCardText: {
    color: '#fff',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  settingsGap: {
    height: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014D40',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  // Category Dropdown Styles
  categoryDropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryDropdownText: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: '500',
  },
  categoryDropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    zIndex: 1000,
    elevation: 10,
    marginTop: 4,
  },
  categoryDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedCategoryDropdownOption: {
    backgroundColor: '#014D40',
  },
  categoryDropdownOptionText: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: '500',
    flex: 1,
  },
  selectedCategoryDropdownOptionText: {
    color: '#fff',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    flex: 1,
  },
  modalHeaderSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalImageContainer: {
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalPlaceholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalFeaturedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalFeaturedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalBasicInfo: {
    alignItems: 'center',
  },
  modalItemName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#014D40',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalItemType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBadgesRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  modalCategoryBadge: {
    backgroundColor: '#014D40',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCategoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContentSections: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#014D40',
    marginLeft: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  modalMeasurementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  modalMeasurementTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#014D40',
  },
  modalMeasurementText: {
    fontSize: 14,
    color: '#014D40',
    fontWeight: '500',
  },
  modalNotes: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalMetadataContainer: {
    gap: 12,
    alignItems: 'center',
  },
  modalMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    width: '100%',
  },
  modalMetadataIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#014D40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalMetadataContent: {
    flex: 1,
    alignItems: 'center',
  },
  modalMetadataLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  modalMetadataValue: {
    fontSize: 16,
    color: '#014D40',
    fontWeight: '600',
    textAlign: 'center',
  },
});
